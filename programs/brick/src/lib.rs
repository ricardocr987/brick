pub mod state;
pub mod errors;
mod instructions;
use {
    anchor_lang::prelude::*,
    instructions::*,
};

declare_id!("84KfPcJAZhNSLMmSzgx3kDx3FfKfS3WK5u8FF8zks18S");

#[program]
pub mod brick {
    use super::*;

    pub fn create_asset(
        ctx: Context<CreateAsset>,
        off_chain_id: String,
        app_name: String,
        refund_timespan: u64,
        token_price: u32,
        exemplars: i32,
        token_name: String,
        token_symbol: String,
        token_uri: String,
    ) -> Result<()> {
        create_asset::handler(
            ctx, 
            off_chain_id,
            app_name,
            refund_timespan,
            token_price,
            exemplars,
            token_name,
            token_symbol,
            token_uri,
        )
    }

    pub fn edit_asset_price(ctx: Context<EditAssetPrice>, token_price: u32) -> Result<()> {
        edit_asset_price::handler(ctx, token_price)
    }

    pub fn buy_asset(ctx: Context<BuyAsset>, timestamp: u64) -> Result<()> {
        buy_asset::handler(ctx, timestamp)
    }

    pub fn share_asset(ctx: Context<ShareAsset>, exemplars: u32) -> Result<()> {
        share_asset::handler(ctx, exemplars)
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        withdraw_funds::handler(ctx)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        refund::handler(ctx)
    }

    pub fn use_asset(ctx: Context<UseAsset>) -> Result<()> {
        use_asset::handler(ctx)
    }

    pub fn delete_asset(ctx: Context<DeleteAsset>) -> Result<()> {
        delete_asset::handler(ctx)
    }
}
