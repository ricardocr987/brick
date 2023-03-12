import { ACCOUNTS_DATA_LAYOUT, AccountType, ACCOUNT_DISCRIMINATOR, BRICK_PROGRAM_ID_PK, PaymentArgs } from "@/utils";
import { getTokenPubkey } from "@/utils/helpers";
import { UseTokenInstructionAccounts, createUseTokenInstruction, RefundInstructionAccounts, createRefundInstruction } from "@/utils/solita/instructions";
import { TokensWithMetadata } from "@/utils/types";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { useState } from "react";

type GetPaymentAccount = {
    paymentPubKey: PublicKey,
    paidMint: PublicKey
}
async function getPaymentAccount(connection: Connection, receiver: PublicKey, tokenMint: PublicKey): Promise<GetPaymentAccount> {
    const paymentEnconded = await connection.getProgramAccounts(
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
                        bytes: receiver.toString(),
                        offset: 40,
                    },
                },
                {
                    memcmp: {
                        bytes: tokenMint.toString(),
                        offset: 72,
                    },
                },
            ],
        },
    )
    const decoded = ACCOUNTS_DATA_LAYOUT[AccountType.Payment].deserialize(paymentEnconded[0][1].account.data)[0] as PaymentArgs
    return {
        paymentPubKey: paymentEnconded[0][0],
        paidMint: decoded.paidMint,
    }
}
export const HoldingTokens = ({ connection, tokens }: { connection: Connection, tokens: TokensWithMetadata[] }) => {
    const { sendTransaction, publicKey, connected } = useWallet()
    const [txnExplorer, setTxnExplorer] = useState("")
    const [isSendingBurn, setIsSendingBurn] = useState(false)
    const [isSentBurn, setIsSentBurn] = useState(false)
    const [isSendingRefund, setIsSendingRefund] = useState(false)
    const [isSentRefund, setIsSentRefund] = useState(false)

    const sendUseTokenTransaction = async (tokenMint: PublicKey) => {
        setTxnExplorer(null)
        setIsSendingBurn(true)

        const tokenAccount = getTokenPubkey(tokenMint)
        const buyerTokenVault = await getAssociatedTokenAddress(tokenMint, publicKey)
        const accounts: UseTokenInstructionAccounts = {
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            authority: publicKey,
            token: tokenAccount,
            tokenMint: tokenMint,
            buyerTokenVault: buyerTokenVault,
        }
        const transaction = new Transaction().add(
            createUseTokenInstruction(accounts)
        )
        let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.recentBlockhash = blockhash;
        const signature = await sendTransaction(
            transaction,
            connection,
        )
    
        setTxnExplorer(`https://solana.fm/tx/${signature}`)
        setIsSentBurn(true)
        setIsSendingBurn(false)
    }

    const sendRefundTransaction = async (tokenMint: PublicKey, acceptedMint: PublicKey) => {
        setTxnExplorer(null)
        setIsSendingRefund(true)

        const tokenAccount = getTokenPubkey(tokenMint)
        const buyerTokenVault = await getAssociatedTokenAddress(tokenMint, publicKey)
        const { paymentPubKey, paidMint } = await getPaymentAccount(connection, publicKey, tokenMint)
        const receiverVault = await getAssociatedTokenAddress(paidMint, publicKey)
        const paymentVault = await getAssociatedTokenAddress(tokenMint, paymentPubKey)
        const accounts: RefundInstructionAccounts = {
            tokenProgram: TOKEN_PROGRAM_ID,
            authority: publicKey,
            token: tokenAccount,
            tokenMint: tokenMint,
            receiverVault: receiverVault,
            payment: paymentPubKey,
            paymentVault: paymentVault,
            buyerTokenVault: buyerTokenVault,
        }
        const transaction = new Transaction().add(
            createRefundInstruction(accounts)
        )
        let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.recentBlockhash = blockhash;
        const signature = await sendTransaction(
            transaction,
            connection,
        )
    
        setTxnExplorer(`https://solana.fm/tx/${signature}`)
        setIsSentRefund(true)
        setIsSendingRefund(false)
    }

    return (
        <>
            {tokens.map((token: TokensWithMetadata) => (
                <div className="innerContainer" key={token.token.tokenMint.toString()}>
                    <a href={`https://solana.fm/address/${token.token.tokenMint.toString()}`}>
                        <img className="imgContainer" src={token.metadata.json.image} />
                    </a>
                    <div className="innerRow">
                        <button className="tokensButton" onClick={() => sendUseTokenTransaction(token.token.tokenMint)} disabled={isSendingBurn && !connected}>
                            { !isSendingBurn && !isSentBurn && <h4 style={{ fontSize: '13px' }}> BURN </h4> }
                            { isSendingBurn && <h4 style={{ fontSize: '13px' }}> Sending </h4> }
                            { isSentBurn && <h4 style={{ fontSize: '13px' }}> <a href={txnExplorer}>View Txn</a> </h4>}
                        </button>
                        <button className="tokensButton" onClick={() => sendRefundTransaction(token.token.tokenMint, token.token.sellerConfig.acceptedMint)} disabled={isSendingRefund && !connected}>
                            { !isSendingRefund && !isSentRefund && <h4 style={{ fontSize: '13px' }}> REFUND </h4> }
                            { isSendingRefund && <h4 style={{ fontSize: '13px' }}> Sending </h4> }
                            { isSentRefund && <h4 style={{ fontSize: '13px' }}> <a href={txnExplorer}>View Txn</a> </h4>}
                        </button>
                    </div>
                </div>
            ))}
        </>
    )
}