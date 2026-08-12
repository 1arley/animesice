/**
 * URL pública do site — usada para URLs absolutas em metadata, sitemap,
 * robots e OG images. Em dev cai no localhost; em prod lê do env ou usa
 * o domínio canônico do projeto.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://animesice.app"
    : "http://localhost:3000");
