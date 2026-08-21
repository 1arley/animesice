import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/common/ToastProvider";
import { SITE_URL } from "@/lib/site";
import { ThirdPartyScripts } from "@/components/common/ThirdPartyScripts";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DeferredCrystalSplash } from "@/components/animesice/DeferredCrystalSplash";

// Tipografia do "sinal da madrugada": Barlow Condensed traz a linguagem de
// cartaz e grade de programação sem transformar toda a interface em terminal.
// Plex Sans sustenta a leitura; Plex Mono aparece apenas em dados de emissão.
const fontDisplay = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const fontPlexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const fontPlexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "optional",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AnimesIce — Assistir animes online em HD, legendados e dublados",
    template: "%s | AnimesIce",
  },
  description: "Assistir animes online em HD, legendados e dublados. Catálogo completo com milhares de títulos, sinopses, avaliação da comunidade e episódios atualizados.",
  keywords: ["assistir animes", "animes online", "animes legendados", "animes dublados", "anime HD", "catálogo de animes"],
  authors: [{ name: "AnimesIce" }],
  creator: "AnimesIce",
  publisher: "AnimesIce",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "AnimesIce",
    title: "AnimesIce — Assistir animes online em HD, legendados e dublados",
    description: "Assistir animes online em HD, legendados e dublados. Catálogo completo com milhares de títulos.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AnimesIce — Assistir animes online em HD",
    description: "Assistir animes online em HD, legendados e dublados. Catálogo completo.",
  },
  icons: {
    icon: [
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/favicon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icons/favicon.ico",
  },
  manifest: "/icons/site.webmanifest",
  other: {
    monetag: "5b3cadc15f39db60af150e8c05e089d0",
  },
};

export const viewport: Viewport = {
  themeColor: "#070B12",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Preconnect hints no <head>: abre handshake TCP+TLS cedo sem
            baixar nada. Só origens efetivamente requisitadas no load
            (Lighthouse pede <= 4 e penaliza preconnect não usado):
            fonts são self-hosted via next/font e o beacon do Cloudflare
            carrega lazyOnload. */}
        <link rel="preconnect" href="https://al5sm.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var busy=false,key='animesice:chunk-recovery',max=2,windowMs=30000,pattern=/loading chunk|loading css chunk|failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|loadingchunkerror/i;function exhausted(){window.dispatchEvent(new Event('animesice:chunk-recovery-exhausted'))}function recover(value,asset){var text=((value&&value.message)||'')+' '+((value&&value.name)||'');if(!asset&&!pattern.test(text))return;if(busy)return;busy=true;try{var now=Date.now(),state=JSON.parse(sessionStorage.getItem(key)||'null');if(!state||now-state.startedAt>windowMs)state={startedAt:now,attempts:0};if(state.attempts>=max){exhausted();return}state.attempts+=1;sessionStorage.setItem(key,JSON.stringify(state));var url=state.attempts===max&&location.pathname!=='/'?new URL('/',location.origin):new URL(location.href);url.searchParams.set('__chunk_retry',String(now));location.replace(url.href)}catch(e){exhausted()}}window.addEventListener('error',function(e){var target=e.target,asset=target&&(target.tagName==='SCRIPT'||(target.tagName==='LINK'&&target.rel==='stylesheet'))&&/\/_next\/static\//.test(target.src||target.href||'');recover(e.error||e,asset)},true);window.addEventListener('unhandledrejection',function(e){recover(e.reason,false)});window.addEventListener('animesice:chunk-error',function(){recover({name:'ChunkLoadError'},false)});try{var clean=new URL(location.href);if(clean.searchParams.has('__chunk_retry')){clean.searchParams.delete('__chunk_retry');history.replaceState(history.state,'',clean.href)}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${fontDisplay.variable} ${fontPlexSans.variable} ${fontPlexMono.variable} antialiased`}
      >
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
        {/* Abertura da identidade de motion: cristal em foco puxado, uma vez
            por sessão, dispensável a qualquer toque/tecla. Nunca bloqueia. */}
        <DeferredCrystalSplash />
        <SpeedInsights />
        {/* Scripts de terceiros: lazyOnload + IntersectionObserver para Monetag.
            Não bloqueiam o paint inicial nem competem com o LCP. */}
        <ThirdPartyScripts />
      </body>
    </html>
  );
}
