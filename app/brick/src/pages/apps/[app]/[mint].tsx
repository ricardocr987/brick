import { GetStaticPaths, InferGetStaticPropsType } from "next";

export const getStaticProps = () => {
    return {
        props: {
            mint: '2wmVCSfPxGPjrnMMn7rchp4uaeoTqN39mXFC2zhPdri9'
        }
    }
}

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
    return {
        paths: [], //indicates that no page needs be created at build time
        fallback: 'blocking' //indicates the type of fallback
    }
}

const MintPage = ({ mint }: InferGetStaticPropsType<typeof getStaticProps>) => {
    return (
        <h1>{mint}</h1>
    )
};

export default MintPage;
