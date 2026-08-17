"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { blur } from "@/lib/blur";
import { upgradeImageUrl } from "@/lib/url";
import type { Anime } from "@/types";

type HeroProps = { animes: Anime[] };

/**
 * Mantém o LCP no HTML inicial e só baixa o carrossel/parallax (motion/react)
 * quando o hero entra no viewport. A imagem estática é também o fallback do
 * chunk, portanto uma rede lenta nunca deixa a primeira dobra vazia.
 */
export function DeferredHomeHero({ animes }: HeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [EnhancedHero, setEnhancedHero] = useState<ComponentType<HeroProps> | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        import("./HomeHero").then(({ HomeHero }) => {
          if (!cancelled) setEnhancedHero(() => HomeHero);
        });
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  if (animes.length === 0) return null;
  return (
    <div ref={ref}>
      {EnhancedHero ? <EnhancedHero animes={animes} /> : <StaticHero anime={animes[0]!} />}
    </div>
  );
}

function StaticHero({ anime }: { anime: Anime }) {
  const art = upgradeImageUrl(anime.bannerImage) ?? upgradeImageUrl(anime.coverImage);
  return (
    <section className="-mx-4 mb-6 sm:mx-0 sm:mb-8" aria-labelledby="hero-title">
      <div className="relative overflow-hidden bg-panel sm:border sm:border-hairline">
        <div className="relative aspect-[4/3] sm:aspect-[21/9] lg:aspect-[2.4/1]">
          {art && (
            <Image
              src={art}
              alt=""
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 639px) 100vw, (max-width: 1536px) calc(100vw - 2rem), 1504px"
              quality={80}
              placeholder="blur"
              blurDataURL={blur.landscape}
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-8">
            <p className="font-mono text-caption uppercase tracking-wider text-ice">Destaque</p>
            <h2 id="hero-title" className="mt-2 max-w-2xl font-display text-display-xl text-snow sm:text-display-2xl">
              {anime.title}
            </h2>
            <Link href={`/animes/${anime.slug}`} className="btn-ice mt-4 inline-flex">
              Assistir agora
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
