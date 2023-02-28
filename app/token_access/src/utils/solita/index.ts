import { AccountMeta, PublicKey } from '@solana/web3.js'
export * from './accounts/index'
export * from './instructions/index'
export * from './instructions'
export * from './accounts'

import { Asset, AssetArgs } from './accounts/index'

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
  'assetMint',
  'asset',
  'acceptedMint',
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

export type ShareAssetInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const ShareAssetAccounts = [
  'systemProgram',
  'tokenProgram',
  'associatedTokenProgram',
  'rent',
  'authority',
  'asset',
  'assetMint',
  'receiverMintedTokenVault',
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
  | ShareAssetInstruction
  | UseAssetInstruction
  | DeleteAssetInstruction
export type ParsedAccounts = Asset

export type ParsedAccountsData = AssetArgs
