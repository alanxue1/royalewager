const fs = require("fs");
const path = require("path");
const { Connection, PublicKey } = require("@solana/web3.js");
const { readOracleKeypair } = require("./tx_utils");

function readOraclePubkeyHint() {
  const fromEnv = (process.env.ORACLE_AUTHORITY_PUBKEY || "").trim();
  if (fromEnv) return fromEnv;

  const p = path.join(process.cwd(), "solana", "oracle-authority-pubkey.txt");
  if (fs.existsSync(p)) return fs.readFileSync(p, "utf8").trim();
  return "";
}

async function main() {
  const rpc = (process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com").trim();
  const conn = new Connection(rpc, "confirmed");

  const oracle = readOracleKeypair();
  const derived = oracle.publicKey;

  const hintedRaw = readOraclePubkeyHint();
  const hinted = hintedRaw ? new PublicKey(hintedRaw) : null;

  const bal = await conn.getBalance(derived, "confirmed");

  process.stdout.write(`rpc=${rpc}\n`);
  process.stdout.write(`oracle_from_keypair=${derived.toBase58()}\n`);
  process.stdout.write(`oracle_balance=${bal} lamports\n`);
  process.stdout.write(`oracle_hint=${hinted ? hinted.toBase58() : ""}\n`);
  process.stdout.write(`oracle_matches_hint=${hinted ? derived.equals(hinted) : ""}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


