use anchor_lang::prelude::*;

#[account]
pub struct App {
    pub authority: Pubkey,
    pub fee_basis_points: u16, // The fee percentage charged for a transaction by the app, a value of 250 corresponds to a fee of 2,5%
    pub bump: u8,
    pub app_name: String, // to discriminate between different apps accounts, limited to 32 bytes
}

impl App {
    pub const SIZE: usize = 8 + 32 + 4 + 1 + 36;
}