import { CreateApp } from "@/components/CreateApp";
import { CreateToken } from "@/components/CreateToken";

const CreateTokenPage = () => {
    return (
        <div className="create">
            <div className="row">
                <CreateApp/>
            </div>
            <div className="row">
                <CreateToken/>
            </div>
        </div>
    )
};

export default CreateTokenPage;
