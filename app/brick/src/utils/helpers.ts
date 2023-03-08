import { PublicKey } from "@solana/web3.js";
import { METADATA_PROGRAM_ID_PK, BRICK_PROGRAM_ID_PK } from "./constants";

export function getAppPubkey(appName: string) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("app", "utf-8"), Buffer.from(appName, "utf-8")],
        BRICK_PROGRAM_ID_PK,
    )[0]
}

export function getTokenPubkey(tokenMint: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("token", "utf-8"), tokenMint.toBuffer()],
        BRICK_PROGRAM_ID_PK,
    )[0]
}

export function getTokenMintPubkey(offChainId: string) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("token_mint", "utf-8"), Buffer.from(offChainId, "utf-8")],
        BRICK_PROGRAM_ID_PK,
    )[0]
}

export function getMetadataPubkey(tokenMint: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("metadata", "utf-8"), tokenMint.toBuffer()], 
        METADATA_PROGRAM_ID_PK,
    )[0]
}