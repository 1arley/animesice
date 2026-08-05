import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${fontInter.variable} ${fontSpaceGrotesk.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
