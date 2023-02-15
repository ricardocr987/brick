// based on: https://github.com/danmt/create-mint-and-metadata-on-chain
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{burn, mint_to, transfer, Burn, Mint, MintTo, Token, TokenAccount, Transfer},
};

declare_id!("AxDTdwnYddq8jZB2Xouons961sv3sHSRHZuvGDuoVU2G");

#[program]
pub mod fishplace {
    use super::*;

    pub fn create_data_set(ctx: Context<CreateDataSet>, title: String) -> Result<()> {
        (*ctx.accounts.data_set).title = title.clone();
        (*ctx.accounts.data_set).mint = ctx.accounts.mint.key();
        (*ctx.accounts.data_set).authority = ctx.accounts.authority.key();
        (*ctx.accounts.data_set).bump = *ctx.bumps.get("data_set").unwrap();

        Ok(())
    }

    pub fn create_master_edition(
        ctx: Context<CreateMasterEdition>,
        master_edition_name: String,
        master_edition_symbol: String,
        master_edition_uri: String,
        master_edition_price: u32,
        master_edition_quantity: u32,
    ) -> Result<()> {
        (*ctx.accounts.master_edition).price = master_edition_price;
        (*ctx.accounts.master_edition).quantity = master_edition_quantity; //-1 if unlimited, needs to be used in constraints
        (*ctx.accounts.master_edition).sold = 0;// if master_edition.quantity != -1, needs to be in a constraint (in other ix
        (*ctx.accounts.master_edition).used = 0;// if master_edition.quantity != -1, needs to be in a constraint (in other ix)
        (*ctx.accounts.master_edition).bump = *ctx.bumps.get("master_edition").unwrap();
        (*ctx.accounts.master_edition).mint_bump = *ctx.bumps.get("master_edition_mint").unwrap();
        (*ctx.accounts.master_edition).metadata_bump = *ctx.bumps.get("master_edition_metadata").unwrap();

        let seeds = &[
            b"data_set".as_ref(),
            ctx.accounts.data_set_base.to_account_info().key.as_ref(),
            &[ctx.accounts.data_set.bump],
        ];

        //This instruction creates and initializes a new Metadata account for a given Mint account
        solana_program::program::invoke_signed(
            &mpl_token_metadata::instruction::create_metadata_accounts_v3(
                //args:
                mpl_token_metadata::ID, //program_id
                (*ctx.accounts.master_edition_metadata).key(), //metadata_account
                ctx.accounts.master_edition_mint.key(), //mint
                ctx.accounts.data_set.key(), //mint_authority
                (*ctx.accounts.authority).key(), //payer
                ctx.accounts.data_set.key(), //update_authority
                master_edition_name,
                master_edition_symbol,
                master_edition_uri,
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
                ctx.accounts.master_edition_metadata.to_account_info().clone(), //metadata
                ctx.accounts.master_edition_mint.to_account_info().clone(), //mint
                ctx.accounts.data_set.to_account_info().clone(), //mint_authority
                ctx.accounts.authority.to_account_info().clone(), //payer
                ctx.accounts.data_set.to_account_info().clone(), //update_authority
            ],
            &[&seeds[..]],
        )?;

        Ok(())
    }

    pub fn buy_data_set(ctx: Context<BuyDataSet>) -> Result<()> {
        (*ctx.accounts.master_edition).sold += 1;

        let seeds = &[
            b"data_set".as_ref(),
            ctx.accounts.data_set_base.to_account_info().key.as_ref(),
            &[ctx.accounts.data_set.bump],
        ];

        // call transfer from authority (buyer) to dataset authority (seller)
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_vault.to_account_info(),
                    to: ctx.accounts.seller_vault.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            ctx.accounts
                .master_edition
                .price
                .checked_mul(1)
                .unwrap()
                .into(),
        )?;

