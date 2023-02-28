use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::System,
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{ burn, Burn, Mint, Token, TokenAccount },
    }
};

#[derive(Accounts)]
pub struct UseAsset<'info> {
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
        bump = asset.bump,
    )]
    pub asset: Account<'info, Asset>,
    #[account(
        mut,
        seeds = [
            b"asset_mint".as_ref(),
            asset.hash_id.as_ref(),
        ],
        bump = asset.mint_bump,
        constraint = buyer_minted_token_vault.mint == asset_mint.key() @ ErrorCode::WrongTokenAccount
    )]
    pub asset_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = buyer_minted_token_vault.owner == authority.key() @ ErrorCode::WrongTokenOwner
    )]
    pub buyer_minted_token_vault: Box<Account<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<UseAsset>, exemplars: u32) -> Result<()> {
    (*ctx.accounts.asset).used += exemplars;

    burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                authority: ctx.accounts.authority.to_account_info(),
                from: ctx.accounts.buyer_minted_token_vault.to_account_info(),
                mint: ctx.accounts.asset_mint.to_account_info(),
            },
        ),
        exemplars.into(),
    )?;

    Ok(())
}