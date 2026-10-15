import type { NextConfig } from "next";

/**
 * Politica de Seguranca de Conteudo (CSP) para producao.
 * Ad networks (Monetag) carregam scripts, iframes e conexoes de um
 * conjunto dinamico de parceiros — sem `https:` eles nao renderizam. Com
 * `script-src https:` + os hosts explicitos, o bloqueio continua para http
 * e para recursos nao-HTTPS; os vetores de XSS mais criticos (object-src,
 * base-uri, frame-ancestors, form-action) permanecem fechados.
 *
 * `'unsafe-eval'` existe por causa do /admin/gacha/animacao: a aba "Código"
 * compila o arquivo da animação colado pelo dev e roda via `new Function`
 * (src/lib/compile-component.ts). É gated por SUPERADMIN + código salvo só
 * passa por compilação antes de gravar. Sem isso, o recurso não funciona em prod.
 */
const isDev = process.env.NODE_ENV !== "production";
const localApiPort = process.env.MOCK_BACKEND_PORT || "3001";
const localConnect =
  isDev || process.env.INCLUDE_LOCAL_API === "1"
    ? ` http://localhost:${localApiPort}`
    : "";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https: https://al5sm.com https://static.cloudflareinsights.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com;
  style-src 'self' 'unsafe-inline' data: https: https://fonts.googleapis.com;
  img-src 'self' blob: data: https: https://cdn.myanimelist.net https://*.myanimelist.net https://meusanimes.blog https://*.meusanimes.blog https://svuaszdqsgztnetefcex.supabase.co https://*.anilist.co https://*.pinimg.com https://*.media-amazon.com https://*.ssl-images-amazon.com https://*.fliptru.com.br https://*.imgur.com;
  font-src 'self' data: https: https://fonts.gstatic.com;
  media-src 'self' blob: data: https://api.animesice.app https://api.dev.animesice.app https://cdn-sv01.maximaimg.online https://*.maximaimg.online${localConnect};
  connect-src 'self' https: https://api.animesice.app wss://api.animesice.app https://al5sm.com https://static.cloudflareinsights.com https://challenges.cloudflare.com https://www.google-analytics.com https://www.googletagmanager.com${localConnect};
  frame-src 'self' https: https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com${localConnect};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  images: {
    unoptimized: false,
    localPatterns: [
      { pathname: "/**", search: "" },
      // The route validates dynamic source/episode values against the API record.
      { pathname: "/api/anime-cover/**" },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "**.myanimelist.net" },
      { protocol: "https", hostname: "meusanimes.blog" },
      { protocol: "https", hostname: "**.meusanimes.blog" },
      { protocol: "https", hostname: "**.anilist.co" },
      { protocol: "https", hostname: "svuaszdqsgztnetefcex.supabase.co" },
      // Pinterest
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "**.pinimg.com" },
      { protocol: "https", hostname: "pinterest.com" },
      { protocol: "https", hostname: "**.pinterest.com" },
      // Amazon / Media Amazon (obras e capas externas)
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "**.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "**.ssl-images-amazon.com" },
      // Fliptru e leitores de mangá/quadrinhos
      { protocol: "https", hostname: "fliptru.com.br" },
      { protocol: "https", hostname: "**.fliptru.com.br" },
      // Imgur
      { protocol: "https", hostname: "i.imgur.com" },
      { protocol: "https", hostname: "**.imgur.com" },
      // Discord CDN
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "media.discordapp.net" },
      // MangaDex
      { protocol: "https", hostname: "uploads.mangadex.org" },
      { protocol: "https", hostname: "**.mangadex.org" },
      // Google / Drive
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
    // Permite os valores de `quality` usados pelos componentes.
    qualities: [60, 80, 85, 100],
    minimumCacheTTL: 60 * 60 * 24 * 60, // 60 dias
    // Breakpoints alinhados ao layout: cards ~16vw mobile, ~200px desktop;
    // hero 100vw; thumbnails ~25vw. Reduz downloads oversized.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  // Rotas antigas da seção Comunidade movidas para /comunidade/*.
  // Redirects permanentes (308) preservam URLs indexadas (sitemap/backlinks).
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/icons/favicon.ico",
        permanent: true,
      },
      {
        source: "/pedidos",
        destination: "/comunidade/pedidos",
        permanent: true,
      },
      {
        source: "/sugestoes",
        destination: "/comunidade/sugestoes",
        permanent: true,
      },
      { source: "/regras", destination: "/comunidade/regras", permanent: true },
      { source: "/login", destination: "/entrar", permanent: true },
      { source: "/register", destination: "/cadastro", permanent: true },
      { source: "/settings", destination: "/configuracoes", permanent: true },
      { source: "/me", destination: "/minha-conta", permanent: true },
      {
        source: "/users/:userName",
        destination: "/usuarios/:userName",
        permanent: true,
      },
      { source: "/room/:slug", destination: "/sala/:slug", permanent: true },
      {
        // /gacha/colecao virou o gerenciador de cosméticos (capa, moldura,
        // destaque); a galeria de cartas vive em /gacha/cartas.
        source: "/gacha/collection",
        destination: "/gacha/cartas",
        permanent: true,
      },
      {
        source: "/gacha/crystals",
        destination: "/gacha/cristais",
        permanent: true,
      },
      {
        source: "/gacha/encyclopedia",
        destination: "/gacha/enciclopedia",
        permanent: true,
      },
      {
        source: "/gacha/trades",
        destination: "/gacha/mercado",
        permanent: true,
      },
      {
        source: "/gacha/trocas",
        destination: "/gacha/mercado",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    if (process.env.LOCAL_API_PROXY !== "1") return [];
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: "http://api:3000/api/:path*",
        },
      ],
    };
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
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
      // Vercel already marks existing Next assets as immutable. A route-wide
      // override would also mark a temporary 404 immutable and poison caches
      // when a deployment changes.
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  experimental: {
    webpackBuildWorker: false,
    optimizePackageImports: ["react", "react-dom", "socket.io-client"],
  },
};

export default nextConfig;
