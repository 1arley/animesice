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
 * - AniList: `cover/medium` -> `cover/large` -> `cover/extraLarge` (o nível
 *   imediatamente acima do atual; banner já vem no maior disponível);
 * - MyAnimeList: versão `l` (grande, ~600px) quando ainda é a miniatura padrão
 *   (~225px); se já é `l`, não há nível maior confiável — mantém.
 * Devolve undefined para URLs inválidas e a própria URL quando não há upgrade.
 */
export function upgradeImageUrl(
  raw: string | null | undefined,
): string | undefined {
  if (!isValidRemoteUrl(raw)) return undefined;
  const url = raw.trim();

  const anilist = url.match(
    /\/anilistcdn\/media\/anime\/cover\/(medium|large)\//i,
  );
  if (anilist) {
    const target = anilist[1]?.toLowerCase() === 'medium' ? 'large' : 'extraLarge';
    return url.replace(anilist[0], `/anilistcdn/media/anime/cover/${target}/`);
  }

  if (
    /^https:\/\/cdn\.myanimelist\.net\//i.test(url) &&
    !/l\.(jpg|jpeg|png|webp)$/i.test(url)
  ) {
    return url.replace(/\.(jpg|jpeg|png|webp)$/i, 'l.$1');
  }

  return url;
}