        // call mintTo instruction
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.master_edition_mint.to_account_info(),
                    to: ctx.accounts.master_edition_vault.to_account_info(),
                    authority: ctx.accounts.data_set.to_account_info(),
                },
                &[&seeds[..]],
            ),
            1, // quantity
        )?;

        Ok(())
    }

    pub fn use_data_set(ctx: Context<UseDataSet>) -> Result<()> {
        (*ctx.accounts.master_edition).used += 1;

        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    authority: ctx.accounts.authority.to_account_info(),
                    from: ctx.accounts.master_edition_vault.to_account_info(),
                    mint: ctx.accounts.master_edition_mint.to_account_info(),
                },
            ),
            1, // quantity
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateDataSet<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: This is used only for generating the PDA. As we need to create multiple datasets accounts, we need another key apart from b"data_set".as_ref(), ie: it is a random address to create multiple PDAs
    pub data_set_base: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = DataSet::SIZE,
        seeds = [
            b"data_set".as_ref(),
            data_set_base.key().as_ref(),
        ],
        bump
    )]
    pub data_set: Account<'info, DataSet>,
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct CreateMasterEdition<'info> {
    /// CHECK: This needs a contraint to be safe
    pub metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: This is used only for generating the PDA.
    pub data_set_base: UncheckedAccount<'info>,
    #[account(
        seeds = [
            b"data_set".as_ref(),
            data_set_base.key().as_ref(),
        ], 
        bump = data_set.bump
    )]
    pub data_set: Account<'info, DataSet>,
    #[account(
        init,
        payer = authority,
        space = MasterEdition::SIZE,
        seeds = [
            b"master_edition".as_ref(),
            data_set.key().as_ref(),
        ],
        bump,
    )]
    pub master_edition: Account<'info, MasterEdition>,
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = data_set,
        seeds = [
            b"master_edition_mint".as_ref(),
            data_set.key().as_ref(),
            master_edition.key().as_ref(),
        ],
        bump,
    )]
    pub master_edition_mint: Account<'info, Mint>,
    /// CHECK: this will be verified by token metadata program
    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            metadata_program.key().as_ref(),
            master_edition_mint.key().as_ref(),
        ],
        bump,
        seeds::program = metadata_program.key()
    )]
    pub master_edition_metadata: UncheckedAccount<'info>,
}

#[derive(Accounts)]
//#[instruction(quantity: u32)]
pub struct BuyDataSet<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: This is used only for generating the PDA.
    pub data_set_base: UncheckedAccount<'info>,
    #[account(
        seeds = [
            b"data_set".as_ref(),
            data_set_base.key().as_ref(),
        ],
        bump = data_set.bump
    )]
    pub data_set: Account<'info, DataSet>,
    #[account(
        mut,
        seeds = [
            b"master_edition".as_ref(),
            data_set.key().as_ref(),
        ],
        bump = master_edition.bump,
        //constraint = master_edition.quantity >= master_edition.sold + quantity @ ErrorCode::NotEnoughMintsAvailable
    )]
    pub master_edition: Account<'info, MasterEdition>,
    #[account(
        mut,
        constraint = buyer_vault.mint == data_set.mint
    )]
    pub buyer_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = seller_vault.mint == data_set.mint
    )]
    pub seller_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [
            b"master_edition_mint".as_ref(),
            data_set.key().as_ref(),
            master_edition.key().as_ref(),
        ],
        bump = master_edition.mint_bump
    )]
    pub master_edition_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = master_edition_vault.mint == master_edition_mint.key()
    )]
    pub master_edition_vault: Box<Account<'info, TokenAccount>>, // buyer token account
}

