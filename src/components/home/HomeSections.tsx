import { cache } from "react";
import Link from "next/link";
import { AnimeCard } from "@/components/common/AnimeCard";
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
      {onAir.length > 0 && <Reveal className="mb-8"><section aria-labelledby="rail-onair"><SectionLabel id="rail-onair">No ar agora <span className="shelf-label-data">{onAir.length}</span></SectionLabel><div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-2"><div className="flex gap-3 snap-x">{onAir.map((anime) => <div key={anime.id} className="w-[140px] shrink-0 snap-start"><AnimeCard anime={anime} /></div>)}</div></div></section></Reveal>}
      <Shelf label="Melhores avaliados" id="shelf-lancamentos" count={animes.length} empty="Nenhum anime no catálogo ainda. Rode o seed do backend." animes={animes} />
      {animes.length > 0 && <Shelf label="Destaques da semana" id="shelf-highlights" animes={animes.slice(0, 6)} />}
    </>
  );
}

export async function LatestSection() {
  const latest = (await getLatest()) ?? [];
  return <Reveal className="mb-8"><section aria-labelledby="shelf-latest"><SectionLabel id="shelf-latest">Últimos episódios <span className="shelf-label-data">{latest.length} novos</span></SectionLabel>{latest.length ? <RevealStagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{latest.map((ep) => <EpisodeCard key={ep.id} episode={ep} />)}</RevealStagger> : <p className="text-body-sm text-mist">Sem episódios recentes.</p>}</section></Reveal>;
}

export async function TrendingSection() {
  const trending = (await getTrending()) ?? [];
  return trending.length ? <Shelf label="Em alta" id="shelf-trending" count={trending.length} animes={trending} /> : null;
}

export async function RecentSection() {
  const recent = (await getRecent()) ?? [];
  return recent.length ? <Shelf label="Recentemente adicionados" id="shelf-recent" count={recent.length} animes={recent} moreHref="/buscar?sort=recentlyAdded" /> : null;
}

function Shelf({ label, id, count, empty, animes, moreHref }: { label: string; id: string; count?: number; empty?: string; animes: Anime[]; moreHref?: string }) {
  return <Reveal className="mb-8"><section aria-labelledby={id}><SectionLabel id={id}>{label} {count !== undefined && <span className="shelf-label-data">{count} títulos</span>}</SectionLabel>{animes.length ? <><RevealStagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{animes.map((anime) => <AnimeCard key={`${id}-${anime.id}`} anime={anime} spotlight={false} />)}</RevealStagger>{moreHref && <div className="mt-6 flex justify-end"><Link href={moreHref} className="text-ice underline hover:text-snow font-sans text-caption">Ver mais →</Link></div>}</> : <p className="text-body-sm text-mist">{empty}</p>}</section></Reveal>;
}

export function SectionFallback({ hero = false }: { hero?: boolean }) {
  return <div aria-hidden="true" className={hero ? "mb-6 aspect-[4/3] animate-pulse bg-panel sm:aspect-[21/9] lg:aspect-[2.4/1]" : "mb-8 h-64 animate-pulse border border-hairline bg-panel/40"} />;
}
