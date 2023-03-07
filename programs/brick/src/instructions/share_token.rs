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
pub struct ShareToken<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>, // seller
    #[account(
        mut,
        seeds = [
            b"token".as_ref(),
            token.token_mint.as_ref(),
        ],
        bump = token.bumps.bump,
        constraint = token.authority == authority.key() @ ErrorCode::IncorrectTokenAuthority
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
        constraint = receiver_vault.mint == token_mint.key() @ ErrorCode::IncorrectReceiverTokenAccount
    )]
    pub receiver_vault: Box<Account<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<ShareToken>, exemplars: u32) -> Result<()> {
    (*ctx.accounts.token).transactions_info.shared += exemplars;

    let seeds = &[
        b"token".as_ref(),
        ctx.accounts.token.token_mint.as_ref(),
        &[ctx.accounts.token.bumps.bump],
    ];

    // call mintTo instruction
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.receiver_vault.to_account_info(),
                authority: ctx.accounts.token.to_account_info(),
            },
            &[&seeds[..]],
        ),
        exemplars.into()
    )?;

    Ok(())
}