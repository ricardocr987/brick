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
import { initNewAccounts } from "./utils";

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
    const {
      sellerKeypair,
      dataSetBaseKeypair,
      acceptedMintPublicKey,
      dataSetPublicKey,
    } = await initNewAccounts(provider, program);

    const tx = await program.methods
      .createDataSet(dataSetTitle)
      .accounts({
        authority: sellerKeypair.publicKey,
        dataSetBase: dataSetBaseKeypair.publicKey,
        mint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();
    const dataSetAccount = await program.account.dataSet.fetch(
      dataSetPublicKey
    );

    assert.isDefined(tx);
    assert.isDefined(dataSetAccount);
    assert.equal(dataSetAccount.title, dataSetTitle);
    assert.isTrue(dataSetAccount.authority.equals(sellerKeypair.publicKey));
  });

  it("Create a master edition to mint unlimited editions:", async () => {
    const masterEditionPrice = 1;
    const masterEditionQuantity = 0; // if 0 unlimited dataset nfts can be minted
    const {
      sellerKeypair,
      dataSetBaseKeypair,
      acceptedMintPublicKey,
      dataSetPublicKey,
      masterEditionPublicKey,
      masterEditionMint,
    } = await initNewAccounts(provider, program);

    await program.methods
      .createDataSet(dataSetTitle)
      .accounts({
        authority: sellerKeypair.publicKey,
        dataSetBase: dataSetBaseKeypair.publicKey,
        mint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

    const tx = await program.methods
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
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

    const masterEditionAccount = await program.account.masterEdition.fetch(
      masterEditionPublicKey
    );
    const masterEditionMintAccount = await getMint(
      provider.connection,
      masterEditionMint
    );
    const metaplexNft = await metaplex
      .nfts()
      .findByMint({ mintAddress: masterEditionMint });

    assert.isDefined(tx);
    assert.isDefined(masterEditionAccount);
    assert.equal(masterEditionAccount.price, masterEditionPrice);
    assert.equal(masterEditionAccount.quantity, masterEditionQuantity);
    assert.equal(masterEditionAccount.unlimitedQuantity, true);
    assert.equal(masterEditionAccount.sold, 0);
    assert.equal(masterEditionMintAccount.decimals, 0);
    assert.equal(masterEditionMintAccount.supply, BigInt(0));

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
    const masterEditionPrice = 1;
    const masterEditionQuantity = 2;

    const buyerBalance = 5;
    const sellerBalance = 2;

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
      .createDataSet(dataSetTitle)
      .accounts({
        authority: sellerKeypair.publicKey,
        dataSetBase: dataSetBaseKeypair.publicKey,
        mint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

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
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

    // preTx info
    const preMasterEditionAccount = await program.account.masterEdition.fetch(
      masterEditionPublicKey
    );
    const preMasterEditionMintAccount = await getMint(
      provider.connection,
      masterEditionMint
    );
    const metaplexNft = await metaplex
      .nfts()
      .findByMint({ mintAddress: masterEditionMint });

    assert.isDefined(preMasterEditionAccount);
    assert.equal(preMasterEditionAccount.price, masterEditionPrice);
    assert.equal(preMasterEditionAccount.quantity, masterEditionQuantity);
    assert.equal(preMasterEditionAccount.unlimitedQuantity, false);
    assert.equal(preMasterEditionAccount.sold, 0);
    assert.equal(preMasterEditionMintAccount.decimals, 0);
    assert.equal(preMasterEditionMintAccount.supply, BigInt(0));

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

    // postTxInfo
    const masterEditionAccount = await program.account.masterEdition.fetch(
      masterEditionPublicKey
    );
    const masterEditionMintAccount = await getMint(
      provider.connection,
      masterEditionMint
    );

    assert.isDefined(masterEditionAccount);
    assert.equal(masterEditionAccount.sold, masterEditionQuantity);
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
    const masterEditionQuantity = 2; // if 0 unlimited dataset nfts can be minted

    const buyerBalance = 5;
    const sellerBalance = 2;

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
      .createDataSet(dataSetTitle)
      .accounts({
        authority: sellerKeypair.publicKey,
        dataSetBase: dataSetBaseKeypair.publicKey,
        mint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

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
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

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

    const tx = await program.methods
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

    const postTxBuyerFunds = await getAccount(
      provider.connection,
      buyerAssociatedTokenToPayPublicKey
    );
    const postTxSellerFunds = await getAccount(
      provider.connection,
      sellerTokenAccountToBePaidPublicKey
    );
    const sellerMasterEditionAccount = await getAccount(
      provider.connection,
      buyerAssociatedTokenMasterEditionPublicKey
    );
    const nftMint = await getMint(provider.connection, masterEditionMint);
    const masterEditionAccount = await program.account.masterEdition.fetch(
      masterEditionPublicKey
    );

    assert.isDefined(tx);
    // Assert buyer token account changed
    assert.isDefined(preTxBuyerFunds);
    assert.isDefined(postTxBuyerFunds);
    assert.equal(
      postTxBuyerFunds.amount,
      preTxBuyerFunds.amount -
        BigInt(masterEditionAccount.price * masterEditionQuantity)
    );
    // Assert seller token account changed
    assert.isDefined(preTxSellerFunds);
    assert.isDefined(postTxSellerFunds);
    assert.equal(
      postTxSellerFunds.amount,
      preTxSellerFunds.amount +
        BigInt(masterEditionAccount.price * masterEditionQuantity)
    );
    // Assert master edition account values changed
    assert.isDefined(buyerAssociatedTokenMasterEditionPublicKey);
    assert.equal(
      sellerMasterEditionAccount.amount,
      BigInt(masterEditionQuantity)
    );
    assert.isDefined(nftMint);
    assert.equal(nftMint.supply, BigInt(masterEditionQuantity));
  });

  it("Uses data set, ie: it is burnt:", async () => {});
});
