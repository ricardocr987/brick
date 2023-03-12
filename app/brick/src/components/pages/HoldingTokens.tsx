import { ACCOUNTS_DATA_LAYOUT, AccountType, ACCOUNT_DISCRIMINATOR, BRICK_PROGRAM_ID_PK, PaymentArgs } from "@/utils";
import { getTokenPubkey } from "@/utils/helpers";
import { UseTokenInstructionAccounts, createUseTokenInstruction, RefundInstructionAccounts, createRefundInstruction } from "@/utils/solita/instructions";
import { TokensWithMetadata } from "@/utils/types";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { useEffect, useState } from "react";
import SwiperCore, { Navigation, Pagination } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper-bundle.css";

SwiperCore.use([Navigation]);

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
    const [buttonStates, setButtonStates] = useState([]);

    useEffect(() => {
        const initButtonState = async () => {
            const newButtonStates = tokens.map(() => ({
                isSendingBurn: false,
                isSentBurn: false,
                isSendingRefund: false,
                isSentRefund: false,
                txnExplorer: null,
            }));
            setButtonStates(newButtonStates);
        };
        initButtonState()
    }, [tokens]);

    const sendUseTokenTransaction = async (tokenMint: PublicKey, index: number) => {
        const newButtonStates = [...buttonStates];
        newButtonStates[index].isSendingBurn = true;
        newButtonStates[index].txnExplorer = null;
        setButtonStates(newButtonStates);

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
        try {
            const transaction = new Transaction().add(
                createUseTokenInstruction(accounts)
            )
            let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
            transaction.recentBlockhash = blockhash;
            const signature = await sendTransaction(
                transaction,
                connection,
            )
            const newButtonStates = [...buttonStates];
            newButtonStates[index].isSentBurn = true;
            newButtonStates[index].isSendingBurn = false;
            newButtonStates[index].txnExplorer = (`https://solana.fm/tx/${signature}`)
            setButtonStates(newButtonStates);
        } catch {
            newButtonStates[index].isSendingBurn = false;
            setButtonStates(newButtonStates);
        }
    }

    const sendRefundTransaction = async (tokenMint: PublicKey, index: number) => {
        const newButtonStates = [...buttonStates];
        newButtonStates[index].isSendingRefund = true;
        newButtonStates[index].txnExplorer = null;
        setButtonStates(newButtonStates);

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
        try {
            const transaction = new Transaction().add(
                createRefundInstruction(accounts)
            )
            let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
            transaction.recentBlockhash = blockhash;
            const signature = await sendTransaction(
                transaction,
                connection,
            )
            const newButtonStates = [...buttonStates];
            newButtonStates[index].isSendingRefund = true;
            newButtonStates[index].isSendingRefund = false;
            newButtonStates[index].txnExplorer = (`https://solana.fm/tx/${signature}`)
            setButtonStates(newButtonStates);
        } catch {
            newButtonStates[index].isSendingRefund = false;
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
                        <div className="innerContainer">
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
                                className="tokensButton"
                                onClick={() => {
                                    const newButtonStates = [...buttonStates];
                                    buttonStates[index].isSendingBurn = true;
                                    setButtonStates(newButtonStates);
                                    sendUseTokenTransaction(token.token.tokenMint, index)
                                }}
                                disabled={buttonStates[index]?.isSendingBurn || buttonStates[index]?.isSetBurn || !connected}
                            >
                                {buttonStates[index]?.isSentBurn && (
                                    <h4 style={{ fontSize: "13px" }}>
                                    <a href={buttonStates[index]?.txnExplorer}>View Txn</a>
                                    </h4>
                                )}
                                {buttonStates[index]?.isSendingBurn && (
                                    <h4 style={{ fontSize: "13px" }}> Sending </h4>
                                )}
                                {!buttonStates[index]?.isSendingBurn && !buttonStates[index]?.isSentBurn && (
                                    <h4 style={{ fontSize: "13px" }}> BURN </h4>
                                )}
                            </button>
                            <button
                                className="tokensButton"
                                onClick={() => {
                                    const newButtonStates = [...buttonStates];
                                    newButtonStates[index].isSendingRefund = true;
                                    setButtonStates(newButtonStates);
                                    sendRefundTransaction(
                                        token.token.tokenMint,
                                        index
                                    )
                                }}
                                disabled={buttonStates[index]?.isSendingRefund && buttonStates[index]?.isSentRefund && !connected}
                            >
                                {buttonStates[index]?.isSentRefund && (
                                    <h4 style={{ fontSize: "13px" }}>
                                        <a href={buttonStates[index]?.txnExplorer}>View Txn</a>
                                    </h4>
                                )}
                                {buttonStates[index]?.isSendingRefund && (
                                    <h4 style={{ fontSize: "isSendingRefund" }}> Sending </h4>
                                )}
                                {!buttonStates[index]?.isSendingRefund && !buttonStates[index]?.isSentRefund && (
                                    <h4 style={{ fontSize: "13px" }}> Refund </h4>
                                )}
                            </button>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </>
    )
}