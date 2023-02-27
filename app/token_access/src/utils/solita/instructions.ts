import * as solita from './index.js'

export type EventBase = {
  id: string;
  timestamp: number;
  type: InstructionType;
  account: string;
}

export enum InstructionType {
  CreateAsset = 'CreateAssetEvent',
  EditAssetPrice = 'EditAssetPriceEvent',
  BuyAsset = 'BuyAssetEvent',
  ShareAsset = 'ShareAssetEvent',
  UseAsset = 'UseAssetEvent',
  DeleteAsset = 'DeleteAssetEvent',
}

export type InstructionBase = EventBase & {
  programId: string
  signer: string
  account: string
}

/*-----------------------* CUSTOM EVENTS TYPES *-----------------------*/

export type CreateAssetEventData = {
  hashId: string
  appName: string
  itemHash: string
  tokenPrice: number
  exemplars: number
  quantityPerExemplars: number
  tokenName: string
  tokenSymbol: string
  tokenUri: string
}

export type CreateAssetInfo = {
  data: CreateAssetEventData
  accounts: solita.CreateAssetInstructionAccounts
}

export type CreateAssetEvent = InstructionBase &
  CreateAssetInfo & {
    type: InstructionType.CreateAsset
  }

/*----------------------------------------------------------------------*/

export type EditAssetPriceEventData = {
  tokenPrice: number
}

export type EditAssetPriceInfo = {
  data: EditAssetPriceEventData
  accounts: solita.EditAssetPriceInstructionAccounts
}

export type EditAssetPriceEvent = InstructionBase &
  EditAssetPriceInfo & {
    type: InstructionType.EditAssetPrice
  }

/*----------------------------------------------------------------------*/

export type BuyAssetEventData = {
  exemplars: number
}

export type BuyAssetInfo = {
  data: BuyAssetEventData
  accounts: solita.BuyAssetInstructionAccounts
}

export type BuyAssetEvent = InstructionBase &
  BuyAssetInfo & {
    type: InstructionType.BuyAsset
  }

/*----------------------------------------------------------------------*/

export type ShareAssetEventData = {
  exemplars: number
}

export type ShareAssetInfo = {
  data: ShareAssetEventData
  accounts: solita.ShareAssetInstructionAccounts
}

export type ShareAssetEvent = InstructionBase &
  ShareAssetInfo & {
    type: InstructionType.ShareAsset
  }

/*----------------------------------------------------------------------*/

export type UseAssetEventData = {
  exemplars: number
}

export type UseAssetInfo = {
  data: UseAssetEventData
  accounts: solita.UseAssetInstructionAccounts
}

export type UseAssetEvent = InstructionBase &
  UseAssetInfo & {
    type: InstructionType.UseAsset
  }

/*----------------------------------------------------------------------*/

export type DeleteAssetInfo = {
  accounts: solita.DeleteAssetInstructionAccounts
}

export type DeleteAssetEvent = InstructionBase &
  DeleteAssetInfo & {
    type: InstructionType.DeleteAsset
  }

/*----------------------------------------------------------------------*/

export function getInstructionType(data: Buffer): InstructionType | undefined {
  const discriminator = data.slice(0, 8)
  return IX_METHOD_CODE.get(discriminator.toString('ascii'))
}

export const IX_METHOD_CODE: Map<string, InstructionType | undefined> = new Map<
  string,
  InstructionType | undefined
>([
  [
    Buffer.from(solita.createAssetInstructionDiscriminator).toString('ascii'),
    InstructionType.CreateAsset,
  ],
  [
    Buffer.from(solita.editAssetPriceInstructionDiscriminator).toString(
      'ascii',
    ),
    InstructionType.EditAssetPrice,
  ],
  [
    Buffer.from(solita.buyAssetInstructionDiscriminator).toString('ascii'),
    InstructionType.BuyAsset,
  ],
  [
    Buffer.from(solita.shareAssetInstructionDiscriminator).toString('ascii'),
    InstructionType.ShareAsset,
  ],
  [
    Buffer.from(solita.useAssetInstructionDiscriminator).toString('ascii'),
    InstructionType.UseAsset,
  ],
  [
    Buffer.from(solita.deleteAssetInstructionDiscriminator).toString('ascii'),
    InstructionType.DeleteAsset,
  ],
])
export const IX_DATA_LAYOUT: Partial<Record<InstructionType, any>> = {
  [InstructionType.CreateAsset]: solita.createAssetStruct,
  [InstructionType.EditAssetPrice]: solita.editAssetPriceStruct,
  [InstructionType.BuyAsset]: solita.buyAssetStruct,
  [InstructionType.ShareAsset]: solita.shareAssetStruct,
  [InstructionType.UseAsset]: solita.useAssetStruct,
  [InstructionType.DeleteAsset]: solita.deleteAssetStruct,
}

export const IX_ACCOUNTS_LAYOUT: Partial<Record<InstructionType, any>> = {
  [InstructionType.CreateAsset]: solita.CreateAssetAccounts,
  [InstructionType.EditAssetPrice]: solita.EditAssetPriceAccounts,
  [InstructionType.BuyAsset]: solita.BuyAssetAccounts,
  [InstructionType.ShareAsset]: solita.ShareAssetAccounts,
  [InstructionType.UseAsset]: solita.UseAssetAccounts,
  [InstructionType.DeleteAsset]: solita.DeleteAssetAccounts,
}

export type ParsedEventsInfo =
  | CreateAssetInfo
  | EditAssetPriceInfo
  | BuyAssetInfo
  | ShareAssetInfo
  | UseAssetInfo
  | DeleteAssetInfo

export type ParsedEvents =
  | CreateAssetEvent
  | EditAssetPriceEvent
  | BuyAssetEvent
  | ShareAssetEvent
  | UseAssetEvent
  | DeleteAssetEvent
