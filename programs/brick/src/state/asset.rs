use anchor_lang::prelude::*;

#[account]
pub struct Asset {
    pub app_name: String, // to discriminate between different apps accounts, limited to 32 bytes
    pub off_chain_id: String, // limited to 32 bytes
    pub accepted_mint: Pubkey, // token used for payment
    pub asset_mint: Pubkey,
    pub authority: Pubkey,
    pub refund_timespan: u64, // time given to buyer to get a refund while still holding tokens
    pub price: u32,
    pub sold: u32,
    pub used: u32,
    pub shared: u32,
    pub refunded: u32,
    pub exemplars: i32, // -1 means unlimited sale
    pub bump: u8,
    pub mint_bump: u8,
    pub metadata_bump: u8,
}

impl Asset {
    pub const SIZE: usize = 8 + 36 + 36 + 32 + 32 + 32 + 8 + 4 + 4 + 4 + 4 + 4 + 4 + 1 + 1 + 1;
}