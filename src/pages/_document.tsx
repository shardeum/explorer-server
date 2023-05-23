import Document, { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script'
import { config } from './../config/index'

export default class MyDocument extends Document {
  render(): JSX.Element {
    return (
      <Html>
        <Head>
          {
            // Google Tag Manager
            config.GTM_Id && config.GTM_Id !== '' && (
              <Script
                id={config.GTM_Id}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer', '${config.GTM_Id}');`,
                }}
              ></Script>
            )
          }
        </Head>
        <body>
          {
            // Google Tag Manager (noscript)
            config.GTM_Id && config.GTM_Id !== '' && (
              <noscript
                dangerouslySetInnerHTML={{
                  __html: `<iframe src="https://www.googletagmanager.com/ns.html?id='${config.GTM_Id}'"
                height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
                }}
              ></noscript>
            )
          }
          <Main />
          <div id="__myPortal" />
          <NextScript />
        </body>
      </Html>
    )
  }
}
