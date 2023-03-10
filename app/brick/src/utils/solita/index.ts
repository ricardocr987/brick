import { AccountMeta, PublicKey } from '@solana/web3.js'
export * from './accounts'
export * from './instructions'
export * from './events'

import {
  App,
  AppArgs,
  Payment,
  PaymentArgs,
  TokenMetadata,
  TokenMetadataArgs,
} from './accounts/index'
import { SellerConfig, TransactionsInfo, Bumps } from './types/index'

export type CreateAppInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const CreateAppAccounts = ['systemProgram', 'rent', 'authority', 'app']

export type CreateTokenInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const CreateTokenAccounts = [
  'metadataProgram',
  'systemProgram',
  'tokenProgram',
  'rent',
  'authority',
  'app',
  'tokenMint',
  'token',
  'acceptedMint',
  'tokenMetadata',
]

export type EditTokenPriceInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const EditTokenPriceAccounts = ['authority', 'token']

export type BuyTokenInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const BuyTokenAccounts = [
  'systemProgram',
  'tokenProgram',
  'associatedTokenProgram',
  'rent',
  'clock',
  'authority',
  'token',
  'tokenMint',
  'buyerTransferVault',
  'acceptedMint',
  'payment',
  'paymentVault',
  'buyerTokenVault',
]

export type ShareTokenInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const ShareTokenAccounts = [
  'systemProgram',
  'tokenProgram',
  'associatedTokenProgram',
  'rent',
  'authority',
  'token',
  'tokenMint',
  'receiverVault',
]

export type WithdrawFundsInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const WithdrawFundsAccounts = [
  'tokenProgram',
  'authority',
  'app',
  'appCreatorVault',
  'token',
  'tokenMint',
  'receiverVault',
  'buyer',
  'payment',
  'paymentVault',
]

export type RefundInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const RefundAccounts = [
  'tokenProgram',
  'authority',
  'token',
  'tokenMint',
  'receiverVault',
  'payment',
  'paymentVault',
  'buyerTokenVault',
]

export type UseTokenInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const UseTokenAccounts = [
  'systemProgram',
  'tokenProgram',
  'associatedTokenProgram',
  'rent',
  'authority',
  'token',
  'tokenMint',
  'buyerTokenVault',
]

export type DeletetokenInstruction = {
  programId: PublicKey
  keys: AccountMeta[]
  data: Buffer
}

export const DeletetokenAccounts = ['authority', 'token']

export type ParsedInstructions =
  | CreateAppInstruction
  | CreateTokenInstruction
  | EditTokenPriceInstruction
  | BuyTokenInstruction
  | ShareTokenInstruction
  | WithdrawFundsInstruction
  | RefundInstruction
  | UseTokenInstruction
  | DeletetokenInstruction
export type ParsedAccounts = App | Payment | TokenMetadata

export type ParsedAccountsData = AppArgs | PaymentArgs | TokenMetadataArgs

export type ParsedTypes = SellerConfig | TransactionsInfo | Bumps
