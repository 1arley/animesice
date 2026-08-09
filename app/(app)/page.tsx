import { AnimeCard } from "@/components/common/AnimeCard";
import { EpisodeCard } from "@/components/common/EpisodeCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { serverFetchJson } from "@/lib/api-server";
import { isOnAir } from "@/lib/status";
import { ContinueWatchingRail } from "@/components/common/ContinueWatchingRail";
import { RecommendationsRail } from "@/components/common/RecommendationsRail";
import type { Anime, Episode, Paginated } from "@/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [animesRes, latestRes, trendingRes, recentRes] = await Promise.all([
    serverFetchJson<Paginated<Anime>>("/anime?page=1&limit=12"),
    serverFetchJson<(Episode & { anime: Anime })[]>("/episode/latest?limit=12"),
    serverFetchJson<Anime[]>("/anime/trending?limit=12"),
    serverFetchJson<Anime[]>("/anime/recently-added?limit=12"),
  ]);

  const animes = animesRes?.data ?? [];
  const latest = latestRes ?? [];
  const trending = trendingRes ?? [];
  const recent = recentRes ?? [];

  // "No ar agora": lançamentos (status LANCAMENTO), únicos por slug.
  const onAir = new Map<string, Anime>();
  for (const a of animes) {
    if (isOnAir(a.status)) onAir.set(a.slug, a);
  }
  const onAirList = [...onAir.values()];

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <ContinueWatchingRail />
      <RecommendationsRail />
      {/* Signature: a programação de agora, como um broadcast bug.
          Hero = conteúdo (episódios correntes), não headline+gradient. */}
      {onAirList.length > 0 && (
            <section className="reveal mb-8" aria-label="No ar agora">
              <Rail label="No ar agora" count={onAirList.length}>
                {onAirList.map((anime) => (
                  <div key={anime.id} className="w-[140px] shrink-0 snap-start">
                    <AnimeCard anime={anime} />
                  </div>
                ))}
              </Rail>
            </section>
          )}

          <section className="reveal mb-8" style={{ animationDelay: "60ms" }} aria-label="Em lançamento">
            <h1 className="shelf-label">
              Em lançamento{" "}
              <span className="shelf-label-data">{animes.length} títulos</span>
            </h1>
            {animes.length === 0 ? (
              <p className="text-body-sm text-mist">
                Nenhum anime no catálogo ainda. Rode o seed do backend.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {animes.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            )}
          </section>

          <section className="reveal mb-8" style={{ animationDelay: "120ms" }} aria-label="Últimos episódios">
            <h2 className="shelf-label">
              Últimos episódios{" "}
              <span className="shelf-label-data">{latest.length} novos</span>
            </h2>
            {latest.length === 0 ? (
              <p className="text-body-sm text-mist">Sem episódios recentes.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {latest.map((ep) => (
                  <EpisodeCard key={ep.id} episode={ep} />
                ))}
              </div>
            )}
          </section>

          {trending.length > 0 && (
            <section className="reveal mb-8" style={{ animationDelay: "180ms" }} aria-label="Em alta">
              <h2 className="shelf-label">
                Em alta{" "}
                <span className="shelf-label-data">{trending.length} títulos</span>
              </h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {trending.map((anime) => (
                  <AnimeCard key={`trend-${anime.id}`} anime={anime} />
                ))}
              </div>
            </section>
          )}

          <AdSlot
            slot="0000000001"
            format="horizontal"
            className="reveal mb-8 min-h-[90px]"
            label="Publicidade"
          />

          {recent.length > 0 && (
            <section className="reveal mb-8" style={{ animationDelay: "240ms" }} aria-label="Recentemente adicionados">
              <h2 className="shelf-label">
                Recentemente adicionados{" "}
                <span className="shelf-label-data">{recent.length} títulos</span>
              </h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {recent.map((anime) => (
                  <AnimeCard key={`recent-${anime.id}`} anime={anime} />
                ))}
              </div>
            </section>
          )}

          {animes.length > 0 && (
            <section className="reveal" style={{ animationDelay: "300ms" }} aria-label="Destaques da semana">
              <h2 className="shelf-label">Destaques da semana</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {animes.slice(0, 6).map((anime) => (
                  <AnimeCard key={`week-${anime.id}`} anime={anime} />
                ))}
              </div>
            </section>
          )}

          <AdSlot
            slot="0000000002"
            format="horizontal"
            className="reveal mt-8 min-h-[90px]"
            label="Publicidade"
          />
      </div>
  );
}

/** Rail horizontal scroll-x com snap. Section label flexível p/ selo de contagem. */
function Rail({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <h1 className="shelf-label">
        {label} <span className="shelf-label-data">{count}</span>
      </h1>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
        <div className="flex gap-3 snap-x">{children}</div>
      </div>
    </>
  );
}
