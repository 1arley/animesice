import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { serverFetchJson } from "@/lib/api-server";
import type { Anime, Paginated } from "@/types";
import { isHentaiAnime } from "@/lib/hentai";

const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "", priority: 1.0 },
  { path: "/buscar", priority: 0.8 },
  { path: "/calendario", priority: 0.8 },
  { path: "/lancamentos", priority: 0.8 },
  { path: "/top", priority: 0.7 },
  { path: "/generos", priority: 0.7 },
  { path: "/blog", priority: 0.6 },
  { path: "/comunidade/sugestoes", priority: 0.6 },
  { path: "/aleatorio", priority: 0.6 },
];

const BLOG_POSTS = [
  "melhores-animes-2026",
  "guia-temporada-outono-2026",
  "melhores-animes-dublados",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, priority }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority,
    }),
  );

  // Blog posts
  const blogEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((slug) => ({
    url: `${SITE_URL}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  // Dynamic animes: paginated fetch, stop when page is empty or meta says done.
  const animeEntries: MetadataRoute.Sitemap = [];
  let page = 1;
  let hasMore = true;
  const limit = 200;

  while (hasMore && page <= 50) {
    const res = await serverFetchJson<Paginated<Pick<Anime, "slug" | "updatedAt" | "genres">>>(
      `/anime?page=${page}&limit=${limit}`,
      { cache: "force-cache", next: { revalidate: 3600, tags: ["sitemap"] } },
    );
    const items = res?.data ?? [];
    if (items.length === 0) {
      hasMore = false;
      break;
    }

    for (const anime of items) {
      // Conteúdo +18 foi movido para hentaisice.com — não pode mais
      // aparecer no sitemap do animesice.
      if (isHentaiAnime(anime)) continue;
      animeEntries.push({
        url: `${SITE_URL}/animes/${anime.slug}`,
        lastModified: new Date(anime.updatedAt ?? new Date()),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    const totalPages = res?.meta.totalPages ?? page;
    hasMore = page < totalPages;
    page++;
  }

  return [...staticEntries, ...blogEntries, ...animeEntries];
}
