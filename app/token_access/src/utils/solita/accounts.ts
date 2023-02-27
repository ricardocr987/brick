import { assetDiscriminator, assetBeet } from './index.js'

export enum AccountType {
  Asset = 'Asset',
}

export const ACCOUNT_DISCRIMINATOR: Record<AccountType, Buffer> = {
  [AccountType.Asset]: Buffer.from(assetDiscriminator),
}

export const ACCOUNTS_DATA_LAYOUT: Record<AccountType, any> = {
  [AccountType.Asset]: assetBeet,
}
