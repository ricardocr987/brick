use {
    crate::state::*,
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
#[instruction(app_name: String)]
pub struct CreateApp<'info> {
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = App::SIZE,
        seeds = [
            b"app".as_ref(),
            app_name.as_bytes(),
        ],
        bump,
    )]
    pub app: Account<'info, App>,
}

pub fn handler<'info>(
    ctx: Context<CreateApp>,
    app_name: String,
    fee_basis_points: u16,
) -> Result<()> {
    if fee_basis_points > 10000 {
        return Err(ErrorCode::IncorrectFee.into());
    }

    (*ctx.accounts.app).authority = ctx.accounts.authority.key();
    (*ctx.accounts.app).fee_basis_points = fee_basis_points;
    (*ctx.accounts.app).bump = *ctx.bumps.get("app").unwrap();
    (*ctx.accounts.app).app_name = app_name.clone();
    
    Ok(())
}
