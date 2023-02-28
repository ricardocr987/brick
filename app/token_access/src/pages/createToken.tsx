import { CreateAssetInstructionAccounts, CreateAssetInstructionArgs, createCreateAssetInstruction, METADATA_PROGRAM_ID_PK, mintFromSymbol } from "@/utils";
import { getAssetMintPubkey, getAssetPubkey, getMetadataPubkey } from "@/utils/helpers";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { useState } from "react";
import { v4 as uuid } from "uuid";

const CreateTokenPage = () => {
    const { connection } = useConnection()
    const { sendTransaction, publicKey } = useWallet()
    const [txnExplorer, setTxnExplorer] = useState(null)
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [acceptedMint, setAcceptedMint] = useState(null)
    const [appName, setAppName] = useState(null)
    const [tokenPrice, setTokenPrice] = useState(null)
    const [exemplars, setExemplars] = useState(null)
    const [quantityPerExemplars, setQuantityPerExemplars] = useState(null)
    const [tokenName, setTokenName] = useState(null)
    const [tokenSymbol, setSymbol] = useState(null)
    const [tokenUri, setTokenUri] = useState(null)

    const sendCreateAssetTransaction = async () => {
        setTxnExplorer(null)
        setIsSending(true)

        const hashId = uuid()
        const assetMint = getAssetMintPubkey(hashId)
        const assetAccount = getAssetPubkey(assetMint)
        const metadataAccount = getMetadataPubkey(assetMint)
    
        const accounts: CreateAssetInstructionAccounts = {
            metadataProgram: METADATA_PROGRAM_ID_PK,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            authority: publicKey,
            assetMint: assetMint,
            asset: assetAccount,
            acceptedMint: acceptedMint,
            tokenMetadata: metadataAccount,
        }

        const args: CreateAssetInstructionArgs = {
            hashId: hashId,
            appName: appName,
            itemHash: hashId,
            tokenPrice: tokenPrice,
            exemplars: exemplars,
            quantityPerExemplars: quantityPerExemplars,
            tokenName: tokenName,
            tokenSymbol: tokenSymbol,
            tokenUri: tokenUri,
        }

        const transaction = new Transaction().add(
            createCreateAssetInstruction(accounts, args)
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

    return (
        <>
            <h1>App name</h1>
            <input value={appName} size={80} onChange={handleAppName} />
            <h1>Price</h1>
            <input value={tokenPrice} size={80} onChange={handleTokenPrice} />
            <h1>Exemplars</h1>
            <input value={exemplars} size={80} onChange={handleExemplars} />
            <h1>Quantity per exemplars</h1>
            <input value={quantityPerExemplars} size={80} onChange={handleQuantityPerExemplars} />
            <h1>Token name</h1>
            <input value={tokenName} size={80} onChange={handleTokenName} />
            <h1>Token symbol</h1>
            <input value={tokenSymbol} size={80} onChange={handleTokenSymbol} />
            <h1>Token uri</h1>
            <input value={tokenUri} size={80} onChange={handleTokenUri} />
            <label> Select token to be paid </label>  
            <select onChange={handleAcceptedMint}>  
                <option value = "USDC"> USDC </option>  
                <option value = "SOL"> SOL </option>  
            </select>
            <button onClick={sendCreateAssetTransaction} disabled={isSending}>
                Create Token
            </button>
            <div>
                { isSent && <h1>The transaction has processed! {txnExplorer}</h1> }
                { isSending && <h1>Sending transaction</h1> }
            </div>
        </>
    )
};

export default CreateTokenPage;
