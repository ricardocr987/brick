import { Program, AnchorProvider } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { Fishplace } from "../../target/types/fishplace";
import {
  createFundedWallet,
  createMint,
  createFundedAssociatedTokenAccount,
} from ".";
import { v4 as uuid } from "uuid";

export async function initNewAccounts(
  provider: AnchorProvider,
  program: Program<Fishplace>,
  buyerBalance?: number,
  sellerBalance?: number
) {
  const sellerKeypair = await createFundedWallet(provider, 20);
  const acceptedMintPublicKey = await createMint(provider);
  const hashIdAux: string = uuid();
  const hashId = hashIdAux.substring(0, 32);
  const [assetPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("asset", "utf-8"), anchor.utils.bytes.utf8.encode(hashId)],
    program.programId
  );
  const [tokenMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("token_mint", "utf-8"), assetPublicKey.toBuffer()],
    program.programId
  );
  const buyerKeypair = await createFundedWallet(provider, 20);
  const buyerMintedTokenVault = await getAssociatedTokenAddress(
    tokenMint,
    buyerKeypair.publicKey
  );
  let buyerTransferVault = undefined;
  let sellerTransferVault = undefined;
  if (buyerBalance && sellerBalance) {
    buyerTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      acceptedMintPublicKey,
      buyerBalance,
      buyerKeypair
    );
    sellerTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      acceptedMintPublicKey,
      sellerBalance,
      sellerKeypair
    );
  }

  return {
    sellerKeypair,
    acceptedMintPublicKey,
    hashId,
    assetPublicKey,
    tokenMint,
    buyerKeypair,
    buyerMintedTokenVault,
    buyerTransferVault,
    sellerTransferVault,
  };
}
