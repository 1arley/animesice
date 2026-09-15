/**
 * URL pública do site — usada para URLs absolutas em metadata, sitemap,
 * robots e OG images. Em dev cai no localhost; em prod lê do env ou usa
 * o domínio efetivamente servido: o apex (animesice.app) é o canonical
 * desde 2026-09; www.animesice.app responde 301 para o apex na borda
 * (Traefik), então TODA URL canônica precisa apontar para o apex.
 * Um canonical apontando para um domínio que redireciona gera duplicatas
 * ("Duplicate, Google selecionou outro canonical" no GSC).
 */
const APEX_CANONICAL_HOSTS = new Set(["www.animesice.app"]);

/**
 * Mantém todos os sinais SEO na mesma origem mesmo quando uma variável
 * de ambiente é configurada com o www antigo. Publicar canonical/sitemap
 * apontando para um host que redireciona cria sinais contraditórios
 * para os buscadores.
 */
export function canonicalPublicUrl(value: string): string {
  const url = new URL(value);
  if (APEX_CANONICAL_HOSTS.has(url.hostname)) {
    url.hostname = url.hostname.replace(/^www\./, "");
  }
  return url.origin;
}

export const SITE_URL = canonicalPublicUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://animesice.app"
      : "http://localhost:3000"),
);

/** Origem pública usada apenas pelos assets imutáveis de produção. */
export const ASSET_URL =
  process.env.NEXT_PUBLIC_ASSET_URL || "https://animesice.vercel.app";
