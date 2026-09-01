import Link from "next/link";
import { AnimeCard } from "@/components/common/AnimeCard";
import { Pagination } from "@/components/ui/Pagination";
import type { Metadata } from "next";
import type { Anime } from "@/types";
import { serverFetchJson } from "@/lib/api-server";
import { SITE_URL } from "@/lib/site";
import { escapeJsonLd } from "@/lib/url";

export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  return {
    title:
      page > 1
        ? `Animes - Página ${page} — Catálogo completo`
        : "Animes — Catálogo completo de animes",
    description:
      "Navegue pelo catálogo completo de animes do AnimesIce. Encontre seus animes favoritos, descubra novos títulos e acompanhe as séries em lançamento.",
    alternates: {
      canonical: page > 1 ? `/animes?page=${page}` : "/animes",
    },
    openGraph: {
      title: "Animes | AnimesIce",
      description: "Catálogo completo de animes no AnimesIce.",
    },
  };
}

export default async function AnimesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const limit = 24;

  const data = await serverFetchJson<{
    data: Anime[];
    meta: { total: number; totalPages: number };
  }>(`/anime?page=${page}&limit=${limit}&sort=rating`, {
    cache: "force-cache",
    next: { revalidate: 300, tags: ["animes"] },
  });

  const animes = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Animes",
    description: "Catálogo completo de animes no AnimesIce.",
    url: `${SITE_URL}/animes`,
    isPartOf: { "@type": "WebSite", name: "AnimesIce", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: animes.map((anime, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "TVSeries",
          name: anime.title,
          url: `${SITE_URL}/animes/${anime.slug}`,
        },
      })),
    },
  };

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(jsonLd) }}
      />

      <nav className="mb-4 text-caption text-mist" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/" className="hover:text-ice">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ice">
            Animes
          </li>
        </ol>
      </nav>

      <h1 className="shelf-label">
        Animes{" "}
        <span className="shelf-label-data">{total} títulos</span>
      </h1>

      {animes.length === 0 ? (
        <p className="text-body-sm text-mist">Nenhum anime encontrado.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {animes.map((anime, i) => (
              <AnimeCard key={anime.id} anime={anime} priority={i < 6} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(p) => `/animes?page=${p}`}
          />
        </>
      )}
    </div>
  );
}