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
 * @category UseToken
 * @category generated
 */
export const useTokenStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'UseTokenInstructionArgs',
)
/**
 * Accounts required by the _useToken_ instruction
 *
 * @property [] associatedTokenProgram
 * @property [_writable_, **signer**] authority
 * @property [_writable_] token
 * @property [_writable_] tokenMint
 * @property [_writable_] buyerTokenVault
 * @category Instructions
 * @category UseToken
 * @category generated
 */
export type UseTokenInstructionAccounts = {
  systemProgram?: web3.PublicKey
  tokenProgram?: web3.PublicKey
  associatedTokenProgram: web3.PublicKey
  rent?: web3.PublicKey
  authority: web3.PublicKey
  token: web3.PublicKey
  tokenMint: web3.PublicKey
  buyerTokenVault: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const useTokenInstructionDiscriminator = [
  149, 40, 199, 254, 83, 150, 43, 26,
]

/**
 * Creates a _UseToken_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category UseToken
 * @category generated
 */
export function createUseTokenInstruction(
  accounts: UseTokenInstructionAccounts,
  programId = new web3.PublicKey(
    'BrickarF2QeREBZsapbhgYPHJi5FYkJVnx7mZhxETCt5',
  ),
) {
  const [data] = useTokenStruct.serialize({
    instructionDiscriminator: useTokenInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.associatedTokenProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.rent ?? web3.SYSVAR_RENT_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.authority,
      isWritable: true,
      isSigner: true,
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
      pubkey: accounts.buyerTokenVault,
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