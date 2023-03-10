import { Sft } from "@metaplex-foundation/js"
import { TokenMetadataArgs } from "./solita"

export type TokensWithMetadata = {
    token: TokenMetadataArgs,
    metadata: Sft
}