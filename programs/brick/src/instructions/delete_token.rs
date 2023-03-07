use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct DeleteToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"token".as_ref(),
            token.token_mint.as_ref(),
        ],
        close = authority,
        bump = token.bumps.bump,
        constraint = token.authority == authority.key() @ ErrorCode::IncorrectTokenAuthority
    )]
    pub token: Box<Account<'info, TokenMetadata>>,
}

pub fn handler<'info>(ctx: Context<DeleteToken>) -> Result<()> {
    if (*ctx.accounts.token).transactions_info.sold + (*ctx.accounts.token).transactions_info.shared > (*ctx.accounts.token).transactions_info.used {
            return Err(ErrorCode::UsersStillHoldUnusedTokens.into());
    }

    Ok(())
}