import { PublicKey } from "@solana/web3.js"

export const TOKEN_ACCESS_PROGRAM_ID = 'FiShPdUdNuvhF9qETghrDWXiiAR8X2ujeGfGwSC84d4P'
export const TOKEN_ACCESS_PROGRAM_ID_PK = new PublicKey(TOKEN_ACCESS_PROGRAM_ID)

export const METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
export const METADATA_PROGRAM_ID_PK = new PublicKey(METADATA_PROGRAM_ID)

export const symbolFromMint: Record<string, string> = {
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'MSOL'
}
export const mintFromSymbol: Record<string, string> = {
    'SOL': 'So11111111111111111111111111111111111111112',
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'MSOL': 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'
}
export const decimalsFromSymbol: Record<string, number> = {
    'SOL': 9,
    'USDC': 6,
    'MSOL': 9
}