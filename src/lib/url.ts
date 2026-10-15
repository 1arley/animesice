/**
 * Allowlist de schemes/hosts seguros para URLs renderizadas no client.
 * Bloqueia `data:`, `javascript:`, `file:` — vetores XSS via <img>/<poster>.
 */

export function isValidRemoteUrl(raw: string | null | undefined): raw is string {
  if (!raw) return false;
  let val = raw.trim();
  if (!val) return false;
  if (val.startsWith("/")) {
    try {
      return new URL(val, "https://animesice.local").origin === "https://animesice.local";
    } catch {
      return false;
    }
  }
  if (/^javascript:/i.test(val) || /^data:/i.test(val) || /^file:/i.test(val)) {
    return false;
  }
  try {
    const u = new URL(val);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Normaliza URLs de imagem e prepara o proxy com fallback para capas do blog. */
export function safeImageSrc(
  raw: string | null | undefined,
  animeSlug?: string,
  episodeNumber?: number,
): string | undefined {
  if (!isValidRemoteUrl(raw)) return undefined;
  const url = raw.trim();

  if (
    animeSlug &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(animeSlug) &&
    isMeusanimesCover(url)
  ) {
    const params = new URLSearchParams({ source: url });
    if (Number.isSafeInteger(episodeNumber) && (episodeNumber ?? 0) > 0) {
      params.set("episode", String(episodeNumber));
    }
    return `/api/anime-cover/${encodeURIComponent(animeSlug)}?${params}`;
  }

  return url;
}

function isMeusanimesCover(raw: string): boolean {
  // Capa local (`/aeliana/...`) passa por isValidRemoteUrl mas não é URL
  // absoluta — `new URL(raw)` sem base lança ERR_INVALID_URL e derruba a
  // render. Caminho relativo nunca é capa do blog.
  if (raw.startsWith("/")) return false;
  const url = new URL(raw);
  const isBlogHost =
    url.hostname === "meusanimes.blog" ||
    url.hostname.endsWith(".meusanimes.blog");
  return (
    url.protocol === "https:" &&
    isBlogHost &&
    url.pathname.startsWith("/wp-content/uploads/")
  );
}

/**
 * Sobe o nível de resolução da arte quando a fonte oferece um maior:
 * - AniList cover: `cover/medium` -> `cover/large` -> `cover/extraLarge`
 *   (banner do AniList não tem variação de tamanho — é só o arquivo).
 * - MyAnimeList: versão `l` (grande, ~600px) quando ainda é a miniatura padrão
 *   (~225px); se já é `l`, não há nível maior confiável — mantém.
 * - Capas do WordPress associadas a um anime: usa o resolver local do MAL.
 *   Sem o slug do anime, remove o sufixo `-<W>x<H>` do resize.
 * Devolve undefined para URLs inválidas e a própria URL quando não há upgrade.
 */
export function upgradeImageUrl(
  raw: string | null | undefined,
  animeSlug?: string,
  episodeNumber?: number,
): string | undefined {
  const safeUrl = safeImageSrc(raw, animeSlug, episodeNumber);
  if (!safeUrl) return undefined;
  if (safeUrl.startsWith("/")) return safeUrl;
  const url = safeUrl;

  // --- AniList cover ---
  const anilist = url.match(
    /\/anilistcdn\/media\/anime\/cover\/(medium|large)\//i,
  );
  if (anilist) {
    // O candidato só é usado em desktop e tem fallback. Pedir extraLarge
    // diretamente evita ampliar a variante `large` em telas de alta densidade.
    return url.replace(anilist[0], "/anilistcdn/media/anime/cover/extraLarge/");
  }

  // --- MyAnimeList ---
  if (
    /^https:\/\/cdn\.myanimelist\.net\//i.test(url) &&
    !/l\.(jpg|jpeg|png|webp)$/i.test(url)
  ) {
    return url.replace(/\.(jpg|jpeg|png|webp)$/i, 'l.$1');
  }

  // --- WordPress: remove o sufixo de resize `-<W>x<H>` p/ pegar o original ---
  // ex: .../wp-content/uploads/2025/06/hash-185x278.jpg -> ...hash.jpg
  const wpMarker = /-(\d{2,4})x(\d{2,4})\.(jpg|jpeg|png|webp)$/i;
  if (wpMarker.test(url)) {
    return url.replace(wpMarker, '.$3');
  }

  // --- Pinterest: sobe resolução de miniaturas (236x, 474x, 564x) para 736x ---
  const pinMarker = /^https:\/\/([a-z0-9-]+\.)?pinimg\.com\/(236x|474x|564x)\//i;
  if (pinMarker.test(url)) {
    return url.replace(/\/(236x|474x|564x)\//i, "/736x/");
  }

  return url;
}

/**
 * Verifica se a URL de imagem pertence a um dos domínios configurados em
 * `remotePatterns` no `next.config.ts`, permitindo otimização via `/_next/image`.
 * Se retornar false, a imagem deve ser renderizada com `unoptimized` para evitar
 * erro HTTP 400 ("url parameter is not allowed").
 */
export function isOptimizableImageUrl(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const val = raw.trim();
  if (!val || val.startsWith("/")) return true;
  try {
    const parsed = new URL(val);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "cdn.myanimelist.net" ||
      host.endsWith(".myanimelist.net") ||
      host === "meusanimes.blog" ||
      host.endsWith(".meusanimes.blog") ||
      host.endsWith(".anilist.co") ||
      host === "svuaszdqsgztnetefcex.supabase.co" ||
      host === "i.pinimg.com" ||
      host.endsWith(".pinimg.com") ||
      host === "pinterest.com" ||
      host.endsWith(".pinterest.com") ||
      host === "m.media-amazon.com" ||
      host.endsWith(".media-amazon.com") ||
      host === "images-na.ssl-images-amazon.com" ||
      host.endsWith(".ssl-images-amazon.com") ||
      host === "fliptru.com.br" ||
      host.endsWith(".fliptru.com.br") ||
      host === "i.imgur.com" ||
      host.endsWith(".imgur.com") ||
      host === "cdn.discordapp.com" ||
      host === "media.discordapp.net" ||
      host === "uploads.mangadex.org" ||
      host.endsWith(".mangadex.org") ||
      host.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

/**
 * Escapa strings para uso seguro em JSON-LD dentro de <script type="application/ld+json">.
 * Previne XSS via </script> injection em campos controlados pelo usuário (títulos, sinopses).
 */
export function escapeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
