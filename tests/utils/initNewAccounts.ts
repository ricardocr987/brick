import { Program, AnchorProvider } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { Fishplace } from "../../target/types/fishplace";
import {
  createFundedWallet,
  createMint,
  createFundedAssociatedTokenAccount,
} from ".";

export async function initNewAccounts(
  provider: AnchorProvider,
  program: Program<Fishplace>,
  buyerBalance?: number,
  sellerBalance?: number
) {
  const sellerKeypair = await createFundedWallet(provider, 20);
  const dataSetBaseKeypair = anchor.web3.Keypair.generate();
  const acceptedMintPublicKey = await createMint(provider);
  const [dataSetPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("data_set", "utf-8"), dataSetBaseKeypair.publicKey.toBuffer()],
    program.programId
  );
  const [masterEditionPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("master_edition", "utf-8"), dataSetPublicKey.toBuffer()],
    program.programId
  );
  const [masterEditionMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("master_edition_mint", "utf-8"),
      dataSetPublicKey.toBuffer(),
      masterEditionPublicKey.toBuffer(),
    ],
    program.programId
  );
  const buyerKeypair = await createFundedWallet(provider, 20);
  const buyerAssociatedTokenMasterEditionPublicKey =
    await getAssociatedTokenAddress(masterEditionMint, buyerKeypair.publicKey);
  let buyerAssociatedTokenToPayPublicKey = undefined;
  let sellerTokenAccountToBePaidPublicKey = undefined;
  if (buyerBalance && sellerBalance) {
    buyerAssociatedTokenToPayPublicKey =
      await createFundedAssociatedTokenAccount(
        provider,
        acceptedMintPublicKey,
        buyerBalance,
        buyerKeypair
      );
    sellerTokenAccountToBePaidPublicKey =
      await createFundedAssociatedTokenAccount(
        provider,
        acceptedMintPublicKey,
        sellerBalance,
        sellerKeypair
      );
  }

  return {
    sellerKeypair,
    dataSetBaseKeypair,
    acceptedMintPublicKey,
    dataSetPublicKey,
    masterEditionPublicKey,
    masterEditionMint,
    buyerKeypair,
    buyerAssociatedTokenToPayPublicKey,
    buyerAssociatedTokenMasterEditionPublicKey,
    sellerTokenAccountToBePaidPublicKey,
  };
}
