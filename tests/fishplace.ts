import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import { BN } from "bn.js";
import { assert } from "chai";
import { Fishplace } from "../target/types/fishplace";
import {
  bundlrStorage,
  isMint,
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

  const aliceBalance = 5000;
  let aliceKeypair: anchor.web3.Keypair;
  let aliceAssociatedTokenAccount: anchor.web3.PublicKey;
  let aliceAssociatedTokenTokenToPayPublicKey: anchor.web3.PublicKey;
  let aliceAssociatedTokenMasterEditionPublicKey: anchor.web3.PublicKey;

  let masterEditionPublicKey: anchor.web3.PublicKey;
  let masterEditionMint: anchor.web3.PublicKey;

  before(async () => {
    [dataSetPublicKey] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("data_set", "utf-8"), dataSetBaseKeypair.publicKey.toBuffer()],
      program.programId
    );
    acceptedMintPublicKey = await createMint(provider);

    [masterEditionPublicKey] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("master_edition", "utf-8"), dataSetPublicKey.toBuffer(),],
      program.programId
    );
    [masterEditionMint] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("master_edition_mint", "utf-8"),
          dataSetPublicKey.toBuffer(),
          masterEditionPublicKey.toBuffer(),
        ],
        program.programId
      );
    
    aliceKeypair = await createFundedWallet(provider);
    /*aliceAssociatedTokenAccount = await createFundedAssociatedTokenAccount(
      provider,
      acceptedMintPublicKey,
      aliceBalance,
      aliceKeypair
    );*/
  })

  it("Create data set account:", async () => {
    const title = "Solana whales time series"
    const tx = await program.methods
      .createDataSet(title)
      .accounts({
        authority: provider.wallet.publicKey,
        dataSetBase: dataSetBaseKeypair.publicKey,
        mint: acceptedMintPublicKey,
      })
      .rpc();
    const dataSetAccount = await program.account.dataSet.fetch(dataSetPublicKey);

    assert.isDefined(tx);
    assert.isDefined(dataSetAccount);
    assert.equal(dataSetAccount.title, title);
    assert.isTrue(dataSetAccount.authority.equals(provider.wallet.publicKey));
  });

  it("Create a master edition to mint unlimited editions:", async () => {
    const masterEditionName = "Solana whales time series";
    const masterEditionSymbol = "SOL";
    const masterEditionUri = "https://aleph.im/876jkfbnewjdfjn";
    const masterEditionPrice = 5;
    const masterEditionQuantity = 0;
    const tx = await program.methods
      .createMasterEdition(
        masterEditionName,
        masterEditionSymbol,
        masterEditionUri,
        masterEditionPrice,
        masterEditionQuantity,
      )
      .accounts({
        metadataProgram: metadataProgramPublicKey,
        authority: provider.wallet.publicKey,
        dataSetBase: dataSetBaseKeypair.publicKey,
        dataSet: dataSetPublicKey,
      })
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
      .findByMint({mintAddress: masterEditionMint});

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
      assert.equal(metaplexNft.mint.decimals, 0);
      assert.isTrue(metaplexNft.mint.supply.basisPoints.eq(new anchor.BN(0)));
      assert.equal(metaplexNft.json.name, masterEditionName);
      assert.equal(metaplexNft.json.symbol, masterEditionSymbol);
      assert.equal(metaplexNft.json.uri, masterEditionUri);
    }
  });
});
