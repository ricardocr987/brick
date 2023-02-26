export * from './accounts/index.js'
export * from './instructions/index.js'

import { AccountMeta, PublicKey } from '@solana/web3.js'
import { Asset, AssetArgs } from './accounts/index.js'

export type CreateAssetInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const CreateAssetAccounts = [
  'metadataProgram',
  'systemProgram',
  'tokenProgram',
  'rent',
  'authority',
  'asset',
  'acceptedMint',
  'assetMint',
  'tokenMetadata',
]

export type EditAssetPriceInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const EditAssetPriceAccounts = ['authority', 'asset']

export type BuyAssetInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const BuyAssetAccounts = [
  'systemProgram',
  'tokenProgram',
  'associatedTokenProgram',
  'rent',
  'authority',
  'asset',
  'buyerTransferVault',
  'sellerTransferVault',
  'assetMint',
  'buyerMintedTokenVault',
]

export type UseAssetInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const UseAssetAccounts = [
  'systemProgram',
  'tokenProgram',
  'associatedTokenProgram',
  'rent',
  'authority',
  'asset',
  'assetMint',
  'buyerMintedTokenVault',
]

export type DeleteAssetInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const DeleteAssetAccounts = ['authority', 'asset']

export type ParsedInstructions =
  | CreateAssetInstruction
  | EditAssetPriceInstruction
  | BuyAssetInstruction
  | UseAssetInstruction
  | DeleteAssetInstruction

export type ParsedAccounts = Asset

export type ParsedAccountsData = AssetArgs
