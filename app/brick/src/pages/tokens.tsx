import { HoldingTokens } from "@/components/pages/HoldingTokens";
import { SellingTokens } from "@/components/pages/SellingTokens";
import { ACCOUNTS_DATA_LAYOUT, AccountType, TokenMetadataArgs, BRICK_PROGRAM_ID_PK, ACCOUNT_DISCRIMINATOR, PaymentArgs, WithdrawFundsInstructionAccounts, createWithdrawFundsInstruction, AppArgs, withdrawComputeUnits } from "@/utils";
import { getPaymentPubkey, getPaymentVaultPubkey, getTokenPubkey } from "@/utils/helpers";
import { TokensWithMetadata } from "@/utils/types";
import { Metaplex, Sft } from "@metaplex-foundation/js";
import { AccountLayout, getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { ComputeBudgetProgram, Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import bs58 from "bs58";
import { useEffect, useState } from "react";

async function getTokens(publicKey: PublicKey, connection: Connection) {
    const tokensData: TokensWithMetadata[] = []
    const tokensOnSale: TokensWithMetadata[] = []
    const metaplex = new Metaplex(connection)
    const [walletTokens, encodedTokensOnSale] = await Promise.all([
        connection.getTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }),
        connection.getProgramAccounts(
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
                        bytes: publicKey.toString(),
                        offset: 136, // authority offset, to get tokens this user is selling
                    },
                },
                ],
            },
        ),
    ])

    const tokenPromises = walletTokens.value.map(async (tokenAccount) => {
        try {
            const accountInfo = await connection.getAccountInfo(tokenAccount.pubkey)
            if (accountInfo && accountInfo.data){
                const accountData = AccountLayout.decode(accountInfo.data)
                const tokenPubkey = getTokenPubkey(accountData.mint)
                const tokenInfo = await connection.getAccountInfo(tokenPubkey)
                if (tokenInfo != null) {
                    const token = ACCOUNTS_DATA_LAYOUT[AccountType.TokenMetadata].deserialize(tokenInfo.data)[0]
                    const metadata = await metaplex.nfts().findByMint({ mintAddress: accountData.mint }) as Sft
                    tokensData.push({ token, metadata })
                }
            } else {
                console.log('accountInfo or its data is undefined')
            }
        } catch (e) {
            console.log(e)
        }
    })
    
    encodedTokensOnSale.forEach(async (tokenAccount) => {
        const token = ACCOUNTS_DATA_LAYOUT[AccountType.TokenMetadata].deserialize(tokenAccount.account.data)[0]
        const metadata = await metaplex.nfts().findByMint({ mintAddress: token.tokenMint }) as Sft
        tokensOnSale.push({ token, metadata })
    })

    await Promise.all([...tokenPromises, encodedTokensOnSale])

    return { tokensData, tokensOnSale } 
}

async function getWithdrawals(publicKey: PublicKey, connection: Connection) {
    const availableWithdrawals: (PaymentArgs & { pubkey: PublicKey })[] = []
    const paymentAccounts = await connection.getProgramAccounts(
        BRICK_PROGRAM_ID_PK,
        {
            filters: [
                {
                    memcmp: {
                        bytes: bs58.encode(ACCOUNT_DISCRIMINATOR[AccountType.Payment]),
                        offset: 0,
                    },
                },
                {
                    memcmp: {
                        bytes: publicKey.toString(),
                        offset: 104, // authority offset, to get tokens this user is selling
                    },
                },
            ],
        },
    )

    const actualTimestamp = Math.floor(Date.now() / 1000)
    paymentAccounts.map((payment) => {
        try { // I updated the payment data, cant deserialize the older ones
            const decodedPayment: PaymentArgs = ACCOUNTS_DATA_LAYOUT[AccountType.Payment].deserialize(payment.account.data)[0]
            // Number(decodedPayment.refundConsumedAt).toString().length < 13 i fucked up with the timestamp digits and created accounts with ms timestamp
            if (Number(decodedPayment.refundConsumedAt).toString().length < 13 && Number(decodedPayment.refundConsumedAt) < actualTimestamp) {
                availableWithdrawals.push({ pubkey: payment.pubkey, ...decodedPayment })
            }
        } catch(e) {
            console.log(e)
        }
    })

    return availableWithdrawals
}

