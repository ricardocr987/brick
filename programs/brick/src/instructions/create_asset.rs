use {
    crate::state::*,
    mpl_token_metadata::{
        ID as mpl_metadata_program,
        instruction::create_metadata_accounts_v3,
    },
    anchor_spl::token::{ Mint, Token },
    anchor_lang::{
        prelude::*,
        solana_program::{
            account_info::AccountInfo,
        },
        system_program::System,
    },
};

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
        mint::decimals = 0,
        mint::authority = asset,
        seeds = [
            b"asset_mint".as_ref(),
            hash_id.as_ref(), 
            // initially the hash_id was used as a seed in the asset account and in the mint was used the asset key
            // makes more sense like this as explained below
        ],
        bump,
    )]
    pub asset_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = Asset::SIZE,
        seeds = [
            b"asset".as_ref(),
            asset_mint.key().as_ref() 
            // this is set to be able to discriminate between tokens of this program and others
            // ie: if a pda with this seeds is found (mint), means that this token was created with this program
        ],
        bump,
    )]
    pub asset: Account<'info, Asset>,
    pub accepted_mint: Account<'info, Mint>,
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

pub fn handler<'info>(
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
    (*ctx.accounts.asset).app_name = app_name.clone();
    (*ctx.accounts.asset).hash_id = hash_id.clone();
    (*ctx.accounts.asset).item_hash = item_hash.clone();
    (*ctx.accounts.asset).accepted_mint = ctx.accounts.accepted_mint.key();
    (*ctx.accounts.asset).asset_mint = ctx.accounts.asset_mint.key();
    (*ctx.accounts.asset).authority = ctx.accounts.authority.key();
    (*ctx.accounts.asset).timestamp_funds_vault = timestamp_funds_vault;
    (*ctx.accounts.asset).price = token_price;
    (*ctx.accounts.asset).sold = 0;
    (*ctx.accounts.asset).used = 0;
    (*ctx.accounts.asset).refunded = 0;
    (*ctx.accounts.asset).exemplars = exemplars;
    (*ctx.accounts.asset).quantity_per_exemplars = quantity_per_exemplars;
    (*ctx.accounts.asset).bump = *ctx.bumps.get("asset").unwrap();
    (*ctx.accounts.asset).mint_bump = *ctx.bumps.get("asset_mint").unwrap();
    (*ctx.accounts.asset).metadata_bump = *ctx.bumps.get("token_metadata").unwrap();
    
    let seeds = &[
        b"asset".as_ref(),
        ctx.accounts.asset.asset_mint.as_ref(),
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
