"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Anime } from "@/types";
import { upgradeImageUrl } from "@/lib/url";
import { isOnAir } from "@/lib/status";

const ROTATE_MS = 6000;

/**
 * HomeHero — "Destaque da madrugada" em carrossel.
 *
 * Âncora da primeira dobra: os animes em alta se revezam na abertura do
 * canal — crossfade a cada 6s, pausa em hover/focus, sem avanço automático
 * para quem prefere reduzir movimento. Dots no canto permitem pular direto.
 *
 * Performance: só a imagem do primeiro slide é priority (LCP); o slide
 * remonta a cada troca (key por id) e a animação `fade` cobre a transição.
 * Contêiner com aspect-ratio fixo (zero CLS), next/image com sizes por viewport.
 */
export function HomeHero({ animes }: { animes: Anime[] }) {
  const count = animes.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion || count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, reduceMotion, count, index]);

  if (count === 0) return null;
  const current = animes[Math.min(index, count - 1)]!;

  return (
    <section
      className="reveal mb-8"
      aria-labelledby="hero-title"
      aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative">
        <Slide key={current.id} anime={current} priority={index === 0} />

        {count > 1 && (
          <div className="absolute bottom-3 right-4 z-10 flex gap-1.5">
            {animes.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Destaque ${i + 1}: ${a.title}`}
                aria-current={i === index}
                className={`h-1.5 transition-all duration-300 ${
                  i === index ? "w-6 bg-ice" : "w-1.5 bg-mist/40 hover:bg-mist"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Slide({ anime, priority }: { anime: Anime; priority: boolean }) {
  // upgradeImageUrl: a capa que o seed guarda é a miniatura MAL (~600px);
  // subimos p/ o nível maior quando a fonte oferece (AniList extraLarge/MAL l).
  const art =
    upgradeImageUrl(anime.bannerImage) ?? upgradeImageUrl(anime.coverImage);
  const onAir = isOnAir(anime.status);

  return (
    <a
      href={`/animes/${anime.slug}`}
      className="group relative block overflow-hidden border border-hairline bg-panel animate-fade"
    >
      <div className="relative aspect-[16/10] sm:aspect-[21/9] lg:aspect-[2.4/1]">
        {art ? (
          <Image
            src={art}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, 92vw"
            className="object-cover opacity-75 transition-opacity duration-500 group-hover:opacity-100"
            quality={85}
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
  );
}
