import { METADATA_PROGRAM_ID_PK, mintFromSymbol } from "@/utils";
import { getTokenMintPubkey, getTokenPubkey, getMetadataPubkey, getAppPubkey } from "@/utils/helpers";
import { CreateTokenInstructionAccounts, CreateTokenInstructionArgs, createCreateTokenInstruction } from "@/utils/solita/instructions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { useState } from "react";

export const CreateToken = () => {
    const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/UKpJEi5xcwjCtOXHye7pjfnkhbOUOqM2', "confirmed")    
    const { sendTransaction, publicKey } = useWallet()
    const [txnExplorer, setTxnExplorer] = useState(null)
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [acceptedMint, setAcceptedMint] = useState(null)
    const [offChainId, setOffChainId] = useState('')
    const [offChainMetadata, setOffChainmetadata] = useState('')
    const [appName, setAppName] = useState(null)
    const [tokenPrice, setTokenPrice] = useState(null)
    const [refundTime, setRefundTime] = useState(null)
    const [exemplars, setExemplars] = useState(null)
    const [tokenName, setTokenName] = useState(null)
    const [tokenSymbol, setSymbol] = useState(null)
    const [tokenUri, setTokenUri] = useState(null)

    const sendCreateTokenTransaction = async () => {
        setTxnExplorer(null)
        setIsSending(true)

        const offChainId1 = offChainId.slice(0, 32)
        let offChainId2 = offChainId.slice(32, 64)
        if (offChainId.length < 32) {
            offChainId2 = "null"
        }
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
            tokenPrice: tokenPrice,
            exemplars: exemplars,
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
    
        setTxnExplorer(`https://explorer.solana.com/tx/${signature}`)
        setIsSent(true)
        setIsSending(false)
    }

    const handleAcceptedMint = ( e: any ) => {
        console.log(e)
        if (e.target.value !== "") setAcceptedMint(new PublicKey(mintFromSymbol[e.target.value]));
    };
    const handleAppName = ( e: any ) => {
        setAppName(e.target.value)
    }
    const handleTokenPrice = ( e: any ) => {
        setTokenPrice(e.target.value)
    }
    const handleExemplars = ( e: any ) => {
        setExemplars(e.target.value)
    }
    const handleTokenName = ( e: any ) => {
        setTokenName(e.target.value)
    }
    const handleTokenSymbol = ( e: any ) => {
        setSymbol(e.target.value)
    }
    const handleTokenUri = ( e: any ) => {
        setTokenUri(e.target.value)
    }
    const handleId = ( e: any ) => {
        setOffChainId(e.target.value)
    }
    const handleMetadata = ( e: any ) => {
        setOffChainmetadata(e.target.value)
    }
    const handleRefundTime = ( e: any ) => {
        setRefundTime(e.target.value)
    }

    return (
        <div className="createToken">
            <div className="innerRow">
                <h1>CREATE TOKEN:</h1>
            </div>
            <div className="innerRow">
                App name: <input className="input" value={appName} size={20} onChange={handleAppName} />
            </div>
            <div className="innerRow">
                Off chain id: <input className="input" value={offChainId} size={20} onChange={handleId} />
            </div>
            <div className="innerRow">
                Metadata: <input className="input" value={offChainMetadata} size={20} onChange={handleMetadata} />
            </div>
            <div className="innerRow">
                Refund timespan: <input className="input" value={refundTime} size={20} onChange={handleRefundTime} />
            </div>
            <div className="innerRow">
                Price: <input className="input" value={tokenPrice} size={20} onChange={handleTokenPrice} />
            </div>
            <div className="innerRow">
                Exemplars: <input className="input" value={exemplars} size={20} onChange={handleExemplars} />
            </div>
            <div className="innerRow">
                Token name: <input className="input" value={tokenName} size={20} onChange={handleTokenName} />
            </div>
            <div className="innerRow">
                Token symbol: <input className="input" value={tokenSymbol} size={20} onChange={handleTokenSymbol} />
            </div>
            <div className="innerRow">
                Token uri: <input className="input" value={tokenUri} size={20} onChange={handleTokenUri} />
                </div>
            <div className="innerRow">
                <label> Select token to be paid </label>  
                <select className="input" onChange={handleAcceptedMint}>  
                    <option value="">Select token</option>
                    <option value="USDC"> USDC </option>  
                    <option value="SOL"> SOL </option>  
                </select>
            </div>
            <div className="innerRow">
                <button className="button" onClick={sendCreateTokenTransaction} disabled={isSending}>
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