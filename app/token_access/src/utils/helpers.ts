import { PublicKey } from "@solana/web3.js";
import { TOKEN_ACCESS_PROGRAM_ID_PK } from "./constants";

export function getAssetPubkey(assetMint: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("asset", "utf-8"), assetMint.toBuffer()], 
        TOKEN_ACCESS_PROGRAM_ID_PK,
    )[0]
}