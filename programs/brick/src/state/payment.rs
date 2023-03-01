use anchor_lang::prelude::*;

#[account]
pub struct Payment {
    pub asset_mint: Pubkey,
    pub seller: Pubkey,
    pub buyer: Pubkey, // this key is used also as seed
    pub exemplars: u32,
    pub price: u32,
    pub total_amount: u64,
    pub payment_timestamp: u64,
    pub seller_receive_funds_timestamp: u64,
    pub bump: u8,
    pub bump_vault: u8,
}

impl Payment {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 4 + 4 + 8 + 8 + 8 + 4 + 1 + 1;
}