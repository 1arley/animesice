/**
 * Tempo relativo em pt-BR para timestamps de atividade/perfil.
 * Ex.: "agora", "há 5 min", "há 3 h", "há 2 dias", "12/08/2026".
 */

/** Formata data absoluta curta (dd/mm/aaaa) — fallback para datas antigas. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * Tempo relativo compacto:
 *  - < 60s  → "agora"
 *  - < 60m  → "há N min"
 *  - < 24h  → "há N h"
 *  - < 7d   → "há N dias"
 *  - >= 7d  → data absoluta curta
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  if (diff < MIN) return "agora";
  if (diff < HOUR) {
    const n = Math.floor(diff / MIN);
    return `há ${n} min`;
  }
  if (diff < DAY) {
    const n = Math.floor(diff / HOUR);
    return `há ${n} h`;
  }
  if (diff < 7 * DAY) {
    const n = Math.floor(diff / DAY);
    return n === 1 ? "há 1 dia" : `há ${n} dias`;
  }
  return formatDate(iso);
}
