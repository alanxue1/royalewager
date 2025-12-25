use anchor_lang::prelude::*;

declare_id!("F3AD5yK9rRiCQWesXeSQSTAmRDbe8ruvQVChE5vsyjnR");

#[program]
pub mod wager_escrow {
  use super::*;

  pub fn create(ctx: Context<Create>, wager_id: u64, amount_lamports: u64, deadline_unix_timestamp: i64, oracle: Pubkey) -> Result<()> {
    require!(amount_lamports > 0, EscrowError::AmountZero);
    require!(amount_lamports <= Escrow::MAX_AMOUNT_LAMPORTS, EscrowError::AmountTooLarge);

    let now = Clock::get()?.unix_timestamp;
    require!(deadline_unix_timestamp > now, EscrowError::DeadlineInPast);

    let escrow = &mut ctx.accounts.escrow;
    escrow.wager_id = wager_id;
    escrow.creator = ctx.accounts.creator.key();
    escrow.joiner = Pubkey::default();
    escrow.oracle = oracle;
    escrow.amount_lamports = amount_lamports;
    escrow.deadline_unix_timestamp = deadline_unix_timestamp;
    escrow.state = EscrowState::AwaitingJoiner as u8;
    escrow.bump = ctx.bumps.escrow;
    escrow.vault_bump = ctx.bumps.vault;

    // Transfer creator deposit into the vault PDA.
    anchor_lang::system_program::transfer(
      CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
          from: ctx.accounts.creator.to_account_info(),
          to: ctx.accounts.vault.to_account_info(),
        },
      ),
      amount_lamports,
    )?;

    Ok(())
  }

  pub fn join(ctx: Context<Join>, wager_id: u64) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    require!(escrow.wager_id == wager_id, EscrowError::WagerIdMismatch);
    require!(escrow.state == EscrowState::AwaitingJoiner as u8, EscrowError::NotJoinable);
    require!(escrow.joiner == Pubkey::default(), EscrowError::JoinerAlreadySet);
    require!(escrow.creator != ctx.accounts.joiner.key(), EscrowError::CreatorCannotJoin);

    anchor_lang::system_program::transfer(
      CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
          from: ctx.accounts.joiner.to_account_info(),
          to: ctx.accounts.vault.to_account_info(),
        },
      ),
      escrow.amount_lamports,
    )?;

    escrow.joiner = ctx.accounts.joiner.key();
    escrow.state = EscrowState::Active as u8;

    Ok(())
  }

  /// winner:
  /// - 0 => creator
  /// - 1 => joiner
  /// - 2 => tie (refund both)
  pub fn settle(ctx: Context<Settle>, wager_id: u64, winner: u8) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    require!(escrow.wager_id == wager_id, EscrowError::WagerIdMismatch);
    require!(escrow.state == EscrowState::Active as u8, EscrowError::NotActive);
    require!(ctx.accounts.oracle.key() == escrow.oracle, EscrowError::UnauthorizedOracle);
    require!(escrow.joiner != Pubkey::default(), EscrowError::JoinerMissing);

    let creator_key = ctx.accounts.creator.key();
    let joiner_key = ctx.accounts.joiner.key();
    require!(creator_key == escrow.creator, EscrowError::CreatorAccountMismatch);
    require!(joiner_key == escrow.joiner, EscrowError::JoinerAccountMismatch);

    let amount = escrow.amount_lamports;
    let total = amount.checked_mul(2).ok_or(EscrowError::MathOverflow)?;

    // Vault is program-owned; we can move lamports by mutating balances.
    let vault_info = ctx.accounts.vault.to_account_info();
    let vault_lamports = **vault_info.lamports.borrow();
    require!(vault_lamports >= total, EscrowError::InsufficientVaultBalance);

    match winner {
      0 => {
        transfer_lamports(&vault_info, &ctx.accounts.creator.to_account_info(), total)?;
      }
      1 => {
        transfer_lamports(&vault_info, &ctx.accounts.joiner.to_account_info(), total)?;
      }
      2 => {
        transfer_lamports(&vault_info, &ctx.accounts.creator.to_account_info(), amount)?;
        transfer_lamports(&vault_info, &ctx.accounts.joiner.to_account_info(), amount)?;
      }
      _ => return err!(EscrowError::InvalidWinner),
    }

    // Drain any remaining lamports (e.g. rent) to creator for cleanup.
    drain_to(&vault_info, &ctx.accounts.creator.to_account_info())?;

    escrow.state = EscrowState::Settled as u8;
    Ok(())
  }

  pub fn refund(ctx: Context<Refund>, wager_id: u64) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    require!(escrow.wager_id == wager_id, EscrowError::WagerIdMismatch);
    require!(escrow.state != EscrowState::Settled as u8, EscrowError::AlreadySettled);
    require!(escrow.state != EscrowState::Refunded as u8, EscrowError::AlreadyRefunded);

    let now = Clock::get()?.unix_timestamp;
    require!(now > escrow.deadline_unix_timestamp, EscrowError::RefundNotAvailableYet);

    let creator_key = ctx.accounts.creator.key();
    require!(creator_key == escrow.creator, EscrowError::CreatorAccountMismatch);

    let vault_info = ctx.accounts.vault.to_account_info();
    let amount = escrow.amount_lamports;

    if escrow.joiner == Pubkey::default() {
      // Only creator deposited.
      transfer_lamports(&vault_info, &ctx.accounts.creator.to_account_info(), amount)?;
      drain_to(&vault_info, &ctx.accounts.creator.to_account_info())?;
    } else {
      let joiner_key = ctx.accounts.joiner.key();
      require!(joiner_key == escrow.joiner, EscrowError::JoinerAccountMismatch);

      transfer_lamports(&vault_info, &ctx.accounts.creator.to_account_info(), amount)?;
      transfer_lamports(&vault_info, &ctx.accounts.joiner.to_account_info(), amount)?;
      drain_to(&vault_info, &ctx.accounts.creator.to_account_info())?;
    }

    escrow.state = EscrowState::Refunded as u8;
    Ok(())
  }
}

