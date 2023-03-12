import { getTokenPubkey } from "@/utils/helpers";
import { ShareTokenInstructionAccounts, createShareTokenInstruction, ShareTokenInstructionArgs, EditTokenPriceInstructionAccounts, EditTokenPriceInstructionArgs, createEditTokenPriceInstruction } from "@/utils/solita/instructions";
import { TokensWithMetadata } from "@/utils/types";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { useState } from "react";

export const SellingTokens = ({ connection, tokens }: { connection: Connection, tokens: TokensWithMetadata[] }) => {
    const { sendTransaction, publicKey, connected } = useWallet()
    const [txnExplorer, setTxnExplorer] = useState("")
    const [isSendingEdit, setIsSendingEdit] = useState(false)
    const [isSentEdit, setIsSentEdit] = useState(false)
    const [isSendingShare, setIsSendingShare] = useState(false)
    const [isSentShare, setIsSentShare] = useState(false)


    const sendShareTokenTransaction = async (tokenMint: PublicKey, acceptedMint: PublicKey) => {
        setTxnExplorer(null)
        setIsSendingShare(true)

        const tokenAccount = getTokenPubkey(tokenMint)
        const receiverVault = await getAssociatedTokenAddress(tokenMint, publicKey)
        const accounts: ShareTokenInstructionAccounts = {
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            authority: publicKey,
            token: tokenAccount,
            tokenMint: tokenMint,
            receiverVault: receiverVault,
        }
        const args: ShareTokenInstructionArgs = {
            exemplars: 1,
        }
        const transaction = new Transaction().add(
            createShareTokenInstruction(accounts, args)
        )
        let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.recentBlockhash = blockhash;
        const signature = await sendTransaction(
            transaction,
            connection,
        )
    
        setTxnExplorer(`https://solana.fm/tx/${signature}`)
        setIsSentShare(true)
        setIsSendingShare(false)
    }

    const sendEditPriceTransaction = async (tokenMint: PublicKey) => {
        setTxnExplorer(null)
        setIsSendingEdit(true)

        const tokenAccount = getTokenPubkey(tokenMint)
        const accounts: EditTokenPriceInstructionAccounts = {
            authority: publicKey,
            token: tokenAccount,
        }
        const args: EditTokenPriceInstructionArgs = { tokenPrice: 1}
        const transaction = new Transaction().add(createEditTokenPriceInstruction(accounts, args))
        let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.recentBlockhash = blockhash;
        const signature = await sendTransaction(
            transaction,
            connection,
        )
    
        setTxnExplorer(`https://solana.fm/tx/${signature}`)
        setIsSentEdit(true)
        setIsSendingEdit(false)
    }

    return (
        <>
            {tokens.map((token: TokensWithMetadata) => (
                <div className="innerContainer" key={token.token.tokenMint.toString()}>
                    <a href={`https://solana.fm/address/${token.token.tokenMint.toString()}`}>
                        <img className="imgContainer" src={token.metadata.json.image} />
                    </a>
                    <div className="innerRow">
                        <button className="tokensButton" onClick={() => sendEditPriceTransaction(token.token.tokenMint)} disabled={isSendingEdit && !connected}>
                            { !isSendingEdit && !isSentEdit && <h4 style={{ fontSize: '13px' }}> BURN </h4> }
                            { isSendingEdit && <h4 style={{ fontSize: '13px' }}> Sending </h4> }
                            { isSentEdit && <h4 style={{ fontSize: '13px' }}> <a href={txnExplorer}>View Txn</a> </h4>}
                        </button>
                        <button className="tokensButton" onClick={() => sendShareTokenTransaction(token.token.tokenMint, token.token.sellerConfig.acceptedMint)} disabled={isSendingShare && !connected}>
                            { !isSendingShare && !isSentShare && <h4 style={{ fontSize: '13px' }}> REFUND </h4> }
                            { isSendingShare && <h4 style={{ fontSize: '13px' }}> Sending </h4> }
                            { isSentShare && <h4 style={{ fontSize: '13px' }}> <a href={txnExplorer}>View Txn</a> </h4>}
                        </button>
                    </div>
                </div>
            ))}
        </>
    )
}