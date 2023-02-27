import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

async function getTokens(publicKey: PublicKey, connection: Connection) {
    const tokensData = []
    const response = await connection.getTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })

    for (const tokenAccount of response.value){
        try {
            const accountInfo = await connection.getAccountInfo(tokenAccount.pubkey)
            if (accountInfo && accountInfo.data){
                tokensData.push(AccountLayout.decode(accountInfo.data))
                console.log(AccountLayout.decode(accountInfo.data))
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
            const tokens = await getTokens(wallet.publicKey, connection)
            setTokens(tokens)
          }
        }
        setAccountState()
    }, [wallet.connected]);
    
    return (
        <h1>User tokens page</h1>
    )
};

export default UserTokensPage;
