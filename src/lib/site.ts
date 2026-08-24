/**
 * URL pública do site — usada para URLs absolutas em metadata, sitemap,
 * robots e OG images. Em dev cai no localhost; em prod lê do env ou usa
 * o domínio efetivamente servido: o apex (animesice.app) responde 308 para
 * www.animesice.app, então TODA URL canônica precisa apontar para o www.
 * Um canonical apontando para um domínio que redireciona gera duplicatas
 * ("Cópia sem página canônica selecionada pelo usuário" no GSC).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://www.animesice.app"
    : "http://localhost:3000");

/** Origem pública usada apenas pelos assets imutáveis de produção. */
export const ASSET_URL =
  process.env.NEXT_PUBLIC_ASSET_URL || "https://animesice.vercel.app";