const UserTokensPage = () => {
    const { publicKey, sendTransaction, connected } = useWallet()
    const connection = new Connection(process.env.RPC, "confirmed")    
    const [tokens, setTokens] = useState([]);
    const [tokensOnSale, setTokenOnSale] = useState([]);
    const [withdrawals, setWithdrawal] = useState([]);
    const [isSent, setSent] = useState(false);
    const [isSending, setSending] = useState(false);
    const [txnExplorer, setTxnExplorer] = useState(null);

    useEffect(() => {
        const setAccountState = async () => {
            if (connected) {
                const { tokensData, tokensOnSale } = await getTokens(publicKey, connection)
                setTokens(tokensData)
                setTokenOnSale(tokensOnSale)
                const withdrawals = await getWithdrawals(publicKey, connection)
                setWithdrawal(withdrawals)
            }
        }
        setAccountState()
    }, [connected]);

    const sendWithdrawalTransaction = async (paymentsAccounts: (PaymentArgs & { pubkey: PublicKey })[]) => {
        setSending(true);
        setTxnExplorer(null)

        console.log(paymentsAccounts)
        const transaction = new Transaction()
        await Promise.all(paymentsAccounts.map(async (account) => {
            const encodedTokenAccount = await connection.getAccountInfo(account.tokenAccount)
            const decodedTokenAccount: TokenMetadataArgs = ACCOUNTS_DATA_LAYOUT[AccountType.TokenMetadata].deserialize(encodedTokenAccount.data)[0]
            const paymentVault = getPaymentVaultPubkey(account.pubkey)
            const receiverVault = await getAssociatedTokenAddress(account.paidMint, publicKey)
            const appAccount = await connection.getAccountInfo(decodedTokenAccount.app)
            const decodedAppAccount: AppArgs = ACCOUNTS_DATA_LAYOUT[AccountType.App].deserialize(appAccount.data)[0]
            const appCreatorVault = await getAssociatedTokenAddress(account.paidMint, decodedAppAccount.authority)
            const accounts: WithdrawFundsInstructionAccounts = {
                tokenProgram: TOKEN_PROGRAM_ID,
                authority: publicKey,
                app: decodedTokenAccount.app,
                appCreatorVault: appCreatorVault,
                token: account.tokenAccount,
                tokenMint: account.tokenMint,
                receiverVault: receiverVault,
                buyer: account.buyer,
                payment: account.pubkey,
                paymentVault: paymentVault,
            }
            transaction.add(createWithdrawFundsInstruction(accounts))
        }))
        let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.recentBlockhash = blockhash;
        try {
            const signature = await sendTransaction(
                transaction,
                connection,
            )
            setSent(true)
            setSending(false);
            setTxnExplorer(`https://solana.fm/tx/${signature}`)
        } catch(e) {
            console.log(e)
            setSending(false);
        }
    }
    
    return (
        <div className="tokens">
            <h1 style={{fontSize: "20px"}}>TOKENS LISTED BY YOU</h1>
            <button
                className="withdrawButton"
                onClick={() => {
                    setSending(true)
                    sendWithdrawalTransaction(withdrawals)
                }}
                disabled={isSending || isSent || !connected}
            >
                {isSent && (
                    <h4 style={{ fontSize: "13px" }}>
                    <a href={txnExplorer}>View Txn</a>
                    </h4>
                )}
                {isSending && (
                    <h4 style={{ fontSize: "13px" }}> Sending </h4>
                )}
                {!isSending && !isSent && (
                    <h4 style={{ fontSize: "13px" }}> WITHDRAW </h4>
                )}
            </button>
            <div className="tokensRow">
                <SellingTokens connection={connection} tokens={tokensOnSale}/>
            </div>
            <h1 style={{fontSize: "20px"}}>TOKENS BOUGHT USING BRICK</h1>
            <div className="tokensRow">
                <HoldingTokens connection={connection} tokens={tokens}/>
            </div>
        </div>
    )
};

export default UserTokensPage;
