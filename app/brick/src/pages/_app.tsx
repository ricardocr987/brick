import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head';
import { ContextProvider } from '@/components/contexts/ContextProvider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const NavItems = [
  { label: "Intro", url: "/", key: 1 },
  { label: "Buy", url: "/app", key: 2 },
  { label: "Sell", url: "/create", key: 3 },
  { label: "My tokens", url: "/tokens", key: 5 },
];

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Brick</title>
        <meta name="description" content="Tokenize any service or off-chain asset" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ContextProvider>
        <Navbar NavItems={NavItems} />
        <div className="container">
            <Component {...pageProps} />
        </div>
        <Footer />
      </ContextProvider>
    </>
  )
}
