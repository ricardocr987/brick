import { getAppPubkey } from "@/utils/helpers";
import { CreateAppInstructionAccounts, createCreateAppInstruction, CreateAppInstructionArgs } from "@/utils/solita/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { useState } from "react";

export const CreateApp = () => {
    const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/UKpJEi5xcwjCtOXHye7pjfnkhbOUOqM2', "confirmed")    
    const { sendTransaction, publicKey } = useWallet()
    const [txnExplorer, setTxnExplorer] = useState(null)
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [appName, setAppName] = useState(null)
    const [fee, setFee] = useState('')

    const sendCreateAppTransaction = async () => {
        setTxnExplorer(null)
        setIsSending(true)

        const appAccount = getAppPubkey(appName)
        const accounts: CreateAppInstructionAccounts = {
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            authority: publicKey,
            app: appAccount,
        }

        const args: CreateAppInstructionArgs = {
            appName: appName,
            feeBasisPoints: Number(fee),
        }

        const transaction = new Transaction().add(
            createCreateAppInstruction(accounts, args)
        )
        let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
        transaction.recentBlockhash = blockhash;

        const signature = await sendTransaction(
            transaction,
            connection,
        )
    
        setTxnExplorer(`https://explorer.solana.com/tx/${signature}`)
        setIsSent(true)
        setIsSending(false)
    }

    const handleAppName = ( e: any ) => {
        setAppName(e.target.value)
    }
    const handleFee = ( e: any ) => {
        setFee(e.target.value)
    }

    return (
        <div className="createApp">
            <div className="row">
                <h1>CREATE APP:</h1>
            </div>
            <div className="row">
                App name: <input className="input" value={appName} size={20} onChange={handleAppName} />
            </div>
            <div className="row">
                Basis fee points: <input className="input" value={fee} size={20} onChange={handleFee} />
            </div>
            <div className="buttonContainer">
                <button className="button" onClick={sendCreateAppTransaction} disabled={isSending}>
                    Create App
                </button>
            </div>
            <div>
                { isSent && <h1> The transaction has processed! {txnExplorer} </h1> }
                { isSending && <h1> Sending transaction </h1> }
            </div>
        </div>
    )
}