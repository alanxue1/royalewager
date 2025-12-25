const { PublicKey } = require("@solana/web3.js");
const { readProgramId, readOracleKeypair, pda, sendIx, u64le } = require("./tx_utils");

// Usage:
//   node solana/escrow/scripts/refund.js <wager_id> <creator_pubkey> <joiner_pubkey_or_creator>
//
// Env:
//   SOLANA_RPC_URL
//   ESCROW_PROGRAM_ID (optional, otherwise reads scripts/PROGRAM_ID.txt)
//   ORACLE_AUTHORITY_KEYPAIR_JSON (json array string OR a file path)

async function main() {
  const [wagerIdRaw, creatorRaw, joinerRaw] = process.argv.slice(2);
  if (!wagerIdRaw || !creatorRaw || !joinerRaw) {
    throw new Error("usage: refund.js <wager_id> <creator_pubkey> <joiner_pubkey_or_creator>");
  }

  const wagerId = BigInt(wagerIdRaw);
  const programId = readProgramId();
  const escrow = pda(programId, "escrow", wagerId);
  const vault = pda(programId, "vault", wagerId);
  const oracle = readOracleKeypair();

  const creator = new PublicKey(creatorRaw);
  const joiner = new PublicKey(joinerRaw);

  const sig = await sendIx({
    ixName: "refund",
    keys: [
      { pubkey: oracle.publicKey, isSigner: true, isWritable: false }, // trigger
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: false, isWritable: true },
      { pubkey: joiner, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([u64le(wagerId)]),
  });

  process.stdout.write(`${sig}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


