import type { NextConfig } from "next";

/**
 * Politica de Seguranca de Conteudo (CSP) para producao.
 * Permite scripts proprios + AdSense + Monetag + Cloudflare Insights.
 */
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://al5sm.com https://static.cloudflareinsights.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://cdn.myanimelist.net https://*.myanimelist.net https://meusanimes.blog https://*.meusanimes.blog https://pagead2.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.google.com.br;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://api.animesice.app https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://al5sm.com https://static.cloudflareinsights.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google;
  frame-src 'self' https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://*.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "**.myanimelist.net" },
      { protocol: "https", hostname: "meusanimes.blog" },
      { protocol: "https", hostname: "**.meusanimes.blog" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 60, // 60 dias
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["react", "react-dom", "socket.io-client"],
  },
};

export default nextConfig;
