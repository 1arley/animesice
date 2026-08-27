import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { serverFetchJson, serverListBlogPosts } from "@/lib/api-server";
import type { Anime, Genre, Paginated } from "@/types";
import { blogPostDate, normalizeBlogList, withLegacyFallback } from "@/lib/blog";

const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "", priority: 1.0 },
  { path: "/animes", priority: 0.9 },
  { path: "/calendario", priority: 0.8 },
  { path: "/lancamentos", priority: 0.8 },
  { path: "/top", priority: 0.7 },
  { path: "/generos", priority: 0.7 },
  { path: "/blog", priority: 0.6 },
  { path: "/sobre", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, priority }) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "daily",
      priority,
    }),
  );

  // Blog posts
  const blogPosts = withLegacyFallback(normalizeBlogList(await serverListBlogPosts()));
  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || blogPostDate(post)),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  // Genre pages: índice /generos/{slug} — uma chamada traz todos, sem paginação.
  const genres = (await serverFetchJson<Genre[]>("/genre", {
    cache: "force-cache",
    next: { revalidate: 3600, tags: ["sitemap"] },
  })) ?? [];
  const genreEntries: MetadataRoute.Sitemap = genres.map((genre) => ({
    url: `${SITE_URL}/generos/${genre.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
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
      if (anime.genres?.some((g) => g.slug === "hentai")) continue;
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

  return [...staticEntries, ...blogEntries, ...genreEntries, ...animeEntries];
}
