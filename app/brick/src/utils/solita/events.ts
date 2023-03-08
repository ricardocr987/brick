import BN from 'bn.js'
import * as solita from './instructions/index'

export enum InstructionType {
  CreateApp = 'CreateAppEvent',
  CreateToken = 'CreateTokenEvent',
  EditTokenPrice = 'EditTokenPriceEvent',
  BuyToken = 'BuyTokenEvent',
  ShareToken = 'ShareTokenEvent',
  WithdrawFunds = 'WithdrawFundsEvent',
  Refund = 'RefundEvent',
  UseToken = 'UseTokenEvent',
  Deletetoken = 'DeletetokenEvent',
}

export type InstructionBase = {
  programId: string
  signer: string
  account: string
}

/*-----------------------* CUSTOM EVENTS TYPES *-----------------------*/

export type CreateAppEventData = {
  appName: string
  feeBasisPoints: number
}

export type CreateAppInfo = {
  data: CreateAppEventData
  accounts: solita.CreateAppInstructionAccounts
}

export type CreateAppEvent = InstructionBase &
  CreateAppInfo & {
    type: InstructionType.CreateApp
  }

/*----------------------------------------------------------------------*/

export type CreateTokenEventData = {
  offChainId: string
  offChainId2: string
  offChainMetadata: string
  refundTimespan: BN
  tokenPrice: number
  exemplars: number
  tokenName: string
  tokenSymbol: string
  tokenUri: string
}

export type CreateTokenInfo = {
  data: CreateTokenEventData
  accounts: solita.CreateTokenInstructionAccounts
}

export type CreateTokenEvent = InstructionBase &
  CreateTokenInfo & {
    type: InstructionType.CreateToken
  }

/*----------------------------------------------------------------------*/

export type EditTokenPriceEventData = {
  tokenPrice: number
}

export type EditTokenPriceInfo = {
  data: EditTokenPriceEventData
  accounts: solita.EditTokenPriceInstructionAccounts
}

export type EditTokenPriceEvent = InstructionBase &
  EditTokenPriceInfo & {
    type: InstructionType.EditTokenPrice
  }

/*----------------------------------------------------------------------*/

export type BuyTokenEventData = {
  timestamp: BN
}

export type BuyTokenInfo = {
  data: BuyTokenEventData
  accounts: solita.BuyTokenInstructionAccounts
}

export type BuyTokenEvent = InstructionBase &
  BuyTokenInfo & {
    type: InstructionType.BuyToken
  }

/*----------------------------------------------------------------------*/

export type ShareTokenEventData = {
  exemplars: number
}

export type ShareTokenInfo = {
  data: ShareTokenEventData
  accounts: solita.ShareTokenInstructionAccounts
}

export type ShareTokenEvent = InstructionBase &
  ShareTokenInfo & {
    type: InstructionType.ShareToken
  }

/*----------------------------------------------------------------------*/

export type WithdrawFundsInfo = {
  accounts: solita.WithdrawFundsInstructionAccounts
}

export type WithdrawFundsEvent = InstructionBase &
  WithdrawFundsInfo & {
    type: InstructionType.WithdrawFunds
  }

/*----------------------------------------------------------------------*/

export type RefundInfo = {
  accounts: solita.RefundInstructionAccounts
}

export type RefundEvent = InstructionBase &
  RefundInfo & {
    type: InstructionType.Refund
  }

/*----------------------------------------------------------------------*/

export type UseTokenInfo = {
  accounts: solita.UseTokenInstructionAccounts
}

export type UseTokenEvent = InstructionBase &
  UseTokenInfo & {
    type: InstructionType.UseToken
  }

/*----------------------------------------------------------------------*/

export type DeletetokenInfo = {
  accounts: solita.DeletetokenInstructionAccounts
}

export type DeletetokenEvent = InstructionBase &
  DeletetokenInfo & {
    type: InstructionType.Deletetoken
  }

/*----------------------------------------------------------------------*/

export type ParsedEventsInfo =
  | CreateAppInfo
  | CreateTokenInfo
  | EditTokenPriceInfo
  | BuyTokenInfo
  | ShareTokenInfo
  | WithdrawFundsInfo
  | RefundInfo
  | UseTokenInfo
  | DeletetokenInfo

export type ParsedEvents =
  | CreateAppEvent
  | CreateTokenEvent
  | EditTokenPriceEvent
  | BuyTokenEvent
  | ShareTokenEvent
  | WithdrawFundsEvent
  | RefundEvent
  | UseTokenEvent
  | DeletetokenEvent
