use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("Refund time has consumed")]
    TimeForRefundHasConsumed,
    #[msg("You cannot withdraw these funds yet")]
    CannotWithdrawYet,
    #[msg("There are not enough tokens to buy")]
    NotEnoughTokensAvailable,
    #[msg("There are still users with a token available for use")]
    UsersStillHoldUnusedTokens,
    #[msg("You are trying to pay a different mint than the one stated by the seller")]
    IncorrectPaymentToken,
    #[msg("You are providing a wrong buyer token account, is where the funds come from to pay")]
    IncorrectBuyerTokenAccountOnTransfer,
    #[msg("You are providing a wrong buyer token account, is where the access token will be received")]
    IncorrectBuyerTokenAccountToStorePurchasedToken,
    #[msg("You are not the owner of this asset account")]
    IncorrectAssetAuthority,
    #[msg("You are not the owner of this payment account")]
    IncorrectPaymentAuthority,
    #[msg("You are providing a worng payment vault")]
    IncorrectPaymentVault,
    #[msg("You are providing an incorrect token account")]
    IncorrectReceiverTokenAccount,
}