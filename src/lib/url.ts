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

/** Normaliza URL de imagem: devolve a string só se for http(s) válida. */
export function safeImageSrc(raw: string | null | undefined): string | undefined {
  return isValidRemoteUrl(raw) ? (raw as string) : undefined;
}

/**
 * Sobe o nível de resolução da arte quando a fonte oferece um maior:
 * - AniList cover: `cover/medium` -> `cover/large` -> `cover/extraLarge`
 *   (banner do AniList não tem variação de tamanho — é só o arquivo).
 * - MyAnimeList: versão `l` (grande, ~600px) quando ainda é a miniatura padrão
 *   (~225px); se já é `l`, não há nível maior confiável — mantém.
 * - WordPress (meusanimes.blog etc.): remove o sufixo `-<W>x<H>` gerado pelo
 *   resize — a URL base aponta pro original de maior resolução.
 * Devolve undefined para URLs inválidas e a própria URL quando não há upgrade.
 */
export function upgradeImageUrl(
  raw: string | null | undefined,
): string | undefined {
  if (!isValidRemoteUrl(raw)) return undefined;
  const url = raw.trim();

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
