import { BRICK_PROGRAM_ID_PK, ACCOUNT_DISCRIMINATOR, ACCOUNTS_DATA_LAYOUT, AccountType, AppArgs } from "@/utils";
import { Connection } from "@solana/web3.js";
import bs58 from "bs58";
import Link from "next/link";
import { useEffect, useState } from "react";

async function getApps(connection: Connection): Promise<AppArgs[]> {
    const apps: AppArgs[] = []
    const encodedAppsAccounts = await connection.getProgramAccounts(
        BRICK_PROGRAM_ID_PK,
        {
            filters: [
                {
                    memcmp: {
                        bytes: bs58.encode(ACCOUNT_DISCRIMINATOR[AccountType.App]),
                        offset: 0,
                    },
                },
            ],
        },
    )
    for (const app of encodedAppsAccounts){
        const decodedApp = ACCOUNTS_DATA_LAYOUT[AccountType.App].deserialize(app.account.data)[0]
        apps.push(decodedApp)
    }

    return apps
}
const MainAppsPage = () => {
    const [apps, setApps] = useState<AppArgs[]>([]);
    const connection = new Connection(process.env.RPC, "confirmed")
    useEffect(() => {
        const setAccountState = async () => {
            const apps = await getApps(connection)
            setApps(apps)
        }
        setAccountState()
    }, []);
    return (
        <div className="apps" style={{ gap: "10px" }}>
            {apps.map(app => (
                <Link href={`/app/${app.appName}`} >
                    <div className="innerContainer" key={app.appName} style={{ width: "150px", height: "150px" }}>
                        {app.appName}
                    </div>
                </Link>
            ))}
        </div>
    )
};

export default MainAppsPage;
