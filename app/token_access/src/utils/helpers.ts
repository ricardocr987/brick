import { PublicKey } from "@solana/web3.js";
import { METADATA_PROGRAM_ID_PK, TOKEN_ACCESS_PROGRAM_ID_PK } from "./constants";

export function getAssetPubkey(assetMint: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("asset", "utf-8"), assetMint.toBuffer()], 
        TOKEN_ACCESS_PROGRAM_ID_PK,
    )[0]
}

export function getAssetMintPubkey(hashId: string) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("asset_mint", "utf-8"), Buffer.from(hashId, "utf-8"),], 
        TOKEN_ACCESS_PROGRAM_ID_PK,
    )[0]
}

export function getMetadataPubkey(assetMint: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("metadata", "utf-8"), assetMint.toBuffer()], 
        METADATA_PROGRAM_ID_PK,
    )[0]
}