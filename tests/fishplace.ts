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
    const exemplarsToBuy = 2;
    const quantityPerExemplars = 1;
    const {
      sellerKeypair,
      acceptedMintPublicKey,
      assetPublicKey,
      hashId,
      assetMint,
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
      preBuyAssetAccount.assetMint.toString(),
      assetMint.toString()
    );
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

    const preBuyassetMintAccount = await getMint(
      provider.connection,
      assetMint
    );
    assert.isDefined(preBuyassetMintAccount);
    assert.equal(preBuyassetMintAccount.decimals, 0);
    assert.equal(preBuyassetMintAccount.supply, BigInt(0));

    const token = await metaplex.nfts().findByMint({ mintAddress: assetMint });
    assert.isDefined(token);
    if (isNft(token)) {
      assert.equal(token.updateAuthorityAddress, assetPublicKey);
      assert.equal(token.mint.address, assetMint);
      assert.equal(token.mint.decimals, 0);
      assert.isTrue(token.mint.supply.basisPoints.eq(new anchor.BN(0)));
      assert.equal(token.json.name, tokenName);
      assert.equal(token.json.symbol, tokenSymbol);
      assert.equal(token.json.uri, tokenUri);
    }

    // initilizes buyer token account to store the token
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerMintedTokenVault,
          buyerKeypair.publicKey,
          assetMint
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
        assetMint: assetMint,
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
    assert.equal(assetAccount.sold, exemplarsToBuy);

    const assetMintAccount = await getMint(provider.connection, assetMint);
    assert.equal(assetMintAccount.supply, BigInt(exemplarsToBuy));

    // check if the buyer is able to mint more tokens from the units bought
    // impossible, the mint authority is the asset pda, only is possible calling
    // the buy ix that first requires the transfer
    try {
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          createMintToInstruction(
            assetMint,
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

  it("Create an asset (limited to 2 buys), mint and metadata accounts and buy both, can't buy more", async () => {
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
      assetMint,
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

    // initilizes buyer token account to store the token
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerMintedTokenVault,
          buyerKeypair.publicKey,
          assetMint
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
        assetMint: assetMint,
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
    assert.equal(assetAccount.exemplars - exemplars, 0);

    const assetMintAccount = await getMint(provider.connection, assetMint);
    assert.equal(assetMintAccount.supply, BigInt(exemplars));

    // check if the buyer is possible to buy more even available = 0
    try {
      await program.methods
        .buyAsset(exemplars)
        .accounts({
          authority: buyerKeypair.publicKey,
          asset: assetPublicKey,
          buyerTransferVault: buyerTransferVault,
          sellerTransferVault: sellerTransferVault,
          assetMint: assetMint,
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
      assetMint,
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

    // initilizes buyer token account to store the token
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerMintedTokenVault,
          buyerKeypair.publicKey,
          assetMint
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
        assetMint: assetMint,
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
    const mintedassetMint = await getMint(provider.connection, assetMint);
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
    assert.isDefined(mintedassetMint);
    assert.equal(mintedassetMint.supply, BigInt(exemplarsToBuy));
  });

  it("Use asset test: seller try to close account with tokens unused, when all used should allow to close the accounts", async () => {
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
      assetMint,
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

    // initilizes buyer token account to store the token
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerMintedTokenVault,
          buyerKeypair.publicKey,
          assetMint
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
        assetMint: assetMint,
        buyerMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    // seller tries to close accounts with unused tokens in the buyer wallet,
    try {
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
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "BuyerWithTokenUnsed");
    }

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
        assetMint: assetMint,
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

    const assetMintAccount = await getMint(provider.connection, assetMint);
    assert.equal(assetMintAccount.supply, BigInt(0));

    await program.methods
      .deleteAsset()
      .accounts({
        authority: sellerKeypair.publicKey,
        asset: assetPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    try {
      await program.account.asset.fetch(assetPublicKey);
    } catch (e) {
      assert.isTrue(
        e.toString().includes("Account does not exist or has no data")
      );
    }
  });

  it("Create a transaction composed by buy and use instruction:", async () => {
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
      assetMint,
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

    // initilizes buyer token account to store the token
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerMintedTokenVault,
          buyerKeypair.publicKey,
          assetMint
        )
      )
    );

    await program.methods
      .useAsset(exemplars)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
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
            assetMint: assetMint,
            buyerMintedTokenVault: buyerMintedTokenVault,
          })
          .instruction(),
      ])
      .rpc()
      .catch(console.error);

    // postTx info
    const assetAccount = await program.account.asset.fetch(assetPublicKey);
    assert.isDefined(assetAccount);
    assert.equal(assetAccount.used, exemplars);

    const assetMintAccount = await getMint(provider.connection, assetMint);
    assert.equal(assetMintAccount.supply, BigInt(0));
  });
});
