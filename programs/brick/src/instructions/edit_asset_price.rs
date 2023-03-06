use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct EditAssetPrice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"asset".as_ref(),
            asset.asset_mint.as_ref()
        ], 
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ ErrorCode::IncorrectAssetAuthority
    )]
    pub asset: Box<Account<'info, Asset>>,
}

pub fn handler<'info>(ctx: Context<EditAssetPrice>, token_price: u32) -> Result<()> {
    (*ctx.accounts.asset).price = token_price;

    Ok(())
}