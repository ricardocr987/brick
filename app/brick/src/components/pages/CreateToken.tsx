import { decimalsFromPubkey, METADATA_PROGRAM_ID_PK, mintFromSymbol } from "@/utils";
import { getTokenMintPubkey, getTokenPubkey, getMetadataPubkey, getAppPubkey } from "@/utils/helpers";
import { CreateTokenInstructionAccounts, CreateTokenInstructionArgs, createCreateTokenInstruction } from "@/utils/solita/instructions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { useState } from "react";

export const CreateToken = ({ connection }: { connection: Connection }) => {
    const { sendTransaction, publicKey, connected } = useWallet()
    const [txnExplorer, setTxnExplorer] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [formCompleted, setFormCompleted] = useState(false)
    const [acceptedMint, setAcceptedMint] = useState(new PublicKey(mintFromSymbol['USDC']))
    const [offChainId, setOffChainId] = useState("")
    const [offChainMetadata, setOffChainmetadata] = useState("")
    const [appName, setAppName] = useState("")
    const [tokenPrice, setTokenPrice] = useState("")
    const [refundTime, setRefundTime] = useState("")
    const [exemplars, setExemplars] = useState("")
    const [tokenName, setTokenName] = useState("")
    const [tokenSymbol, setSymbol] = useState("")
    const [tokenUri, setTokenUri] = useState("")

    function handleInputChange() {
        setFormCompleted(
            offChainId !== "" && offChainMetadata !== "" && appName !== "" 
            && tokenPrice !== "" && refundTime !== "" && exemplars !== "" 
            && tokenName !== "" && tokenSymbol !== "" && tokenUri !== ""
        )
    }

    async function sendCreateTokenTransaction() {
        if (formCompleted) {
            setTxnExplorer(null)
            setIsSending(true)
    
            if (!tokenUri.includes('arweave')) setTokenUri('https://arweave.net/8B4J8VmfJ9-zwWLz8XgGY8V8qa-xEMDAhol411cJjkk')
            const acceptedMintDecimals = decimalsFromPubkey[acceptedMint.toString()]
            const parsedNumber = parseFloat(tokenPrice.replace(/,/g, ''))
            const standardizedNumber = parsedNumber * Math.pow(10, acceptedMintDecimals)
            const offChainId1 = offChainId.slice(0, 32)
            let offChainId2 = offChainId.slice(32, 64)
            if (offChainId.length < 32) offChainId2 = ""
            const tokenMint = getTokenMintPubkey(offChainId1)
            const tokenAccount = getTokenPubkey(tokenMint)
            const appAccount = getAppPubkey(appName)
            const metadataAccount = getMetadataPubkey(tokenMint)
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
                refundTimespan: new BN(Number(refundTime)),
                tokenPrice: standardizedNumber,// to convert it to the right amount
                exemplars: Number(exemplars),
                tokenName: tokenName,
                tokenSymbol: tokenSymbol,
                tokenUri: tokenUri,
            }
            console.log(Number(refundTime))
            try {
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
            } catch {
                setIsSending(false)
            }
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
                    <option value="SOL"> SOL </option>  
                    <option value="BONK"> BONK </option>
                    <option value="USDC"> USDC </option> 
                </select>
            </div>
            <button className="button" onClick={() => sendCreateTokenTransaction()}>
                { !isSending && !isSent && <h4 style={{ fontSize: '13px' }}> CREATE TOKEN </h4> }
                { isSending && <h4 style={{ fontSize: '13px' }}> Sending transaction </h4> }
                { isSent && <h4 style={{ fontSize: '13px' }}> <a href={txnExplorer}>View Transaction</a> </h4>}
            </button>
        </div>
    )
}