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

  const appName = "Fishplace";
  const tokenName = "Solana whales time series";
  const tokenSymbol = "SOL";
  const tokenUri = "https://aleph.im/876jkfbnewjdfjn";

  it("Create an asset to mint unlimited editions and buy some", async () => {
    const buyerBalance = 5;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = -1; // makes the token can be sold unlimited times
    const quantityPerExemplars = 1;
    const {
      sellerKeypair,
      acceptedMintPublicKey,
      assetPublicKey,
      hashId,
      tokenMint,
      buyerKeypair,
      buyerMintedTokenVault,
      buyerTransferVault,
      sellerTransferVault,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        tokenPrice,
        exemplars,
        quantityPerExemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        acceptedMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const preBuyAssetAccount = await program.account.asset.fetch(
      assetPublicKey
    );
    assert.isDefined(preBuyAssetAccount);
    assert.equal(preBuyAssetAccount.appName, appName);
    assert.equal(preBuyAssetAccount.hashId, hashId);
    assert.equal(preBuyAssetAccount.itemHash, hashId);
    assert.equal(
      preBuyAssetAccount.acceptedMint.toString(),
      acceptedMintPublicKey.toString()
    );
    assert.equal(
      preBuyAssetAccount.authority.toString(),
      sellerKeypair.publicKey.toString()
    );
    assert.equal(preBuyAssetAccount.price, tokenPrice);
    assert.equal(preBuyAssetAccount.sold, 0);
    assert.equal(preBuyAssetAccount.used, 0);
    assert.equal(preBuyAssetAccount.exemplars, exemplars);
    assert.equal(preBuyAssetAccount.quantityPerExemplars, quantityPerExemplars);

    const preBuyTokenMintAccount = await getMint(
      provider.connection,
      tokenMint
    );
    assert.isDefined(preBuyTokenMintAccount);
    assert.equal(preBuyTokenMintAccount.decimals, 0);
    assert.equal(preBuyTokenMintAccount.supply, BigInt(0));

    const metadata = await metaplex
      .nfts()
      .findByMint({ mintAddress: tokenMint });
    assert.isDefined(metadata);
    if (isNft(metadata)) {
      assert.equal(metadata.updateAuthorityAddress, assetPublicKey);
      assert.equal(metadata.mint.address, tokenMint);
      assert.equal(metadata.mint.decimals, 0);
      assert.isTrue(metadata.mint.supply.basisPoints.eq(new anchor.BN(0)));
      assert.equal(metadata.json.name, tokenName);
      assert.equal(metadata.json.symbol, tokenSymbol);
      assert.equal(metadata.json.uri, tokenUri);
    }

    // initilizes buyer token account to store the nft copy
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerMintedTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    await program.methods
      .buyAsset(2)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        buyerTransferVault: buyerTransferVault,
        sellerTransferVault: sellerTransferVault,
        tokenMint: tokenMint,
        buyerMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    // postTxInfo
    const assetAccount = await program.account.asset.fetch(assetPublicKey);
    assert.isDefined(assetAccount);
    assert.equal(assetAccount.sold, 2);

    const tokenMintAccount = await getMint(provider.connection, tokenMint);
    assert.equal(tokenMintAccount.supply, BigInt(2));

    // check if the buyer is able to mint more nfts from the unit bought
    try {
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          createMintToInstruction(
            tokenMint,
            buyerKeypair.publicKey,
            assetPublicKey,
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

  it("Create a asset (limited to 2 buys), mint and metadata accounts and buy both, can't buy more", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = 2;
    const quantityPerExemplars = 1;
    const {
      sellerKeypair,
      acceptedMintPublicKey,
      assetPublicKey,
      hashId,
      tokenMint,
      buyerKeypair,
      buyerMintedTokenVault,
      buyerTransferVault,
      sellerTransferVault,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        tokenPrice,
        exemplars,
        quantityPerExemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        acceptedMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    // initilizes buyer token account to store the nft copy
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerMintedTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    await program.methods
      .buyAsset(exemplars)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        buyerTransferVault: buyerTransferVault,
        sellerTransferVault: sellerTransferVault,
        tokenMint: tokenMint,
        buyerMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    // postTxInfo
    const assetAccount = await program.account.asset.fetch(assetPublicKey);
    assert.isDefined(assetAccount);
    assert.equal(assetAccount.sold, exemplars);

    const tokenMintAccount = await getMint(provider.connection, tokenMint);
    assert.equal(tokenMintAccount.supply, BigInt(exemplars));

    const metadata = await metaplex
      .nfts()
      .findByMint({ mintAddress: tokenMint });
    assert.isDefined(metadata);
    if (isNft(metadata)) {
      assert.equal(metadata.updateAuthorityAddress, assetPublicKey);
      assert.equal(metadata.mint.address, tokenMint);
      assert.equal(metadata.mint.decimals, 0);
      assert.isTrue(metadata.mint.supply.basisPoints.eq(new anchor.BN(0)));
      assert.equal(metadata.json.name, tokenName);
      assert.equal(metadata.json.symbol, tokenSymbol);
      assert.equal(metadata.json.uri, tokenUri);
    }
    // check if the buyer is possible to buy more even available = 0
    try {
      await program.methods
        .buyAsset(exemplars)
        .accounts({
          authority: buyerKeypair.publicKey,
          asset: assetPublicKey,
          buyerTransferVault: buyerTransferVault,
          sellerTransferVault: sellerTransferVault,
          tokenMint: tokenMint,
          buyerMintedTokenVault: buyerMintedTokenVault,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "NotEnoughTokensAvailable");
    }
  });

  it("Create an asset and modify the price, an user pays the new price", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const oldTokenPrice = 1;
    const newTokenPrice = 2;
    const exemplars = -1; // makes the token can be sold unlimited times
    const exemplarsToBuy = 2;
    const quantityPerExemplars = 1;
    const {
      sellerKeypair,
      acceptedMintPublicKey,
      assetPublicKey,
      hashId,
      tokenMint,
      buyerKeypair,
      buyerMintedTokenVault,
      buyerTransferVault,
      sellerTransferVault,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    const preTxBuyerFunds = await getAccount(
      provider.connection,
      buyerTransferVault
    );
    const preTxSellerFunds = await getAccount(
      provider.connection,
      sellerTransferVault
    );

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        oldTokenPrice,
        exemplars,
        quantityPerExemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        acceptedMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const prePriceChangeAssetAccount = await program.account.asset.fetch(
      assetPublicKey
    );
    assert.isDefined(prePriceChangeAssetAccount);
    assert.equal(prePriceChangeAssetAccount.price, oldTokenPrice);

    await program.methods
      .editAssetPrice(newTokenPrice)
      .accounts({
        authority: sellerKeypair.publicKey,
        asset: assetPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const postPriceChangeAssetAccount = await program.account.asset.fetch(
      assetPublicKey
    );
    assert.isDefined(postPriceChangeAssetAccount);
    assert.equal(postPriceChangeAssetAccount.price, newTokenPrice);

    // initilizes buyer token account to store the nft copy
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerMintedTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    await program.methods
      .buyAsset(exemplarsToBuy)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        buyerTransferVault: buyerTransferVault,
        sellerTransferVault: sellerTransferVault,
        tokenMint: tokenMint,
        buyerMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const postTxBuyerFunds = await getAccount(
      provider.connection,
      buyerTransferVault
    );
    const postTxSellerFunds = await getAccount(
      provider.connection,
      sellerTransferVault
    );
    const nftMint = await getMint(provider.connection, tokenMint);
    const assetAccount = await program.account.asset.fetch(assetPublicKey);
    const buyerTokenVaultAccount = await getAccount(
      provider.connection,
      buyerMintedTokenVault
    );

    // Assert buyer token account changed
    assert.isDefined(preTxBuyerFunds);
    assert.isDefined(postTxBuyerFunds);
    assert.equal(
      postTxBuyerFunds.amount,
      preTxBuyerFunds.amount - BigInt(assetAccount.price * exemplarsToBuy)
    );
    // Assert seller token account changed
    assert.isDefined(preTxSellerFunds);
    assert.isDefined(postTxSellerFunds);
    assert.equal(
      postTxSellerFunds.amount,
      preTxSellerFunds.amount + BigInt(assetAccount.price * exemplarsToBuy)
    );
    // Assert master edition account values changed
    assert.isDefined(buyerMintedTokenVault);
    assert.equal(buyerTokenVaultAccount.amount, BigInt(exemplarsToBuy));
    assert.isDefined(nftMint);
    assert.equal(nftMint.supply, BigInt(exemplarsToBuy));
  });

  it("Uses data set, ie: it is burnt, as there shouldn't be more nfts to sell will close the asset account", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = 2;
    const quantityPerExemplars = 1;
    const {
      sellerKeypair,
      acceptedMintPublicKey,
      assetPublicKey,
      hashId,
      tokenMint,
      buyerKeypair,
      buyerMintedTokenVault,
      buyerTransferVault,
      sellerTransferVault,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        tokenPrice,
        exemplars,
        quantityPerExemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        acceptedMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    // initilizes buyer token account to store the nft copy
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerMintedTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    await program.methods
      .buyAsset(exemplars)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        buyerTransferVault: buyerTransferVault,
        sellerTransferVault: sellerTransferVault,
        tokenMint: tokenMint,
        buyerMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    // preTx info
    const preUseAssetAccount = await program.account.asset.fetch(
      assetPublicKey
    );
    assert.isDefined(preUseAssetAccount);
    assert.equal(preUseAssetAccount.used, 0);
    assert.equal(preUseAssetAccount.sold, exemplars);

    await program.methods
      .useAsset(exemplars)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        tokenMint: tokenMint,
        buyerMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    // postTx info
    const postUseAssetAccount = await program.account.asset.fetch(
      assetPublicKey
    );
    assert.isDefined(postUseAssetAccount);
    assert.equal(postUseAssetAccount.used, exemplars);

    const tokenMintAccount = await getMint(provider.connection, tokenMint);
    assert.equal(tokenMintAccount.supply, BigInt(0));

    await program.methods
      .deleteAsset()
      .accounts({
        authority: sellerKeypair.publicKey,
        asset: assetPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

    try {
      await program.account.asset.fetch(assetPublicKey);
    } catch (e) {
      assert.isTrue(
        e.toString().includes("Account does not exist or has no data")
      );
    }
  });

  it("Create a transaction composed by the buy and use instruction:", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = 2;
    const quantityPerExemplars = 1;
    const {
      sellerKeypair,
      acceptedMintPublicKey,
      assetPublicKey,
      hashId,
      tokenMint,
      buyerKeypair,
      buyerMintedTokenVault,
      buyerTransferVault,
      sellerTransferVault,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        tokenPrice,
        exemplars,
        quantityPerExemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        acceptedMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    // initilizes buyer token account to store the nft copy
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerMintedTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    await program.methods
      .useAsset(exemplars)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        tokenMint: tokenMint,
        buyerMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .preInstructions([
        await program.methods
          .buyAsset(exemplars)
          .accounts({
            authority: buyerKeypair.publicKey,
            asset: assetPublicKey,
            buyerTransferVault: buyerTransferVault,
            sellerTransferVault: sellerTransferVault,
            tokenMint: tokenMint,
            buyerMintedTokenVault: buyerMintedTokenVault,
          })
          .instruction()
      ])
      .rpc()
      .catch(console.error);

    // postTx info
    const assetAccount = await program.account.asset.fetch(
      assetPublicKey
    );
    assert.isDefined(assetAccount);
    assert.equal(assetAccount.used, exemplars);

    const tokenMintAccount = await getMint(provider.connection, tokenMint);
    assert.equal(tokenMintAccount.supply, BigInt(0));
  });
});
