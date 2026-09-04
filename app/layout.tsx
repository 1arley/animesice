import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/common/ToastProvider";
import { SITE_URL } from "@/lib/site";
import { escapeJsonLd } from "@/lib/url";
import { ThirdPartyScripts } from "@/components/common/ThirdPartyScripts";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { DeferredCrystalSplash } from "@/components/animesice/DeferredCrystalSplash";
import { chunkRecoveryScript } from "@/lib/chunk-recovery-script";
import { ServiceNotice } from "@/components/common/ServiceNotice";

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
  alternates: {
    canonical: SITE_URL,
    languages: {
      "pt-BR": SITE_URL,
    },
  },
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
};

export const viewport: Viewport = {
  themeColor: "#080C12",
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
        <script
          dangerouslySetInnerHTML={{
            __html: chunkRecoveryScript,
          }}
        />
        {/* Structured data global: declara o nome da marca (WebSite +
            Organization) para o Google montar a entidade "AnimesIce" e
            habilita a caixa de busca nos sitelinks via SearchAction. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: escapeJsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: "AnimesIce",
                  description:
                    "Assistir animes online em HD, legendados e dublados.",
                  inLanguage: "pt-BR",
                  publisher: { "@id": `${SITE_URL}/#organization` },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: `${SITE_URL}/buscar?q={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  url: SITE_URL,
                  name: "AnimesIce",
                  logo: {
                    "@type": "ImageObject",
                    url: `${SITE_URL}/icons/favicon-96x96.png`,
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${fontDisplay.variable} ${fontPlexSans.variable} ${fontPlexMono.variable} antialiased`}
      >
        <ServiceNotice />
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
        {/* Abertura da identidade de motion: cristal em foco puxado, uma vez
            por sessão, dispensável a qualquer toque/tecla. Nunca bloqueia. */}
        <DeferredCrystalSplash />
        <SpeedInsights />
        <Analytics />
        {/* Direct Link controlado localmente; nenhum script de anúncios remoto. */}
        <ThirdPartyScripts />
      </body>
    </html>
  );
}
