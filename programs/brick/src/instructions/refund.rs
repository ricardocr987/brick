use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
    anchor_spl::token::{ burn, close_account, transfer, Burn, Mint, Token, TokenAccount, Transfer, CloseAccount },
};

#[derive(Accounts)]
pub struct Refund<'info> {
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"asset".as_ref(),
            asset.asset_mint.as_ref(),
        ],
        bump = asset.bump
    )]
    pub asset: Account<'info, Asset>,
    #[account(
        mut,
        seeds = [
            b"asset_mint".as_ref(),
            asset.off_chain_id.as_ref(),
        ],
        bump = asset.mint_bump
    )]
    pub asset_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = receiver_vault.mint == asset.accepted_mint @ ErrorCode::IncorrectReceiverTokenAccount
    )]
    pub receiver_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [
            b"payment".as_ref(),
            asset_mint.key().as_ref(),
            payment.buyer.as_ref(),
            payment.payment_timestamp.to_le_bytes().as_ref(),
        ],
        bump = payment.bump,
        constraint = authority.key() == payment.buyer @ ErrorCode::IncorrectPaymentAuthority,
        close = authority,
    )]
    pub payment: Account<'info, Payment>,
    #[account(
        mut,
        seeds = [
            b"payment_vault".as_ref(),
            payment.key().as_ref(),
        ],
        bump = payment.bump_vault,
        constraint = payment_vault.owner == payment.key() && payment_vault.mint == asset.accepted_mint.key() @ ErrorCode::IncorrectPaymentVault,
    )]
    pub payment_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = buyer_token_vault.mint == asset_mint.key() @ ErrorCode::IncorrectBuyerTokenAccountToStorePurchasedToken
    )]
    pub buyer_token_vault: Box<Account<'info, TokenAccount>>, // buyer token account to store Asset token
}

pub fn handler<'info>(ctx: Context<Refund>) -> Result<()> {
    let clock = Clock::get()?;
    if ctx.accounts.payment.refund_consumed_at < clock.unix_timestamp as u64 {
        return Err(ErrorCode::TimeForRefundHasConsumed.into());
    }
    (*ctx.accounts.asset).sold -= 1;
    (*ctx.accounts.asset).refunded += 1;

    let payment_timestamp = ctx.accounts.payment.payment_timestamp.to_le_bytes();
    let seeds = &[
        b"payment".as_ref(),
        ctx.accounts.payment.asset_mint.as_ref(),
        ctx.accounts.payment.buyer.as_ref(),
        payment_timestamp.as_ref(),
        &[ctx.accounts.payment.bump],
    ];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payment_vault.to_account_info(),
                to: ctx.accounts.receiver_vault.to_account_info(),
                authority: ctx.accounts.payment.to_account_info(),
            },
            &[&seeds[..]],
        ),
        ctx.accounts.payment.price.into(),
    )?;

    burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                authority: ctx.accounts.authority.to_account_info(),
                from: ctx.accounts.buyer_token_vault.to_account_info(),
                mint: ctx.accounts.asset_mint.to_account_info(),
            },
        ),
        1,
    )?;

    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            CloseAccount {
                account: ctx.accounts.payment_vault.to_account_info(),
                destination: ctx.accounts.authority.to_account_info(),
                authority: ctx.accounts.payment.to_account_info(),
            }, 
            &[&seeds[..]],
        )
    )?;

    Ok(())
}