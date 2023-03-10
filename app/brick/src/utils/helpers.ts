import { BN } from "@project-serum/anchor";
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

export function getPaymentPubkey(tokenMint: PublicKey, publicKey: PublicKey, buyTimestamp: Buffer) {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("payment", "utf-8"),
            tokenMint.toBuffer(),
            publicKey.toBuffer(),
            buyTimestamp,
        ],
        BRICK_PROGRAM_ID_PK,
    )[0]
}

export function getPaymentVaultPubkey(paymentPublicKey: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("payment_vault", "utf-8"), paymentPublicKey.toBuffer()],
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
        [
            Buffer.from("metadata", "utf-8"), 
            METADATA_PROGRAM_ID_PK.toBuffer(),
            tokenMint.toBuffer()
        ], 
        METADATA_PROGRAM_ID_PK,
    )[0]
}