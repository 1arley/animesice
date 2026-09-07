import type { Anime } from "@/types";

export const ADULT_GENRE_SLUG = "hentai";
export const ADULT_AGE_RATING = "A18";
export const ADULT_CONFIRM_KEY = "animesice:adult-ok";

export function isHentai(anime: {
  genres?: Array<{ slug: string }> | null;
  ageRating?: string | null;
}): boolean {
  return (
    anime.ageRating === ADULT_AGE_RATING ||
    (anime.genres ?? []).some((g) => g.slug === ADULT_GENRE_SLUG)
  );
}

export function withoutAdult<T extends Parameters<typeof isHentai>[0]>(
  items: T[],
): T[] {
  return items.filter((a) => !isHentai(a));
}

export function isAdultCatalogEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADULT_CATALOG_ENABLED === "1";
}
