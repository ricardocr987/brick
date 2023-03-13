import { ACCOUNTS_DATA_LAYOUT, AccountType, ACCOUNT_DISCRIMINATOR, BRICK_PROGRAM_ID_PK, BuyTokenInstructionAccounts, BuyTokenInstructionArgs, createBuyTokenInstruction, getAppPubkey, getMetadataPubkey, getPaymentPubkey, getPaymentVaultPubkey, getTokenPubkey, TokenMetadataArgs } from "@/utils";
import { Connection, PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { useRouter } from "next/router"
import { useEffect, useState } from "react";
import { Metaplex, Sft } from "@metaplex-foundation/js";
import { TokensWithMetadata } from "@/utils/types";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import BN from "bn.js";

async function getTokens(appName: string, connection: Connection): Promise<TokensWithMetadata[]> {
    const tokensData: TokensWithMetadata[] = []
    const appAddress = getAppPubkey(appName)
    const metaplex = new Metaplex(connection)
    const encodedAppTokens = await connection.getProgramAccounts(
        BRICK_PROGRAM_ID_PK,
        {
            filters: [
                {
                    memcmp: {
                        bytes: bs58.encode(ACCOUNT_DISCRIMINATOR[AccountType.TokenMetadata]),
                        offset: 0,
                    },
                },
                {
                    memcmp: {
                        bytes: appAddress.toString(),
                        offset: 72, // authority offset, to get tokens this user is selling
                    },
                },
            ],
        },
    )

    await Promise.all(encodedAppTokens.map(async (tokenAccount) => {
        const token = ACCOUNTS_DATA_LAYOUT[AccountType.TokenMetadata].deserialize(tokenAccount.account.data)[0]
        const metadata = await metaplex.nfts().findByMint({ mintAddress: token.tokenMint }) as Sft
        tokensData.push({ token, metadata })
    }))

    return tokensData
}

const AppPage = () => {
    const router = useRouter()
    const appName = router.query.app
    const connection = new Connection(process.env.RPC, "confirmed")
    const { sendTransaction, publicKey, connected } = useWallet()
    const [buttonStates, setButtonStates] = useState([]);
    const [tokens, setTokens] = useState<TokensWithMetadata[]>([])
    
    useEffect(() => {
        if (!router.isReady) return
        const setAccountState = async () => {
            const tokensData = await getTokens(appName as string, connection)
            setTokens(tokensData)
        }
        setAccountState()
    }, []);

    useEffect(() => {
        const initButtonState = async () => {
            const newButtonStates = tokens.map(() => ({
                isSending: false,
                isSent: false,
                txnExplorer: null,
            }));
            setButtonStates(newButtonStates);
        };
        initButtonState()
    }, [tokens]);

    const sendBuyTokenTransaction = async (tokenMint: PublicKey, acceptedMint: PublicKey, index: number) => {
        const newButtonStates = [...buttonStates];
        newButtonStates[index].isSending = true;
        newButtonStates[index].txnExplorer = null;
        setButtonStates(newButtonStates);

        const tokenAccount = getTokenPubkey(tokenMint)
        const buyerTokenVault = await getAssociatedTokenAddress(tokenMint, publicKey)
        const buyerTransferVault = await getAssociatedTokenAddress(acceptedMint, publicKey)
        const buyTimestamp = new BN(Math.floor(Date.now() / 1000))
        const payment = getPaymentPubkey(tokenMint, publicKey, Buffer.from(buyTimestamp.toArray('le', 8)))
        const paymentVault = getPaymentVaultPubkey(payment)
        const accounts: BuyTokenInstructionAccounts = {
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            clock: SYSVAR_CLOCK_PUBKEY,
            authority: publicKey,
            token: tokenAccount,
            tokenMint: tokenMint,
            buyerTransferVault: buyerTransferVault,
            acceptedMint: acceptedMint,
            payment: payment,
            paymentVault: paymentVault,
            buyerTokenVault: buyerTokenVault,
        }
        const args: BuyTokenInstructionArgs = { timestamp: buyTimestamp }
        try {
            const transaction = new Transaction().add(createBuyTokenInstruction(accounts, args))
            let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
            transaction.recentBlockhash = blockhash;
            const signature = await sendTransaction(
                transaction,
                connection,
            )
            const newButtonStates = [...buttonStates];
            newButtonStates[index].isSent = true;
            newButtonStates[index].isSending = false;
            newButtonStates[index].txnExplorer = (`https://solana.fm/tx/${signature}`)
            setButtonStates(newButtonStates);
        } catch {
            newButtonStates[index].isSending = false;
            setButtonStates(newButtonStates);
        }
    }
    
    return (
        <div className="apps">
            {tokens.map((token: TokensWithMetadata, index: number) => (
                <div className="innerContainer" key={token.token.tokenMint.toString()}>
                    <a href={`https://solana.fm/address/${token.token.tokenMint.toString()}`}>
                        { token.metadata.json ?  <img className="imgContainer" src={token.metadata.json.image} /> : <img className="imgContainer" src={"https://arweave.net/VASpc3F7nSNF9IvoVtbZfoasmutUowrYLXxNz_rsKK4"} />}
                    </a>
                    <button className="tokensButton" onClick={() => sendBuyTokenTransaction(token.token.tokenMint, token.token.sellerConfig.acceptedMint, index)} disabled={buttonStates[index]?.isSending || buttonStates[index]?.isSent || !connected}>
                        {buttonStates[index]?.isSent && (
                            <h4 style={{ fontSize: "13px" }}>
                                <a href={buttonStates[index]?.txnExplorer}>View Txn</a>
                            </h4>
                        )}
                        {buttonStates[index]?.isSending && (
                            <h4 style={{ fontSize: "13px" }}> Sending </h4>
                        )}
                        {!buttonStates[index]?.isSending && !buttonStates[index]?.isSent && (
                            <h4 style={{ fontSize: "13px" }}> BUY </h4>
                        )}
                    </button>
                </div>
            ))}
        </div>
    )
};

export default AppPage;