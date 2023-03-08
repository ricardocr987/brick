use {
    crate::state::*,
    crate::utils::*,
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
#[instruction(off_chain_id: String)]
pub struct CreateToken<'info> {
    /// CHECK: contraint added to force using actual metaplex metadata program
    #[account(address = mpl_metadata_program, executable)]
    pub metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [
            b"app".as_ref(),
            app.app_name.as_bytes()
            // initially the off_chain_id was used as a seed in the token account and in the mint was used the token key
            // makes more sense like this as explained below
        ],
        bump = app.bump,
    )]
    pub app: Account<'info, App>,
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = token,
        seeds = [
            b"token_mint".as_ref(),
            off_chain_id.as_ref()
            // initially the off_chain_id was used as a seed in the token account and in the mint was used the token key
            // makes more sense like this as explained below
        ],
        bump,
    )]
    pub token_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = TokenMetadata::SIZE,
        seeds = [
            b"token".as_ref(),
            token_mint.key().as_ref() 
            // this is set to be able to discriminate between tokens of this program and others
            // ie: if a pda with this seeds is found (mint), means that this token was created with this program
        ],
        bump,
    )]
    pub token: Box<Account<'info, TokenMetadata>>,
    pub accepted_mint: Account<'info, Mint>,
    /// CHECK: this will be verified by token metadata program
    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            metadata_program.key().as_ref(),
            token_mint.key().as_ref(),
        ],
        bump,
        seeds::program = metadata_program.key()
    )]
    pub token_metadata: UncheckedAccount<'info>,
}

pub fn handler<'info>(
    ctx: Context<CreateToken>,
    off_chain_id: String, // only this part is used as seed
    off_chain_id2: String, // 64 bytes id is what ipfs uses, becuase 32 bytes seeds limit 
    // i'm forced to do this, splitting it in the client and joining it here
    off_chain_metadata: String,
    refund_timespan: u64,
    token_price: u32,
    exemplars: i32,
    token_name: String,
    token_symbol: String,
    token_uri: String,
) -> Result<()> {
    let metadata_data = get_64_bytes_from_string(off_chain_metadata)?;
    let id2_data = get_32_bytes_from_string(off_chain_id2)?;
    (*ctx.accounts.token).off_chain_metadata = metadata_data;
    (*ctx.accounts.token).app = ctx.accounts.app.key();
    (*ctx.accounts.token).token_mint = ctx.accounts.token_mint.key();
    (*ctx.accounts.token).authority = ctx.accounts.authority.key();
    (*ctx.accounts.token).seller_config = SellerConfig {
        refund_timespan,
        price: token_price,
        accepted_mint: ctx.accounts.accepted_mint.key(),
        exemplars,
    };
    (*ctx.accounts.token).transactions_info = TransactionsInfo {
        sold: 0,
        used: 0,
        shared: 0,
        refunded: 0,
    };
    (*ctx.accounts.token).bumps = Bumps {
        bump: *ctx.bumps.get("token").unwrap(),
        mint_bump: *ctx.bumps.get("token_mint").unwrap(),
        metadata_bump: *ctx.bumps.get("token_metadata").unwrap(),
    };
    (*ctx.accounts.token).off_chain_id2 = id2_data;
    (*ctx.accounts.token).off_chain_id = off_chain_id;

    let seeds = &[
        b"token".as_ref(),
        ctx.accounts.token.token_mint.as_ref(),
        &[ctx.accounts.token.bumps.bump],
    ];

    //This instruction creates and initializes a new Metadata account for a given Mint account
    solana_program::program::invoke_signed(
        &create_metadata_accounts_v3(
            //args:
            mpl_metadata_program, //program_id
            (*ctx.accounts.token_metadata).key(), //metadata_account
            ctx.accounts.token_mint.key(), //mint
            ctx.accounts.token.key(), //mint_authority
            (*ctx.accounts.authority).key(), //payer
            ctx.accounts.token.key(), //update_authority
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
            ctx.accounts.token_mint.to_account_info().clone(), //mint
            ctx.accounts.token.to_account_info().clone(), //mint_authority
            ctx.accounts.authority.to_account_info().clone(), //payer
            ctx.accounts.token.to_account_info().clone(), //update_authority
        ],
        &[&seeds[..]],
    )?;

    Ok(())
}
