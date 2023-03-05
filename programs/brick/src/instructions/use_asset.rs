use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::{
        prelude::*,
        system_program::System,
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{ burn, Burn, Mint, Token, TokenAccount },
    }
};

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
            asset.asset_mint.as_ref(),
        ],
        bump = asset.bump,
    )]
    pub asset: Account<'info, Asset>,
    #[account(
        mut,
        seeds = [
            b"asset_mint".as_ref(),
            asset.hash_id.as_ref(),
        ],
        bump = asset.mint_bump,
        constraint = buyer_minted_token_vault.mint == asset_mint.key() @ ErrorCode::IncorrectBuyerTokenAccountToStorePurchasedToken
    )]
    pub asset_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = buyer_minted_token_vault.owner == authority.key() @ ErrorCode::IncorrectBuyerTokenAccountToStorePurchasedToken
    )]
    pub buyer_minted_token_vault: Box<Account<'info, TokenAccount>>,
    /*#[account(
        mut,
        constraint = seller_vault.mint == asset.accepted_mint && seller_vault.owner == payment.seller
    )]
    pub seller_vault: Account<'info, TokenAccount>, // seller token account, receives the funds stored in the payment vault
    #[account(
        mut,
        seeds = [
            b"payment".as_ref(),
            asset_mint.key().as_ref(),
            payment.buyer.as_ref(),
            payment.payment_timestamp.to_le_bytes().as_ref(),
        ],
        bump = payment.bump,
        constraint = authority.key() == payment.buyer, // will be better checked in the handler
        close = authority,
    )]
    pub payment: Box<Account<'info, Payment>>,
    #[account(
        mut,
        seeds = [
            b"payment_vault".as_ref(),
            payment.key().as_ref(),
        ],
        bump = payment.bump_vault,
        constraint = payment_vault.owner == payment.key() && payment_vault.mint == asset.accepted_mint.key()
    )]
    pub payment_vault: Box<Account<'info, TokenAccount>>,*/
}

pub fn handler<'info>(ctx: Context<UseAsset>, exemplars: u32) -> Result<()> {
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

    /*

    it is a disaster to send the funds to the seller when the buyer burns the token, because it can 
    happen that he has bought twice the same token (different txns), then there are two payments accounts 
    with the necessary information to execute that transfer (simplified example). parameterizing the 
    exemplars at the instruction level in this case is annoying, but I think it is better to keep that 
    and make the seller wait the established time to withdraw the funds

    let payment_timestamp = ctx.accounts.payment.payment_timestamp.to_le_bytes();
    let seeds = &[
        b"payment".as_ref(),
        ctx.accounts.payment.asset_mint.as_ref(),
        ctx.accounts.payment.buyer.as_ref(),
        payment_timestamp.as_ref(),
        &[ctx.accounts.payment.bump],
    ];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payment_vault.to_account_info(),
                to: ctx.accounts.seller_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
            &[&seeds[..]],
        ),
        ctx.accounts.payment.amount,
    )?;

    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            CloseAccount {
                account: ctx.accounts.payment_vault.to_account_info(),
                destination: ctx.accounts.authority.to_account_info(),
                authority: ctx.accounts.payment.to_account_info(),
            }, 
            &[&seeds[..]],
        )
    )?;
    
    */

    Ok(())
}