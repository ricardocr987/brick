import { Program, AnchorProvider } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  createFundedWallet,
  createMint,
  createFundedAssociatedTokenAccount,
} from ".";
import { v4 as uuid } from "uuid";
import { Brick } from "../../target/types/brick";
import { Connection } from "@solana/web3.js";

export async function initNewAccounts(
  provider: AnchorProvider,
  program: Program<Brick>,
  appName: string,
  buyerBalance?: number,
  sellerBalance?: number,
  creatorBalance?: number
) {
  const appCreatorKeypair = await createFundedWallet(provider, 20);
  const sellerKeypair = await createFundedWallet(provider, 20);
  const acceptedMintPublicKey = await createMint(provider);
  const [appPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("app", "utf-8"), Buffer.from(appName, "utf-8")],
    program.programId
  );
  const offChainIdAux: string = uuid();
  const offChainId = offChainIdAux.substring(0, 32);
  const offChainId2 = offChainId;
  const [tokenMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("token_mint", "utf-8"), Buffer.from(offChainId, "utf-8")],
    program.programId
  );
  const [tokenPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("token", "utf-8"), tokenMint.toBuffer()],
    program.programId
  );
  const buyerKeypair = await createFundedWallet(provider, 20);
  const buyerTokenVault = await getAssociatedTokenAddress(
    tokenMint,
    buyerKeypair.publicKey
  );
  const connection = new Connection(
    "https://api.testnet.solana.com",
    "processed"
  );
  const slot = await connection.getSlot();
  const buyTimestamp = new anchor.BN(await connection.getBlockTime(slot));
  const [paymentPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment", "utf-8"),
      tokenMint.toBuffer(),
      buyerKeypair.publicKey.toBuffer(),
      buyTimestamp.toBuffer("le", 8),
    ],
    program.programId
  );
  const [paymentVaultPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("payment_vault", "utf-8"), paymentPublicKey.toBuffer()],
    program.programId
  );
  const secondBuyTimestamp = new anchor.BN(
    (await connection.getBlockTime(slot)) + 1
  );
  const [secondPaymentPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment", "utf-8"),
      tokenMint.toBuffer(),
      buyerKeypair.publicKey.toBuffer(),
      secondBuyTimestamp.toBuffer("le", 8),
    ],
    program.programId
  );
  const [secondPaymentVaultPublicKey] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_vault", "utf-8"),
        secondPaymentPublicKey.toBuffer(),
      ],
      program.programId
    );
  let buyerTransferVault = undefined;
  let sellerTransferVault = undefined;
  let creatorTransferVault = undefined;
  if (buyerBalance && sellerBalance) {
    buyerTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      acceptedMintPublicKey,
      buyerBalance,
      buyerKeypair
    );
    sellerTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      acceptedMintPublicKey,
      sellerBalance,
      sellerKeypair
    );
  }
  if (creatorBalance) {
    creatorTransferVault = await createFundedAssociatedTokenAccount(
      provider,
      acceptedMintPublicKey,
      creatorBalance,
      appCreatorKeypair
    );
  }

  return {
    appPublicKey,
    appCreatorKeypair,
    creatorTransferVault,
    sellerKeypair,
    acceptedMintPublicKey,
    offChainId,
    offChainId2,
    tokenPublicKey,
    tokenMint,
    buyerKeypair,
    buyerTokenVault,
    buyerTransferVault,
    sellerTransferVault,
    buyTimestamp,
    paymentPublicKey,
    paymentVaultPublicKey,
    secondBuyTimestamp,
    secondPaymentPublicKey,
    secondPaymentVaultPublicKey,
  };
}
