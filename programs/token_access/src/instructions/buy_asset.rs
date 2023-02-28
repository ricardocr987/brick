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
pub struct BuyAsset<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
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
        constraint = buyer_transfer_vault.mint == asset.accepted_mint @ ErrorCode::WrongBuyerMintProvided
    )]
    pub buyer_transfer_vault: Account<'info, TokenAccount>, // buyer token account to pay
    #[account(
        mut,
        constraint = seller_transfer_vault.mint == asset.accepted_mint @ ErrorCode::WrongSellerMintProvided
    )]
    pub seller_transfer_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [
            b"asset_mint".as_ref(),
            asset.hash_id.as_ref(),
        ],
        bump = asset.mint_bump
    )]
    pub asset_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = buyer_minted_token_vault.mint == asset_mint.key() @ ErrorCode::WrongTokenAccount
    )]
    pub buyer_minted_token_vault: Box<Account<'info, TokenAccount>>, // buyer token account to store Asset token
}

pub fn handler<'info>(ctx: Context<BuyAsset>, exemplars: u32) -> Result<()> {
    if 
        (*ctx.accounts.asset).exemplars > -1 && 
        (*ctx.accounts.asset).sold + exemplars > (*ctx.accounts.asset).exemplars as u32 {
            return Err(ErrorCode::NotEnoughTokensAvailable.into());
    }

    (*ctx.accounts.asset).sold += exemplars;

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
                to: ctx.accounts.seller_transfer_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        ctx.accounts
            .asset
            .price
            .checked_mul(exemplars.into())
            .unwrap()
            .into(),
    )?;

    // call mintTo instruction
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.asset_mint.to_account_info(),
                to: ctx.accounts.buyer_minted_token_vault.to_account_info(),
                authority: ctx.accounts.asset.to_account_info(),
            },
            &[&seeds[..]],
        ),
        exemplars.into()
    )?;

    Ok(())
}