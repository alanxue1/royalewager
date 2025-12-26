const { Connection } = require("@solana/web3.js");
const { readOracleKeypair } = require("./tx_utils");

const LAMPORTS_PER_SOL = 1_000_000_000;

// Usage:
//   SOLANA_RPC_URL=... ORACLE_AUTHORITY_KEYPAIR_JSON=... node solana/escrow/scripts/fund_oracle.js [lamports]
//
// Default: 1 SOL airdrop (devnet/localnet).
async function main() {
  const [lamportsRaw] = process.argv.slice(2);
  const lamports =
    lamportsRaw == null || lamportsRaw === ""
      ? 1 * LAMPORTS_PER_SOL
      : Number(lamportsRaw);

  if (!Number.isFinite(lamports) || lamports <= 0) {
    throw new Error("lamports must be a positive number");
  }

  const rpc = (process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com").trim();
  const conn = new Connection(rpc, "confirmed");

  const oracle = readOracleKeypair();
  const pk = oracle.publicKey;

  const before = await conn.getBalance(pk, "confirmed");
  process.stdout.write(`oracle=${pk.toBase58()} rpc=${rpc}\n`);
  process.stdout.write(`balance_before=${before} lamports\n`);

  const sig = await conn.requestAirdrop(pk, lamports);
  await conn.confirmTransaction(sig, "confirmed");

  const after = await conn.getBalance(pk, "confirmed");
  process.stdout.write(`airdrop_sig=${sig}\n`);
  process.stdout.write(`balance_after=${after} lamports\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


