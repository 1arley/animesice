import Image from "next/image";
import type { Anime } from "@/types";
import { safeImageSrc } from "@/lib/url";
import { isOnAir } from "@/lib/status";

/**
 * HomeHero — "Destaque da madrugada".
 *
 * Âncora da primeira dobra: o anime em alta vira a abertura do canal.
 * Arte de fundo (banner → cover), vinheta de legibilidade com gradiente de
 * gelo, ident em mono (edge-tag verbal) e o CTA "Assistir" como affordance —
 * o card inteiro é um link, então o CTA é visual (aria-hidden).
 *
 * Performance: uma imagem priority (LCP), contêiner com aspect-ratio fixo
 * (zero CLS), next/image com sizes por viewport.
 */
export function HomeHero({ anime }: { anime: Anime }) {
  const art = anime.bannerImage
    ? safeImageSrc(anime.bannerImage)
    : safeImageSrc(anime.coverImage);
  const onAir = isOnAir(anime.status);

  return (
    <section className="reveal mb-8" aria-labelledby="hero-title">
      <a
        href={`/animes/${anime.slug}`}
        className="group relative block overflow-hidden border border-hairline bg-panel"
      >
        <div className="relative aspect-[16/10] sm:aspect-[21/9] lg:aspect-[2.4/1]">
          {art ? (
            <Image
              src={art}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 92vw"
              className="object-cover opacity-75 transition-opacity duration-500 group-hover:opacity-100"
              quality={80}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-panel to-ink" />
          )}

          {/* Vinheta de legibilidade: escurece o lado do texto e a base. */}
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/25 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8">
            <span className="mb-3 inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-caption font-medium uppercase tracking-wider text-ice">
              <span className="h-1 w-1 bg-ice" aria-hidden="true" />
              Destaque da madrugada
              {onAir && (
                <span className="inline-flex items-center gap-1.5 text-signal">
                  <span
                    className="h-1 w-1 animate-blink bg-signal"
                    aria-hidden="true"
                  />
                  No ar
                </span>
              )}
            </span>

            <h2
              id="hero-title"
              className="max-w-xl font-display text-2xl font-bold tracking-tight text-snow sm:text-3xl lg:text-4xl"
            >
              {anime.title}
            </h2>

            {anime.synopsis && (
              <p className="mt-2 line-clamp-2 max-w-xl text-body-sm text-mist sm:line-clamp-3">
                {anime.synopsis}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              {anime.rating != null && anime.rating > 0 && (
                <span className="font-mono text-caption font-medium text-ice tabular-nums">
                  {anime.rating.toFixed(2)}
                </span>
              )}
              {anime.year != null && (
                <span className="font-mono text-caption uppercase tracking-wider text-mist">
                  {anime.year}
                </span>
              )}
              {anime.format && (
                <span className="font-mono text-caption uppercase tracking-wider text-mist">
                  {anime.format}
                </span>
              )}
              <span className="font-mono text-caption uppercase tracking-wider text-mist">
                {anime.audio === "DUBLADO" ? "Dublado" : "Legendado"}
              </span>

              {/* Affordance de ação — o card inteiro já é o link. */}
              <span className="btn-ice ml-auto" aria-hidden="true">
                Assistir
              </span>
            </div>
          </div>
        </div>
      </a>
    </section>
  );
}
