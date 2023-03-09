import { METADATA_PROGRAM_ID_PK, mintFromSymbol } from "@/utils";
import { getTokenMintPubkey, getTokenPubkey, getMetadataPubkey, getAppPubkey } from "@/utils/helpers";
import { CreateTokenInstructionAccounts, CreateTokenInstructionArgs, createCreateTokenInstruction } from "@/utils/solita/instructions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { useState } from "react";

export const CreateToken = ({ connection }: { connection: Connection }) => {
    const { sendTransaction, publicKey } = useWallet()
    const [txnExplorer, setTxnExplorer] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [formCompleted, setFormCompleted] = useState(false)
    const [acceptedMint, setAcceptedMint] = useState(null)
    const [offChainId, setOffChainId] = useState(null)
    const [offChainMetadata, setOffChainmetadata] = useState(null)
    const [appName, setAppName] = useState(null)
    const [tokenPrice, setTokenPrice] = useState(null)
    const [refundTime, setRefundTime] = useState(null)
    const [exemplars, setExemplars] = useState(null)
    const [tokenName, setTokenName] = useState(null)
    const [tokenSymbol, setSymbol] = useState(null)
    const [tokenUri, setTokenUri] = useState(null)

    function handleInputChange() {
        setFormCompleted(
            acceptedMint !== null && offChainId !== null && offChainMetadata !== null && appName !== null 
            && tokenPrice !== null && refundTime !== null && exemplars !== null && tokenName !== null
            && tokenSymbol !== null && tokenUri !== null
        )
    }

    async function sendCreateTokenTransaction() {
        if (formCompleted) {
            setTxnExplorer(null)
            setIsSending(true)
    
            const offChainId1 = offChainId.slice(0, 32)
            let offChainId2 = offChainId.slice(32, 64)
            if (offChainId.length < 32) offChainId2 = ""
            const tokenMint = getTokenMintPubkey(offChainId1)
            const tokenAccount = getTokenPubkey(tokenMint)
            const appAccount = getAppPubkey(appName)
            const metadataAccount = getMetadataPubkey(tokenMint)
            console.log(acceptedMint)
            const accounts: CreateTokenInstructionAccounts = {
                metadataProgram: METADATA_PROGRAM_ID_PK,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
                authority: publicKey,
                app: appAccount,
                tokenMint: tokenMint,
                token: tokenAccount,
                acceptedMint: acceptedMint,
                tokenMetadata: metadataAccount,
            }
            const args: CreateTokenInstructionArgs = {
                offChainId: offChainId1,
                offChainId2: offChainId2,
                offChainMetadata: offChainMetadata,
                refundTimespan: new BN(refundTime),
                tokenPrice: Number(tokenPrice),
                exemplars: Number(exemplars),
                tokenName: tokenName,
                tokenSymbol: tokenSymbol,
                tokenUri: tokenUri,
            }
            const transaction = new Transaction().add(
                createCreateTokenInstruction(accounts, args)
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

    return (
        <div className="createToken">
            <div className="innerRow">
                <h1 style={{textAlign: "center"}}>CREATE TOKEN</h1>
            </div>
            <div className="innerRow">
                App name: <input className="input" value={appName} size={20} onChange={e => setAppName(e.target.value)} onBlur={handleInputChange} />
            </div>
            <div className="innerRow">
                Off chain id: <input className="input" value={offChainId} size={20} onChange={e => setOffChainId(e.target.value)} onBlur={handleInputChange} />
            </div>
            <div className="innerRow">
                Metadata: <input className="input" value={offChainMetadata} size={20} onChange={e => setOffChainmetadata(e.target.value)} onBlur={handleInputChange} />
            </div>
            <div className="innerRow">
                Refund timespan: <input className="input" value={refundTime} size={20} onChange={e => setRefundTime(e.target.value)} onBlur={handleInputChange} />
            </div>
            <div className="innerRow">
                Price: <input className="input" value={tokenPrice} size={20} onChange={e => setTokenPrice(e.target.value)} onBlur={handleInputChange} />
            </div>
            <div className="innerRow">
                Exemplars: <input className="input" value={exemplars} size={20} onChange={e => setExemplars(e.target.value)} onBlur={handleInputChange} />
            </div>
            <div className="innerRow">
                Token name: <input className="input" value={tokenName} size={20} onChange={e => setTokenName(e.target.value)} onBlur={handleInputChange} />
            </div>
            <div className="innerRow">
                Token symbol: <input className="input" value={tokenSymbol} size={20} onChange={e => setSymbol(e.target.value)} onBlur={handleInputChange} />
            </div>
            <div className="innerRow">
                Token uri: <input className="input" value={tokenUri} size={20} onChange={e => setTokenUri(e.target.value)} onBlur={handleInputChange} />
                </div>
            <div className="innerRow">
                <label> Select token to be paid </label>  
                <select className="input" onBlur={handleInputChange} onChange={ e => setAcceptedMint(new PublicKey(mintFromSymbol[e.target.value])) }>  
                    <option value="">Select token</option>
                    <option value="USDC"> USDC </option>  
                    <option value="SOL"> SOL </option>  
                </select>
            </div>
            <div className="innerRow">
                <button className="button" onClick={sendCreateTokenTransaction} disabled={(isSending && !formCompleted)}>
                    Create Token
                </button>
            </div>
            <div className="innerRow">
                { isSending && <h4> Sending transaction </h4> }
                { isSent && <h4> The transaction has processed! <a href={txnExplorer} style={{ color: 'black' }}>View Transaction</a> </h4> }
            </div>
        </div>
    )
}