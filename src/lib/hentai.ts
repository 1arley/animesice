/**
 * Identificação de conteúdo +18 movido para o subdomínio hentais.
 * O backend marca títulos adultos com o gênero `Hentai` (slug `hentai`).
 */
import type { Anime, Genre } from "@/types";

export const HENTAIS_SITE_URL = "https://hentais.animesice.app";

const HENTAI_GENRE_SLUG = "hentai";

export function isHentaiGenre(genre: Pick<Genre, "slug">): boolean {
  return genre.slug === HENTAI_GENRE_SLUG;
}

export function isHentaiAnime(
  anime: Pick<Anime, "genres"> | null | undefined,
): boolean {
  return anime?.genres?.some((g) => isHentaiGenre(g)) ?? false;
}

export function hentaisPath(slug: string, number?: number): string {
  return number == null
    ? `${HENTAIS_SITE_URL}/animes/${slug}`
    : `${HENTAIS_SITE_URL}/animes/${slug}/${number}`;
}