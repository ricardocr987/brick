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
pub struct BuyAsset<'info> {
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
            b"asset".as_ref(),
            asset.asset_mint.as_ref(),
        ],
        bump = asset.bump
    )]
    pub asset: Box<Account<'info, Asset>>,
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
        constraint = buyer_transfer_vault.mint == asset.accepted_mint @ ErrorCode::IncorrectBuyerTokenAccountOnTransfer
    )]
    pub buyer_transfer_vault: Account<'info, TokenAccount>, // buyer token account to pay
    #[account(
        constraint = accepted_mint.key() == asset.accepted_mint.key() @ ErrorCode::IncorrectPaymentToken
    )]
    pub accepted_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = Payment::SIZE,
        seeds = [
            b"payment".as_ref(),
            asset_mint.key().as_ref(),
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
        mut,
        constraint = buyer_token_vault.mint == asset_mint.key() @ ErrorCode::IncorrectBuyerTokenAccountToStorePurchasedToken
    )]
    pub buyer_token_vault: Box<Account<'info, TokenAccount>>, // buyer token account to store Asset token
}

pub fn handler<'info>(ctx: Context<BuyAsset>, timestamp: u64) -> Result<()> {
    if (*ctx.accounts.asset).exemplars > -1 && (*ctx.accounts.asset).sold + 1 > (*ctx.accounts.asset).exemplars as u32 {
        return Err(ErrorCode::NotEnoughTokensAvailable.into());
    }

    (*ctx.accounts.asset).sold += 1;
    (*ctx.accounts.payment).asset_mint = ctx.accounts.asset_mint.key();
    (*ctx.accounts.payment).seller = ctx.accounts.asset.authority;
    (*ctx.accounts.payment).buyer = ctx.accounts.authority.key();
    (*ctx.accounts.payment).price = ctx.accounts.asset.price;
    (*ctx.accounts.payment).payment_timestamp = timestamp;
    (*ctx.accounts.payment).refund_consumed_at = ctx.accounts.asset.refund_timespan + timestamp;
    (*ctx.accounts.payment).bump = *ctx.bumps.get("payment").unwrap();
    (*ctx.accounts.payment).bump_vault = *ctx.bumps.get("payment_vault").unwrap();

    let seeds = &[
        b"asset".as_ref(),
        ctx.accounts.asset.asset_mint.as_ref(),
        &[ctx.accounts.asset.bump],
    ];

    // call transfer from authority (buyer) to Asset authority (seller)
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_transfer_vault.to_account_info(),
                to: ctx.accounts.payment_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        ctx.accounts.asset.price.into(),
    )?;

    // call mintTo instruction
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.asset_mint.to_account_info(),
                to: ctx.accounts.buyer_token_vault.to_account_info(),
                authority: ctx.accounts.asset.to_account_info(),
            },
            &[&seeds[..]],
        ),
        1
    )?;

    Ok(())
}