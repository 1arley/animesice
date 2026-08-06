import { notFound } from "next/navigation";
import type { Anime } from "@/types";
import { safeImageSrc } from "@/lib/url";
import { AdSlot } from "@/components/ads/AdSlot";
import { serverFetchJson } from "@/lib/api-server";
import { isOnAir } from "@/lib/status";
import { CommentSection } from "@/components/common/CommentSection";
import { FavoriteButton } from "@/components/common/FavoriteButton";
import { RatingStars, AnimeStatsDisplay } from "@/components/common/RatingStars";
import { AnimeCard } from "@/components/common/AnimeCard";
import { api } from "@/lib/api";

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anime = await serverFetchJson<Anime>(`/anime/${slug}`, 60);
  if (!anime) notFound();

  const episodes = (anime.episodes ?? []).slice().sort((a, b) => a.number - b.number);
  const related = await serverFetchJson<Anime[]>(`/anime/${slug}/related`, 300) ?? [];
  const ongoing = isOnAir(anime.status);
  const dub = anime.audio === "DUBLADO";

  return (
    <article className="mx-auto max-w-shelf px-4 py-6">
      <p className="mb-4">
            <a href="/" className="text-body-sm text-mist transition-colors hover:text-ice">
              ← Voltar à prateleira
            </a>
          </p>

          {/* Cabeça: capa + identidade. UI emoldura a arte, não compete. */}
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="shrink-0 md:w-56 lg:w-64">
              <div className="overflow-hidden bg-panel" style={{ aspectRatio: "2 / 3" }}>
                {safeImageSrc(anime.coverImage) ? (
                  <img
                    src={safeImageSrc(anime.coverImage)}
                    alt={anime.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-hairline">
                    <span className="font-display text-caption uppercase tracking-wider text-mist">
                      sem capa
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <h1 className="font-display text-display-xl text-ink">{anime.title}</h1>

              {/* Placar de fatos — binários que merecem signposting, não 5 chips. */}
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-y border-hairline py-3">
                {anime.rating != null && (
                  <div>
                    <dt className="font-display text-caption uppercase tracking-wider text-mist">
                      Nota
                    </dt>
                    <dd className="font-display text-body font-semibold text-ice tabular-nums">
                      {anime.rating.toFixed(2)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="font-display text-caption uppercase tracking-wider text-mist">
                    Status
                  </dt>
                  <dd className="font-sans text-body-sm font-medium text-ink">
                    {ongoing ? "Em lançamento" : anime.status || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-display text-caption uppercase tracking-wider text-mist">
                    Áudio
                  </dt>
                  <dd className="font-sans text-body-sm font-medium text-ink">
                    {dub ? "Dublado" : "Legendado"}
                  </dd>
                </div>
                {anime.ageRating && (
                  <div>
                    <dt className="font-display text-caption uppercase tracking-wider text-mist">
                      Classe
                    </dt>
                    <dd className="font-sans text-body-sm font-medium text-ink">
                      {anime.ageRating}
                    </dd>
                  </div>
                )}
              </dl>

               {anime.genres && anime.genres.length > 0 && (
                 <ul className="mt-4 flex flex-wrap gap-2">
                   {anime.genres.map((g) => (
                     <li
                       key={g.id}
                       className="border border-hairline px-2 py-1 font-sans text-caption text-mist"
                     >
                       {g.name}
                     </li>
                   ))}
                 </ul>
               )}

               <div className="mt-5 flex flex-wrap items-center gap-4">
                 <FavoriteButton slug={slug} />
                 <AnimeStatsDisplay slug={slug} />
               </div>

               <section className="mt-5">
                <h2 className="mb-2 font-sans text-caption font-semibold uppercase tracking-wider text-mist">
                  Sinopse
                </h2>
                <p className="whitespace-pre-line max-w-2xl text-body text-mist">
                  {anime.synopsis || "Sem sinopse disponível."}
                </p>
              </section>
            </div>
          </div>

          <AdSlot
            slot="0000000003"
            format="horizontal"
            className="mt-10 min-h-[90px]"
          />

          {/* Lista de episódios: grid de números, não cards de card-img.
              Nº é conteúdo, tipográfico. */}
           <section className="mt-10 border-y border-hairline py-6">
             <h2 className="mb-3 font-display text-body font-semibold text-ice">Avalie este anime</h2>
             <RatingStars slug={slug} />
           </section>

           <section className="mt-10">
             <h2 className="shelf-label">
              Episódios{" "}
              {episodes.length > 0 && (
                <span className="shelf-label-data">{episodes.length}</span>
              )}
            </h2>
            {episodes.length === 0 ? (
              <p className="text-body-sm text-mist">Sem episódios cadastrados.</p>
            ) : (
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {episodes.map((ep) => {
                  const available = ep.videoUrl ?? ep.embedUrl;
                  return (
                    <li key={ep.id}>
                      <a
                        href={`/animes/${slug}/${ep.number}`}
                        className={`group block border border-hairline bg-panel px-1 py-2 text-center transition-colors hover:border-ice ${
                          available ? "" : "opacity-40"
                        }`}
                        title={`Episódio ${ep.number}${available ? "" : " — sem vídeo"}`}
                      >
                        <span className="font-display text-body font-semibold text-mist tabular-nums transition-colors group-hover:text-ice">
                          {ep.number}
                        </span>
                        <span className="block font-display text-caption uppercase tracking-wider text-mist">
                          ep
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
           </section>

           {related.length > 0 && (
             <section className="mt-10">
               <h2 className="shelf-label">Você também pode gostar</h2>
               <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                 {related.map((item) => (
                   <AnimeCard key={item.id} anime={item} />
                 ))}
               </div>
             </section>
           )}

           <CommentSection animeId={anime.id} />
     </article>
   );
}
