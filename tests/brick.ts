import * as anchor from "@project-serum/anchor";
import { Program, AnchorError } from "@project-serum/anchor";
import { assert } from "chai";
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
import { delay, initNewAccounts } from "./utils";
import { Brick } from "../target/types/brick";
import { Connection } from "@solana/web3.js";

describe("brick", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Brick as Program<Brick>;

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
  const noRefundTime = new anchor.BN(0);

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
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        noRefundTime,
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
    assert.equal(preBuyAssetAccount.assetMint.toString(), assetMint.toString());
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

    const preBuyAssetMintAccount = await getMint(
      provider.connection,
      assetMint
    );
    assert.isDefined(preBuyAssetMintAccount);
    assert.equal(preBuyAssetMintAccount.decimals, 0);
    assert.equal(preBuyAssetMintAccount.supply, BigInt(0));

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
      .buyAsset(buyTimestamp, exemplarsToBuy)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
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
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        noRefundTime,
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
      .buyAsset(buyTimestamp, exemplars)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
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

    // check if the buyer is able to buy more even available = 0
    const connection = new Connection('https://api.testnet.solana.com', 'processed');
    const slot = await connection.getSlot();
    const newBuyTimeStamp = new anchor.BN(await connection.getBlockTime(slot));
    const [newPaymentPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment", "utf-8"),
        assetMint.toBuffer(),
        buyerKeypair.publicKey.toBuffer(),
        newBuyTimeStamp.toBuffer("le", 8),
      ],
      program.programId
    );
    const [newPaymentVaultPublicKey] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("payment_vault", "utf-8"), newPaymentPublicKey.toBuffer()],
        program.programId
      );
    try {
      await program.methods
        .buyAsset(newBuyTimeStamp, exemplars)
        .accounts({
          authority: buyerKeypair.publicKey,
          asset: assetPublicKey,
          assetMint: assetMint,
          buyerTransferVault: buyerTransferVault,
          acceptedMint: acceptedMintPublicKey,
          payment: newPaymentPublicKey,
          paymentVault: newPaymentVaultPublicKey,
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

  it("Create an asset and modify the price, an user pays the new price, seller withdraws funds and get the correct amount", async () => {
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
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
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
        noRefundTime,
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
      .buyAsset(buyTimestamp, exemplarsToBuy)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount)

    // check if the buyer can withdraw the funds when the seller is the authority
    try {
      await program.methods
        .withdrawFunds()
        .accounts({
          authority: buyerKeypair.publicKey,
          asset: assetPublicKey,
          assetMint: assetMint,
          receiverVault: buyerTransferVault,
          payment: paymentPublicKey,
          buyer: buyerKeypair.publicKey,
          paymentVault: paymentVaultPublicKey,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectPaymentAuthority");
    }
    try {
      await program.methods
        .refund()
        .accounts({
          authority: buyerKeypair.publicKey,
          asset: assetPublicKey,
          assetMint: assetMint,
          receiverVault: buyerTransferVault,
          payment: paymentPublicKey,
          paymentVault: paymentVaultPublicKey,
          buyerMintedTokenVault: buyerMintedTokenVault,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "TimeForRefundHasConsumed");
    }

    await program.methods
      .withdrawFunds()
      .accounts({
        authority: sellerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
        receiverVault: sellerTransferVault,
        payment: paymentPublicKey,
        buyer: buyerKeypair.publicKey,
        paymentVault: paymentVaultPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
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

  it("Use asset test: seller try to close account with unused tokens, when all are used should allow to close the accounts", async () => {
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
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        noRefundTime,
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
      .buyAsset(buyTimestamp, exemplars)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
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
        assert.equal(e.error.errorCode.code, "UsersStillHoldUnusedTokens");
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
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        noRefundTime,
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
          .buyAsset(buyTimestamp, exemplars)
          .accounts({
            authority: buyerKeypair.publicKey,
            asset: assetPublicKey,
            assetMint: assetMint,
            buyerTransferVault: buyerTransferVault,
            acceptedMint: acceptedMintPublicKey,
            payment: paymentPublicKey,
            paymentVault: paymentVaultPublicKey,
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

    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount)
  });

  it("Share asset ix, seller sends token to another wallet, only seller can do this", async () => {
    const buyerBalance = 5;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = -1; // makes the token can be sold unlimited times
    const exemplarsToShare = 2;
    const quantityPerExemplars = 1;
    const {
      sellerKeypair,
      acceptedMintPublicKey,
      assetPublicKey,
      hashId,
      assetMint,
      buyerKeypair,
      buyerMintedTokenVault,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        noRefundTime,
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

    const preShareAssetAccount = await program.account.asset.fetch(
      assetPublicKey
    );
    assert.isDefined(preShareAssetAccount);
    assert.equal(preShareAssetAccount.appName, appName);
    assert.equal(preShareAssetAccount.hashId, hashId);
    assert.equal(preShareAssetAccount.itemHash, hashId);
    assert.equal(
      preShareAssetAccount.assetMint.toString(),
      assetMint.toString()
    );
    assert.equal(
      preShareAssetAccount.acceptedMint.toString(),
      acceptedMintPublicKey.toString()
    );
    assert.equal(
      preShareAssetAccount.authority.toString(),
      sellerKeypair.publicKey.toString()
    );
    assert.equal(preShareAssetAccount.price, tokenPrice);
    assert.equal(preShareAssetAccount.sold, 0);
    assert.equal(preShareAssetAccount.used, 0);
    assert.equal(preShareAssetAccount.exemplars, exemplars);
    assert.equal(
      preShareAssetAccount.quantityPerExemplars,
      quantityPerExemplars
    );

    const preShareAssetMintAccount = await getMint(
      provider.connection,
      assetMint
    );
    assert.isDefined(preShareAssetMintAccount);
    assert.equal(preShareAssetMintAccount.decimals, 0);
    assert.equal(preShareAssetMintAccount.supply, BigInt(0));

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
      .shareAsset(exemplarsToShare)
      .accounts({
        authority: sellerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
        receiverMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    // postTxInfo
    const assetAccount = await program.account.asset.fetch(assetPublicKey);
    assert.isDefined(assetAccount);
    assert.equal(assetAccount.shared, exemplarsToShare);

    const assetMintAccount = await getMint(provider.connection, assetMint);
    assert.equal(assetMintAccount.supply, BigInt(exemplarsToShare));

    try {
      await program.methods
        .shareAsset(exemplarsToShare)
        .accounts({
          authority: buyerKeypair.publicKey,
          asset: assetPublicKey,
          assetMint: assetMint,
          receiverMintedTokenVault: buyerMintedTokenVault,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectAssetAuthority");
    }
  });

  it("Buyer gets refund, before test if the seller can withdraw during the refund time", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = 2;
    const quantityPerExemplars = 1;
    const refundTime = new anchor.BN(60000);
    const {
      sellerKeypair,
      acceptedMintPublicKey,
      assetPublicKey,
      hashId,
      assetMint,
      buyerKeypair,
      buyerMintedTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        refundTime,
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

    const preTxBuyerFunds = await getAccount(
      provider.connection,
      buyerTransferVault
    );

    await program.methods
      .buyAsset(buyTimestamp, exemplars)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const paymentVaultFunds = await getAccount(
      provider.connection,
      paymentVaultPublicKey
    );
    assert.isDefined(paymentVaultFunds)
    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount)
    assert.equal(
      paymentVaultFunds.amount,
      BigInt(tokenPrice * exemplars)
    );

    // check if the buyer can withdraw the funds when the seller is the authority
    try {
      await program.methods
        .withdrawFunds()
        .accounts({
          authority: sellerKeypair.publicKey,
          asset: assetPublicKey,
          assetMint: assetMint,
          receiverVault: sellerTransferVault,
          payment: paymentPublicKey,
          buyer: buyerKeypair.publicKey,
          paymentVault: paymentVaultPublicKey,
        })
        .signers(
          sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "CannotWithdrawYet");
    }
    try {
      await program.methods
        .refund()
        .accounts({
          authority: sellerKeypair.publicKey,
          asset: assetPublicKey,
          assetMint: assetMint,
          receiverVault: sellerTransferVault,
          payment: paymentPublicKey,
          paymentVault: paymentVaultPublicKey,
          buyerMintedTokenVault: buyerMintedTokenVault,
        })
        .signers(
          sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectPaymentAuthority");
    }

    await program.methods
      .refund()
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
        receiverVault: buyerTransferVault,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
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

    // Assert buyer token account haven't changed
    assert.isDefined(preTxBuyerFunds);
    assert.isDefined(postTxBuyerFunds);
    assert.equal(postTxBuyerFunds.amount, preTxBuyerFunds.amount);
  });

  it("Seller withdraws after refund time, before test if the buyer can get a refund after the refund time", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = 2;
    const quantityPerExemplars = 1;
    const refundTime = new anchor.BN(3); // it is introduced in seconds
    const {
      sellerKeypair,
      acceptedMintPublicKey,
      assetPublicKey,
      hashId,
      assetMint,
      buyerKeypair,
      buyerMintedTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(provider, program, buyerBalance, sellerBalance);

    await program.methods
      .createAsset(
        hashId,
        appName,
        hashId,
        refundTime,
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

    const preTxSellerFunds = await getAccount(
      provider.connection,
      sellerTransferVault
    );

    await program.methods
      .buyAsset(buyTimestamp, exemplars)
      .accounts({
        authority: buyerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerMintedTokenVault: buyerMintedTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const paymentVaultFunds = await getAccount(
      provider.connection,
      paymentVaultPublicKey
    );
    assert.isDefined(paymentVaultFunds)
    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount)
    assert.equal(
      paymentVaultFunds.amount,
      BigInt(tokenPrice * exemplars)
    );

    await delay(5000) // i've created 3s refund time, it waits 5s

    // check if the buyer can withdraw the funds when the seller is the authority
    try {
      await program.methods
        .withdrawFunds()
        .accounts({
          authority: buyerKeypair.publicKey,
          asset: assetPublicKey,
          assetMint: assetMint,
          receiverVault: buyerTransferVault,
          payment: paymentPublicKey,
          buyer: buyerKeypair.publicKey,
          paymentVault: paymentVaultPublicKey,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectPaymentAuthority");
    }
    try {
      await program.methods
        .refund()
        .accounts({
          authority: buyerKeypair.publicKey,
          asset: assetPublicKey,
          assetMint: assetMint,
          receiverVault: buyerTransferVault,
          payment: paymentPublicKey,
          paymentVault: paymentVaultPublicKey,
          buyerMintedTokenVault: buyerMintedTokenVault,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "TimeForRefundHasConsumed");
    }

    await program.methods
      .withdrawFunds()
      .accounts({
        authority: sellerKeypair.publicKey,
        asset: assetPublicKey,
        assetMint: assetMint,
        receiverVault: sellerTransferVault,
        payment: paymentPublicKey,
        buyer: buyerKeypair.publicKey,
        paymentVault: paymentVaultPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc();

    const postTxSellerFunds = await getAccount(
      provider.connection,
      sellerTransferVault
    );

    // Assert buyer token account haven't changed
    assert.isDefined(preTxSellerFunds);
    assert.equal(preTxSellerFunds.amount + BigInt(exemplars * tokenPrice) , postTxSellerFunds.amount);
  });
});
