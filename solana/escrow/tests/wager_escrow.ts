import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WagerEscrowProgram = Program<any>;

function u64le(n: anchor.BN) {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(BigInt(n.toString(10)));
  return out;
}

describe("wager_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WagerEscrow as WagerEscrowProgram;

  const creator = Keypair.generate();
  const joiner = Keypair.generate();
  const oracle = Keypair.generate();

  const wagerId = new anchor.BN(42);
  const amount = new anchor.BN(100_000); // 0.0001 SOL

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), u64le(wagerId)],
    program.programId,
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), u64le(wagerId)],
    program.programId,
  );

  const airdrop = async (pubkey: PublicKey, sol = 1) => {
    const sig = await provider.connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig, "confirmed");
  };

  before(async () => {
    await airdrop(creator.publicKey);
    await airdrop(joiner.publicKey);
    await airdrop(oracle.publicKey);
  });

  it("create + join + settle (creator wins)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const deadline = new anchor.BN(now + 60);

    await program.methods
      .create(wagerId, amount, deadline, oracle.publicKey)
      .accounts({
        creator: creator.publicKey,
        escrow: escrowPda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .join(wagerId)
      .accounts({
        joiner: joiner.publicKey,
        escrow: escrowPda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([joiner])
      .rpc();

    const preCreator = await provider.connection.getBalance(creator.publicKey, "confirmed");
    const preJoiner = await provider.connection.getBalance(joiner.publicKey, "confirmed");

    await program.methods
      .settle(wagerId, 0) // winner=creator
      .accounts({
        oracle: oracle.publicKey,
        escrow: escrowPda,
        vault: vaultPda,
        creator: creator.publicKey,
        joiner: joiner.publicKey,
      })
      .signers([oracle])
      .rpc();

    const postCreator = await provider.connection.getBalance(creator.publicKey, "confirmed");
    const postJoiner = await provider.connection.getBalance(joiner.publicKey, "confirmed");

    // Winner should net +amount (minus fees), loser should net -amount (plus fees).
    expect(postCreator).to.be.greaterThan(preCreator);
    expect(postJoiner).to.be.lessThan(preJoiner);
  });

  it("refund after deadline when no joiner", async () => {
    const wagerId2 = new anchor.BN(99);
    const [escrow2] = PublicKey.findProgramAddressSync([Buffer.from("escrow"), u64le(wagerId2)], program.programId);
    const [vault2] = PublicKey.findProgramAddressSync([Buffer.from("vault"), u64le(wagerId2)], program.programId);

    const now = Math.floor(Date.now() / 1000);
    const deadline = new anchor.BN(now + 1);

    await program.methods
      .create(wagerId2, amount, deadline, oracle.publicKey)
      .accounts({
        creator: creator.publicKey,
        escrow: escrow2,
        vault: vault2,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // Wait for deadline to pass.
    await new Promise((r) => setTimeout(r, 1500));

    const preCreator = await provider.connection.getBalance(creator.publicKey, "confirmed");
    await program.methods
      .refund(wagerId2)
      .accounts({
        trigger: joiner.publicKey,
        escrow: escrow2,
        vault: vault2,
        creator: creator.publicKey,
        // joiner account is ignored in the no-joiner branch; pass creator to satisfy account.
        joiner: creator.publicKey,
      })
      .signers([joiner])
      .rpc();
    const postCreator = await provider.connection.getBalance(creator.publicKey, "confirmed");
    expect(postCreator).to.be.greaterThan(preCreator);
  });
});


