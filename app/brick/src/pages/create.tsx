import { CreateApp } from "@/components/pages/CreateApp";
import { CreateToken } from "@/components/pages/CreateToken";
import { Connection } from "@solana/web3.js";

const CreateTokenPage = () => {
    const connection = new Connection(process.env.RPC, "confirmed")    
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
