import { CreateApp } from "@/components/CreateApp";
import { CreateToken } from "@/components/CreateToken";

const CreateTokenPage = () => {
    return (
        <div className="create">
            <div className="column">
                <CreateApp/>
            </div>
            <div className="column">
                <CreateToken/>
            </div>
        </div>
    )
};

export default CreateTokenPage;
