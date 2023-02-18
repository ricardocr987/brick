import { initNewAccounts } from ".";
import { Program, AnchorProvider } from "@project-serum/anchor";
import { Fishplace } from "../../target/types/fishplace";
import * as anchor from "@project-serum/anchor";

export async function createMasterEditionInstructions(
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
    acceptedMintPublicKey,
    dataSetPublicKey,
    hashId,
    masterEditionInfoPublicKey,
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
      dataSet: dataSetPublicKey,
    })
    .preInstructions([
      await program.methods
        .createDataSet(hashId, dataSetTitle)
        .accounts({
          authority: sellerKeypair.publicKey,
          mint: acceptedMintPublicKey,
        })
        .instruction(),
    ])
    .signers(
      sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
    )
    .rpc();

  return {
    sellerKeypair,
    acceptedMintPublicKey,
    dataSetPublicKey,
    masterEditionInfoPublicKey,
    masterEditionMint,
    buyerKeypair,
    buyerAssociatedTokenToPayPublicKey,
    buyerAssociatedTokenMasterEditionPublicKey,
    sellerTokenAccountToBePaidPublicKey,
  };
}
