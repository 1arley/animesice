import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import type { Anime } from "@/types";
import { safeImageSrc, upgradeImageUrl, escapeJsonLd } from "@/lib/url";
import { AdaptiveImage } from "@/components/common/AdaptiveImage";
import { blur } from "@/lib/blur";
import { serverFetchJson } from "@/lib/api-server";

import { isOnAir } from "@/lib/status";
import { CommentSection } from "@/components/common/CommentSection";
import { FavoriteButton } from "@/components/common/FavoriteButton";
import { AnimeListButton } from "@/components/common/AnimeListButton";
import { RatingStars, AnimeStatsDisplay } from "@/components/common/RatingStars";
import { SpotlightCard } from "@/components/core/SpotlightCard";
import { RelatedSimilarSections } from "@/components/common/RelatedSimilarSections";
import { PageTitle } from "@/components/ui/PageTitle";
import { ShareButtons } from "@/components/common/ShareButtons";
import { PrefetchEpisodeLink } from "@/components/common/PrefetchEpisodeLink";
import { EpisodePrefetcher } from "@/components/common/EpisodePrefetcher";
import Image from "next/image";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

const getAnime = cache(async (slug: string) => serverFetchJson<Anime>(`/anime/${slug}`, { cache: "force-cache", next: { revalidate: 300, tags: [`anime:${slug}`] } }));

