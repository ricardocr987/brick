/*import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { GetStaticPaths } from "next";

export async function getStaticProps() {
    const connection: Connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/UKpJEi5xcwjCtOXHye7pjfnkhbOUOqM2')
    const wallet = useWallet()
    const tokensData = []
    const response = await connection.getTokenAccountsByOwner(wallet.publicKey, { programId: TOKEN_PROGRAM_ID })

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

    return {
        props: {
            tokensData
        }
    }
}*/

const UserTokensPage = ({tokensData}) => {
    return (
        <h1>User tokens page</h1>
    )
};

export default UserTokensPage;
