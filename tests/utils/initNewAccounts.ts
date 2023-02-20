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
  const [dataSetPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("data_set", "utf-8"), anchor.utils.bytes.utf8.encode(hashId)],
    program.programId
  );
  const [masterEditionInfoPublicKey] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("master_edition_info", "utf-8"),
        dataSetPublicKey.toBuffer(),
      ],
      program.programId
    );
  const [masterEditionMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("master_edition_mint", "utf-8"),
      dataSetPublicKey.toBuffer(),
      masterEditionInfoPublicKey.toBuffer(),
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
    acceptedMintPublicKey,
    hashId,
    dataSetPublicKey,
    masterEditionInfoPublicKey,
    masterEditionMint,
    buyerKeypair,
    buyerAssociatedTokenToPayPublicKey,
    buyerAssociatedTokenMasterEditionPublicKey,
    sellerTokenAccountToBePaidPublicKey,
  };
}
