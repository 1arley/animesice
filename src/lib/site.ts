/**
 * URL pública do site — usada para URLs absolutas em metadata, sitemap,
 * robots e OG images. Em dev cai no localhost; em prod lê do env ou usa
 * o domínio efetivamente servido: o apex (animesice.app) responde 308 para
 * www.animesice.app, então TODA URL canônica precisa apontar para o www.
 * Um canonical apontando para um domínio que redireciona gera duplicatas
 * ("Cópia sem página canônica selecionada pelo usuário" no GSC).
 */
const WWW_CANONICAL_HOSTS = new Set(["animesice.app", "hentaisice.com"]);

/**
 * Mantém todos os sinais SEO na mesma origem mesmo quando uma variável da
 * Vercel é configurada com o domínio apex. Ambos os domínios públicos
 * redirecionam o apex para www; publicar canonical/sitemap apontando de volta
 * para o apex cria sinais contraditórios para os buscadores.
 */
export function canonicalPublicUrl(value: string): string {
  const url = new URL(value);
  if (WWW_CANONICAL_HOSTS.has(url.hostname)) {
    url.hostname = `www.${url.hostname}`;
  }
  return url.origin;
}

export const SITE_URL = canonicalPublicUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://www.animesice.app"
      : "http://localhost:3000"),
);

/** Origem pública usada apenas pelos assets imutáveis de produção. */
export const ASSET_URL =
  process.env.NEXT_PUBLIC_ASSET_URL || "https://animesice.vercel.app";
