import { cache } from "react";
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

const options = { cache: "force-cache" as const, next: { revalidate: 60 } };
const getAnimes = cache(() => serverFetchJson<Paginated<Anime>>("/anime?page=1&limit=12", options));
const getLatest = cache(() => serverFetchJson<(Episode & { anime: Anime })[]>("/episode/latest?limit=12", options));
const getTrending = cache(() => serverFetchJson<Anime[]>("/anime/trending?limit=12", options));
const getRecent = cache(() => serverFetchJson<Anime[]>("/anime/recently-added?limit=12", options));

export async function TrendingHeroSection() {
  const trending = (await getTrending()) ?? [];
  return trending.length ? <DeferredHomeHero animes={trending.slice(0, 6)} /> : null;
}

export async function CatalogSections() {
  const animes = (await getAnimes())?.data ?? [];
  const onAir = [...new Map(animes.filter((anime) => isOnAir(anime.status)).map((anime) => [anime.slug, anime])).values()];
  return (
    <>
      {onAir.length > 0 && <Reveal className="mb-10"><section aria-labelledby="rail-onair"><SectionLabel id="rail-onair">No ar agora <span className="shelf-label-data">{onAir.length} séries</span></SectionLabel><div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-2"><div className="flex snap-x gap-3">{onAir.map((anime) => <div key={anime.id} className="w-[148px] shrink-0 snap-start sm:w-[164px]"><AnimeCard anime={anime} variant="poster" /></div>)}</div></div></section></Reveal>}
      <RankedShelf label="Melhores avaliados" id="shelf-lancamentos" empty="O catálogo está sendo preparado. Volte daqui a pouco para encontrar novos títulos." animes={animes} />
      {animes.length > 0 && <BroadcastShelf label="Escolhas da semana" id="shelf-highlights" animes={animes.slice(0, 6)} />}
    </>
  );
}

export async function LatestSection() {
  const latest = (await getLatest()) ?? [];
  return <Reveal className="mb-8"><section aria-labelledby="shelf-latest"><SectionLabel id="shelf-latest">Últimos episódios <span className="shelf-label-data">{latest.length} novos</span></SectionLabel>{latest.length ? <RevealStagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{latest.map((ep) => <EpisodeCard key={ep.id} episode={ep} />)}</RevealStagger> : <p className="text-body-sm text-mist">Sem episódios recentes.</p>}</section></Reveal>;
}

export async function TrendingSection() {
  const trending = (await getTrending()) ?? [];
  return trending.length ? <RankedShelf label="Em alta agora" id="shelf-trending" animes={trending} /> : null;
}

export async function RecentSection() {
  const recent = (await getRecent()) ?? [];
  return recent.length ? <Shelf label="Acabaram de chegar" id="shelf-recent" count={recent.length} animes={recent} moreHref="/buscar?sort=recentlyAdded" /> : null;
}

function Shelf({ label, id, count, empty, animes, moreHref }: { label: string; id: string; count?: number; empty?: string; animes: Anime[]; moreHref?: string }) {
  return <Reveal className="mb-12"><section aria-labelledby={id}><SectionLabel id={id}>{label} {count !== undefined && <span className="shelf-label-data">{count} títulos</span>}</SectionLabel>{animes.length ? <><RevealStagger className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{animes.map((anime) => <AnimeCard key={`${id}-${anime.id}`} anime={anime} spotlight={false} variant="poster" />)}</RevealStagger>{moreHref && <div className="mt-6 flex justify-end"><Link href={moreHref} className="inline-flex min-h-11 items-center border-b border-ice/50 font-sans text-body-sm text-snow transition-colors hover:border-ice hover:text-ice">Ver todo o catálogo <span className="ml-2" aria-hidden="true">→</span></Link></div>}</> : <p className="max-w-lg border-l-2 border-hairline py-2 pl-4 text-body-sm text-mist">{empty}</p>}</section></Reveal>;
}

function RankedShelf({ label, id, empty, animes }: { label: string; id: string; empty?: string; animes: Anime[] }) {
  return <Reveal className="mb-12"><section aria-labelledby={id}><SectionLabel id={id}>{label} {animes.length > 0 && <span className="shelf-label-data">ranking</span>}</SectionLabel>{animes.length ? <RevealStagger className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{animes.map((anime, index) => <AnimeCard key={`${id}-${anime.id}`} anime={anime} rank={index + 1} spotlight={false} variant="poster" />)}</RevealStagger> : <p className="max-w-lg border-l-2 border-hairline py-2 pl-4 text-body-sm text-mist">{empty}</p>}</section></Reveal>;
}

function BroadcastShelf({ label, id, animes }: { label: string; id: string; animes: Anime[] }) {
  return <Reveal className="mb-12"><section aria-labelledby={id}><SectionLabel id={id}>{label}<span className="shelf-label-note">curadoria da casa</span></SectionLabel><div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"><RevealStagger className="flex snap-x gap-3 md:grid md:grid-cols-3">{animes.map((anime, index) => <div key={`${id}-${anime.id}`} className="w-[84vw] max-w-[430px] shrink-0 snap-start md:w-auto"><BroadcastCard anime={anime} priority={index === 0} /></div>)}</RevealStagger></div></section></Reveal>;
}

export function SectionFallback({ hero = false }: { hero?: boolean }) {
  return <div aria-hidden="true" className={hero ? "mb-6 aspect-[4/3] animate-pulse bg-panel sm:aspect-[21/9] lg:aspect-[2.4/1]" : "mb-10 h-64 animate-pulse border border-hairline bg-panel/40"} />;
}
