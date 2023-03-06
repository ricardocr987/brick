use anchor_lang::prelude::*;

#[account]
pub struct Asset {
    pub app_name: [u8; 32], // to discriminate between different apps accounts, limited to 32 bytes
    pub off_chain_metadata: [u8; 64], // limited to 64 bytes, could be filled with anything by the app
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
    pub off_chain_id: String, // limited to 32 bytes, used as seed of the mint account
}

impl Asset {
    pub const SIZE: usize = 8 + 32 + 64 + 32 + 32 + 32 + 8 + 4 + 4 + 4 + 4 + 4 + 4 + 1 + 1 + 1 + 36;
}