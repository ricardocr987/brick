import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
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
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";
import {
  createFundedWallet,
  createMint,
  createFundedAssociatedTokenAccount,
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

  const dataSetBaseKeypair = anchor.web3.Keypair.generate();
  let dataSetPublicKey: anchor.web3.PublicKey;
  let acceptedMintPublicKey: anchor.web3.PublicKey;
  let masterEditionPublicKey: anchor.web3.PublicKey;
  let masterEditionMint: anchor.web3.PublicKey;

  const sellerBalance = 2;
  let sellerKeypair: anchor.web3.Keypair;
  let sellerTokenAccountToBePaidPublicKey: anchor.web3.PublicKey;
  const buyerBalance = 5;
  let buyerKeypair: anchor.web3.Keypair;
  let buyerAssociatedTokenToPayPublicKey: anchor.web3.PublicKey;
  let buyerAssociatedTokenMasterEditionPublicKey: anchor.web3.PublicKey;

  before(async () => {
    // Program accounts: (program creates dataSet & masterEdition accounts (metaplex accounts apart))
    [dataSetPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("data_set", "utf-8"),
        dataSetBaseKeypair.publicKey.toBuffer(),
      ],
      program.programId
    );
    acceptedMintPublicKey = await createMint(provider);
    [masterEditionPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("master_edition", "utf-8"), dataSetPublicKey.toBuffer()],
      program.programId
    );
    [masterEditionMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("master_edition_mint", "utf-8"),
        dataSetPublicKey.toBuffer(),
        masterEditionPublicKey.toBuffer(),
      ],
      program.programId
    );
    // Seller token account to receive funds
    sellerKeypair = await createFundedWallet(provider);
    sellerTokenAccountToBePaidPublicKey =
      await createFundedAssociatedTokenAccount(
        provider,
        acceptedMintPublicKey,
        sellerBalance,
        sellerKeypair
      );

    // Buyer wallet & ata's:
    buyerKeypair = await createFundedWallet(provider);
    buyerAssociatedTokenToPayPublicKey =
      await createFundedAssociatedTokenAccount(
        provider,
        acceptedMintPublicKey,
        buyerBalance,
        buyerKeypair
      );
    buyerAssociatedTokenMasterEditionPublicKey =
      await getAssociatedTokenAddress(
        masterEditionMint,
        buyerKeypair.publicKey
      );
  });

  it("Create data set account:", async () => {
    const title = "Solana whales time series";
    const tx = await program.methods
      .createDataSet(title)
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
    assert.equal(dataSetAccount.title, title);
    assert.isTrue(dataSetAccount.authority.equals(sellerKeypair.publicKey));
  });

  it("Create a master edition to mint unlimited editions:", async () => {
    const masterEditionName = "Solana whales time series";
    const masterEditionSymbol = "SOL";
    const masterEditionUri = "https://aleph.im/876jkfbnewjdfjn";
    const masterEditionPrice = 1;
    const masterEditionQuantity = 0;

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
    assert.equal(masterEditionAccount.sold, 0);
    assert.isDefined(masterEditionMintAccount);
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

  it("Buys data set master edition copy:", async () => {
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
      .buyDataSet()
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
      preTxBuyerFunds.amount - BigInt(masterEditionAccount.price)
    );
    // Assert seller token account changed
    assert.isDefined(preTxSellerFunds);
    assert.isDefined(postTxSellerFunds);
    assert.equal(
      postTxSellerFunds.amount,
      preTxSellerFunds.amount + BigInt(masterEditionAccount.price)
    );
    // Assert master edition account values changed
    assert.isDefined(buyerAssociatedTokenMasterEditionPublicKey);
    assert.equal(sellerMasterEditionAccount.amount, BigInt(1));
    assert.isDefined(nftMint);
    assert.equal(nftMint.supply, BigInt(1));
  });
});
