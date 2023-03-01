import { GetStaticPaths, InferGetStaticPropsType } from "next";

export const getStaticProps = () => {
    return {
        props: {
            app: 'fishplace'
        }
    }
}

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
    return {
        paths: [], //indicates that no page needs be created at build time
        fallback: 'blocking' //indicates the type of fallback
    }
}

const AppPage = ({ app }: InferGetStaticPropsType<typeof getStaticProps>) => {
    return (
        <h1>{app}</h1>
    )
};

export default AppPage;