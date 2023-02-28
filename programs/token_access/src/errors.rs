use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("There are not enough tokens to buy")]
    NotEnoughTokensAvailable,
    #[msg("You are providing a wrong seller mint")]
    WrongSellerMintProvided,
    #[msg("You are providing a wrong buyer mint")]
    WrongBuyerMintProvided,
    #[msg("You are providing a wrong token account where the Asset token is stored")]
    WrongTokenAccount,
    #[msg("You are trying to use an token that you don't own")]
    WrongTokenOwner,
    #[msg("There are still users with the token available for use")]
    UnusedTokenExists,
    #[msg("You are not the owner of this asset")]
    WrongAssetAuthority
}