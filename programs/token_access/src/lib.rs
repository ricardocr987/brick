pub mod state;
pub mod errors;
mod instructions;
use {
    anchor_lang::prelude::*,
    instructions::*,
};

declare_id!("CVxc3dHvujRrFQ5iMBxFFWPsXnU8SyvVT9SgUTJjxXdv");

#[program]
pub mod token_access {
    use super::*;

    pub fn create_asset(
        ctx: Context<CreateAsset>,
        hash_id: String,
        app_name: String,
        item_hash: String,
        timestamp_funds_vault: u64,
        token_price: u32,
        exemplars: i32,
        quantity_per_exemplars: u32,
        token_name: String,
        token_symbol: String,
        token_uri: String,
    ) -> Result<()> {
        create_asset::handler(
            ctx, 
            hash_id,
            app_name,
            item_hash,
            timestamp_funds_vault,
            token_price,
            exemplars,
            quantity_per_exemplars,
            token_name,
            token_symbol,
            token_uri,
        )
    }

    pub fn edit_asset_price(ctx: Context<EditAssetPrice>, token_price: u32) -> Result<()> {
        edit_asset_price::handler(ctx, token_price)
    }

    pub fn buy_asset(ctx: Context<BuyAsset>, timestamp: u64, exemplars: u32) -> Result<()> {
        buy_asset::handler(ctx, timestamp, exemplars)
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

    pub fn use_asset(ctx: Context<UseAsset>, exemplars: u32) -> Result<()> {
        use_asset::handler(ctx, exemplars)
    }

    pub fn delete_asset(ctx: Context<DeleteAsset>) -> Result<()> {
        delete_asset::handler(ctx)
    }
}
