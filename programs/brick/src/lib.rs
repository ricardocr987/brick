pub mod state;
pub mod errors;
pub mod utils;
mod instructions;
use {
    anchor_lang::prelude::*,
    instructions::*,
};

declare_id!("84KfPcJAZhNSLMmSzgx3kDx3FfKfS3WK5u8FF8zks18S");

#[program]
pub mod brick {
    use super::*;

    pub fn create_app(ctx: Context<CreateApp>, app_name: String, fee_basis_points: u16) -> Result<()> {
        create_app::handler(ctx, app_name, fee_basis_points)
    }

    pub fn create_token(
        ctx: Context<CreateToken>,
        off_chain_id: String,
        off_chain_metadata: String,
        refund_timespan: u64,
        token_price: u32,
        exemplars: i32,
        token_name: String,
        token_symbol: String,
        token_uri: String,
    ) -> Result<()> {
        create_token::handler(
            ctx,
            off_chain_id,
            off_chain_metadata,
            refund_timespan,
            token_price,
            exemplars,
            token_name,
            token_symbol,
            token_uri,
        )
    }

    pub fn edit_token_price(ctx: Context<EditTokenPrice>, token_price: u32) -> Result<()> {
        edit_token_price::handler(ctx, token_price)
    }

    pub fn buy_token(ctx: Context<BuyToken>, timestamp: u64) -> Result<()> {
        buy_token::handler(ctx, timestamp)
    }

    pub fn share_token(ctx: Context<ShareToken>, exemplars: u32) -> Result<()> {
        share_token::handler(ctx, exemplars)
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        withdraw_funds::handler(ctx)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        refund::handler(ctx)
    }

    pub fn use_token(ctx: Context<UseToken>) -> Result<()> {
        use_token::handler(ctx)
    }

    pub fn deletetoken(ctx: Context<DeleteToken>) -> Result<()> {
        delete_token::handler(ctx)
    }
}
