use anchor_lang::prelude::*;

#[account]
pub struct TokenMetadata {
    pub off_chain_metadata: [u8; 64], // limited to 64 bytes, could be filled with anything by the app
    pub app: Pubkey, // to discriminate between different apps accounts
    pub token_mint: Pubkey,
    pub authority: Pubkey,
    pub seller_config: SellerConfig,
    pub transactions_info: TransactionsInfo,
    pub bumps: Bumps,
    pub off_chain_id2: [u8; 32], // 64 bytes id is what ipfs uses, becuase 32 bytes seeds limit 
    // i'm forced to do this, splitting it in the client and joining it here
    pub off_chain_id: String, // limited to 32 bytes, used as seed of the mint account
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct SellerConfig {
    pub refund_timespan: u64, // time given to buyer to get a refund while still holding tokens
    pub price: u32, // token amount
    pub accepted_mint: Pubkey, // token used for payment
    pub exemplars: i32, // -1 means unlimited sale
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct TransactionsInfo {
    pub sold: u32,
    pub used: u32,
    pub shared: u32,
    pub refunded: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct Bumps {
    pub bump: u8,
    pub mint_bump: u8,
    pub metadata_bump: u8,
}

impl TokenMetadata {
    pub const SIZE: usize = 8 + 64 + 32 + 32 + 32 + 32 + 8 + 4 + 4 + 4 + 4 + 4 + 4 + 1 + 1 + 1 + 32 + 36;
}