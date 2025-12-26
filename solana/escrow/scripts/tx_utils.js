const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Keypair, PublicKey, Transaction, TransactionInstruction, Connection } = require("@solana/web3.js");

const LAMPORTS_PER_SOL = 1_000_000_000;

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

async function ensureOracleFeePayerFunded(connection, oraclePubkey) {
  const bal = await connection.getBalance(oraclePubkey, "confirmed");
  if (bal > 0) return;

  const rpc = (connection.rpcEndpoint || "").toString();
  const auto = (process.env.SOLANA_AUTO_AIRDROP_ORACLE || "").trim() === "1";

  if (!auto) {
    throw new Error(
      [
        `Oracle fee payer has 0 lamports (and may not exist on-chain).`,
        `oracle=${oraclePubkey.toBase58()}`,
        `rpc=${rpc}`,
        `Fund this pubkey (>= 0.01 SOL) or set SOLANA_AUTO_AIRDROP_ORACLE=1 to auto-airdrop on devnet.`,
        `Tip: node solana/escrow/scripts/fund_oracle.js`,
      ].join(" | ")
    );
  }

  // Only auto-airdrop on devnet/localnet by intent.
  const rpcLc = rpc.toLowerCase();
  const looksLikeDevnet = rpcLc.includes("devnet.solana.com");
  const looksLikeLocalnet = rpcLc.includes("localhost") || rpcLc.includes("127.0.0.1");
  if (!looksLikeDevnet && !looksLikeLocalnet) {
    throw new Error(
      `Refusing to auto-airdrop on non-devnet rpc=${rpc}. Fund oracle=${oraclePubkey.toBase58()} manually.`
    );
  }

  const airdropLamports = Number(process.env.SOLANA_ORACLE_AIRDROP_LAMPORTS || 1 * LAMPORTS_PER_SOL);
  const sig = await connection.requestAirdrop(oraclePubkey, airdropLamports);
  await connection.confirmTransaction(sig, "confirmed");
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

  await ensureOracleFeePayerFunded(connection, oracle.publicKey);

  const ix = new TransactionInstruction({
    programId,
    keys,
    data: Buffer.concat([discriminator(ixName), data]),
  });

  const { blockhash } = await connection.getLatestBlockhash("finalized");

  const tx = new Transaction().add(ix);
  tx.feePayer = oracle.publicKey;
  tx.recentBlockhash = blockhash;
  tx.sign(oracle);

  // Send with skipPreflight=false to get simulation errors
  let sig;
  try {
    sig = await connection.sendRawTransaction(tx.serialize(), { 
      skipPreflight: false,
      maxRetries: 0,
    });
  } catch (e) {
    // If send fails, try to get more details from simulation
    if (e.logs) {
      throw new Error(`Transaction failed: ${e.message}. Logs: ${e.logs.join("\n")}`);
    }
    throw e;
  }
  
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


