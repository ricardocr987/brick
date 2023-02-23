use anchor_lang::{
    prelude::*,
    solana_program::{
        account_info::AccountInfo,
    },
    system_program::System,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{ burn, mint_to, transfer, Burn, Mint, MintTo, Token, TokenAccount, Transfer },
};
use mpl_token_metadata::{
    ID as mpl_metadata_program,
    instruction::create_metadata_accounts_v3,
};

declare_id!("FiShPdUdNuvhF9qETghrDWXiiAR8X2ujeGfGwSC84d4P");

#[program]
pub mod fishplace {
    use super::*;

    pub fn create_asset(
        ctx: Context<CreateAsset>,
        hash_id: String, 
        app_name: String,
        item_hash: String,
        token_price: u32,
        exemplars: i32,
        quantity_per_exemplars: u32,
        token_name: String,
        token_symbol: String,
        token_uri: String,
    ) -> Result<()> {
        (*ctx.accounts.asset).app_name = app_name.clone();
        (*ctx.accounts.asset).hash_id = hash_id.clone();
        (*ctx.accounts.asset).item_hash = item_hash.clone();
        (*ctx.accounts.asset).accepted_mint = ctx.accounts.accepted_mint.key();
        (*ctx.accounts.asset).asset_mint = ctx.accounts.asset_mint.key();
        (*ctx.accounts.asset).authority = ctx.accounts.authority.key();
        (*ctx.accounts.asset).price = token_price;
        (*ctx.accounts.asset).sold = 0;
        (*ctx.accounts.asset).used = 0;
        (*ctx.accounts.asset).exemplars = exemplars;
        (*ctx.accounts.asset).quantity_per_exemplars = quantity_per_exemplars;
        (*ctx.accounts.asset).bump = *ctx.bumps.get("asset").unwrap();
        (*ctx.accounts.asset).mint_bump = *ctx.bumps.get("asset_mint").unwrap();
        (*ctx.accounts.asset).metadata_bump = *ctx.bumps.get("token_metadata").unwrap();
        
        let seeds = &[
            b"asset".as_ref(),
            ctx.accounts.asset.hash_id.as_ref(),
            &[ctx.accounts.asset.bump],
        ];

        //This instruction creates and initializes a new Metadata account for a given Mint account
        solana_program::program::invoke_signed(
            &create_metadata_accounts_v3(
                //args:
                mpl_metadata_program, //program_id
                (*ctx.accounts.token_metadata).key(), //metadata_account
                ctx.accounts.asset_mint.key(), //mint
                ctx.accounts.asset.key(), //mint_authority
                (*ctx.accounts.authority).key(), //payer
                ctx.accounts.asset.key(), //update_authority
                token_name,
                token_symbol,
                token_uri,
                None, //creators
                0, //sellerFeeBasisPoints
                true, //update_authority_is_signer
                true, //isMutable
                None, //collection
                None, //uses
                None, //collectionDetails
            ),
            //accounts context:
            &[
                ctx.accounts.token_metadata.to_account_info().clone(), //metadata
                ctx.accounts.asset_mint.to_account_info().clone(), //mint
                ctx.accounts.asset.to_account_info().clone(), //mint_authority
                ctx.accounts.authority.to_account_info().clone(), //payer
                ctx.accounts.asset.to_account_info().clone(), //update_authority
            ],
            &[&seeds[..]],
        )?;

        Ok(())
    }

    pub fn edit_asset_price(ctx: Context<EditAssetPrice>, token_price: u32) -> Result<()> {
        (*ctx.accounts.asset).price = token_price;

        Ok(())
    }

    pub fn buy_asset(ctx: Context<BuyAsset>, exemplars: u32) -> Result<()> {
        if 
            (*ctx.accounts.asset).exemplars > -1 && 
            (*ctx.accounts.asset).sold + exemplars > (*ctx.accounts.asset).exemplars as u32 {
                return Err(ErrorCode::NotEnoughTokensAvailable.into());
        }

        (*ctx.accounts.asset).sold += exemplars;

        let seeds = &[
            b"asset".as_ref(),
            ctx.accounts.asset.hash_id.as_ref(),
            &[ctx.accounts.asset.bump],
        ];

        // call transfer from authority (buyer) to Asset authority (seller)
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_transfer_vault.to_account_info(),
                    to: ctx.accounts.seller_transfer_vault.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            ctx.accounts
                .asset
                .price
                .checked_mul(exemplars.into())
                .unwrap()
                .into(),
        )?;

