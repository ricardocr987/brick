import { CreateApp } from "@/components/CreateApp";
import { CreateToken } from "@/components/CreateToken";
import { Connection } from "@solana/web3.js";
import { loadEnvConfig } from '@next/env'

const CreateTokenPage = () => {
    const connection = new Connection(process.env.RPC, "confirmed")    
    console.log(process.env.RPC)
    return (
        <div className="create">
            <div className="row">
                <CreateApp connection={connection}/>
            </div>
            <div className="row">
                <CreateToken connection={connection}/>
            </div>
        </div>
    )
};

export default CreateTokenPage;
