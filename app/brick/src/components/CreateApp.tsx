import { getAppPubkey } from "@/utils/helpers";
import { CreateAppInstructionAccounts, createCreateAppInstruction, CreateAppInstructionArgs } from "@/utils/solita/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { useState } from "react";

export const CreateApp = ({ connection }: { connection: Connection }) => {
    const { sendTransaction, publicKey } = useWallet()
    const [txnExplorer, setTxnExplorer] = useState(null)
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [formCompleted, setFormCompleted] = useState(false)
    const [appName, setAppName] = useState(null)
    const [fee, setFee] = useState(null)

    function handleInputChange() {
        setFormCompleted(setAppName !== null && fee !== null)
    }

    const sendCreateAppTransaction = async () => {
        if (formCompleted) {
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
        
            setTxnExplorer(`https://solana.fm/tx/${signature}`)
            setIsSent(true)
            setIsSending(false)
        }
    }

    const handleAppName = ( e: any ) => {
        setAppName(e.target.value)
    }
    const handleFee = ( e: any ) => {
        setFee(e.target.value)
    }

    return (
        <div className="createApp">
            <div className="innerRow">
                <h1 style={{textAlign: "center"}}>CREATE APP</h1>
            </div>
            <div className="innerRow">
                App name: <input className="input" value={appName} size={20} onChange={handleAppName} onBlur={handleInputChange}/>
            </div>
            <div className="innerRow">
                Basis fee points: <input className="input" value={fee} size={20} onChange={handleFee} onBlur={handleInputChange}/>
            </div>
            <div className="innerRow">
                <button className="button" onClick={sendCreateAppTransaction} disabled={isSending && !formCompleted}>
                    Create App
                </button>
            </div>
            <div className="innerRow">
                { isSending && <h4 style={{ fontSize: '13px' }}> Sending transaction </h4> }
                { isSent && <h4 style={{ fontSize: '13px' }}> The transaction has processed! <a href={txnExplorer} style={{ color: 'black' }}>View Transaction</a> </h4> }
            </div>
        </div>
    )
}