import { initNewAccounts } from ".";
import { Program, AnchorProvider } from "@project-serum/anchor";
import { Fishplace } from "../../target/types/fishplace";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";

export async function createBuyDataSetInstructions(
  provider: AnchorProvider,
  program: Program<Fishplace>,
  buyerBalance: number,
  sellerBalance: number,
  masterEditionPrice: number,
  masterEditionQuantity: number,
  dataSetTitle = "Solana whales time series",
  masterEditionName = "Solana whales time series",
  masterEditionSymbol = "SOL",
  masterEditionUri = "https://aleph.im/876jkfbnewjdfjn",
  metadataProgramPublicKey = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  )
) {
  const {
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
  } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);
  await program.methods
    .createMasterEdition(
      masterEditionName,
      masterEditionSymbol,
      masterEditionUri,
      masterEditionPrice,
      masterEditionQuantity
    )
    .accounts({
      metadataProgram: metadataProgramPublicKey,
      authority: sellerKeypair.publicKey,
      dataSetBase: dataSetBaseKeypair.publicKey,
      dataSet: dataSetPublicKey,
    })
    .preInstructions([
      await program.methods
        .createDataSet(dataSetTitle)
        .accounts({
          authority: sellerKeypair.publicKey,
          dataSetBase: dataSetBaseKeypair.publicKey,
          mint: acceptedMintPublicKey,
        })
        .instruction(),
    ])
    .signers(
      sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
    )
    .rpc();

  // initilizes buyer token account to store the nft copy
  await provider.sendAndConfirm(
    new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        buyerAssociatedTokenMasterEditionPublicKey,
        buyerKeypair.publicKey,
        masterEditionMint
      )
    )
  );

  await program.methods
    .buyDataSet(masterEditionQuantity)
    .accounts({
      authority: buyerKeypair.publicKey,
      dataSetBase: dataSetBaseKeypair.publicKey,
      dataSet: dataSetPublicKey,
      masterEdition: masterEditionPublicKey,
      buyerVault: buyerAssociatedTokenToPayPublicKey,
      sellerVault: sellerTokenAccountToBePaidPublicKey,
      masterEditionMint: masterEditionMint,
      masterEditionVault: buyerAssociatedTokenMasterEditionPublicKey,
    })
    .signers(
      buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
    )
    .rpc();

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