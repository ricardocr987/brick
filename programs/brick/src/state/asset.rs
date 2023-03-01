use anchor_lang::prelude::*;

#[account]
pub struct Asset {
    pub app_name: String, // to discriminate between different apps accounts, limited to 32 bytes
    pub hash_id: String, // limited to 32 bytes
    pub item_hash: String, // limited to 64 bytes
    pub accepted_mint: Pubkey, // token used to trade
    pub asset_mint: Pubkey, // asset mint
    pub authority: Pubkey,
    pub timestamp_funds_vault: u64, // how much time do you give to the buyer to get a refund? (meanwhile buyer still has token)
    pub price: u32,
    pub sold: u32,
    pub used: u32,
    pub shared: u32,
    pub refunded: u32,
    pub exemplars: i32,
    pub quantity_per_exemplars: u32,
    pub bump: u8,
    pub mint_bump: u8,
    pub metadata_bump: u8,
}

impl Asset {
    pub const SIZE: usize = 8 + 36 + 36 + 68 + 32 + 32 + 32 + 4 + 4 + 4 + 4 + 4 + 4 + 1 + 1 + 1;
}