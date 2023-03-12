import { HoldingTokens } from "@/components/pages/HoldingTokens";
import { SellingTokens } from "@/components/pages/SellingTokens";
import { ACCOUNTS_DATA_LAYOUT, AccountType, TokenMetadataArgs, BRICK_PROGRAM_ID_PK, ACCOUNT_DISCRIMINATOR } from "@/utils";
import { getTokenPubkey } from "@/utils/helpers";
import { TokensWithMetadata } from "@/utils/types";
import { Metaplex, Sft } from "@metaplex-foundation/js";
import { AccountLayout, RawAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { useEffect, useState } from "react";

async function getTokens(publicKey: PublicKey, connection: Connection) {
    const tokensData: TokensWithMetadata[] = []
    const tokensOnSale: TokensWithMetadata[] = []
    const metaplex = new Metaplex(connection)
    const [walletTokens, encodedTokensOnSale] = await Promise.all([
        connection.getTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }),
        connection.getProgramAccounts(
            BRICK_PROGRAM_ID_PK,
            {
                filters: [
                {
                    memcmp: {
                    bytes: bs58.encode(ACCOUNT_DISCRIMINATOR[AccountType.TokenMetadata]),
                    offset: 0,
                    },
                },
                {
                    memcmp: {
                    bytes: publicKey.toString(),
                    offset: 136, // authority offset, to get tokens this user is selling
                    },
                },
                ],
            },
        ),
    ])

    const tokenPromises = walletTokens.value.map(async (tokenAccount) => {
        try {
            const accountInfo = await connection.getAccountInfo(tokenAccount.pubkey)
            if (accountInfo && accountInfo.data){
                const accountData = AccountLayout.decode(accountInfo.data)
                const tokenPubkey = getTokenPubkey(accountData.mint)
                const tokenInfo = await connection.getAccountInfo(tokenPubkey)
                if (tokenInfo != null) {
                    const token = ACCOUNTS_DATA_LAYOUT[AccountType.TokenMetadata].deserialize(tokenInfo.data)[0]
                    const metadata = await metaplex.nfts().findByMint({ mintAddress: accountData.mint }) as Sft
                    tokensData.push({ token, metadata })
                }
            } else {
                console.log('accountInfo or its data is undefined')
            }
        } catch (e) {
            console.log(e)
        }
    })
    
    encodedTokensOnSale.forEach(async (tokenAccount) => {
        const token = ACCOUNTS_DATA_LAYOUT[AccountType.TokenMetadata].deserialize(tokenAccount.account.data)[0]
        const metadata = await metaplex.nfts().findByMint({ mintAddress: token.tokenMint }) as Sft
        tokensOnSale.push({ token, metadata })
    })

    await Promise.all([...tokenPromises, encodedTokensOnSale])

    return { tokensData, tokensOnSale } 
}

const UserTokensPage = () => {
    const wallet = useWallet()
    const connection = new Connection(process.env.RPC, "confirmed")    
    const [tokens, setTokens] = useState([]);
    const [tokensOnSale, setTokenOnSale] = useState([]);

    useEffect(() => {
        const setAccountState = async () => {
            if (wallet.connected) {
                const { tokensData, tokensOnSale } = await getTokens(wallet.publicKey, connection)
                setTokens(tokensData)
                setTokenOnSale(tokensOnSale)
            }
        }
        setAccountState()
    }, [wallet.connected]);
    
    return (
        <div className="tokens">
            <h1 style={{fontSize: "20px"}}>TOKENS LISTED BY YOU</h1>
            <div className="tokensRow">
                <SellingTokens connection={connection} tokens={tokensOnSale}/>
            </div>
            <h1 style={{fontSize: "20px"}}>TOKENS BOUGHT USING BRICK</h1>
            <div className="tokensRow">
                <HoldingTokens connection={connection} tokens={tokens}/>
            </div>
        </div>
    )
};

export default UserTokensPage;
