import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnimeCard } from "@/components/common/AnimeCard";
import type { GenreAnimesResponse } from "@/types";
import { serverFetchJson } from "@/lib/api-server";
import { SITE_URL } from "@/lib/site";
import { escapeJsonLd } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const genreName = slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const description = `Assistir animes do gênero ${genreName} online em HD. Catálogo completo com ${genreName} legendados e dublados no AnimesIce.`;

  return {
    title: page > 1 ? `${genreName} - Página ${page}` : genreName,
    description,
    alternates: {
      canonical: page > 1 ? `/generos/${slug}?page=${page}` : `/generos/${slug}`,
      types: {
        "application/rss+xml": [
          { title: `${genreName} RSS`, url: `/generos/${slug}/rss` },
        ],
      },
    },
    openGraph: {
      title: `${genreName} | AnimesIce`,
      description,
      type: "website",
    },
  };
}

export default async function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const limit = 24;

  const data = await serverFetchJson<GenreAnimesResponse>(
    `/genre/${slug}/animes?page=${page}&limit=${limit}`,
  );

  // Gênero inexistente: gera 404 real. Um 200 com texto "não encontrado"
  // vira soft-404 no Google (e, com streaming, noindex) — exatamente o que
  // as páginas não indexadas do Search Console mostravam.
  if (!data || !data.genre) notFound();

  const { genre, data: animes, meta } = data;
  const genreName = genre.name;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${genreName} - Animes`,
    description: `Catálogo de animes do gênero ${genreName} no AnimesIce.`,
    url: `${SITE_URL}/generos/${slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: "AnimesIce",
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: meta.total,
      itemListElement: animes.slice(0, 10).map((anime, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "TVSeries",
          name: anime.title,
          url: `${SITE_URL}/animes/${anime.slug}`,
          ...(anime.coverImage ? { image: anime.coverImage } : {}),
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
          <li><a href="/" className="hover:text-ice">Início</a></li>
          <li aria-hidden="true">/</li>
          <li><a href="/generos" className="hover:text-ice">Gêneros</a></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ice">{genreName}</li>
        </ol>
      </nav>

      <h1 className="shelf-label">
        {genreName}{" "}
        <span className="shelf-label-data">{meta.total} títulos</span>
      </h1>

      {animes.length === 0 ? (
        // Gênero sem nenhum anime publicado ainda é uma página válida
        // (alguns gêneros reais têm 0 títulos publicados em prod). 404 aqui
        // quebraria links legítimos do índice /generos.
        <p className="text-body-sm text-mist">Nenhum anime neste gênero.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {animes.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>

          <nav className="mt-8 flex items-center gap-3" aria-label="Paginação">
            {page > 1 ? (
              <a href={`/generos/${slug}?page=${page - 1}`} className="btn-ghost">← Anterior</a>
            ) : (
              <span className="btn-ghost opacity-40">← Anterior</span>
            )}
            <span className="font-mono text-body-sm text-mist tabular-nums">
              {page} / {meta.totalPages}
            </span>
            {page < meta.totalPages ? (
              <a href={`/generos/${slug}?page=${page + 1}`} className="btn-ghost">Próxima →</a>
            ) : (
              <span className="btn-ghost opacity-40">Próxima →</span>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
