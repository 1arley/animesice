import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import type { Anime } from "@/types";
import { safeImageSrc, upgradeImageUrl } from "@/lib/url";
import { AdaptiveImage } from "@/components/common/AdaptiveImage";
import { blur } from "@/lib/blur";
import { serverFetchJson } from "@/lib/api-server";
import { isHentaiAnime, hentaisPath } from "@/lib/hentai";
import { isOnAir } from "@/lib/status";
import { CommentSection } from "@/components/common/CommentSection";
import { FavoriteButton } from "@/components/common/FavoriteButton";
import { AnimeListButton } from "@/components/common/AnimeListButton";
import { RatingStars, AnimeStatsDisplay } from "@/components/common/RatingStars";
import { AnimeCard } from "@/components/common/AnimeCard";
import { SpotlightCard } from "@/components/core/SpotlightCard";
import { PageTitle } from "@/components/ui/PageTitle";
import Image from "next/image";
import { SITE_URL } from "@/lib/site";

export const revalidate = 60;

const getAnime = cache(async (slug: string) => serverFetchJson<Anime>(`/anime/${slug}`, { cache: "force-cache", next: { revalidate: 60, tags: [`anime:${slug}`] } }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const anime = await getAnime(slug);
  if (!anime) return {};

  const description = anime.synopsis
    ? anime.synopsis.slice(0, 160)
    : `Assistir ${anime.title} online em HD, legendado${anime.audio === "DUBLADO" ? " e dublado" : ""}.`;
  const ogImage = upgradeImageUrl(anime.bannerImage) ?? upgradeImageUrl(anime.coverImage);

  return {
    title: anime.title,
    description,
    alternates: { canonical: `/animes/${slug}` },
    openGraph: {
      title: anime.title,
      description,
      type: "video.tv_show",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: anime.title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anime = await getAnime(slug);
  if (!anime) notFound();

  if (isHentaiAnime(anime)) permanentRedirect(hentaisPath(slug));

  const episodes = (anime.episodes ?? []).slice().sort((a, b) => a.number - b.number);
  const [related, similar] = await Promise.all([
    serverFetchJson<Anime[]>(`/anime/${slug}/related`, { cache: "force-cache", next: { revalidate: 300, tags: [`related:${slug}`] } }),
    serverFetchJson<Anime[]>(`/recommendation/similar/${slug}?limit=12`, { cache: "force-cache", next: { revalidate: 300, tags: [`similar:${slug}`] } }),
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
  const desktopCover = upgradeImageUrl(anime.coverImage);

  return (
    <article className="mx-auto max-w-shelf px-4 py-6">
      <p className="mb-4">
        <Link href="/" className="text-body-sm text-mist transition-colors hover:text-ice">
          ← Voltar à prateleira
        </Link>
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
            placeholder="blur"
            blurDataURL={blur.landscape}
            aria-hidden="true"
            className="object-cover opacity-30"
            quality={80}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-transparent to-transparent" />
        </div>
      )}

      {/* Cabeça: capa + identidade. UI emoldura a arte, não compete. */}
      <div className={`flex flex-col gap-6 ${banner ? "relative z-10 -mt-12 sm:-mt-20 lg:-mt-[120px]" : ""} md:flex-row`}>
        {/* No mobile a capa ganha largura fixa: sem isso o div aspect-ratio
            2:3 vira 100% da coluna e o poster domina a tela. */}
        <div className="w-36 shrink-0 sm:w-40 md:w-48 lg:w-56">
          <div className="relative overflow-hidden bg-panel shadow-lg shadow-black/40" style={{ aspectRatio: "2 / 3" }}>
            {cover ? (
              <AdaptiveImage
                src={cover}
                desktopSrc={desktopCover}
                alt={anime.title}
                fill
                sizes="(max-width: 768px) 50vw, 256px"
                priority
                placeholder="blur"
                blurDataURL={blur.portrait}
                className="object-cover"
                quality={85}
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

          <PageTitle variant="display" text={anime.title} />

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
                  {anime.season && (
                    <span className="text-mist">
                      {" "}
                      ·{" "}
                      {anime.season === "WINTER"
                        ? "Inverno"
                        : anime.season === "SPRING"
                          ? "Primavera"
                          : anime.season === "SUMMER"
                            ? "Verão"
                            : "Outono"}
                    </span>
                  )}
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
            {anime.anilistId && (
              <div>
                <dt className="font-mono text-caption uppercase tracking-wider text-mist">
                  AniList
                </dt>
                <dd className="font-mono text-body-sm font-medium text-ice tabular-nums">
                  <Link
                    href={`https://anilist.co/anime/${anime.anilistId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-snow"
                    title="Abrir no AniList"
                  >
                    #{anime.anilistId} ↗
                  </Link>
                </dd>
              </div>
            )}
          </dl>

          {anime.genres && anime.genres.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {anime.genres.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/generos/${g.slug}`}
                    className="border border-hairline px-2.5 py-1 font-sans text-caption text-mist transition-colors hover:border-ice hover:text-ice"
                  >
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-4">
            {episodes.length > 0 && (
              <Link
                href={`/animes/${slug}/${episodes[0].number}`}
                className="btn-ice"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                  <path d="M3 2l9 5-9 5z" />
                </svg>
                Assistir ep. 1
              </Link>
            )}
            <FavoriteButton slug={slug} />
            <AnimeListButton slug={slug} />
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
          /* Painel de episódios como um controle remoto: um único glow de
             gelo segue o cursor pela grade (raio curto, luz localizada) —
             spotlight por chip seria ruído visual num painel utilitário. */
          <SpotlightCard radius={140}>
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
              {episodes.map((ep) => {
                const available = ep.videoUrl ?? ep.embedUrl;
                return (
                  <li key={ep.id}>
                    <Link
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SpotlightCard>
        )}
      </section>

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

      <CommentSection animeId={anime.id} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TVSeries",
            name: anime.title,
            ...(anime.synopsis ? { description: anime.synopsis.slice(0, 300) } : {}),
            ...(anime.year ? { startDate: String(anime.year) } : {}),
            ...(cover ? { image: cover } : {}),
            ...(anime.genres?.length ? { genre: anime.genres.map((g) => g.name).join(", ") } : {}),
            ...(anime.studios?.length ? { productionCompany: { "@type": "Organization", name: anime.studios.join(", ") } } : {}),
            ...(anime.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: anime.rating, bestRating: 10, ratingCount: 1 } } : {}),
          }),
        }}
      />
    </article>
  );
}
