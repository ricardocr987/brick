/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as splToken from '@solana/spl-token'
import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'

/**
 * @category Instructions
 * @category WithdrawFunds
 * @category generated
 */
export const withdrawFundsStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'WithdrawFundsInstructionArgs',
)
/**
 * Accounts required by the _withdrawFunds_ instruction
 *
 * @property [_writable_, **signer**] authority
 * @property [] app
 * @property [_writable_] appCreatorVault
 * @property [_writable_] token
 * @property [_writable_] tokenMint
 * @property [_writable_] receiverVault
 * @property [_writable_] buyer
 * @property [_writable_] payment
 * @property [_writable_] paymentVault
 * @category Instructions
 * @category WithdrawFunds
 * @category generated
 */
export type WithdrawFundsInstructionAccounts = {
  tokenProgram?: web3.PublicKey
  authority: web3.PublicKey
  app: web3.PublicKey
  appCreatorVault: web3.PublicKey
  token: web3.PublicKey
  tokenMint: web3.PublicKey
  receiverVault: web3.PublicKey
  buyer: web3.PublicKey
  payment: web3.PublicKey
  paymentVault: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const withdrawFundsInstructionDiscriminator = [
  241, 36, 29, 111, 208, 31, 104, 217,
]

/**
 * Creates a _WithdrawFunds_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category WithdrawFunds
 * @category generated
 */
export function createWithdrawFundsInstruction(
  accounts: WithdrawFundsInstructionAccounts,
  programId = new web3.PublicKey(
    'BrickarF2QeREBZsapbhgYPHJi5FYkJVnx7mZhxETCt5',
  ),
) {
  const [data] = withdrawFundsStruct.serialize({
    instructionDiscriminator: withdrawFundsInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.authority,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.app,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.appCreatorVault,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.token,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenMint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.receiverVault,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.buyer,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.payment,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.paymentVault,
      isWritable: true,
      isSigner: false,
    },
  ]

  if (accounts.anchorRemainingAccounts != null) {
    for (const acc of accounts.anchorRemainingAccounts) {
      keys.push(acc)
    }
  }

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  })
  return ix
}
