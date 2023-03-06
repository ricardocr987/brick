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
  buyerBalance?: number,
  sellerBalance?: number
) {
  const sellerKeypair = await createFundedWallet(provider, 20);
  const acceptedMintPublicKey = await createMint(provider);
  const offChainIdAux: string = uuid();
  const offChainId = offChainIdAux.substring(0, 32);
  const [assetMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("asset_mint", "utf-8"), 
      Buffer.from(offChainId, "utf-8"),
    ],
    program.programId
  );
  const [assetPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("asset", "utf-8"), assetMint.toBuffer()],
    program.programId
  );
  const buyerKeypair = await createFundedWallet(provider, 20);
  const buyerTokenVault = await getAssociatedTokenAddress(
    assetMint,
    buyerKeypair.publicKey
  );
  const connection = new Connection('https://api.testnet.solana.com', 'processed');
  const slot = await connection.getSlot();
  const buyTimestamp = new anchor.BN(await connection.getBlockTime(slot));
  const [paymentPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment", "utf-8"),
      assetMint.toBuffer(),
      buyerKeypair.publicKey.toBuffer(),
      buyTimestamp.toBuffer("le", 8),
    ],
    program.programId
  );
  const [paymentVaultPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("payment_vault", "utf-8"), paymentPublicKey.toBuffer()],
    program.programId
  );
  const secondBuyTimestamp = new anchor.BN(await connection.getBlockTime(slot) + 1);
  const [secondPaymentPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment", "utf-8"),
      assetMint.toBuffer(),
      buyerKeypair.publicKey.toBuffer(),
      secondBuyTimestamp.toBuffer("le", 8),
    ],
    program.programId
  );
  const [secondPaymentVaultPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("payment_vault", "utf-8"), secondPaymentPublicKey.toBuffer()],
    program.programId
  );
  let buyerTransferVault = undefined;
  let sellerTransferVault = undefined;
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

  return {
    sellerKeypair,
    acceptedMintPublicKey,
    offChainId,
    assetPublicKey,
    assetMint,
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
