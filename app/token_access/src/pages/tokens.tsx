import { ACCOUNTS_DATA_LAYOUT, AccountType, AssetArgs } from "@/utils";
import { getAssetPubkey } from "@/utils/helpers";
import { AccountLayout, RawAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

async function getTokens(publicKey: PublicKey, connection: Connection) {
    const tokensData: (AssetArgs & RawAccount)[] = []
    const walletTokens = await connection.getTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })

    for (const tokenAccount of walletTokens.value){
        try {
            const accountInfo = await connection.getAccountInfo(tokenAccount.pubkey)
            if (accountInfo && accountInfo.data){
                const accountData = AccountLayout.decode(accountInfo.data)
                const assetPubkey = getAssetPubkey(accountData.mint)
                try {
                    const assetInfo = await connection.getAccountInfo(assetPubkey)
                    const assetData = ACCOUNTS_DATA_LAYOUT[AccountType.Asset].deserialize(assetInfo)[0]
                    tokensData.push({
                        ...assetData,
                        ...accountData
                    })
                } catch(e) {} // if it doesnt exists, it isnt a token from the token access program
            } else {
                console.log('accountInfo or its data is undefined')
            }
        } catch (e) {
            console.log(e)
        }
    }

    return tokensData
}

const UserTokensPage = () => {
    const wallet = useWallet()
    const { connection } = useConnection()
    const [tokens, setTokens] = useState([]);

    useEffect(() => {
        const setAccountState = async () => {
          if (wallet.connected) {
            const tokensData = await getTokens(wallet.publicKey, connection)
            setTokens(tokensData)
          }
        }
        setAccountState()
    }, [wallet.connected]);
    
    return (
        <h1>User tokens page</h1>
    )
};

export default UserTokensPage;
