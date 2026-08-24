import { Suspense } from "react";
import { serverFetchJson } from "@/lib/api-server";
import type { Anime } from "@/types";
import { AnimeCard } from "@/components/common/AnimeCard";

async function RelatedSimilar({ slug }: { slug: string }) {
  const [related, similar] = await Promise.all([
    serverFetchJson<Anime[]>(`/anime/${slug}/related`, {
      cache: "force-cache",
      next: { revalidate: 300, tags: [`related:${slug}`] },
    }),
    serverFetchJson<Anime[]>(`/recommendation/similar/${slug}?limit=12`, {
      cache: "force-cache",
      next: { revalidate: 300, tags: [`similar:${slug}`] },
    }),
  ]);

  const relatedAnimes = related ?? [];
  const similarAnimes = (similar ?? [])
    .filter((s) => !relatedAnimes.some((r) => r.id === s.id))
    .slice(0, 6);

  return (
    <>
      {relatedAnimes.length > 0 && (
        <section className="mt-10">
          <h2 className="shelf-label">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {relatedAnimes.map((item) => (
              <AnimeCard key={item.id} anime={item} />
            ))}
          </div>
        </section>
      )}

      {similarAnimes.length > 0 && (
        <section className="mt-10">
          <h2 className="shelf-label">
            Animes similares{" "}
            <span className="shelf-label-data">{similarAnimes.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {similarAnimes.map((item) => (
              <AnimeCard key={`sim-${item.id}`} anime={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function RelatedSimilarFallback() {
  return (
    <section className="mt-10">
      <h2 className="shelf-label">Você também pode gostar</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: "2 / 3" }} />
        ))}
      </div>
    </section>
  );
}

export function RelatedSimilarSections({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<RelatedSimilarFallback />}>
      <RelatedSimilar slug={slug} />
    </Suspense>
  );
}
