/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
export type TransactionsInfo = {
  sold: number
  used: number
  shared: number
  refunded: number
}

/**
 * @category userTypes
 * @category generated
 */
export const transactionsInfoBeet = new beet.BeetArgsStruct<TransactionsInfo>(
  [
    ['sold', beet.u32],
    ['used', beet.u32],
    ['shared', beet.u32],
    ['refunded', beet.u32],
  ],
  'TransactionsInfo',
)
