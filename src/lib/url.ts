/**
 * Allowlist de schemes/hosts seguros para URLs renderizadas no client.
 * Bloqueia `data:`, `javascript:`, `file:` — vetores XSS via <img>/<poster>.
 */

export function isValidRemoteUrl(raw: string | null | undefined): raw is string {
  if (!raw) return false;
  let val = raw.trim();
  if (!val) return false;
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

/** Normaliza URLs de imagem e aponta capas do blog para o resolver do MAL. */
export function safeImageSrc(
  raw: string | null | undefined,
  animeSlug?: string,
): string | undefined {
  if (!isValidRemoteUrl(raw)) return undefined;
  const url = raw.trim();

  if (
    animeSlug &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(animeSlug) &&
    isMeusanimesCover(url)
  ) {
    return `/api/anime-cover/${encodeURIComponent(animeSlug)}`;
  }

  return url;
}

function isMeusanimesCover(raw: string): boolean {
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
): string | undefined {
  const safeUrl = safeImageSrc(raw, animeSlug);
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

  return url;
}

/**
 * Escapa strings para uso seguro em JSON-LD dentro de <script type="application/ld+json">.
 * Previne XSS via </script> injection em campos controlados pelo usuário (títulos, sinopses).
 */
export function escapeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
