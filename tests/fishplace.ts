import * as anchor from "@project-serum/anchor";
import { Program, AnchorError } from "@project-serum/anchor";
import { assert } from "chai";
import { Fishplace } from "../target/types/fishplace";
import {
  bundlrStorage,
  isNft,
  Metaplex,
  walletAdapterIdentity,
} from "@metaplex-foundation/js";
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getMint,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  createBuyDataSetInstructions,
  createMasterEditionInstructions,
  initNewAccounts,
} from "./utils";

describe("fishplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Fishplace as Program<Fishplace>;

  const metadataProgramPublicKey = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  const metaplex = Metaplex.make(provider.connection)
    .use(walletAdapterIdentity(provider.wallet))
    .use(bundlrStorage());

  const dataSetTitle = "Solana whales time series";
  const masterEditionName = "Solana whales time series";
  const masterEditionSymbol = "SOL";
  const masterEditionUri = "https://aleph.im/876jkfbnewjdfjn";

  it("Create data set account:", async () => {
    const { sellerKeypair, acceptedMintPublicKey, dataSetPublicKey, hashId } =
      await initNewAccounts(provider, program);

    await program.methods
      .createDataSet(hashId, dataSetTitle)
      .accounts({
        authority: sellerKeypair.publicKey,
        mint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

    const dataSetAccount = await program.account.dataSet.fetch(
      dataSetPublicKey
    );
    assert.isDefined(dataSetAccount);
    assert.equal(dataSetAccount.title, dataSetTitle);
    assert.isTrue(dataSetAccount.authority.equals(sellerKeypair.publicKey));
  });

  it("Create a master edition to mint unlimited editions:", async () => {
    const masterEditionPrice = 1;
    const masterEditionQuantity = 0; // if 0 unlimited dataset nfts can be minted
    const {
      sellerKeypair,
      acceptedMintPublicKey,
      dataSetPublicKey,
      hashId,
      masterEditionInfoPublicKey,
      masterEditionMint,
    } = await initNewAccounts(provider, program);

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

    const masterEditionInfoAccount =
      await program.account.masterEditionInfo.fetch(masterEditionInfoPublicKey);
    assert.isDefined(masterEditionInfoAccount);
    assert.equal(masterEditionInfoAccount.price, masterEditionPrice);
    assert.equal(masterEditionInfoAccount.quantity, masterEditionQuantity);
    assert.equal(masterEditionInfoAccount.unlimitedQuantity, true);
    assert.equal(masterEditionInfoAccount.sold, 0);

    const masterEditionMintAccount = await getMint(
      provider.connection,
      masterEditionMint
    );
    assert.isDefined(masterEditionMintAccount);
    assert.equal(masterEditionMintAccount.decimals, 0);
    assert.equal(masterEditionMintAccount.supply, BigInt(0));

    const metaplexNft = await metaplex
      .nfts()
      .findByMint({ mintAddress: masterEditionMint });
    assert.isDefined(metaplexNft);
    if (isNft(metaplexNft)) {
      assert.equal(metaplexNft.updateAuthorityAddress, dataSetPublicKey);
      assert.equal(metaplexNft.mint.address, masterEditionMint);
      assert.equal(metaplexNft.mint.decimals, 0);
      assert.isTrue(metaplexNft.mint.supply.basisPoints.eq(new anchor.BN(0)));
      assert.equal(metaplexNft.json.name, masterEditionName);
      assert.equal(metaplexNft.json.symbol, masterEditionSymbol);
      assert.equal(metaplexNft.json.uri, masterEditionUri);
    }
  });

  it("Create a master edition to mint limited editions and buy all:", async () => {
    const buyerBalance = 5;
    const sellerBalance = 2;
    const masterEditionPrice = 1;
    const masterEditionQuantity = 2;
    const {
      dataSetPublicKey,
      masterEditionInfoPublicKey,
      masterEditionMint,
      buyerKeypair,
      buyerAssociatedTokenToPayPublicKey,
      buyerAssociatedTokenMasterEditionPublicKey,
      sellerTokenAccountToBePaidPublicKey,
    } = await createMasterEditionInstructions(
      provider,
      program,
      buyerBalance,
      sellerBalance,
      masterEditionPrice,
      masterEditionQuantity
    );

    // preTx info
    const premasterEditionInfoAccount =
      await program.account.masterEditionInfo.fetch(masterEditionInfoPublicKey);
    assert.isDefined(premasterEditionInfoAccount);
    assert.equal(premasterEditionInfoAccount.price, masterEditionPrice);
    assert.equal(premasterEditionInfoAccount.quantity, masterEditionQuantity);
    assert.equal(premasterEditionInfoAccount.unlimitedQuantity, false);
    assert.equal(premasterEditionInfoAccount.sold, 0);

    const preMasterEditionMintAccount = await getMint(
      provider.connection,
      masterEditionMint
    );
    assert.equal(preMasterEditionMintAccount.decimals, 0);
    assert.equal(preMasterEditionMintAccount.supply, BigInt(0));

    const metaplexNft = await metaplex
      .nfts()
      .findByMint({ mintAddress: masterEditionMint });
    assert.isDefined(metaplexNft);
    if (isNft(metaplexNft)) {
      assert.equal(metaplexNft.updateAuthorityAddress, dataSetPublicKey);
      assert.equal(metaplexNft.mint.address, masterEditionMint);
      assert.equal(metaplexNft.mint.decimals, 0);
      assert.isTrue(metaplexNft.mint.supply.basisPoints.eq(new anchor.BN(0)));
      assert.equal(metaplexNft.json.name, masterEditionName);
      assert.equal(metaplexNft.json.symbol, masterEditionSymbol);
      assert.equal(metaplexNft.json.uri, masterEditionUri);
    }

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
        dataSet: dataSetPublicKey,
        masterEditionInfo: masterEditionInfoPublicKey,
        buyerVault: buyerAssociatedTokenToPayPublicKey,
        sellerVault: sellerTokenAccountToBePaidPublicKey,
        masterEditionMint: masterEditionMint,
        buyerMasterEditionVault: buyerAssociatedTokenMasterEditionPublicKey,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc();

    // postTxInfo
    const masterEditionInfoAccount =
      await program.account.masterEditionInfo.fetch(masterEditionInfoPublicKey);
    assert.isDefined(masterEditionInfoAccount);
    assert.equal(masterEditionInfoAccount.sold, masterEditionQuantity);

    const masterEditionMintAccount = await getMint(
      provider.connection,
      masterEditionMint
    );
    assert.equal(
      masterEditionMintAccount.supply,
      BigInt(masterEditionQuantity)
    );

    // check if the buyer is able to mint more nfts from the unit bought
    try {
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          createMintToInstruction(
            masterEditionMint,
            buyerKeypair.publicKey,
            dataSetPublicKey,
            1,
            [buyerKeypair.publicKey]
          )
        )
      );
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e, "Error: Signature verification failed");
    }
  });

  it("Create and buy 2 data set master edition copies in the same ix from an unlimited mint:", async () => {
    const masterEditionPrice = 1;
    const masterEditionQuantity = 2;
    const buyerBalance = 5;
    const sellerBalance = 2;
    const {
      dataSetPublicKey,
      masterEditionInfoPublicKey,
      masterEditionMint,
      buyerKeypair,
      buyerAssociatedTokenToPayPublicKey,
      buyerAssociatedTokenMasterEditionPublicKey,
      sellerTokenAccountToBePaidPublicKey,
    } = await createMasterEditionInstructions(
      provider,
      program,
      buyerBalance,
      sellerBalance,
      masterEditionPrice,
      masterEditionQuantity
    );

    const preTxBuyerFunds = await getAccount(
      provider.connection,
      buyerAssociatedTokenToPayPublicKey
    );
    const preTxSellerFunds = await getAccount(
      provider.connection,
      sellerTokenAccountToBePaidPublicKey
    );

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
        dataSet: dataSetPublicKey,
        masterEditionInfo: masterEditionInfoPublicKey,
        buyerVault: buyerAssociatedTokenToPayPublicKey,
        sellerVault: sellerTokenAccountToBePaidPublicKey,
        masterEditionMint: masterEditionMint,
        buyerMasterEditionVault: buyerAssociatedTokenMasterEditionPublicKey,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc();

    const postTxBuyerFunds = await getAccount(
      provider.connection,
      buyerAssociatedTokenToPayPublicKey
    );
    const postTxSellerFunds = await getAccount(
      provider.connection,
      sellerTokenAccountToBePaidPublicKey
    );
    const sellermasterEditionInfoAccount = await getAccount(
      provider.connection,
      buyerAssociatedTokenMasterEditionPublicKey
    );
    const nftMint = await getMint(provider.connection, masterEditionMint);
    const masterEditionInfoAccount =
      await program.account.masterEditionInfo.fetch(masterEditionInfoPublicKey);

    // Assert buyer token account changed
    assert.isDefined(preTxBuyerFunds);
    assert.isDefined(postTxBuyerFunds);
    assert.equal(
      postTxBuyerFunds.amount,
      preTxBuyerFunds.amount -
        BigInt(masterEditionInfoAccount.price * masterEditionQuantity)
    );
    // Assert seller token account changed
    assert.isDefined(preTxSellerFunds);
    assert.isDefined(postTxSellerFunds);
    assert.equal(
      postTxSellerFunds.amount,
      preTxSellerFunds.amount +
        BigInt(masterEditionInfoAccount.price * masterEditionQuantity)
    );
    // Assert master edition account values changed
    assert.isDefined(buyerAssociatedTokenMasterEditionPublicKey);
    assert.equal(
      sellermasterEditionInfoAccount.amount,
      BigInt(masterEditionQuantity)
    );
    assert.isDefined(nftMint);
    assert.equal(nftMint.supply, BigInt(masterEditionQuantity));
  });

  it("Uses data set, ie: it is burnt, as there shouldn't be more nfts to sell should close all accounts:", async () => {
    const masterEditionPrice = 1;
    const masterEditionQuantity = 1;
    const buyerBalance = 5;
    const sellerBalance = 2;
    const {
      sellerKeypair,
      dataSetPublicKey,
      masterEditionInfoPublicKey,
      masterEditionMint,
      buyerKeypair,
      buyerAssociatedTokenMasterEditionPublicKey,
    } = await createBuyDataSetInstructions(
      provider,
      program,
      buyerBalance,
      sellerBalance,
      masterEditionPrice,
      masterEditionQuantity
    );

    // preTx info
    const premasterEditionInfoAccount =
      await program.account.masterEditionInfo.fetch(masterEditionInfoPublicKey);
    assert.isDefined(premasterEditionInfoAccount);
    assert.equal(premasterEditionInfoAccount.used, 0);

    await program.methods
      .useDataSet(masterEditionQuantity)
      .accounts({
        authority: buyerKeypair.publicKey,
        dataSet: dataSetPublicKey,
        masterEditionInfo: masterEditionInfoPublicKey,
        masterEditionMint: masterEditionMint,
        buyerMasterEditionVault: buyerAssociatedTokenMasterEditionPublicKey,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc();

    // postTx info
    const masterEditionInfoAccount =
      await program.account.masterEditionInfo.fetch(masterEditionInfoPublicKey);
    assert.isDefined(masterEditionInfoAccount);
    assert.equal(masterEditionInfoAccount.used, 1);

    const masterEditionMintAccount = await getMint(
      provider.connection,
      masterEditionMint
    );
    assert.equal(masterEditionMintAccount.supply, BigInt(0));

    await program.methods
      .deleteDataSet()
      .accounts({
        authority: sellerKeypair.publicKey,
        dataSet: dataSetPublicKey,
        masterEditionInfo: masterEditionInfoPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

    try {
      await program.account.dataSet.fetch(dataSetPublicKey);
    } catch (e) {
      assert.isTrue(
        e.toString().includes("Account does not exist or has no data")
      );
    }
    try {
      await program.account.masterEditionInfo.fetch(masterEditionInfoPublicKey);
    } catch (e) {
      assert.isTrue(
        e.toString().includes("Account does not exist or has no data")
      );
    }
  });

  it("Create a transaction composed by the buy and use instruction:", async () => {
    const buyerBalance = 5;
    const sellerBalance = 2;
    const masterEditionPrice = 1;
    const masterEditionQuantity = 1;
    const {
      dataSetPublicKey,
      masterEditionInfoPublicKey,
      masterEditionMint,
      buyerKeypair,
      buyerAssociatedTokenToPayPublicKey,
      buyerAssociatedTokenMasterEditionPublicKey,
      sellerTokenAccountToBePaidPublicKey,
    } = await createMasterEditionInstructions(
      provider,
      program,
      buyerBalance,
      sellerBalance,
      masterEditionPrice,
      masterEditionQuantity
    );

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
      .useDataSet(masterEditionQuantity)
      .accounts({
        authority: buyerKeypair.publicKey,
        dataSet: dataSetPublicKey,
        masterEditionInfo: masterEditionInfoPublicKey,
        masterEditionMint: masterEditionMint,
        buyerMasterEditionVault: buyerAssociatedTokenMasterEditionPublicKey,
      })
      .preInstructions([
        await program.methods
          .buyDataSet(masterEditionQuantity)
          .accounts({
            authority: buyerKeypair.publicKey,
            dataSet: dataSetPublicKey,
            masterEditionInfo: masterEditionInfoPublicKey,
            buyerVault: buyerAssociatedTokenToPayPublicKey,
            sellerVault: sellerTokenAccountToBePaidPublicKey,
            masterEditionMint: masterEditionMint,
            buyerMasterEditionVault: buyerAssociatedTokenMasterEditionPublicKey,
          })
          .instruction(),
      ])
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc();

    // postTx info
    const masterEditionInfoAccount =
      await program.account.masterEditionInfo.fetch(masterEditionInfoPublicKey);
    assert.isDefined(masterEditionInfoAccount);
    assert.equal(masterEditionInfoAccount.used, 1);

    const masterEditionMintAccount = await getMint(
      provider.connection,
      masterEditionMint
    );
    assert.equal(masterEditionMintAccount.supply, BigInt(0));
  });
});
