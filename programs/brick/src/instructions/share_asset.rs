use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::System,
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{ mint_to, Mint, MintTo, Token, TokenAccount },
    }
};

#[derive(Accounts)]
pub struct ShareAsset<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>, // seller
    #[account(
        mut,
        seeds = [
            b"asset".as_ref(),
            asset.asset_mint.as_ref(),
        ],
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ ErrorCode::IncorrectAssetAuthority
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
        constraint = receiver_vault.mint == asset_mint.key() @ ErrorCode::IncorrectReceiverTokenAccount
    )]
    pub receiver_vault: Box<Account<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<ShareAsset>, exemplars: u32) -> Result<()> {
    (*ctx.accounts.asset).shared += exemplars;

    let seeds = &[
        b"asset".as_ref(),
        ctx.accounts.asset.asset_mint.as_ref(),
        &[ctx.accounts.asset.bump],
    ];

    // call mintTo instruction
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.asset_mint.to_account_info(),
                to: ctx.accounts.receiver_vault.to_account_info(),
                authority: ctx.accounts.asset.to_account_info(),
            },
            &[&seeds[..]],
        ),
        exemplars.into()
    )?;

    Ok(())
}