import type { NextConfig } from "next";

/**
 * Politica de Seguranca de Conteudo (CSP) para producao.
 * Permite scripts proprios + AdSense + Monetag + Cloudflare Insights.
 */
const localConnect = process.env.INCLUDE_LOCAL_API === '1' ? ' http://localhost:3001' : '';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://al5sm.com https://static.cloudflareinsights.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://cdn.myanimelist.net https://*.myanimelist.net https://meusanimes.blog https://*.meusanimes.blog https://svuaszdqsgztnetefcex.supabase.co https://pagead2.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.google.com.br https://*.anilist.co;
  font-src 'self' data: https://fonts.gstatic.com;
  media-src 'self' blob: data: https://api.animesice.app;
  connect-src 'self' https://api.animesice.app wss://api.animesice.app https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com https://al5sm.com https://static.cloudflareinsights.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://challenges.cloudflare.com${localConnect};
  frame-src 'self' https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://*.googlesyndication.com https://fundingchoicesmessages.google.com https://*.google.com https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "**.myanimelist.net" },
      { protocol: "https", hostname: "meusanimes.blog" },
      { protocol: "https", hostname: "**.meusanimes.blog" },
      { protocol: "https", hostname: "**.anilist.co" },
      { protocol: "https", hostname: "svuaszdqsgztnetefcex.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 60, // 60 dias
    // Breakpoints alinhados ao layout: cards ~16vw mobile, ~200px desktop;
    // hero 100vw; thumbnails ~25vw. Reduz downloads oversized.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  // Rotas antigas da seção Comunidade movidas para /comunidade/*.
  // Redirects permanentes (308) preservam URLs indexadas (sitemap/backlinks).
  async redirects() {
    return [
      { source: "/pedidos", destination: "/comunidade/pedidos", permanent: true },
      { source: "/sugestoes", destination: "/comunidade/sugestoes", permanent: true },
      { source: "/regras", destination: "/comunidade/regras", permanent: true },
    ];
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
