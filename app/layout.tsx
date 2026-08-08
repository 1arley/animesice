import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ADSENSE_CLIENT } from "@/lib/adsense";

const fontInter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fontSpaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AnimesIce — Assistir animes online",
    template: "%s | AnimesIce",
  },
  description: "Assistir animes online em HD, legendados e dublados",
  other: {
    "google-adsense-account": ADSENSE_CLIENT,
    monetag: "5b3cadc15f39db60af150e8c05e089d0",
  },
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
          src="https://quge5.com/88/tag.min.js"
          data-zone="267619"
          async
          data-cfasync="false"
        />
      </head>
      <body
        className={`${fontInter.variable} ${fontSpaceGrotesk.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
