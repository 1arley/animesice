import { AnimeCard } from "@/components/common/AnimeCard";
import { EpisodeCard } from "@/components/common/EpisodeCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { serverFetchJson } from "@/lib/api-server";
import { isOnAir } from "@/lib/status";
import { ContinueWatchingRail } from "@/components/common/ContinueWatchingRail";
import { RecommendationsRail } from "@/components/common/RecommendationsRail";
import { SectionLabel } from "@/components/common/SectionLabel";
import type { Anime, Episode, Paginated } from "@/types";

export const revalidate = 60;

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
      {/*
        Hierarquia semântica da página:
          h1 = "Prateleira" (título da página, único; sr-only na UI principal,
               o wordmark do header assume a marca visualmente)
          h2 = rótulos de seção (shelf-label)
          h3 = títulos de cards (AnimeCard/EpisodeCard)
      */}
      <h1 className="sr-only">Prateleira — Animes no ar, lançamentos e destaques</h1>

      <ContinueWatchingRail />
      <RecommendationsRail />

      {onAirList.length > 0 && (
        <section className="reveal mb-8" aria-labelledby="rail-onair">
          <Rail label="No ar agora" count={onAirList.length} labelId="rail-onair">
            {onAirList.map((anime, i) => (
              <div key={anime.id} className="w-[140px] shrink-0 snap-start">
                <AnimeCard anime={anime} priority={i < 3} />
              </div>
            ))}
          </Rail>
        </section>
      )}

      <section className="reveal mb-8" style={{ animationDelay: "60ms" }} aria-labelledby="shelf-lancamentos">
        <SectionLabel id="shelf-lancamentos">
          Em lançamento{" "}
          <span className="shelf-label-data">{animes.length} títulos</span>
        </SectionLabel>
        {animes.length === 0 ? (
          <p className="text-body-sm text-mist">
            Nenhum anime no catálogo ainda. Rode o seed do backend.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {animes.map((anime, i) => (
              <AnimeCard key={anime.id} anime={anime} priority={i < 6} />
            ))}
          </div>
        )}
      </section>

      <section className="reveal mb-8" style={{ animationDelay: "120ms" }} aria-labelledby="shelf-latest">
        <SectionLabel id="shelf-latest">
          Últimos episódios{" "}
          <span className="shelf-label-data">{latest.length} novos</span>
        </SectionLabel>
        {latest.length === 0 ? (
          <p className="text-body-sm text-mist">Sem episódios recentes.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {latest.map((ep, i) => (
              <EpisodeCard key={ep.id} episode={ep} priority={i < 4} />
            ))}
          </div>
        )}
      </section>

      {trending.length > 0 && (
        <section className="reveal mb-8" style={{ animationDelay: "180ms" }} aria-labelledby="shelf-trending">
          <SectionLabel id="shelf-trending">
            Em alta{" "}
            <span className="shelf-label-data">{trending.length} títulos</span>
          </SectionLabel>
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
        <section className="reveal mb-8" style={{ animationDelay: "240ms" }} aria-labelledby="shelf-recent">
          <SectionLabel id="shelf-recent">
            Recentemente adicionados{" "}
            <span className="shelf-label-data">{recent.length} títulos</span>
          </SectionLabel>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {recent.map((anime) => (
              <AnimeCard key={`recent-${anime.id}`} anime={anime} />
            ))}
          </div>
        </section>
      )}

      {animes.length > 0 && (
        <section className="reveal" style={{ animationDelay: "300ms" }} aria-labelledby="shelf-highlights">
          <SectionLabel id="shelf-highlights">Destaques da semana</SectionLabel>
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

/**
 * Rail horizontal scroll-x com snap. Recebe `labelId` para ligar o rótulo
 * visual à seção semântica (a seção-pai tem aria-labelledby apontando
 * para o id do label interno).
 */
function Rail({
  label,
  count,
  children,
  labelId,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
  labelId?: string;
}) {
  return (
    <>
      <SectionLabel id={labelId}>{label} <span className="shelf-label-data">{count}</span></SectionLabel>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
        <div className="flex gap-3 snap-x">{children}</div>
      </div>
    </>
  );
}
