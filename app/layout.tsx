import type { Metadata, Viewport } from "next";
import { Chakra_Petch, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/common/ToastProvider";
import { SITE_URL } from "@/lib/site";
import { ThirdPartyScripts } from "@/components/common/ThirdPartyScripts";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DeferredCrystalSplash } from "@/components/animesice/DeferredCrystalSplash";

// Tipografia do "sinal da madrugada": um display de cristal (Chakra Petch)
// para vozes, IBM Plex Sans para o corpo e IBM Plex Mono para os dados de
// transmissão (EPG, timecodes, nº de episódio). Nada de grotescas de plantão.
const fontChakra = Chakra_Petch({
  variable: "--font-chakra",
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
    default: "AnimesIce — Assistir animes online",
    template: "%s | AnimesIce",
  },
  description: "Assistir animes online em HD, legendados e dublados",
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
      </head>
      <body
        className={`${fontChakra.variable} ${fontPlexSans.variable} ${fontPlexMono.variable} antialiased`}
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
