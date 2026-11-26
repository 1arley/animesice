import { cache, type ReactNode } from "react";
import Link from "next/link";
import { AnimeCard } from "@/components/common/AnimeCard";
import { BroadcastCard } from "@/components/common/BroadcastCard";
import { DeferredHomeHero } from "@/components/common/DeferredHomeHero";
import { EpisodeCard } from "@/components/common/EpisodeCard";
import { SectionLabel } from "@/components/common/SectionLabel";
import { Reveal, RevealStagger } from "@/components/core/Reveal";
import { serverFetchJson } from "@/lib/api-server";
import { isOnAir } from "@/lib/status";
import type { Anime, Episode, Paginated } from "@/types";

/* ───────────── data ───────────── */

const options = { cache: "force-cache" as const, next: { revalidate: 60 } };

const getAnimes = cache(() => serverFetchJson<Paginated<Anime>>("/anime?page=1&limit=12", options));
const getLatest = cache(() => serverFetchJson<(Episode & { anime: Anime })[]>("/episode/latest?limit=12", options));
const getTrending = cache(() => serverFetchJson<Anime[]>("/anime/trending?limit=12", options));
const getRecent = cache(() => serverFetchJson<Anime[]>("/anime/recently-added?limit=12", options));

/* ───────────── helpers ───────────── */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Abaixo da dobra: o navegador pula layout/paint até a seção ficar próxima da viewport.
const LAZY = "[content-visibility:auto] [contain-intrinsic-size:auto_480px]";

const GRID_6 = "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
const GRID_5 = "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

function Empty({ children }: { children: ReactNode }) {
  return <p className="max-w-lg border-l-2 border-hairline py-2 pl-4 text-body-sm text-mist">{children}</p>;
}

function Rail({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`scrollbar-none -mx-4 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice/60 ${className}`}
    >
      {children}
    </div>
  );
}

function Shelf({
  id,
  label,
  data,
  className = "mb-12",
  children,
}: {
  id: string;
  label: ReactNode;
  data?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Reveal className={className}>
      <section aria-labelledby={id} className={LAZY}>
        <SectionLabel id={id}>
          {label}
          {data && <span className="shelf-label-data">{data}</span>}
        </SectionLabel>
        {children}
      </section>
    </Reveal>
  );
}

/* ───────────── sections ───────────── */

export async function TrendingHeroSection() {
  const trending = (await getTrending()) ?? [];
  return trending.length ? <DeferredHomeHero animes={trending.slice(0, 6)} /> : null;
}

export async function CatalogSections() {
  const animes = (await getAnimes())?.data ?? [];

  const onAir = [...new Map(animes.filter((a) => isOnAir(a.status)).map((a) => [a.slug, a])).values()];

  return (
    <>
      {onAir.length > 0 && (
        <Shelf id="rail-onair" label="No ar agora" data={plural(onAir.length, "série", "séries")} className="mb-10">
          <Rail label="Séries no ar agora">
            <ul className="flex gap-3">
              {onAir.map((anime) => (
                <li key={anime.id} className="w-[148px] shrink-0 snap-start sm:w-[164px]">
                  <AnimeCard anime={anime} variant="poster" />
                </li>
              ))}
            </ul>
          </Rail>
        </Shelf>
      )}

      <Shelf id="shelf-top-rated" label="Melhores avaliados" data={animes.length > 0 ? "ranking" : undefined}>
        {animes.length ? (
          <RevealStagger className={GRID_6}>
            {animes.map((anime, i) => (
              <AnimeCard key={anime.id} anime={anime} rank={i + 1} spotlight={false} variant="poster" />
            ))}
          </RevealStagger>
        ) : (
          <Empty>O catálogo está sendo preparado. Volte daqui a pouco para encontrar novos títulos.</Empty>
        )}
      </Shelf>

      {animes.length > 0 && (
        <Shelf id="shelf-highlights" label={<>Escolhas da semana</>} data={undefined}>
          <Rail label="Escolhas da semana" className="md:mx-0 md:overflow-visible md:px-0">
            <RevealStagger className="flex gap-3 md:grid md:grid-cols-3">
              {animes.slice(0, 6).map((anime, i) => (
                <div key={anime.id} className="w-[84vw] max-w-[430px] shrink-0 snap-start md:w-auto md:max-w-none">
                  <BroadcastCard anime={anime} priority={i === 0} />
                </div>
              ))}
            </RevealStagger>
          </Rail>
          <span className="sr-only">curadoria da casa</span>
        </Shelf>
      )}
    </>
  );
}

export async function LatestSection() {
  const latest = (await getLatest()) ?? [];
  return (
    <Shelf id="shelf-latest" label="Últimos episódios" data={plural(latest.length, "novo", "novos")} className="mb-8">
      {latest.length ? (
        <RevealStagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {latest.map((ep) => (
            <EpisodeCard key={ep.id} episode={ep} />
          ))}
        </RevealStagger>
      ) : (
        <Empty>Sem episódios recentes.</Empty>
      )}
    </Shelf>
  );
}

export async function TrendingSection() {
  const trending = (await getTrending()) ?? [];
  if (!trending.length) return null;
  return (
    <Shelf id="shelf-trending" label="Em alta agora" data="ranking">
      <RevealStagger className={GRID_6}>
        {trending.map((anime, i) => (
          <AnimeCard key={anime.id} anime={anime} rank={i + 1} spotlight={false} variant="poster" />
        ))}
      </RevealStagger>
    </Shelf>
  );
}

export async function RecentSection() {
  const recent = (await getRecent()) ?? [];
  if (!recent.length) return null;
  return (
    <Shelf id="shelf-recent" label="Acabaram de chegar" data={plural(recent.length, "título", "títulos")}>
      <RevealStagger className={GRID_5}>
        {recent.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} spotlight={false} variant="poster" />
        ))}
      </RevealStagger>
      <div className="mt-6 flex justify-end">
        <Link
          href="/buscar?sort=recentlyAdded"
          className="group inline-flex min-h-11 items-center border-b border-ice/50 font-sans text-body-sm text-snow transition-colors hover:border-ice hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice/60"
        >
          Ver todo o catálogo
          <span className="ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </Shelf>
  );
}

export function SectionFallback({ hero = false }: { hero?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={
        hero
          ? "-mx-4 aspect-[4/3] min-h-80 w-[calc(100%+2rem)] animate-pulse bg-panel pb-[61px] [box-sizing:content-box] sm:mx-0 sm:aspect-[21/9] sm:min-h-72 sm:w-full md:aspect-[2.8/1] lg:aspect-[3.2/1]"
          : "mb-10 h-64 animate-pulse border border-hairline bg-panel/40"
      }
    />
  );
}
