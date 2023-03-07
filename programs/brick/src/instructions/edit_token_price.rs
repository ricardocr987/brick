use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct EditTokenPrice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"token".as_ref(),
            token.token_mint.as_ref()
        ], 
        bump = token.bumps.bump,
        constraint = token.authority == authority.key() @ ErrorCode::IncorrectTokenAuthority
    )]
    pub token: Box<Account<'info, TokenMetadata>>,
}

pub fn handler<'info>(ctx: Context<EditTokenPrice>, token_price: u32) -> Result<()> {
    (*ctx.accounts.token).seller_config.price = token_price;

    Ok(())
}