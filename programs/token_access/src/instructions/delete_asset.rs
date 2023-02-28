use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct DeleteAsset<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"asset".as_ref(),
            asset.asset_mint.as_ref(),
        ],
        close = authority,
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ ErrorCode::WrongAssetAuthority
    )]
    pub asset: Account<'info, Asset>,
}

pub fn handler<'info>(ctx: Context<DeleteAsset>) -> Result<()> {
    if (*ctx.accounts.asset).sold + (*ctx.accounts.asset).shared > (*ctx.accounts.asset).used {
            return Err(ErrorCode::UnusedTokenExists.into());
    }

    Ok(())
}