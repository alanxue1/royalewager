const { PublicKey, Connection } = require("@solana/web3.js");
const { readProgramId, readOracleKeypair, pda, sendIx, u64le } = require("./tx_utils");

// Usage:
//   node solana/escrow/scripts/settle.js <wager_id> <winner:0|1|2> <creator_pubkey> <joiner_pubkey>
//
// Env:
//   SOLANA_RPC_URL
//   ESCROW_PROGRAM_ID (optional, otherwise reads scripts/PROGRAM_ID.txt)
//   ORACLE_AUTHORITY_KEYPAIR_JSON (json array string OR a file path)

async function main() {
  const [wagerIdRaw, winnerRaw, creatorRaw, joinerRaw] = process.argv.slice(2);
  if (!wagerIdRaw || winnerRaw == null || !creatorRaw || !joinerRaw) {
    throw new Error("usage: settle.js <wager_id> <winner:0|1|2> <creator_pubkey> <joiner_pubkey>");
  }

  const wagerId = BigInt(wagerIdRaw);
  const winner = Number(winnerRaw);
  if (![0, 1, 2].includes(winner)) throw new Error("winner must be 0|1|2");

  const programId = readProgramId();
  const escrow = pda(programId, "escrow", wagerId);
  const vault = pda(programId, "vault", wagerId);
  const oracle = readOracleKeypair();

  const creator = new PublicKey(creatorRaw);
  const joiner = new PublicKey(joinerRaw);

  // Check if escrow account exists before attempting to settle
  const rpc = (process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com").trim();
  const connection = new Connection(rpc, "confirmed");
  
  const escrowInfo = await connection.getAccountInfo(escrow);
  if (!escrowInfo) {
    throw new Error(`Escrow account does not exist for wager_id=${wagerIdRaw}. Escrow PDA: ${escrow.toBase58()}. Make sure the escrow was created on-chain first.`);
  }

  // Verify escrow account matches expected creator/joiner
  // Account data structure:
  // 0-7: discriminator (8 bytes)
  // 8-15: wager_id (8 bytes)
  // 16-47: creator (32 bytes)
  // 48-79: joiner (32 bytes)
  // 80-111: oracle (32 bytes)
  // 112-119: amount_lamports (8 bytes)
  // 120-127: deadline_unix_timestamp (8 bytes)
  // 128: state (1 byte)
  // 129: bump (1 byte)
  // 130: vault_bump (1 byte)
  if (escrowInfo.data.length >= 80) {
    const escrowCreatorBytes = escrowInfo.data.slice(16, 48);
    const escrowJoinerBytes = escrowInfo.data.slice(48, 80);
    const escrowCreator = new PublicKey(escrowCreatorBytes);
    const escrowJoiner = new PublicKey(escrowJoinerBytes);
    
    if (!escrowCreator.equals(creator)) {
      throw new Error(`Escrow creator mismatch for wager_id=${wagerIdRaw}. Escrow has ${escrowCreator.toBase58()}, expected ${creator.toBase58()}. The escrow account may have been created for a different wager.`);
    }
    
    if (!escrowJoiner.equals(joiner)) {
      throw new Error(`Escrow joiner mismatch for wager_id=${wagerIdRaw}. Escrow has ${escrowJoiner.toBase58()}, expected ${joiner.toBase58()}. The escrow account may have been created for a different wager.`);
    }

    // Check escrow state (offset 128)
    if (escrowInfo.data.length >= 129) {
      const state = escrowInfo.data[128];
      if (state !== 1) {
        throw new Error(`Escrow is not in Active state for wager_id=${wagerIdRaw}. Current state: ${state} (0=AwaitingJoiner, 1=Active, 2=Settled, 3=Refunded). The escrow must be in Active state to settle.`);
      }
    }
  }

  const vaultInfo = await connection.getAccountInfo(vault);
  const vaultBalance = vaultInfo ? vaultInfo.lamports : 0;
  if (vaultBalance === 0) {
    throw new Error(`Vault account has zero balance for wager_id=${wagerIdRaw}. Vault PDA: ${vault.toBase58()}. Make sure both deposits were made on-chain.`);
  }

  const sig = await sendIx({
    ixName: "settle",
    keys: [
      { pubkey: oracle.publicKey, isSigner: true, isWritable: false },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: false, isWritable: true },
      { pubkey: joiner, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([u64le(wagerId), Buffer.from([winner])]),
  });

  process.stdout.write(`${sig}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


