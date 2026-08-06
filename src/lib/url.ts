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