#[derive(Accounts)]
#[instruction(wager_id: u64)]
pub struct Create<'info> {
  #[account(mut)]
  pub creator: Signer<'info>,

  #[account(
    init,
    payer = creator,
    seeds = [b"escrow", &wager_id.to_le_bytes()],
    bump,
    space = Escrow::SPACE
  )]
  pub escrow: Account<'info, Escrow>,

  /// Program-owned vault PDA holding lamports.
  /// CHECK: Created by Anchor with specified seeds/owner.
  #[account(
    init,
    payer = creator,
    seeds = [b"vault", &wager_id.to_le_bytes()],
    bump,
    space = 0,
    owner = crate::ID
  )]
  pub vault: UncheckedAccount<'info>,

  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(wager_id: u64)]
pub struct Join<'info> {
  #[account(mut)]
  pub joiner: Signer<'info>,

  #[account(
    mut,
    seeds = [b"escrow", &wager_id.to_le_bytes()],
    bump = escrow.bump
  )]
  pub escrow: Account<'info, Escrow>,

  /// CHECK: PDA verified by seeds/bump; program-owned.
  #[account(
    mut,
    seeds = [b"vault", &wager_id.to_le_bytes()],
    bump = escrow.vault_bump
  )]
  pub vault: UncheckedAccount<'info>,

  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(wager_id: u64)]
pub struct Settle<'info> {
  pub oracle: Signer<'info>,

  #[account(
    mut,
    seeds = [b"escrow", &wager_id.to_le_bytes()],
    bump = escrow.bump
  )]
  pub escrow: Account<'info, Escrow>,

  /// CHECK: PDA verified by seeds/bump; program-owned.
  #[account(
    mut,
    seeds = [b"vault", &wager_id.to_le_bytes()],
    bump = escrow.vault_bump
  )]
  pub vault: UncheckedAccount<'info>,

  #[account(mut, address = escrow.creator)]
  pub creator: SystemAccount<'info>,

  #[account(mut, address = escrow.joiner)]
  pub joiner: SystemAccount<'info>,
}

