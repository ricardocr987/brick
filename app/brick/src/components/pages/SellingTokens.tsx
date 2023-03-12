import { getTokenPubkey } from "@/utils/helpers";
import { ShareTokenInstructionAccounts, createShareTokenInstruction, ShareTokenInstructionArgs, EditTokenPriceInstructionAccounts, EditTokenPriceInstructionArgs, createEditTokenPriceInstruction, DeletetokenInstructionAccounts, createDeletetokenInstruction } from "@/utils/solita/instructions";
import { TokensWithMetadata } from "@/utils/types";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { useEffect, useState } from "react";
import SwiperCore, { Navigation } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper-bundle.css";

SwiperCore.use([Navigation]);
export const SellingTokens = ({ connection, tokens }: { connection: Connection, tokens: TokensWithMetadata[] }) => {
    const { sendTransaction, publicKey, connected } = useWallet()
    const [buttonStates, setButtonStates] = useState([]);

    useEffect(() => {
        const initButtonState = async () => {
            const newButtonStates = tokens.map(() => ({
                isSendingShare: false,
                isSentShare: false,
                isSendingEdit: false,
                isSentEdit: false,
                isSendingDelete: false,
                isSentDelete: false,
                txnExplorer: null,
            }));
            setButtonStates(newButtonStates);
        };
        initButtonState()
    }, [tokens]);
      

    const sendShareTokenTransaction = async (tokenMint: PublicKey, index: number) => {
        const newButtonStates = [...buttonStates];
        newButtonStates[index].isSendingShare = true;
        newButtonStates[index].txnExplorer = null;
        setButtonStates(newButtonStates);

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
        try {
            const transaction = new Transaction().add(
                createShareTokenInstruction(accounts, args)
            )
            let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
            transaction.recentBlockhash = blockhash;
            const signature = await sendTransaction(
                transaction,
                connection,
            )
            const newButtonStates = [...buttonStates];
            newButtonStates[index].isSentShare = true;
            newButtonStates[index].isSendingShare = false;
            newButtonStates[index].txnExplorer = (`https://solana.fm/tx/${signature}`)
            setButtonStates(newButtonStates);
        } catch {
            newButtonStates[index].isSendingShare = false;
            setButtonStates(newButtonStates);
        }
    }

    const sendEditPriceTransaction = async (tokenMint: PublicKey, index: number) => {
        const newButtonStates = [...buttonStates];
        newButtonStates[index].isSendingEdit = true;
        newButtonStates[index].txnExplorer = null;
        setButtonStates(newButtonStates);

        const tokenAccount = getTokenPubkey(tokenMint)
        const accounts: EditTokenPriceInstructionAccounts = {
            authority: publicKey,
            token: tokenAccount,
        }
        const args: EditTokenPriceInstructionArgs = { tokenPrice: 1}
        try {
            const transaction = new Transaction().add(createEditTokenPriceInstruction(accounts, args))
            let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
            transaction.recentBlockhash = blockhash;
            const signature = await sendTransaction(
                transaction,
                connection,
            )
            const newButtonStates = [...buttonStates];
            newButtonStates[index].isSentEdit = true;
            newButtonStates[index].isSendingEdit = false;
            newButtonStates[index].txnExplorer = (`https://solana.fm/tx/${signature}`)
            setButtonStates(newButtonStates);
        } catch {
            newButtonStates[index].isSendingEdit = false;
            setButtonStates(newButtonStates);
        }
    }

    const sendDeleteTokenTransaction = async (tokenMint: PublicKey, index: number) => {
        const newButtonStates = [...buttonStates];
        newButtonStates[index].isSendingDelete = true;
        newButtonStates[index].txnExplorer = null;
        setButtonStates(newButtonStates);

        const tokenAccount = getTokenPubkey(tokenMint)
        const accounts: DeletetokenInstructionAccounts = {
            authority: publicKey,
            token: tokenAccount,
        }
        try {
            const transaction = new Transaction().add(createDeletetokenInstruction(accounts))
            let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
            transaction.recentBlockhash = blockhash;
            const signature = await sendTransaction(
                transaction,
                connection,
            )
            const newButtonStates = [...buttonStates];
            newButtonStates[index].isSentDelete = true;
            newButtonStates[index].isSendingDelete = false;
            newButtonStates[index].txnExplorer = (`https://solana.fm/tx/${signature}`)
            setButtonStates(newButtonStates);
        } catch {
            newButtonStates[index].isSendingDelete = false;
            setButtonStates(newButtonStates);
        }
    }

    return (
        <>
            <Swiper
                spaceBetween={20}
                slidesPerView={5}
                navigation
                pagination={false}
                className="swiper-wrapper"
            >
                {tokens.map((token: TokensWithMetadata, index: number) => (
                    <SwiperSlide key={index}>
                        <div className="innerContainer" key={index}>
                            <a href={`https://solana.fm/address/${token.token.tokenMint.toString()}`}>
                            {token.metadata.json ? (
                                <img className="imgContainer" src={token.metadata.json.image} />
                            ) : (
                                <img
                                className="imgContainer"
                                src={
                                    "https://arweave.net/VASpc3F7nSNF9IvoVtbZfoasmutUowrYLXxNz_rsKK4"
                                }
                                />
                            )}
                            </a>
                            <button
                                className="sellingTokensButton"
                                onClick={() => {
                                    const newButtonStates = [...buttonStates];
                                    newButtonStates[index].isSendingEdit = true;
                                    setButtonStates(newButtonStates);
                                    sendEditPriceTransaction(token.token.tokenMint, index)
                                }}
                                disabled={buttonStates[index]?.isSendingEdit || buttonStates[index]?.isSentEdit || !connected}
                            >
                                {buttonStates[index]?.isSentEdit && (
                                    <h4 style={{ fontSize: "13px" }}>
                                        <a href={buttonStates[index]?.txnExplorer}>View Txn</a>
                                    </h4>
                                )}
                                {buttonStates[index]?.isSendingEdit && (
                                    <h4 style={{ fontSize: "13px" }}> Sending </h4>
                                )}
                                {!buttonStates[index]?.isSendingEdit && !buttonStates[index]?.isSentEdit && (
                                    <h4 style={{ fontSize: "13px" }}> EDIT </h4>
                                )}
                            </button>
                            <button
                                className="sellingTokensButton"
                                onClick={() => {
                                    const newButtonStates = [...buttonStates];
                                    newButtonStates[index].isSendingShare = true;
                                    setButtonStates(newButtonStates);
                                    sendShareTokenTransaction(
                                        token.token.tokenMint,
                                        index
                                    )
                                }}
                                disabled={buttonStates[index]?.isSendingShare || buttonStates[index]?.isSentShare || !connected}
                            >
                                {buttonStates[index]?.isSentShare && (
                                    <h4 style={{ fontSize: "13px" }}>
                                        <a href={buttonStates[index]?.txnExplorer}>View Txn</a>
                                    </h4>
                                )}
                                {buttonStates[index]?.isSendingShare && (
                                    <h4 style={{ fontSize: "13px" }}> Sending </h4>
                                )}
                                {!buttonStates[index]?.isSendingShare && !buttonStates[index]?.isSentShare && (
                                    <h4 style={{ fontSize: "13px" }}> SHARE </h4>
                                )}
                            </button>
                            <button
                                className="sellingTokensButton"
                                onClick={() => {
                                    const newButtonStates = [...buttonStates];
                                    newButtonStates[index].isSendingDelete = true;
                                    setButtonStates(newButtonStates);
                                    sendDeleteTokenTransaction(
                                        token.token.tokenMint,
                                        index
                                    )
                                }}
                                disabled={buttonStates[index]?.isSendingDelete || buttonStates[index]?.isSentDelete || !connected}
                            >
                                {buttonStates[index]?.isSentDelete && (
                                    <h4 style={{ fontSize: "13px" }}>
                                        <a href={buttonStates[index]?.txnExplorer}>View Txn</a>
                                    </h4>
                                )}
                                {buttonStates[index]?.isSendingDelete && (
                                    <h4 style={{ fontSize: "13px" }}> Sending </h4>
                                )}
                                {!buttonStates[index]?.isSendingDelete && !buttonStates[index]?.isSentDelete && (
                                    <h4 style={{ fontSize: "13px" }}> Delete </h4>
                                )}
                            </button>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </>
    )
}