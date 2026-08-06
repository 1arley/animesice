/**
 * Vocabulário de status do anime (fonte: backend, Prisma enum).
 * Convenção: substring-match em maiúsculas — "LANC" cobre LANCAMENTO etc.
 */

export function isOnAir(status?: string | null): boolean {
  return !!status && status.toUpperCase().includes("LANC");
}

export function isConcluded(status?: string | null): boolean {
  return !!status && status.toUpperCase().includes("CONCL");
}

/** Status -> rótulo curto da edge-tag (condensado, nao mais de ~10 chars). */
export function statusLabel(status: string): string {
  if (isOnAir(status)) return "No ar";
  if (isConcluded(status)) return "Fim";
  return status.slice(0, 8) || "Cat";
}