#[derive(Accounts)]
#[instruction(wager_id: u64)]
pub struct Refund<'info> {
  // Anyone can trigger refunds after deadline (prevents stuck funds).
  pub trigger: Signer<'info>,

  #[account(
    mut,
    seeds = [b"escrow", &wager_id.to_le_bytes()],
    bump = escrow.bump
  )]
  pub escrow: Account<'info, Escrow>,

  /// CHECK: PDA verified by seeds/bump; program-owned.
  #[account(
    mut,
    seeds = [b"vault", &wager_id.to_le_bytes()],
    bump = escrow.vault_bump
  )]
  pub vault: UncheckedAccount<'info>,

  #[account(mut, address = escrow.creator)]
  pub creator: SystemAccount<'info>,

  // In the "no joiner" case, this will be the default pubkey and the caller should pass creator again.
  // We validate it only when escrow.joiner != Pubkey::default().
  #[account(mut)]
  pub joiner: SystemAccount<'info>,
}

#[account]
pub struct Escrow {
  pub wager_id: u64,
  pub creator: Pubkey,
  pub joiner: Pubkey,
  pub oracle: Pubkey,
  pub amount_lamports: u64,
  pub deadline_unix_timestamp: i64,
  pub state: u8,
  pub bump: u8,
  pub vault_bump: u8,
}

impl Escrow {
  pub const MAX_AMOUNT_LAMPORTS: u64 = 10_000_000_000; // 10 SOL safety cap (tweak later)
  pub const SPACE: usize = 8 /*disc*/ + 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1 + 1;
}

#[repr(u8)]
pub enum EscrowState {
  AwaitingJoiner = 0,
  Active = 1,
  Settled = 2,
  Refunded = 3,
}

#[error_code]
pub enum EscrowError {
  #[msg("amount must be > 0")]
  AmountZero,
  #[msg("amount too large")]
  AmountTooLarge,
  #[msg("deadline is in the past")]
  DeadlineInPast,
  #[msg("wager id mismatch")]
  WagerIdMismatch,
  #[msg("escrow not joinable")]
  NotJoinable,
  #[msg("joiner already set")]
  JoinerAlreadySet,
  #[msg("creator cannot join")]
  CreatorCannotJoin,
  #[msg("escrow not active")]
  NotActive,
  #[msg("unauthorized oracle")]
  UnauthorizedOracle,
  #[msg("joiner missing")]
  JoinerMissing,
  #[msg("creator account mismatch")]
  CreatorAccountMismatch,
  #[msg("joiner account mismatch")]
  JoinerAccountMismatch,
  #[msg("invalid winner")]
  InvalidWinner,
  #[msg("math overflow")]
  MathOverflow,
  #[msg("insufficient vault balance")]
  InsufficientVaultBalance,
  #[msg("already settled")]
  AlreadySettled,
  #[msg("already refunded")]
  AlreadyRefunded,
  #[msg("refund not available yet")]
  RefundNotAvailableYet,
}

fn transfer_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> Result<()> {
  let from_lamports = **from.lamports.borrow();
  require!(from_lamports >= amount, EscrowError::InsufficientVaultBalance);
  **from.try_borrow_mut_lamports()? -= amount;
  **to.try_borrow_mut_lamports()? += amount;
  Ok(())
}

fn drain_to(from: &AccountInfo, to: &AccountInfo) -> Result<()> {
  let remaining = **from.lamports.borrow();
  if remaining == 0 {
    return Ok(());
  }
  **from.try_borrow_mut_lamports()? = 0;
  **to.try_borrow_mut_lamports()? += remaining;
  Ok(())
}