#[derive(Accounts)]
//#[instruction(quantity: u32)]
pub struct UseDataSet<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: This is used only for generating the PDA.
    pub data_set_base: UncheckedAccount<'info>,
    #[account(
        seeds = [
            b"data_set".as_ref(),
            data_set_base.key().as_ref(),
        ],
        bump = data_set.bump
    )]
    pub data_set: Account<'info, DataSet>,
    #[account(
        mut,
        seeds = [
            b"master_edition".as_ref(),
            data_set.key().as_ref(),
        ],
        bump = master_edition.bump,
        //constraint = master_edition.sold - master_edition.used >= quantity @ ErrorCode::NotEnoughTicketsToCheckIn
    )]
    pub master_edition: Account<'info, MasterEdition>,
    #[account(
        mut,
        seeds = [
            b"master_edition_mint".as_ref(),
            data_set.key().as_ref(),
            master_edition.key().as_ref(),
        ],
        bump = master_edition.mint_bump,
    )]
    pub master_edition_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = master_edition_vault.mint == master_edition_mint.key()
    )]
    pub master_edition_vault: Box<Account<'info, TokenAccount>>,
}

#[account]
pub struct DataSet {
    pub title: String,
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
}

impl DataSet {
    pub const SIZE: usize = 8 + 36 + 32 + 32 + 1 + 1;
}

#[account]
pub struct MasterEdition {
    pub price: u32,
    pub quantity: u32,
    pub sold: u32,
    pub used: u32,
    pub bump: u8,
    pub mint_bump: u8,
    pub metadata_bump: u8,
}

impl MasterEdition {
    pub const SIZE: usize = 8 + 4 + 4 + 4 + 4 + 1 + 1 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("This NFT is already used")]
    NFTAlreadyUsed,
    #[msg("There are not enough NFTs to buyv.")]
    NotEnoughMintsAvailable
}


/* Another way to mint NFTs from the master edition (would replace the cpi made to the mint ix of the token_program in buy_data_set ix):
    //Given a Masted Edition, this instruction creates a new Edition derived from a new Mint account.
    solana_program::program::invoke_signed(
        &mpl_token_metadata::instruction::mint_new_edition_from_master_edition_via_token(
            //args:
            mpl_token_metadata::ID, //program_id
            (*ctx.accounts.new_metadata).key(), //edition metadata
            *ctx.accounts.new_edition.key(), //edition
            ctx.accounts.master_edition.key(), //master_edition NFT
            ctx.accounts.master_edition_mint.key(), //mint
            ctx.accounts.data_set.key(), //mint_authority
            (*ctx.accounts.authority).key(), //payer
            ctx.accounts.token_account_owner.key(), 
            ctx.accounts.token_account.key(), 
            ctx.accounts.new_metadata_update_authority.key(), 
            ctx.accounts.metadata.key(), 
            ctx.accounts.metadata_mint.key(), 
            edition,
        ),
        //accounts context:
        &[
            ctx.accounts.new_metadata.to_account_info().clone(), //"New Metadata key (pda of ['metadata', program id, mint id])"
            ctx.accounts.new_edition.to_account_info().clone(), //"New Edition (pda of ['metadata', program id, mint id, 'edition'])"
            ctx.accounts.master_edition.to_account_info().clone(), //"Master Record Edition V2 (pda of ['metadata', program id, master metadata mint id, 'edition'])"
            ctx.accounts.new_mint.to_account_info().clone(), //"Mint of new token - THIS WILL TRANSFER AUTHORITY AWAY FROM THIS KEY"
            ctx.accounts.edition_mark_pda.to_account_info().clone(), //"Edition pda to mark creation - will be checked for pre-existence. (pda of ['metadata', program id, 
                                                                    //master metadata mint id, 'edition', edition_number]) where edition_number is NOT the edition number 
                                                                    //you pass in args but actually edition_number = floor(edition/EDITION_MARKER_BIT_SIZE)."
            ctx.accounts.new_mint_authority.to_account_info().clone(), //newMintAuthority
            ctx.accounts.authority.to_account_info().clone(), //payer
            ctx.accounts.data_set.to_account_info().clone(), //owner of token account containing master token
            ctx.accounts.master_edition_token_account.to_account_info().clone(), //"token account containing token from master metadata mint"
            ctx.accounts.data_set.to_account_info().clone(), //Update authority info for new metadata
            ctx.accounts.master_edition_metadata.to_account_info().clone(),
        ],
        &[&seeds[..]],
    )?;
*/