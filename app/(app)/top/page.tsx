import { AnimeCard } from "@/components/common/AnimeCard";
import type { Anime } from "@/types";
import { serverFetchJson } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function TopPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const sp = await searchParams;
  const limit = Math.min(Math.max(parseInt(sp.limit ?? "30", 10) || 30, 1), 100);

  const animes = await serverFetchJson<Anime[]>(`/anime/top?limit=${limit}`) ?? [];

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <h1 className="shelf-label">
        Top Animes{" "}
        <span className="shelf-label-data">{animes.length} títulos</span>
      </h1>
      {animes.length === 0 ? (
        <p className="text-body-sm text-mist">Sem animes cadastrados ainda.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {animes.map((anime, i) => (
            <div key={anime.id} className="relative">
              <span className="absolute left-1.5 top-1.5 z-10 bg-ink/80 px-1.5 py-0.5 font-mono text-caption font-bold text-ice tabular-nums">
                #{i + 1}
              </span>
              <AnimeCard anime={anime} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
