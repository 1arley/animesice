import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Anime } from "@/types";
import { safeImageSrc, upgradeImageUrl } from "@/lib/url";
import { AdSlot } from "@/components/ads/AdSlot";
import { serverFetchJson } from "@/lib/api-server";
import { isOnAir } from "@/lib/status";
import { CommentSection } from "@/components/common/CommentSection";
import { FavoriteButton } from "@/components/common/FavoriteButton";
import { RatingStars, AnimeStatsDisplay } from "@/components/common/RatingStars";
import { AnimeCard } from "@/components/common/AnimeCard";
import Image from "next/image";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const anime = await serverFetchJson<Anime>(`/anime/${slug}`);
  if (!anime) return {};

  const description = anime.synopsis
    ? anime.synopsis.slice(0, 160)
    : `Assistir ${anime.title} online em HD, legendado${anime.audio === "DUBLADO" ? " e dublado" : ""}.`;

  return {
    title: anime.title,
    description,
    openGraph: {
      title: anime.title,
      description,
      type: "video.tv_show",
    },
    twitter: {
      card: "summary_large_image",
      title: anime.title,
      description,
    },
  };
}

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anime = await serverFetchJson<Anime>(`/anime/${slug}`);
  if (!anime) notFound();

  const episodes = (anime.episodes ?? []).slice().sort((a, b) => a.number - b.number);
  const [related, similar] = await Promise.all([
    serverFetchJson<Anime[]>(`/anime/${slug}/related`),
    serverFetchJson<Anime[]>(`/recommendation/similar/${slug}?limit=12`),
  ]);
  const relatedAnimes = related ?? [];
  const similarAnimes = (similar ?? []).filter(
    (s) => !relatedAnimes.some((r) => r.id === s.id),
  ).slice(0, 6);
  const ongoing = isOnAir(anime.status);
  const dub = anime.audio === "DUBLADO";
  // upgradeImageUrl: sobe a resolução quando a fonte oferece (MAL l / AniList
  // extraLarge); cover vira fallback do banner p/ nunca ficar sem arte.
  const banner =
    upgradeImageUrl(anime.bannerImage) ?? upgradeImageUrl(anime.coverImage);
  const cover = safeImageSrc(anime.coverImage);

  return (
    <article className="mx-auto max-w-shelf px-4 py-6">
      <p className="mb-4">
        <a href="/" className="text-body-sm text-mist transition-colors hover:text-ice">
          ← Voltar à prateleira
        </a>
      </p>

      {/* Banner hero — backdrop with gradient overlay */}
      {banner && (
        <div className="relative mb-6 overflow-hidden" style={{ aspectRatio: "21 / 9", maxHeight: "320px" }}>
          <Image
            src={banner}
            alt=""
            fill
            sizes="100vw"
            priority
            aria-hidden="true"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-transparent to-transparent" />
        </div>
      )}

      {/* Cabeça: capa + identidade. UI emoldura a arte, não compete. */}
      <div className={`flex flex-col gap-6 ${banner ? "mt-[-120px] relative z-10" : ""} md:flex-row`}>
        <div className="shrink-0 md:w-48 lg:w-56">
          <div className="relative overflow-hidden bg-panel shadow-lg shadow-black/40" style={{ aspectRatio: "2 / 3" }}>
            {cover ? (
              <Image
                src={cover}
                alt={anime.title}
                fill
                sizes="(max-width: 768px) 50vw, 256px"
                priority
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-hairline">
                <span className="font-mono text-caption uppercase tracking-wider text-mist">
                  sem capa
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          {/* Status badge above title */}
          <div className="mb-2 flex items-center gap-2">
            <span className={`px-2 py-0.5 font-mono text-caption font-medium uppercase tracking-wider ${ongoing ? "bg-ice text-ink" : "border border-hairline text-mist"}`}>
              {ongoing ? (
                <>
                  <span className="edge-tag-live" aria-hidden="true" />
                  No ar
                </>
              ) : (
                "Finalizado"
              )}
            </span>
            <span className="font-mono text-caption uppercase tracking-wider text-mist">
              {dub ? "Dublado" : "Legendado"}
            </span>
            {anime.format && (
              <span className="font-mono text-caption uppercase tracking-wider text-mist">
                · {anime.format}
              </span>
            )}
          </div>

          <h1 className="font-display text-display-lg text-snow md:text-display-xl">{anime.title}</h1>

          {anime.japaneseTitle && (
            <p className="mt-1 font-sans text-body-sm text-mist">{anime.japaneseTitle}</p>
          )}

          {/* Placar de fatos */}
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-y border-hairline py-3">
            {anime.rating != null && anime.rating > 0 && (
              <div>
                <dt className="font-mono text-caption uppercase tracking-wider text-mist">
                  Nota
                </dt>
                <dd className="font-mono text-body font-medium text-ice tabular-nums">
                  {anime.rating.toFixed(2)}
                </dd>
              </div>
            )}
            {anime.year && (
              <div>
                <dt className="font-mono text-caption uppercase tracking-wider text-mist">
                  Ano
                </dt>
                <dd className="font-mono text-body-sm font-medium text-snow tabular-nums">
                  {anime.year}
                </dd>
              </div>
            )}
            {episodes.length > 0 && (
              <div>
                <dt className="font-mono text-caption uppercase tracking-wider text-mist">
                  Episódios
                </dt>
                <dd className="font-mono text-body-sm font-medium text-snow tabular-nums">
                  {episodes.length}
                </dd>
              </div>
            )}
            {anime.ageRating && (
              <div>
                <dt className="font-mono text-caption uppercase tracking-wider text-mist">
                  Classe
                </dt>
                <dd className="font-mono text-body-sm font-medium text-snow">
                  {anime.ageRating}
                </dd>
              </div>
            )}
            {anime.studios && anime.studios.length > 0 && (
              <div>
                <dt className="font-mono text-caption uppercase tracking-wider text-mist">
                  Estúdio
                </dt>
                <dd className="font-mono text-body-sm font-medium text-snow">
                  {anime.studios.join(", ")}
                </dd>
              </div>
            )}
          </dl>

          {anime.genres && anime.genres.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {anime.genres.map((g) => (
                <li key={g.id}>
                  <a
                    href={`/generos/${g.slug}`}
                    className="border border-hairline px-2.5 py-1 font-sans text-caption text-mist transition-colors hover:border-ice hover:text-ice"
                  >
                    {g.name}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-4">
            {episodes.length > 0 && (
              <a
                href={`/animes/${slug}/${episodes[0].number}`}
                className="btn-ice"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                  <path d="M3 2l9 5-9 5z" />
                </svg>
                Assistir ep. 1
              </a>
            )}
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

      {/* Avaliação */}
      <section className="mt-10 border-y border-hairline py-6">
        <h2 className="mb-3 font-display text-body font-semibold text-ice">Avalie este anime</h2>
        <RatingStars slug={slug} />
      </section>

      {/* Episódios */}
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
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
            {episodes.map((ep) => {
              const available = ep.videoUrl ?? ep.embedUrl;
              return (
                <li key={ep.id}>
                  <a
                    href={`/animes/${slug}/${ep.number}`}
                    className={`group block border border-hairline bg-panel px-1 py-2 text-center transition-all hover:border-ice hover:bg-hairline/50 ${
                      available ? "" : "opacity-40"
                    }`}
                    title={`Episódio ${ep.number}${available ? "" : " — sem vídeo"}`}
                  >
                    <span className="font-mono text-body font-medium text-mist tabular-nums transition-colors group-hover:text-ice">
                      {ep.number}
                    </span>
                    <span className="block font-mono text-caption uppercase tracking-wider text-mist">
                      ep
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {relatedAnimes.length > 0 && (
        <section className="mt-10">
          <h2 className="shelf-label">Você também pode gostar</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
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
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {similarAnimes.map((item) => (
              <AnimeCard key={`sim-${item.id}`} anime={item} />
            ))}
          </div>
        </section>
      )}

      <CommentSection animeId={anime.id} />
    </article>
  );
}
