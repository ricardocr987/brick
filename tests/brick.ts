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

  const tokenName = "Bonking the bonked";
  const tokenSymbol = "BONKY";
  const tokenUri = "https://aleph.im/876jkfbnewjdfjn";
  const noRefundTime = new anchor.BN(0);
  const noOffChainMetada = "";
  const creatorBalance = 100000000;
  const noFee = 0;

  it("Create an app (including a fee), an token to mint unlimited editions and buy some, checks payment data is correct, withdraw to check fee", async () => {
    const buyerBalance = 500000000;
    const sellerBalance = 200000000;
    const tokenPrice = 50000;
    const exemplars = -1; // makes the token can be sold unlimited times
    const fee = 250; // represents 5% fee for each sale
    const appName = "Fishplace";
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenPublicKey,
      offChainId,
      offChainId2,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      secondBuyTimestamp,
      secondPaymentPublicKey,
      secondPaymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, fee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    const appAccount = await program.account.app.fetch(appPublicKey);
    assert.isDefined(appAccount);
    assert.equal(appAccount.appName, appName);
    assert.equal(
      appAccount.authority.toString(),
      appCreatorKeypair.publicKey.toString()
    );
    assert.equal(appAccount.feeBasisPoints, fee);

    await program.methods
      .createToken(
        offChainId,
        offChainId2,
        noOffChainMetada,
        noRefundTime,
        tokenPrice,
        exemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
        acceptedMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const preBuyTokenAccount = await program.account.tokenMetadata.fetch(
      tokenPublicKey
    );
    assert.isDefined(preBuyTokenAccount);
    assert.equal(preBuyTokenAccount.app.toString(), appPublicKey.toString());
    assert.equal(preBuyTokenAccount.offChainId, offChainId);
    assert.equal(
      preBuyTokenAccount.sellerConfig.acceptedMint.toString(),
      acceptedMintPublicKey.toString()
    );
    assert.equal(preBuyTokenAccount.tokenMint.toString(), tokenMint.toString());
    assert.equal(
      preBuyTokenAccount.authority.toString(),
      sellerKeypair.publicKey.toString()
    );
    assert.equal(
      Number(preBuyTokenAccount.sellerConfig.refundTimespan),
      Number(noRefundTime)
    );
    assert.equal(preBuyTokenAccount.sellerConfig.price, tokenPrice);
    assert.equal(preBuyTokenAccount.transactionsInfo.sold, 0);
    assert.equal(preBuyTokenAccount.transactionsInfo.used, 0);
    assert.equal(preBuyTokenAccount.transactionsInfo.shared, 0);
    assert.equal(preBuyTokenAccount.transactionsInfo.refunded, 0);
    assert.equal(preBuyTokenAccount.sellerConfig.exemplars, exemplars);

    const preBuytokenMintAccount = await getMint(
      provider.connection,
      tokenMint
    );
    assert.isDefined(preBuytokenMintAccount);
    assert.equal(preBuytokenMintAccount.decimals, 0);
    assert.equal(preBuytokenMintAccount.supply, BigInt(0));

    const token = await metaplex.nfts().findByMint({ mintAddress: tokenMint });
    assert.isDefined(token);
    if (isNft(token)) {
      assert.equal(token.updateAuthorityAddress, tokenPublicKey);
      assert.equal(token.mint.address, tokenMint);
      assert.equal(token.mint.decimals, 0);
      assert.isTrue(token.mint.supply.basisPoints.eq(new anchor.BN(0)));
      assert.equal(token.json.name, tokenName);
      assert.equal(token.json.symbol, tokenSymbol);
      assert.equal(token.json.uri, tokenUri);
    }

    await program.methods
      .buyToken(buyTimestamp)
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .buyToken(secondBuyTimestamp)
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: secondPaymentPublicKey,
        paymentVault: secondPaymentVaultPublicKey,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.equal(paymentAccount.tokenMint.toString(), tokenMint.toString());
    assert.equal(
      paymentAccount.seller.toString(),
      sellerKeypair.publicKey.toString()
    );
    assert.equal(
      paymentAccount.buyer.toString(),
      buyerKeypair.publicKey.toString()
    );
    assert.equal(paymentAccount.price, tokenPrice);
    assert.equal(Number(paymentAccount.paymentTimestamp), Number(buyTimestamp));
    assert.equal(Number(paymentAccount.refundConsumedAt), Number(buyTimestamp));

    const secondPaymentAccount = await program.account.payment.fetch(
      secondPaymentPublicKey
    );
    assert.equal(
      secondPaymentAccount.tokenMint.toString(),
      tokenMint.toString()
    );
    assert.equal(
      secondPaymentAccount.seller.toString(),
      sellerKeypair.publicKey.toString()
    );
    assert.equal(
      secondPaymentAccount.buyer.toString(),
      buyerKeypair.publicKey.toString()
    );
    assert.equal(secondPaymentAccount.price, tokenPrice);
    assert.equal(
      Number(secondPaymentAccount.paymentTimestamp),
      Number(secondBuyTimestamp)
    );
    assert.equal(
      Number(secondPaymentAccount.refundConsumedAt),
      Number(secondBuyTimestamp)
    );

    // postTxInfo
    const TokenAccount = await program.account.tokenMetadata.fetch(
      tokenPublicKey
    );
    assert.isDefined(TokenAccount);
    assert.equal(TokenAccount.transactionsInfo.sold, 2);

    const tokenMintAccount = await getMint(provider.connection, tokenMint);
    assert.equal(tokenMintAccount.supply, BigInt(2));

    // check if the buyer is able to mint more tokens from the units bought
    // impossible, the mint authority is the token pda, only is possible calling
    // the buy ix that first requires the transfer
    try {
      await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          createMintToInstruction(
            tokenMint,
            buyerKeypair.publicKey,
            tokenPublicKey,
            1,
            [buyerKeypair.publicKey]
          )
        )
      );
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e, "Error: Signature verification failed");
    }

    await program.methods
      .withdrawFunds()
      .accounts({
        authority: sellerKeypair.publicKey,
        token: tokenPublicKey,
        app: appPublicKey,
        appCreatorVault: creatorTransferVault,
        tokenMint: tokenMint,
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

    await program.methods
      .withdrawFunds()
      .accounts({
        authority: sellerKeypair.publicKey,
        token: tokenPublicKey,
        app: appPublicKey,
        appCreatorVault: creatorTransferVault,
        tokenMint: tokenMint,
        receiverVault: sellerTransferVault,
        payment: secondPaymentPublicKey,
        buyer: buyerKeypair.publicKey,
        paymentVault: secondPaymentVaultPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const creatorTokenVaultAccount = await getAccount(
      provider.connection,
      creatorTransferVault
    );
    const totalAmount = 2 * tokenPrice;
    const creatorFee = (totalAmount * fee) / 10000;
    const expectedCreatorAmount = Math.trunc(creatorBalance + creatorFee);
    assert.equal(
      Number(creatorTokenVaultAccount.amount),
      expectedCreatorAmount
    );
    const sellerTokenAccount = await getAccount(
      provider.connection,
      sellerTransferVault
    );
    const expectedSellerAmount = Math.trunc(
      sellerBalance + totalAmount - creatorFee
    );
    assert.equal(Number(sellerTokenAccount.amount), expectedSellerAmount);
  });

  it("Create an token (limited to 2 buys), mint and metadata accounts and buy both, can't buy more", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = 2;
    const appName = "Fishnet";
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenPublicKey,
      offChainId,
      offChainId2,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      secondBuyTimestamp,
      secondPaymentPublicKey,
      secondPaymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, noFee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .createToken(
        offChainId,
        offChainId2,
        noOffChainMetada,
        noRefundTime,
        tokenPrice,
        exemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
        acceptedMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    // initilizes buyer token account to store the token: added init if needed so unnecessary
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    await program.methods
      .buyToken(buyTimestamp)
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .buyToken(secondBuyTimestamp)
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: secondPaymentPublicKey,
        paymentVault: secondPaymentVaultPublicKey,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    // postTxInfo
    const TokenAccount = await program.account.tokenMetadata.fetch(
      tokenPublicKey
    );
    assert.isDefined(TokenAccount);
    assert.equal(TokenAccount.sellerConfig.exemplars - exemplars, 0);

    const tokenMintAccount = await getMint(provider.connection, tokenMint);
    assert.equal(tokenMintAccount.supply, BigInt(exemplars));

    // check if the buyer is able to buy more even available = 0
    const connection = new Connection(
      "https://api.testnet.solana.com",
      "processed"
    );
    const slot = await connection.getSlot();
    const newBuyTimeStamp = new anchor.BN(await connection.getBlockTime(slot));
    const [newPaymentPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment", "utf-8"),
        tokenMint.toBuffer(),
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
        .buyToken(newBuyTimeStamp)
        .accounts({
          authority: buyerKeypair.publicKey,
          token: tokenPublicKey,
          tokenMint: tokenMint,
          buyerTransferVault: buyerTransferVault,
          acceptedMint: acceptedMintPublicKey,
          payment: newPaymentPublicKey,
          paymentVault: newPaymentVaultPublicKey,
          buyerTokenVault: buyerTokenVault,
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

  it("Create an token and modify the price, an user pays the new price, seller withdraws funds and get the correct amount", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const oldTokenPrice = 1;
    const newTokenPrice = 2;
    const exemplars = -1; // makes the token can be sold unlimited times
    const appName = "Solana";
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenPublicKey,
      offChainId,
      offChainId2,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      secondBuyTimestamp,
      secondPaymentPublicKey,
      secondPaymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, noFee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    const preTxBuyerFunds = await getAccount(
      provider.connection,
      buyerTransferVault
    );
    const preTxSellerFunds = await getAccount(
      provider.connection,
      sellerTransferVault
    );

    await program.methods
      .createToken(
        offChainId,
        offChainId2,
        noOffChainMetada,
        noRefundTime,
        oldTokenPrice,
        exemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
        acceptedMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const prePriceChangeTokenAccount =
      await program.account.tokenMetadata.fetch(tokenPublicKey);
    assert.isDefined(prePriceChangeTokenAccount);
    assert.equal(prePriceChangeTokenAccount.sellerConfig.price, oldTokenPrice);

    await program.methods
      .editTokenPrice(newTokenPrice)
      .accounts({
        authority: sellerKeypair.publicKey,
        token: tokenPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const postPriceChangeTokenAccount =
      await program.account.tokenMetadata.fetch(tokenPublicKey);
    assert.isDefined(postPriceChangeTokenAccount);
    assert.equal(postPriceChangeTokenAccount.sellerConfig.price, newTokenPrice);

    // initilizes buyer token account to store the token
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          buyerTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    await program.methods
      .buyToken(buyTimestamp)
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .buyToken(secondBuyTimestamp)
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: secondPaymentPublicKey,
        paymentVault: secondPaymentVaultPublicKey,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount);

    // check if the buyer can withdraw the funds when the seller is the authority
    try {
      await program.methods
        .withdrawFunds()
        .accounts({
          authority: buyerKeypair.publicKey,
          app: appPublicKey,
          appCreatorVault: creatorTransferVault,
          token: tokenPublicKey,
          tokenMint: tokenMint,
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
          token: tokenPublicKey,
          tokenMint: tokenMint,
          receiverVault: buyerTransferVault,
          payment: paymentPublicKey,
          paymentVault: paymentVaultPublicKey,
          buyerTokenVault: buyerTokenVault,
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
        app: appPublicKey,
        appCreatorVault: creatorTransferVault,
        token: tokenPublicKey,
        tokenMint: tokenMint,
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

    await program.methods
      .withdrawFunds()
      .accounts({
        authority: sellerKeypair.publicKey,
        token: tokenPublicKey,
        app: appPublicKey,
        appCreatorVault: creatorTransferVault,
        tokenMint: tokenMint,
        receiverVault: sellerTransferVault,
        payment: secondPaymentPublicKey,
        buyer: buyerKeypair.publicKey,
        paymentVault: secondPaymentVaultPublicKey,
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
    const mintedtokenMint = await getMint(provider.connection, tokenMint);
    const TokenAccount = await program.account.tokenMetadata.fetch(
      tokenPublicKey
    );
    const buyerTokenVaultAccount = await getAccount(
      provider.connection,
      buyerTokenVault
    );

    // Assert buyer token account changed
    assert.isDefined(preTxBuyerFunds);
    assert.isDefined(postTxBuyerFunds);
    assert.equal(
      postTxBuyerFunds.amount,
      preTxBuyerFunds.amount - BigInt(TokenAccount.sellerConfig.price * 2)
    );
    // Assert seller token account changed
    assert.isDefined(preTxSellerFunds);
    assert.isDefined(postTxSellerFunds);
    assert.equal(
      postTxSellerFunds.amount,
      preTxSellerFunds.amount + BigInt(TokenAccount.sellerConfig.price * 2)
    );
    // Assert master edition account values changed
    assert.isDefined(buyerTokenVault);
    assert.equal(buyerTokenVaultAccount.amount, BigInt(2));
    assert.isDefined(mintedtokenMint);
    assert.equal(mintedtokenMint.supply, BigInt(2));
  });

  it("Use token test: seller try to close account with unused tokens, when all are used should allow to close the accounts", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = 1;
    const appName = "Brick";
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenPublicKey,
      offChainId,
      offChainId2,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      secondBuyTimestamp,
      secondPaymentPublicKey,
      secondPaymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, noFee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .createToken(
        offChainId,
        offChainId2,
        noOffChainMetada,
        noRefundTime,
        tokenPrice,
        exemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
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
          buyerTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    await program.methods
      .buyToken(buyTimestamp)
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    // seller tries to close accounts with unused tokens in the buyer wallet,
    try {
      await program.methods
        .deletetoken()
        .accounts({
          authority: sellerKeypair.publicKey,
          token: tokenPublicKey,
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
    const preUseTokenAccount = await program.account.tokenMetadata.fetch(
      tokenPublicKey
    );
    assert.isDefined(preUseTokenAccount);
    assert.equal(preUseTokenAccount.transactionsInfo.used, 0);
    assert.equal(preUseTokenAccount.transactionsInfo.sold, exemplars);

    await program.methods
      .useToken()
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .rpc()
      .catch(console.error);

    // postTx info
    const postUseTokenAccount = await program.account.tokenMetadata.fetch(
      tokenPublicKey
    );
    assert.isDefined(postUseTokenAccount);
    assert.equal(postUseTokenAccount.transactionsInfo.used, exemplars);

    const tokenMintAccount = await getMint(provider.connection, tokenMint);
    assert.equal(tokenMintAccount.supply, BigInt(0));

    await program.methods
      .deletetoken()
      .accounts({
        authority: sellerKeypair.publicKey,
        token: tokenPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    try {
      await program.account.tokenMetadata.fetch(tokenPublicKey);
    } catch (e) {
      assert.isTrue(
        e.toString().includes("Account does not exist or has no data")
      );
    }
  });

  it("Create a transaction composed by buy and use instruction, buyer cant refund after burn", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = 1;
    const refundTime = new anchor.BN(50000);
    const appName = "Aleph";
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenPublicKey,
      offChainId,
      offChainId2,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      secondBuyTimestamp,
      secondPaymentPublicKey,
      secondPaymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, noFee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .createToken(
        offChainId,
        offChainId2,
        noOffChainMetada,
        refundTime,
        tokenPrice,
        exemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
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
          buyerTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    await program.methods
      .useToken()
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTokenVault: buyerTokenVault,
      })
      .signers(
        buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
      )
      .preInstructions([
        await program.methods
          .buyToken(buyTimestamp)
          .accounts({
            authority: buyerKeypair.publicKey,
            token: tokenPublicKey,
            tokenMint: tokenMint,
            buyerTransferVault: buyerTransferVault,
            acceptedMint: acceptedMintPublicKey,
            payment: paymentPublicKey,
            paymentVault: paymentVaultPublicKey,
            buyerTokenVault: buyerTokenVault,
          })
          .instruction(),
      ])
      .rpc()
      .catch(console.error);

    // test if user can get refund after burn
    try {
      await program.methods
        .refund()
        .accounts({
          authority: buyerKeypair.publicKey,
          token: tokenPublicKey,
          tokenMint: tokenMint,
          receiverVault: buyerTransferVault,
          payment: paymentPublicKey,
          paymentVault: paymentVaultPublicKey,
          buyerTokenVault: buyerTokenVault,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.isTrue(
          e.logs.includes("Program log: Error: insufficient funds")
        );
    }

    // postTx info
    const TokenAccount = await program.account.tokenMetadata.fetch(
      tokenPublicKey
    );
    assert.isDefined(TokenAccount);
    assert.equal(TokenAccount.transactionsInfo.used, exemplars);

    const tokenMintAccount = await getMint(provider.connection, tokenMint);
    assert.equal(tokenMintAccount.supply, BigInt(0));

    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount);
  });

  it("Share token ix, seller sends token to another wallet, only seller can do this", async () => {
    const buyerBalance = 5;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = -1; // makes the token can be sold unlimited times
    const exemplarsToShare = 2;
    const appName = "SOL";
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenPublicKey,
      offChainId,
      offChainId2,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      secondBuyTimestamp,
      secondPaymentPublicKey,
      secondPaymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, noFee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .createToken(
        offChainId,
        offChainId2,
        noOffChainMetada,
        noRefundTime,
        tokenPrice,
        exemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
        acceptedMint: acceptedMintPublicKey,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    const preShareTokenAccount = await program.account.tokenMetadata.fetch(
      tokenPublicKey
    );
    assert.isDefined(preShareTokenAccount);
    assert.equal(preShareTokenAccount.app.toString(), appPublicKey.toString());
    assert.equal(preShareTokenAccount.offChainId, offChainId);
    assert.equal(
      preShareTokenAccount.sellerConfig.acceptedMint.toString(),
      acceptedMintPublicKey.toString()
    );
    assert.equal(
      preShareTokenAccount.authority.toString(),
      sellerKeypair.publicKey.toString()
    );
    assert.equal(preShareTokenAccount.sellerConfig.price, tokenPrice);
    assert.equal(preShareTokenAccount.transactionsInfo.sold, 0);
    assert.equal(preShareTokenAccount.transactionsInfo.used, 0);
    assert.equal(preShareTokenAccount.sellerConfig.exemplars, exemplars);

    const preSharetokenMintAccount = await getMint(
      provider.connection,
      tokenMint
    );
    assert.isDefined(preSharetokenMintAccount);
    assert.equal(preSharetokenMintAccount.decimals, 0);
    assert.equal(preSharetokenMintAccount.supply, BigInt(0));

    const token = await metaplex.nfts().findByMint({ mintAddress: tokenMint });
    assert.isDefined(token);
    if (isNft(token)) {
      assert.equal(token.updateAuthorityAddress, tokenPublicKey);
      assert.equal(token.mint.address, tokenMint);
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
          buyerTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    await program.methods
      .shareToken(exemplarsToShare)
      .accounts({
        authority: sellerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        receiverVault: buyerTokenVault,
      })
      .signers(
        sellerKeypair instanceof (anchor.Wallet as any) ? [] : [sellerKeypair]
      )
      .rpc()
      .catch(console.error);

    // postTxInfo
    const TokenAccount = await program.account.tokenMetadata.fetch(
      tokenPublicKey
    );
    assert.isDefined(TokenAccount);
    assert.equal(TokenAccount.transactionsInfo.shared, exemplarsToShare);

    const tokenMintAccount = await getMint(provider.connection, tokenMint);
    assert.equal(tokenMintAccount.supply, BigInt(exemplarsToShare));

    try {
      await program.methods
        .shareToken(exemplarsToShare)
        .accounts({
          authority: buyerKeypair.publicKey,
          token: tokenPublicKey,
          tokenMint: tokenMint,
          receiverVault: buyerTokenVault,
        })
        .signers(
          buyerKeypair instanceof (anchor.Wallet as any) ? [] : [buyerKeypair]
        )
        .rpc();
    } catch (e) {
      if (e as AnchorError)
        assert.equal(e.error.errorCode.code, "IncorrectTokenAuthority");
    }
  });

  it("Buyer gets refund, before test if the seller can withdraw during the refund time", async () => {
    const buyerBalance = 10;
    const sellerBalance = 2;
    const tokenPrice = 2;
    const exemplars = 1;
    const appName = "Backpack";
    const refundTime = new anchor.BN(60000);
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenPublicKey,
      offChainId,
      offChainId2,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      secondBuyTimestamp,
      secondPaymentPublicKey,
      secondPaymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, noFee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .createToken(
        offChainId,
        offChainId2,
        noOffChainMetada,
        refundTime,
        tokenPrice,
        exemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
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
          buyerTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    const preTxBuyerFunds = await getAccount(
      provider.connection,
      buyerTransferVault
    );

    await program.methods
      .buyToken(buyTimestamp)
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTokenVault: buyerTokenVault,
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
    assert.isDefined(paymentVaultFunds);
    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount);
    assert.equal(paymentVaultFunds.amount, BigInt(tokenPrice * exemplars));

    // check if the buyer can withdraw the funds when the seller is the authority
    try {
      await program.methods
        .withdrawFunds()
        .accounts({
          authority: sellerKeypair.publicKey,
          app: appPublicKey,
          appCreatorVault: creatorTransferVault,
          token: tokenPublicKey,
          tokenMint: tokenMint,
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
          token: tokenPublicKey,
          tokenMint: tokenMint,
          receiverVault: sellerTransferVault,
          payment: paymentPublicKey,
          paymentVault: paymentVaultPublicKey,
          buyerTokenVault: buyerTokenVault,
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
        token: tokenPublicKey,
        tokenMint: tokenMint,
        receiverVault: buyerTransferVault,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTokenVault: buyerTokenVault,
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
    const exemplars = 1;
    const refundTime = new anchor.BN(3); // it is introduced in seconds
    const appName = "OnePiece";
    const {
      appPublicKey,
      appCreatorKeypair,
      creatorTransferVault,
      sellerKeypair,
      acceptedMintPublicKey,
      tokenPublicKey,
      offChainId,
      offChainId2,
      tokenMint,
      buyerKeypair,
      buyerTokenVault,
      buyerTransferVault,
      buyTimestamp,
      paymentPublicKey,
      paymentVaultPublicKey,
      secondBuyTimestamp,
      secondPaymentPublicKey,
      secondPaymentVaultPublicKey,
      sellerTransferVault,
    } = await initNewAccounts(
      provider,
      program,
      appName,
      buyerBalance,
      sellerBalance,
      creatorBalance
    );

    await program.methods
      .createApp(appName, noFee)
      .accounts({
        authority: appCreatorKeypair.publicKey,
      })
      .signers(
        appCreatorKeypair instanceof (anchor.Wallet as any)
          ? []
          : [appCreatorKeypair]
      )
      .rpc()
      .catch(console.error);

    await program.methods
      .createToken(
        offChainId,
        offChainId2,
        noOffChainMetada,
        refundTime,
        tokenPrice,
        exemplars,
        tokenName,
        tokenSymbol,
        tokenUri
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: sellerKeypair.publicKey,
        app: appPublicKey,
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
          buyerTokenVault,
          buyerKeypair.publicKey,
          tokenMint
        )
      )
    );

    const preTxSellerFunds = await getAccount(
      provider.connection,
      sellerTransferVault
    );

    await program.methods
      .buyToken(buyTimestamp)
      .accounts({
        authority: buyerKeypair.publicKey,
        token: tokenPublicKey,
        tokenMint: tokenMint,
        buyerTransferVault: buyerTransferVault,
        acceptedMint: acceptedMintPublicKey,
        payment: paymentPublicKey,
        paymentVault: paymentVaultPublicKey,
        buyerTokenVault: buyerTokenVault,
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
    assert.isDefined(paymentVaultFunds);
    const paymentAccount = await program.account.payment.fetch(
      paymentPublicKey
    );
    assert.isDefined(paymentAccount);
    assert.equal(paymentVaultFunds.amount, BigInt(tokenPrice * exemplars));

    await delay(5000); // i've created 3s refund time, it waits 5s

    // check if the buyer can withdraw the funds when the seller is the authority
    try {
      await program.methods
        .withdrawFunds()
        .accounts({
          authority: buyerKeypair.publicKey,
          app: appPublicKey,
          appCreatorVault: creatorTransferVault,
          token: tokenPublicKey,
          tokenMint: tokenMint,
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
          token: tokenPublicKey,
          tokenMint: tokenMint,
          receiverVault: buyerTransferVault,
          payment: paymentPublicKey,
          paymentVault: paymentVaultPublicKey,
          buyerTokenVault: buyerTokenVault,
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
        app: appPublicKey,
        appCreatorVault: creatorTransferVault,
        token: tokenPublicKey,
        tokenMint: tokenMint,
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
    assert.equal(
      preTxSellerFunds.amount + BigInt(exemplars * tokenPrice),
      postTxSellerFunds.amount
    );
  });
});
