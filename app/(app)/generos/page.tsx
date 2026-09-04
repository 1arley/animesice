import Link from "next/link";
import type { Metadata } from "next";
import type { Genre } from "@/types";
import { serverFetchJson } from "@/lib/api-server";
import { SITE_URL } from "@/lib/site";
import { EmptyState } from "@/components/ui/EmptyState";
import { escapeJsonLd } from "@/lib/url";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Gêneros — Todos os gêneros de anime",
  description:
    "Explore todos os gêneros de anime disponíveis no AnimesIce. Encontre ações, aventuras, comédia, drama, fantasia e muito mais.",
  alternates: { canonical: "/generos" },
  openGraph: {
    title: "Gêneros | AnimesIce",
    description: "Explore todos os gêneros de anime disponíveis no AnimesIce.",
    type: "website",
  },
};

export default async function GenerosPage() {
  const genres =
    (await serverFetchJson<Genre[]>("/genre", {
      cache: "force-cache",
      next: { revalidate: 300, tags: ["genres"] },
    })) ?? [];

  if (!genres || genres.length === 0) {
    return (
      <div className="mx-auto max-w-shelf px-4 py-6">
        <EmptyState text="Nenhum gênero encontrado." />
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Gêneros de Anime",
    description: "Explore todos os gêneros de anime disponíveis no AnimesIce.",
    url: `${SITE_URL}/generos`,
    isPartOf: { "@type": "WebSite", name: "AnimesIce", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: genres.length,
      itemListElement: genres.map((genre, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Thing",
          name: genre.name,
          url: `${SITE_URL}/generos/${genre.slug}`,
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
            Gêneros
          </li>
        </ol>
      </nav>

      <h1 className="shelf-label">
        Gêneros{" "}
        <span className="shelf-label-data">{genres.length} gêneros</span>
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {genres.map((genre) => (
          <Link
            key={genre.id}
            href={`/generos/${genre.slug}`}
            className="group flex flex-col items-center justify-center gap-2 rounded border border-hairline bg-panel p-4 text-center transition-colors hover:border-ice hover:bg-panel-subtle"
          >
            <span className="font-display text-lg text-snow transition-colors group-hover:text-ice">
              {genre.name}
            </span>
            <span className="font-mono text-caption text-mist tabular-nums">
              {genre._count?.animes ?? 0} animes
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
