import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head';
import { ContextProvider } from '@/components/ContextProvider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const NavItems = [
  { label: "Home", url: "/", key: 1 },
  { label: "Apps", url: "/apps", key: 2 },
];

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Token Access</title>
        <meta name="description" content="Tokenize any service or off-chain asset" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ContextProvider>
        <Navbar NavItems={NavItems} />
          <Component {...pageProps} />
        <Footer />
      </ContextProvider>
    </>
  )
}
