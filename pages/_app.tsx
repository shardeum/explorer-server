import "../styles/globals.scss";
import type { AppProps } from "next/app";
import { SWRConfig } from "swr";

import { fetcher } from "../src/api";

import { Layout } from "../src/components";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
      }}
    >
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </SWRConfig>
  );
}
