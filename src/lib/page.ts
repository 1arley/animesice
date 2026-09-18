/**
 * Normaliza o parâmetro ?page= de listagens (buscar, catálogo, gêneros).
 * Absorve o que URLs reais carregam: valores repetidos (string[] no Next 15),
 * decimais, negativos, lixo alfanumérico e zeros. Só inteiros >= 1 passam;
 * qualquer outra coisa cai para a página 1.
 */
export function parsePage(raw: string | string[] | undefined): number {
  if (raw === undefined) return 1;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}