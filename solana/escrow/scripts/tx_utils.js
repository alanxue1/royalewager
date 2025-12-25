const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Keypair, PublicKey, Transaction, TransactionInstruction, Connection } = require("@solana/web3.js");

function readProgramId() {
  const fromEnv = (process.env.ESCROW_PROGRAM_ID || "").trim();
  if (fromEnv) return new PublicKey(fromEnv);

  const p = path.join(__dirname, "PROGRAM_ID.txt");
  if (fs.existsSync(p)) return new PublicKey(fs.readFileSync(p, "utf8").trim());

  const repoP = path.join(__dirname, "..", "scripts", "PROGRAM_ID.txt"); // compat
  if (fs.existsSync(repoP)) return new PublicKey(fs.readFileSync(repoP, "utf8").trim());

  throw new Error("ESCROW_PROGRAM_ID missing (and PROGRAM_ID.txt not found)");
}

function readOracleKeypair() {
  const raw = (process.env.ORACLE_AUTHORITY_KEYPAIR_JSON || "").trim();
  if (!raw) throw new Error("ORACLE_AUTHORITY_KEYPAIR_JSON missing");

  if (raw.startsWith("[")) {
    const arr = JSON.parse(raw);
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }

  // Treat as a file path.
  const p = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  const arr = JSON.parse(fs.readFileSync(p, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

function u64le(n) {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(BigInt(n));
  return out;
}

function discriminator(ixName) {
  const preimage = Buffer.from(`global:${ixName}`, "utf8");
  return crypto.createHash("sha256").update(preimage).digest().subarray(0, 8);
}

function pda(programId, seedPrefix, wagerId) {
  return PublicKey.findProgramAddressSync([Buffer.from(seedPrefix, "utf8"), u64le(wagerId)], programId)[0];
}

async function sendIx({ ixName, keys, data, rpcUrl }) {
  const programId = readProgramId();
  const oracle = readOracleKeypair();

  const rpc = (rpcUrl || process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com").trim();
  const connection = new Connection(rpc, "confirmed");

  const ix = new TransactionInstruction({
    programId,
    keys,
    data: Buffer.concat([discriminator(ixName), data]),
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = oracle.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

  tx.sign(oracle);

  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

module.exports = {
  readProgramId,
  readOracleKeypair,
  u64le,
  discriminator,
  pda,
  sendIx,
};


