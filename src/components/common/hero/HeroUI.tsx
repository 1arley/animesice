"use client";

import Link from "next/link";
import { ShinyText } from "@/components/core/ShinyText";
import { isOnAir } from "@/lib/status";
import type { Anime } from "@/types";

interface HeroUIProps {
  anime: Anime;
  label: string;
  isMobile: boolean;
}

export function HeroUI({ anime, label, isMobile }: HeroUIProps) {
  const onAir = isOnAir(anime.status);

  return (
    <div className="absolute inset-0 flex flex-col justify-end p-4 pb-16 sm:p-6 sm:pb-6 lg:p-8">
      {/* Left-side legibility gradient (desktop/tablet) */}
      <div
        className="absolute inset-0 sm:block"
        style={{
          background: isMobile
            ? "linear-gradient(180deg, transparent 30%, rgba(7,11,18,0.92) 100%)"
            : "linear-gradient(90deg, rgba(7,11,18,0.92) 0%, rgba(7,11,18,0.65) 35%, rgba(7,11,18,0.15) 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      {/* Bottom anchor gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 50%, rgba(7,11,18,0.85) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Label */}
        <span className="mb-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-caption font-medium uppercase tracking-wider text-ice sm:mb-3">
          <span className="h-1 w-1 bg-ice" aria-hidden="true" />
          <ShinyText
            text={label}
            color="#45F0E0"
            shineColor="#E9EFF5"
            speed={5}
            spread={100}
          />
          {onAir && (
            <span className="inline-flex items-center gap-1.5 text-signal">
              <span className="h-1 w-1 animate-blink bg-signal" aria-hidden="true" />
              No ar
            </span>
          )}
        </span>

        {/* Title */}
        <h2
          id="hero-title"
          className="max-w-xl font-display text-xl font-bold tracking-tight text-snow sm:text-3xl lg:text-4xl"
        >
          {anime.title}
        </h2>

        {/* Synopsis */}
        {anime.synopsis && !isMobile && (
          <p className="mt-2 hidden max-w-xl text-body-sm text-mist sm:line-clamp-2 sm:block lg:line-clamp-3">
            {anime.synopsis}
          </p>
        )}

        {/* Meta + CTAs */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-4">
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
          {anime.format && !isMobile && (
            <span className="hidden font-mono text-caption uppercase tracking-wider text-mist sm:inline">
              {anime.format}
            </span>
          )}
          <span className="font-mono text-caption uppercase tracking-wider text-mist">
            {anime.audio === "DUBLADO" ? "Dublado" : "Legendado"}
          </span>

          {/* CTA primary */}
          <Link
            href={`/animes/${anime.slug}`}
            className="btn-ice hidden sm:ml-auto sm:inline-flex"
          >
            Assistir
          </Link>
        </div>

        {/* Mobile CTA full-width */}
        <Link
          href={`/animes/${anime.slug}`}
          className="btn-ice mt-3 w-full justify-center sm:hidden"
        >
          Assistir
        </Link>
      </div>
    </div>
  );
}
