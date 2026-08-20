const FORMAT_LABELS: Record<string, string> = {
  TV: "TV",
  MOVIE: "Filme",
  OVA: "OVA",
  ONA: "ONA",
  SPECIAL: "Especial",
  MUSIC: "Música",
};

const SEASON_LABELS: Record<string, string> = {
  WINTER: "Inverno",
  SPRING: "Primavera",
  SUMMER: "Verão",
  FALL: "Outono",
};

const STATUS_LABELS: Record<string, string> = {
  LANCAMENTO: "Em lançamento",
  FINALIZADO: "Finalizado",
  EM_BREVE: "Em breve",
  PAUSADO: "Pausado",
  // Compatibilidade durante a aplicação da migração do banco.
  COMPLETO: "Finalizado",
  CONCLUIDO: "Finalizado",
};

export function animeFormatLabel(value: string): string {
  return FORMAT_LABELS[value] ?? value;
}

export function animeSeasonLabel(value: string): string {
  return SEASON_LABELS[value] ?? value;
}

export function animeStatusLabel(value: string): string {
  return STATUS_LABELS[value] ?? value;
}
