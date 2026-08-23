/**
 * Identificação de conteúdo +18 movido para o subdomínio hentais.
 * O backend marca títulos adultos com o gênero `Hentai` (slug `hentai`).
 */
import type { Anime, Genre } from "@/types";

export const HENTAIS_SITE_URL =
  process.env.NEXT_PUBLIC_HENTAIS_SITE_URL || "https://www.hentaisice.com";

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

/**
 * Resolve migrações sem uma tabela de slugs no frontend.
 *
 * Quando um título é removido da API principal, ainda precisamos preservar a
 * URL que o Google e backlinks conhecem. A própria existência da página no
 * HentaisIce é a fonte de verdade. O resultado fica no Data Cache do Next por
 * um dia, evitando uma consulta externa em cada acesso a um 404 legítimo.
 */
export async function findHentaisMigration(
  slug: string,
  number?: number,
): Promise<string | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  if (number != null && (!Number.isInteger(number) || number < 0)) return null;

  const destination = hentaisPath(slug, number);

  try {
    const response = await fetch(destination, {
      method: "GET",
      redirect: "follow",
      cache: "force-cache",
      next: { revalidate: 86_400, tags: [`hentais-migration:${slug}`] },
    });

    if (!response.ok) return null;

    // O not-found do destino usa streaming do Next e pode responder 200. A
    // diretiva noindex é, nesse caso, o sinal confiável de soft-404.
    const html = await response.text();
    return /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)
      ? null
      : destination;
  } catch (error) {
    console.error(`[findHentaisMigration] ${destination} -> ${error}`);
    return null;
  }
}
