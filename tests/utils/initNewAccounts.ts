import { Program, AnchorProvider } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  createFundedWallet,
  createMint,
  createFundedAssociatedTokenAccount,
} from ".";
import { v4 as uuid } from "uuid";
import { TokenAccess } from "../../target/types/token_access";
import { Connection } from "@solana/web3.js";

export async function initNewAccounts(
  provider: AnchorProvider,
  program: Program<TokenAccess>,
  buyerBalance?: number,
  sellerBalance?: number
) {
  const sellerKeypair = await createFundedWallet(provider, 20);
  const acceptedMintPublicKey = await createMint(provider);
  const hashIdAux: string = uuid();
  const hashId = hashIdAux.substring(0, 32);
  const [assetMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("asset_mint", "utf-8"), Buffer.from(hashId, "utf-8")],
    program.programId
  );
  const [assetPublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("asset", "utf-8"), assetMint.toBuffer()],
    program.programId
  );
  const buyerKeypair = await createFundedWallet(provider, 20);
  const buyerMintedTokenVault = await getAssociatedTokenAddress(
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
    hashId,
    assetPublicKey,
    assetMint,
    buyerKeypair,
    buyerMintedTokenVault,
    buyerTransferVault,
    sellerTransferVault,
    buyTimestamp,
    paymentPublicKey,
    paymentVaultPublicKey,
  };
}