export async function generateStaticParams() {
  const trending = await serverFetchJson<Pick<Anime, "slug">[]>("/anime/trending?limit=24", {
    cache: "force-cache",
    next: { revalidate: 3600 },
  });
  return (trending ?? []).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const anime = await getAnime(slug);
  if (!anime) return {};

  const statusText = isOnAir(anime.status) ? "no ar" : "finalizado";
  const audioText = anime.audio === "DUBLADO" ? "dublado em português" : "legendado";
  const genresText = anime.genres?.length ? anime.genres.slice(0, 3).map((g) => g.name).join(", ") : "";
  const episodesText = anime.episodes?.length ? `${anime.episodes.length} episódios` : "";
  const metaParts = [
    `Assistir ${anime.title} ${audioText} em HD`,
    genresText && `Gêneros: ${genresText}`,
    episodesText,
    anime.year && `Ano: ${anime.year}`,
    statusText,
  ].filter(Boolean);
  const description = metaParts.join(" · ").slice(0, 160);
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

  const episodes = (anime.episodes ?? []).slice().sort((a, b) => a.number - b.number);
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
      {/* Prefetch em background dos episódios visíveis — aquece o cache do backend */}
      <EpisodePrefetcher
        episodes={episodes.slice(0, 12).map((ep) => ({ animeSlug: slug, episodeNumber: ep.number }))}
      />

      <nav className="mb-4 text-caption text-mist" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li><a href="/" className="hover:text-ice">Início</a></li>
          <li aria-hidden="true">/</li>
          <li><a href="/animes" className="hover:text-ice">Animes</a></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ice">{anime.title}</li>
        </ol>
      </nav>

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

          <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
            {episodes.length > 0 && (
              <PrefetchEpisodeLink
                href={`/animes/${slug}/${episodes[0].number}`}
                animeSlug={slug}
                episodeNumber={episodes[0].number}
                prefetch
                className="btn-primary col-span-2 justify-center sm:col-span-1 sm:justify-start"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                  <path d="M3 2l9 5-9 5z" />
                </svg>
                Assistir ep. 1
              </PrefetchEpisodeLink>
            )}
            <FavoriteButton slug={slug} />
            <AnimeListButton slug={slug} />
            <div className="col-span-2 sm:col-span-1">
              <AnimeStatsDisplay slug={slug} />
            </div>
          </div>

          <div className="mt-4">
            <ShareButtons
              title={anime.title}
              url={`/animes/${slug}`}
              description={anime.synopsis?.slice(0, 100)}
            />
          </div>

          <section className="mt-5">
            <h2 className="mb-2 font-sans text-caption font-semibold uppercase tracking-wider text-mist">
              Sinopse
            </h2>
            <p className="whitespace-pre-line max-w-2xl text-body text-mist">
              {anime.editorialSynopsis || anime.synopsis || "Sem sinopse disponível."}
            </p>
          </section>

          <section className="mt-5 border border-hairline bg-panel/50 p-4">
            <h2 className="mb-2 font-sans text-caption font-semibold uppercase tracking-wider text-mist">
              Onde assistir
            </h2>
            <p className="text-body-sm text-snow">
              {anime.editorialWhereToWatch || "Assista no AnimesIce"}
            </p>
            {episodes.length > 0 && (
                <PrefetchEpisodeLink
                  href={`/animes/${slug}/${episodes[0].number}`}
                  animeSlug={slug}
                  episodeNumber={episodes[0].number}
                  prefetch
                  className="btn-primary mt-3 inline-flex"
                >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                  <path d="M3 2l9 5-9 5z" />
                </svg>
                Assistir agora
              </PrefetchEpisodeLink>
            )}
          </section>

          {(anime.editorialSeasonsInfo || anime.year || anime.season || anime.format) && (
            <section className="mt-5 border border-hairline bg-panel/50 p-4">
              <h2 className="mb-2 font-sans text-caption font-semibold uppercase tracking-wider text-mist">
                Temporadas
              </h2>
              <p className="text-body-sm text-snow">
                {anime.editorialSeasonsInfo ||
                  [anime.year, anime.season && (anime.season === "WINTER" ? "Inverno" : anime.season === "SPRING" ? "Primavera" : anime.season === "SUMMER" ? "Verão" : "Outono"), anime.format]
                    .filter(Boolean)
                    .join(" · ") ||
                  "Informação não disponível."}
              </p>
            </section>
          )}

          {(anime.editorialDubbingInfo || anime.audio) && (
            <section className="mt-5 border border-hairline bg-panel/50 p-4">
              <h2 className="mb-2 font-sans text-caption font-semibold uppercase tracking-wider text-mist">
                Dublagem
              </h2>
              <p className="text-body-sm text-snow">
                {anime.editorialDubbingInfo ||
                  (dub ? "Disponível dublado em português" : "Disponível legendado")}
              </p>
            </section>
          )}

          {episodes.length > 0 && (
            <section className="mt-6 border border-hairline bg-panel/50 p-4">
              <h2 className="mb-3 font-sans text-caption font-semibold uppercase tracking-wider text-mist">
                Informações rápidas
              </h2>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-caption text-mist">Total de episódios</dt>
                  <dd className="font-mono text-body-sm font-medium text-snow">{episodes.length} episódios</dd>
                </div>
                {anime.year && (
                  <div>
                    <dt className="font-mono text-caption text-mist">Ano de lançamento</dt>
                    <dd className="font-mono text-body-sm font-medium text-snow">{anime.year}</dd>
                  </div>
                )}
                {anime.audio && (
                  <div>
                    <dt className="font-mono text-caption text-mist">Áudio</dt>
                    <dd className="font-mono text-body-sm font-medium text-snow">{dub ? "Dublado em português" : "Legendado"}</dd>
                  </div>
                )}
                {anime.status && (
                  <div>
                    <dt className="font-mono text-caption text-mist">Status</dt>
                    <dd className="font-mono text-body-sm font-medium text-snow">{ongoing ? "No ar (em lançamento)" : "Finalizado"}</dd>
                  </div>
                )}
                {anime.studios && anime.studios.length > 0 && (
                  <div>
                    <dt className="font-mono text-caption text-mist">Estúdio</dt>
                    <dd className="font-mono text-body-sm font-medium text-snow">{anime.studios.join(", ")}</dd>
                  </div>
                )}
                {anime.ageRating && (
                  <div>
                    <dt className="font-mono text-caption text-mist">Classificação indicativa</dt>
                    <dd className="font-mono text-body-sm font-medium text-snow">{anime.ageRating}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>
      </div>

      {/* Avaliação */}
      <section className="mt-10 border-y border-hairline py-6">
        <h2 className="mb-3 font-display text-body font-semibold text-ice">Avalie este anime</h2>
        <RatingStars slug={slug} />
      </section>

      {/* Episódios */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="shelf-label">
            Episódios{" "}
            {episodes.length > 0 && (
              <span className="shelf-label-data">{episodes.length}</span>
            )}
          </h2>
          {episodes.length > 12 && (
            <Link
              href={`/animes/${slug}/${episodes[0].number}`}
              prefetch
              className="font-mono text-caption text-ice transition-colors hover:text-snow"
            >
              Ver todos →
            </Link>
          )}
        </div>
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
                      prefetch
                      className={`group block border border-hairline bg-panel px-1 py-2 text-center transition-all hover:border-ice hover:bg-hairline/50 ${
                        available ? "" : "opacity-60"
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

      <RelatedSimilarSections slug={slug} />

      <CommentSection animeId={anime.id} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: escapeJsonLd({
            "@context": "https://schema.org",
            "@type": "TVSeries",
            name: anime.title,
            ...(anime.japaneseTitle ? { alternateName: anime.japaneseTitle } : {}),
            url: `${SITE_URL}/animes/${slug}`,
            ...(anime.editorialSynopsis || anime.synopsis ? { description: (anime.editorialSynopsis || anime.synopsis)!.slice(0, 500) } : {}),
            ...(anime.year ? { startDate: String(anime.year) } : {}),
            ...(cover ? { image: cover } : {}),
            ...(anime.bannerImage ? { thumbnailUrl: upgradeImageUrl(anime.bannerImage) } : {}),
            ...(anime.genres?.length ? { genre: anime.genres.map((g) => g.name) } : {}),
            ...(anime.studios?.length ? { productionCompany: anime.studios.map((s) => ({ "@type": "Organization", name: s })) } : {}),
            ...(anime.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: anime.rating, bestRating: 10, ratingCount: 1, reviewCount: 1 } } : {}),
            ...(anime.format ? { televisionFormat: anime.format } : {}),
            ...(anime.ageRating ? { contentRating: anime.ageRating } : {}),
            ...(episodes.length > 0 ? { numberOfEpisodes: episodes.length } : {}),
            ...(episodes.length > 0 ? { episode: episodes.slice(0, 10).map((ep) => ({ "@type": "TVEpisode", episodeNumber: ep.number, name: `Episódio ${ep.number}`, url: `${SITE_URL}/animes/${slug}/${ep.number}` })) } : {}),
            ...(ongoing ? { productionStatus: "https://schema.org/InPostProduction" } : { productionStatus: "https://schema.org/Completed" }),
            ...(anime.genres?.length ? { about: anime.genres.map((g) => ({ "@type": "Thing", name: g.name })) } : {}),
            potentialAction: { "@type": "WatchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/animes/${slug}/${episodes[0]?.number ?? 1}` } },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: escapeJsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Animes", item: `${SITE_URL}/animes` },
              { "@type": "ListItem", position: 3, name: anime.title },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: escapeJsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `Quantos episódios tem ${anime.title}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `${anime.title} possui ${episodes.length} episódios.`,
                },
              },
              {
                "@type": "Question",
                name: `${anime.title} é dublado ou legendado?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `${anime.title} está disponível ${dub ? "dublado em português" : "legendado"} no AnimesIce.`,
                },
              },
              {
                "@type": "Question",
                name: `${anime.title} está finalizado?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: ongoing
                    ? `${anime.title} está no ar e ainda está sendo exibido.`
                    : `${anime.title} já está finalizado.`,
                },
              },
              ...(anime.genres?.length
                ? [
                    {
                      "@type": "Question",
                      name: `Quais são os gêneros de ${anime.title}?`,
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: `Os gêneros de ${anime.title} são: ${anime.genres.map((g) => g.name).join(", ")}.`,
                      },
                    },
                  ]
                : []),
              ...(anime.studios?.length
                ? [
                    {
                      "@type": "Question",
                      name: `Qual estúdio produziu ${anime.title}?`,
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: `${anime.title} foi produzido pelo estúdio ${anime.studios.join(" e ")}.`,
                      },
                    },
                  ]
                : []),
            ],
          }),
        }}
      />
    </article>
  );
}
