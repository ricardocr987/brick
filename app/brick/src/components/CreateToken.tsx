import { METADATA_PROGRAM_ID_PK, mintFromSymbol } from "@/utils";
import { getTokenMintPubkey, getTokenPubkey, getMetadataPubkey, getAppPubkey } from "@/utils/helpers";
import { CreateTokenInstructionAccounts, CreateTokenInstructionArgs, createCreateTokenInstruction } from "@/utils/solita/instructions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { useState } from "react";

export const CreateToken = () => {
    const { connection } = useConnection()
    const { sendTransaction, publicKey } = useWallet()
    const [txnExplorer, setTxnExplorer] = useState(null)
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [acceptedMint, setAcceptedMint] = useState(null)
    const [offChainId, setOffChainId] = useState('')
    const [appName, setAppName] = useState(null)
    const [tokenPrice, setTokenPrice] = useState(null)
    const [refundTime, setRefundTime] = useState(null)
    const [exemplars, setExemplars] = useState(null)
    const [quantityPerExemplars, setQuantityPerExemplars] = useState(null)
    const [tokenName, setTokenName] = useState(null)
    const [tokenSymbol, setSymbol] = useState(null)
    const [tokenUri, setTokenUri] = useState(null)

    const sendCreateTokenTransaction = async () => {
        setTxnExplorer(null)
        setIsSending(true)

        const offChainId1 = offChainId.slice(0, 32)
        const offChainId2 = offChainId.slice(3, 64)
        const tokenMint = getTokenMintPubkey(offChainId1)
        const tokenAccount = getTokenPubkey(tokenMint)
        const metadataAccount = getMetadataPubkey(tokenMint)
        const appAccount = getMetadataPubkey(appName)

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
            offChainMetadata: '',
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

        const signature = await sendTransaction(
            transaction,
            connection,
        )
    
        setTxnExplorer(`https://explorer.solana.com/tx/${signature}`)
        setIsSent(true)
        setIsSending(false)
    }

    const handleAcceptedMint = ( e: any ) => {
        setAcceptedMint(new PublicKey(mintFromSymbol[e.target.value]));
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
    const handleQuantityPerExemplars = ( e: any ) => {
        setQuantityPerExemplars(e.target.value)
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
    const handleRefundTime = ( e: any ) => {
        setRefundTime(e.target.value)
    }

    return (
        <div className="createToken">
            App name: <input value={appName} size={30} onChange={handleAppName} />
            Off chain id: <input value={offChainId} size={30} onChange={handleId} />
            Refund timespan: <input value={refundTime} size={30} onChange={handleRefundTime} />
            Price: <input value={tokenPrice} size={30} onChange={handleTokenPrice} />
            Exemplars: <input value={exemplars} size={30} onChange={handleExemplars} />
            Quantity per exemplars: <input value={quantityPerExemplars} size={30} onChange={handleQuantityPerExemplars} />
            Token name: <input value={tokenName} size={30} onChange={handleTokenName} />
            Token symbol: <input value={tokenSymbol} size={30} onChange={handleTokenSymbol} />
            Token uri: <input value={tokenUri} size={30} onChange={handleTokenUri} />
            <label> Select token to be paid </label>  
            <select onChange={handleAcceptedMint}>  
                <option value = "USDC"> USDC </option>  
                <option value = "SOL"> SOL </option>  
            </select>
            <button onClick={sendCreateTokenTransaction} disabled={isSending}>
                Create Token
            </button>
            <div>
                { isSent && <h1> The transaction has processed! {txnExplorer} </h1> }
                { isSending && <h1> Sending transaction </h1> }
            </div>
        </div>
    )
}