import { CreateApp } from "@/components/CreateApp";
import { CreateToken } from "@/components/CreateToken";

const CreateTokenPage = () => {
    return (
        <div>
            <h1>CREATE APP:</h1>
            <CreateApp/>
            <h1>CREATE TOKEN:</h1>
            <CreateToken/>
        </div>
    )
};

export default CreateTokenPage;
