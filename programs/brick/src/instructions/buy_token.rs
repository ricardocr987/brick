use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::System,
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{ mint_to, transfer, Mint, MintTo, Token, TokenAccount, Transfer },
    }
};

#[derive(Accounts)]
#[instruction(timestamp: u64)]
pub struct BuyToken<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"token".as_ref(),
            token.token_mint.as_ref(),
        ],
        bump = token.bumps.bump
    )]
    pub token: Box<Account<'info, TokenMetadata>>,
    #[account(
        mut,
        seeds = [
            b"token_mint".as_ref(),
            token.off_chain_id.as_ref(),
        ],
        bump = token.bumps.mint_bump
    )]
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = buyer_transfer_vault.mint == token.seller_config.accepted_mint @ ErrorCode::IncorrectBuyerTokenAccountOnTransfer
    )]
    pub buyer_transfer_vault: Account<'info, TokenAccount>, // buyer token account to pay
    #[account(
        constraint = accepted_mint.key() == token.seller_config.accepted_mint.key() @ ErrorCode::IncorrectPaymentToken
    )]
    pub accepted_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = Payment::SIZE,
        seeds = [
            b"payment".as_ref(),
            token_mint.key().as_ref(),
            authority.key().as_ref(),
            timestamp.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub payment: Account<'info, Payment>,
    #[account(
        init,
        payer = authority,
        seeds = [
            b"payment_vault".as_ref(),
            payment.key().as_ref(),
        ],
        bump,
        token::mint = accepted_mint,
        token::authority = payment,
    )]
    pub payment_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = authority, 
        associated_token::mint = token_mint, 
        associated_token::authority = authority,
    )]
    pub buyer_token_vault: Box<Account<'info, TokenAccount>>, // buyer token account to store token token
}

pub fn handler<'info>(ctx: Context<BuyToken>, timestamp: u64) -> Result<()> {
    if (*ctx.accounts.token).seller_config.exemplars > -1 && (*ctx.accounts.token).transactions_info.sold + 1 > (*ctx.accounts.token).seller_config.exemplars as u32 {
        return Err(ErrorCode::NotEnoughTokensAvailable.into());
    }

    (*ctx.accounts.token).transactions_info.sold += 1;
    (*ctx.accounts.payment).token_account = ctx.accounts.token.key();
    (*ctx.accounts.payment).token_mint = ctx.accounts.token_mint.key();
    (*ctx.accounts.payment).paid_mint = ctx.accounts.accepted_mint.key();
    (*ctx.accounts.payment).seller = ctx.accounts.token.authority;
    (*ctx.accounts.payment).buyer = ctx.accounts.authority.key();
    (*ctx.accounts.payment).price = ctx.accounts.token.seller_config.price;
    (*ctx.accounts.payment).payment_timestamp = timestamp;
    (*ctx.accounts.payment).refund_consumed_at = ctx.accounts.token.seller_config.refund_timespan + timestamp;
    (*ctx.accounts.payment).bump = *ctx.bumps.get("payment").unwrap();
    (*ctx.accounts.payment).bump_vault = *ctx.bumps.get("payment_vault").unwrap();

    let seeds = &[
        b"token".as_ref(),
        ctx.accounts.token.token_mint.as_ref(),
        &[ctx.accounts.token.bumps.bump],
    ];

    // call transfer from authority (buyer) to token authority (seller)
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_transfer_vault.to_account_info(),
                to: ctx.accounts.payment_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        ctx.accounts.token.seller_config.price.into(),
    )?;

    // call mintTo instruction
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.buyer_token_vault.to_account_info(),
                authority: ctx.accounts.token.to_account_info(),
            },
            &[&seeds[..]],
        ),
        1
    )?;

    Ok(())
}