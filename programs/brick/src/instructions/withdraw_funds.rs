use {
    crate::state::*,
    crate::utils::get_withdraw_amounts,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
    anchor_spl::token::{ close_account, transfer, Mint, Token, TokenAccount, Transfer, CloseAccount },
};

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    pub token_program: Program<'info, Token>,
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
        constraint = app.key() == token.app
    )]
    pub app: Account<'info, App>,
    #[account(
        mut,
        constraint = app_creator_vault.mint == token.seller_config.accepted_mint @ ErrorCode::IncorrectReceiverTokenAccount
    )]
    pub app_creator_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [
            b"token".as_ref(),
            token.token_mint.as_ref(),
        ],
        bump = token.bumps.bump
    )]
    pub token: Box<Account<'info, TokenMetadata>>,
    #[account(
        mut,
        seeds = [
            b"token_mint".as_ref(),
            token.off_chain_id.as_ref(),
        ],
        bump = token.bumps.mint_bump
    )]
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = receiver_vault.mint == token.seller_config.accepted_mint @ ErrorCode::IncorrectReceiverTokenAccount
    )]
    pub receiver_vault: Account<'info, TokenAccount>,
    /// CHECK: there is a constraint that confirms if this account is the buyer account
    #[account(
        mut, 
        constraint = payment.buyer == buyer.key()
    )]
    pub buyer: AccountInfo<'info>, // only is used to get the rent from closing payment account (cant use payment.buyer)
    // (either authority because signer could be also the seller, this account switch authority in certain conditions, see logic)
    #[account(
        mut,
        seeds = [
            b"payment".as_ref(),
            token_mint.key().as_ref(),
            payment.buyer.as_ref(),
            payment.payment_timestamp.to_le_bytes().as_ref(),
        ],
        bump = payment.bump,
        constraint = authority.key() == payment.seller @ ErrorCode::IncorrectPaymentAuthority,
        close = buyer,
    )]
    pub payment: Account<'info, Payment>,
    #[account(
        mut,
        seeds = [
            b"payment_vault".as_ref(),
            payment.key().as_ref(),
        ],
        bump = payment.bump_vault,
        constraint = payment_vault.owner == payment.key() && payment_vault.mint == token.seller_config.accepted_mint.key() @ ErrorCode::IncorrectPaymentVault,
    )]
    pub payment_vault: Box<Account<'info, TokenAccount>>,
}

pub fn handler<'info>(ctx: Context<WithdrawFunds>) -> Result<()> {
    let clock = Clock::get()?;

    if ctx.accounts.payment.refund_consumed_at > clock.unix_timestamp as u64 {
        return Err(ErrorCode::CannotWithdrawYet.into());
    }
    
    let payment_timestamp = ctx.accounts.payment.payment_timestamp.to_le_bytes();
    let seeds = &[
        b"payment".as_ref(),
        ctx.accounts.payment.token_mint.as_ref(),
        ctx.accounts.payment.buyer.as_ref(),
        payment_timestamp.as_ref(),
        &[ctx.accounts.payment.bump],
    ];
    
    if ctx.accounts.app.fee_basis_points > 0 {
        let (total_fee, seller_amount) = get_withdraw_amounts(
            ctx.accounts.app.fee_basis_points, 
            ctx.accounts.payment.price
        )?;
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payment_vault.to_account_info(),
                    to: ctx.accounts.app_creator_vault.to_account_info(),
                    authority: ctx.accounts.payment.to_account_info(),
                },
                &[&seeds[..]],
            ),
            total_fee,
        )?;
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payment_vault.to_account_info(),
                    to: ctx.accounts.receiver_vault.to_account_info(),
                    authority: ctx.accounts.payment.to_account_info(),
                },
                &[&seeds[..]],
            ),
            seller_amount,
        )?;
    } else {
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payment_vault.to_account_info(),
                    to: ctx.accounts.receiver_vault.to_account_info(),
                    authority: ctx.accounts.payment.to_account_info(),
                },
                &[&seeds[..]],
            ),
            ctx.accounts.payment.price.into(),
        )?;
    }

    close_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            CloseAccount {
                account: ctx.accounts.payment_vault.to_account_info(),
                destination: ctx.accounts.buyer.to_account_info(),
                authority: ctx.accounts.payment.to_account_info(),
            }, 
            &[&seeds[..]],
        )
    )?;

    Ok(())
}