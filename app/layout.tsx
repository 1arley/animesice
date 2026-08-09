import type { Metadata, Viewport } from "next";
import { Chakra_Petch, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ADSENSE_CLIENT } from "@/lib/adsense";

// Tipografia do "sinal da madrugada": um display de cristal (Chakra Petch)
// para vozes, IBM Plex Sans para o corpo e IBM Plex Mono para os dados de
// transmissão (EPG, timecodes, nº de episódio). Nada de grotescas de plantão.
const fontChakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const fontPlexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const fontPlexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
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
    "google-adsense-account": ADSENSE_CLIENT,
    monetag: "5b3cadc15f39db60af150e8c05e089d0",
  },
};

export const viewport: Viewport = {
  themeColor: "#070B12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
        {/* Monetag MultiTag: in-page push (onclick) + demais formatos.
            Push notifications continuam desativados (sw.js removido). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(s){s.dataset.zone='11528359',s.src='https://al5sm.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`,
          }}
        />
      </head>
      <body
        className={`${fontChakra.variable} ${fontPlexSans.variable} ${fontPlexMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
