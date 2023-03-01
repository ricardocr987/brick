export * from "./createFundedWallet";
export * from "./createMint";
export * from "./createFundedAssociatedTokenAccount";
export * from "./initNewAccounts";

export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}
