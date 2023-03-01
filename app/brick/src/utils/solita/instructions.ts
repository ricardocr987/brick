import * as solita from './index'

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


export const IX_DATA_LAYOUT: Partial<Record<InstructionType, any>> = {
  [InstructionType.CreateAsset]: solita.createAssetStruct,
  [InstructionType.EditAssetPrice]: solita.editAssetPriceStruct,
  [InstructionType.BuyAsset]: solita.buyAssetStruct,
  [InstructionType.ShareAsset]: solita.shareAssetStruct,
  [InstructionType.UseAsset]: solita.useAssetStruct,
  [InstructionType.DeleteAsset]: solita.deleteAssetStruct,
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
