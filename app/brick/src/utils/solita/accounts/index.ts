export * from './App'
export * from './Payment'
export * from './TokenMetadata'

import { App, appBeet, appDiscriminator } from './App'
import { Payment, paymentBeet, paymentDiscriminator } from './Payment'
import { TokenMetadata, tokenMetadataBeet, tokenMetadataDiscriminator } from './TokenMetadata'

export const accountProviders = { App, Payment, TokenMetadata }
export enum AccountType {
    App = 'App',
    Payment = 'Payment',
    TokenMetadata = 'TokenMetadata',
  }
export const ACCOUNTS_DATA_LAYOUT: Record<AccountType, any> = {
    [AccountType.App]: appBeet,
    [AccountType.Payment]: paymentBeet,
    [AccountType.TokenMetadata]: tokenMetadataBeet,
}
  
export const ACCOUNT_DISCRIMINATOR: Record<AccountType, Buffer> = {
  [AccountType.App]: Buffer.from(appDiscriminator),
  [AccountType.Payment]: Buffer.from(paymentDiscriminator),
  [AccountType.TokenMetadata]: Buffer.from(tokenMetadataDiscriminator),
}