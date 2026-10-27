/**
 * Evento sazonal "Guerra Sangrenta" (TYBW).
 * Tudo desliga sozinho na data fim — nenhum deploy de remoção necessário.
 */
const BLOOD_WAR_END = new Date("2026-12-31T23:59:59-03:00");

export function isBloodWarActive(now: Date = new Date()): boolean {
  return now.getTime() < BLOOD_WAR_END.getTime();
}

/** Reconhece Bleach pelo título/slug em qualquer variação de catalogação. */
export function isBloodWarAnime(anime: {
  title: string;
  slug: string;
  alternativeTitles?: string[];
  japaneseTitle?: string | null;
}): boolean {
  const haystacks = [
    anime.title,
    anime.slug,
    anime.japaneseTitle ?? "",
    ...(anime.alternativeTitles ?? []),
  ];
  return haystacks.some((t) => t.toLowerCase().includes("bleach"));
}
