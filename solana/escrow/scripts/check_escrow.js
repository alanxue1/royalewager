const { PublicKey, Connection } = require("@solana/web3.js");
const { readProgramId, pda, u64le } = require("./tx_utils");

async function main() {
  const [wagerIdRaw] = process.argv.slice(2);
  if (!wagerIdRaw) {
    throw new Error("usage: check_escrow.js <wager_id>");
  }

  const wagerId = BigInt(wagerIdRaw);
  const programId = readProgramId();
  const escrow = pda(programId, "escrow", wagerId);
  const vault = pda(programId, "vault", wagerId);

  const rpc = (process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com").trim();
  const connection = new Connection(rpc, "confirmed");

  const escrowInfo = await connection.getAccountInfo(escrow);
  const vaultInfo = await connection.getAccountInfo(vault);

  if (!escrowInfo) {
    console.log(`Escrow account does not exist for wager_id=${wagerIdRaw}`);
    return;
  }

  const data = escrowInfo.data;
  if (data.length < 131) {
    console.log(`Escrow account data too short: ${data.length} bytes`);
    return;
  }

  // Decode escrow data structure:
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
  const state = data.length > 128 ? data[128] : null;
  const joinerBytes = data.slice(48, 80);
  const joinerPubkey = new PublicKey(joinerBytes);
  const creatorBytes = data.slice(16, 48);
  const creatorPubkey = new PublicKey(creatorBytes);
  
  // Also decode wager_id for verification
  const wagerIdBytes = data.slice(8, 16);
  const wagerIdFromEscrow = Buffer.from(wagerIdBytes).readBigUInt64LE(0);

  console.log(`Escrow PDA: ${escrow.toBase58()}`);
  console.log(`Vault PDA: ${vault.toBase58()}`);
  console.log(`Vault balance: ${vaultInfo ? vaultInfo.lamports : 0} lamports`);
  console.log(`Wager ID in escrow: ${wagerIdFromEscrow}`);
  console.log(`Expected wager ID: ${wagerId}`);
  console.log(`State: ${state} (0=AwaitingJoiner, 1=Active, 2=Settled, 3=Refunded)`);
  console.log(`Creator: ${creatorPubkey.toBase58()}`);
  console.log(`Joiner: ${joinerPubkey.toBase58()}`);
  console.log(`Joiner is default: ${joinerPubkey.equals(PublicKey.default)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