        // call mintTo instruction
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.asset_mint.to_account_info(),
                    to: ctx.accounts.buyer_minted_token_vault.to_account_info(),
                    authority: ctx.accounts.asset.to_account_info(),
                },
                &[&seeds[..]],
            ),
            exemplars.into()
        )?;

        Ok(())
    }

    pub fn use_asset(ctx: Context<UseAsset>, exemplars: u32) -> Result<()> {
        (*ctx.accounts.asset).used += exemplars;

        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    authority: ctx.accounts.authority.to_account_info(),
                    from: ctx.accounts.buyer_minted_token_vault.to_account_info(),
                    mint: ctx.accounts.asset_mint.to_account_info(),
                },
            ),
            exemplars.into(),
        )?;

        Ok(())
    }

    pub fn delete_asset(ctx: Context<DeleteAsset>) -> Result<()> {
        if (*ctx.accounts.asset).sold > (*ctx.accounts.asset).used {
                return Err(ErrorCode::BuyerWithTokenUnsed.into());
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(hash_id: String)]
pub struct CreateAsset<'info> {
    /// CHECK: contraint added to force using actual metaplex metadata program
    #[account(address = mpl_metadata_program, executable)]
    pub metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = Asset::SIZE,
        seeds = [
            b"asset".as_ref(),
            hash_id.as_ref()
        ],
        bump,
    )]
    pub asset: Account<'info, Asset>,
    pub accepted_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = asset,
        seeds = [
            b"asset_mint".as_ref(),
            asset.key().as_ref(),
        ],
        bump,
    )]
    pub asset_mint: Account<'info, Mint>,
    /// CHECK: this will be verified by token metadata program
    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            metadata_program.key().as_ref(),
            asset_mint.key().as_ref(),
        ],
        bump,
        seeds::program = metadata_program.key()
    )]
    pub token_metadata: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct EditAssetPrice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"asset".as_ref(),
            asset.hash_id.as_ref()
        ], 
        bump = asset.bump,
        constraint = asset.authority == authority.key()
    )]
    pub asset: Account<'info, Asset>,
}

#[derive(Accounts)]
pub struct BuyAsset<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"asset".as_ref(),
            asset.hash_id.as_ref(),
        ],
        bump = asset.bump
    )]
    pub asset: Account<'info, Asset>,
    #[account(
        mut,
        constraint = buyer_transfer_vault.mint == asset.accepted_mint @ ErrorCode::WrongBuyerMintProvided
    )]
    pub buyer_transfer_vault: Account<'info, TokenAccount>, // buyer token account to pay
    #[account(
        mut,
        constraint = seller_transfer_vault.mint == asset.accepted_mint @ ErrorCode::WrongSellerMintProvided
    )]
    pub seller_transfer_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [
            b"asset_mint".as_ref(),
            asset.key().as_ref(),
        ],
        bump = asset.mint_bump
    )]
    pub asset_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = buyer_minted_token_vault.mint == asset_mint.key() @ ErrorCode::WrongTokenAccount
    )]
    pub buyer_minted_token_vault: Box<Account<'info, TokenAccount>>, // buyer token account to store Asset token
}

#[derive(Accounts)]
pub struct UseAsset<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"asset".as_ref(),
            asset.hash_id.as_ref(),
        ],
        bump = asset.bump,
    )]
    pub asset: Account<'info, Asset>,
    #[account(
        mut,
        seeds = [
            b"asset_mint".as_ref(),
            asset.key().as_ref(),
        ],
        bump = asset.mint_bump,
        constraint = buyer_minted_token_vault.owner == authority.key() @ ErrorCode::WrongTokenOwner
    )]
    pub asset_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = buyer_minted_token_vault.mint == asset_mint.key() @ ErrorCode::WrongTokenAccount
    )]
    pub buyer_minted_token_vault: Box<Account<'info, TokenAccount>>,
}

#[derive(Accounts)]
pub struct DeleteAsset<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"asset".as_ref(),
            asset.hash_id.as_ref(),
        ],
        close = authority,
        bump = asset.bump,
        constraint = asset.authority == authority.key()
    )]
    pub asset: Account<'info, Asset>,
}

#[account]
pub struct Asset {
    pub app_name: String, // to discriminate between different apps accounts, limited to 32 bytes
    pub hash_id: String, // limited to 32 bytes
    pub item_hash: String, // limited to 64 bytes
    pub accepted_mint: Pubkey, // token used to trade
    pub asset_mint: Pubkey, // asset mint
    pub authority: Pubkey,
    pub price: u32,
    pub sold: u32,
    pub used: u32,
    pub exemplars: i32,
    pub quantity_per_exemplars: u32,
    pub bump: u8,
    pub mint_bump: u8,
    pub metadata_bump: u8,
}

impl Asset {
    pub const SIZE: usize = 8 + 36 + 36 + 68 + 32 + 32 + 32 + 4 + 4 + 4 + 4 + 4 + 1 + 1 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("There are not enough token to buy")]
    NotEnoughTokensAvailable,
    #[msg("You are providing a wrong seller mint")]
    WrongSellerMintProvided,
    #[msg("You are providing a wrong buyer mint")]
    WrongBuyerMintProvided,
    #[msg("You are providing a wrong token account where the Asset token is stored")]
    WrongTokenAccount,
    #[msg("You are trying to use an token that you don't own")]
    WrongTokenOwner,
    #[msg("There are still buyers with the token available for use")]
    BuyerWithTokenUnsed,
}
