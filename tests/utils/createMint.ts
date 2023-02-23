import { AnchorProvider, web3 } from "@project-serum/anchor";
import {
  createInitializeMintInstruction,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const createMint = async (
  provider: AnchorProvider,
  decimals = 0
): Promise<web3.PublicKey> => {
  const assetMint = new web3.Keypair();
  const lamportsForMint =
    await provider.connection.getMinimumBalanceForRentExemption(
      MintLayout.span
    );

  // Allocate mint and wallet account
  await provider.sendAndConfirm(
    new web3.Transaction()
      .add(
        web3.SystemProgram.createAccount({
          programId: TOKEN_PROGRAM_ID,
          space: MintLayout.span,
          fromPubkey: provider.wallet.publicKey,
          newAccountPubkey: assetMint.publicKey,
          lamports: lamportsForMint,
        })
      )
      .add(
        createInitializeMintInstruction(
          assetMint.publicKey,
          decimals,
          provider.wallet.publicKey,
          provider.wallet.publicKey
        )
      ),
    [assetMint]
  );
  return assetMint.publicKey;
};
