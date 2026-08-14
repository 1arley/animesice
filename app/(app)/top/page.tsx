import { AnimeCard } from "@/components/common/AnimeCard";
import { TiltedCard } from "@/components/core/TiltedCard";
import Link from "next/link";
import type { Metadata } from "next";
import type { Anime } from "@/types";
import { safeImageSrc } from "@/lib/url";
import { serverFetchJson } from "@/lib/api-server";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Top Animes",
  description: "Os animes mais bem avaliados da plataforma, ranqueados por nota.",
  alternates: { canonical: "/top" },
};

export default async function TopPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const sp = await searchParams;
  const limit = Math.min(Math.max(parseInt(sp.limit ?? "30", 10) || 30, 1), 100);

  const animes = await serverFetchJson<Anime[]>(`/anime/top?limit=${limit}`, { cache: "force-cache", next: { revalidate: 300, tags: ["top"] } }) ?? [];

  const [first, ...rest] = animes;
  const firstCover = first ? safeImageSrc(first.coverImage) : null;

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <h1 className="shelf-label">
        Top Animes{" "}
        <span className="shelf-label-data">{animes.length} títulos</span>
      </h1>

      {/* Destaque #1 — o pódio com tilt 3D que segue o cursor. */}
      {first && firstCover && (
        <Link
          href={`/animes/${first.slug}`}
          aria-label={`Top 1 — ${first.title}`}
          className="group mx-auto mb-10 block w-full max-w-[220px] sm:max-w-[240px]"
        >
          <TiltedCard
            imageSrc={firstCover}
            altText={first.title}
            captionText={`Nº 1 · ${first.title}`}
            overlayContent={
              <span className="bg-ink/80 px-1.5 py-0.5 font-mono text-caption font-bold text-ice tabular-nums backdrop-blur-sm">
                #1
              </span>
            }
            displayOverlayContent
          />
          <span className="mt-3 block text-center font-display text-body font-semibold text-snow transition-colors group-hover:text-ice">
            {first.title}
          </span>
        </Link>
      )}

      {animes.length === 0 ? (
        <p className="text-body-sm text-mist">Sem animes cadastrados ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {rest.map((anime, i) => (
            <div key={anime.id} className="relative">
              <span className="absolute left-1.5 top-1.5 z-10 bg-ink/80 px-1.5 py-0.5 font-mono text-caption font-bold text-ice tabular-nums">
                #{i + 2}
              </span>
              <AnimeCard anime={anime} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
