"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { Anime } from "@/types";
import { useIsMobile } from "@/lib/use-is-mobile";
import { isBloodWarAnime } from "@/lib/event-theme";
import { HeroSlide } from "./hero/HeroSlide";

const ROTATE_MS = 7000;

function highlightLabelForHour(hour: number): string {
  if (hour >= 0 && hour < 6) return "Destaque da madrugada";
  if (hour >= 6 && hour < 11) return "Pra ver no café da manhã";
  if (hour >= 11 && hour < 14) return "Pra ver almoçando";
  if (hour >= 14 && hour < 18) return "Pra ver de tarde";
  if (hour >= 18 && hour < 22) return "Pra ver jantando";
  return "Pra ver antes de dormir";
}

export function HomeHero({ animes }: { animes: Anime[] }) {
  const count = animes.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const isMobile = useIsMobile();
  const [label, setLabel] = useState("Destaque da madrugada");

  useEffect(() => {
    setLabel(highlightLabelForHour(new Date().getHours()));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || hovered || focused || reduceMotion || count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, hovered, focused, reduceMotion, count, index]);

  if (count === 0) return null;
  const current = animes[Math.min(index, count - 1)]!;

  return (
    <section
      className="-mx-4 sm:mx-0"
      aria-labelledby="hero-title"
      aria-roledescription="carrossel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className="relative sm:border sm:border-hairline bg-panel overflow-hidden">
        {/* Proporção casada com a arte: o banner do AniList é 1900x400 (4.75:1).
            Numa caixa 2.4/1 o `object-cover` amplia ~1.4x na vertical e o
            resultado fica mole. Cada degrau abaixo de 2.8/1 mantém o upscale
            perto de 1.0 na largura máxima da prateleira (1340px). */}
        <div className="relative aspect-[4/3] min-h-80 w-full sm:aspect-[21/9] sm:min-h-72 md:aspect-[2.8/1] lg:aspect-[3.2/1]">
          <AnimatePresence mode="wait" initial={false}>
            <HeroSlide
              key={current.id}
              anime={current}
              label={label}
              priority={index === 0}
              isMobile={isMobile}
              bloodWar={isBloodWarAnime(current)}
            />
          </AnimatePresence>
        </div>

        {count > 1 && (
          <div className="flex items-center justify-between border-t border-hairline bg-panel px-1 py-2 sm:px-6">
            <span className="hidden font-mono text-caption tabular-nums text-mist sm:inline" aria-hidden="true">
              <span className="text-ice">{String(index + 1).padStart(2, "0")}</span> / {String(count).padStart(2, "0")}
            </span>
            <div className="flex w-full items-center justify-between sm:w-auto">
              {animes.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setIndex(i); setPaused(true); }}
                  aria-label={`Destaque ${i + 1}: ${a.title}`}
                  aria-current={i === index}
                  className="group flex h-11 w-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-1.5 transition-[width,background-color] duration-300 ${
                      i === index ? "w-6 bg-ice" : "w-1.5 bg-mist/50 group-hover:bg-mist"
                    }`}
                  />
                </button>
              ))}
              {!reduceMotion && (
                <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Reproduzir destaques automaticamente" : "Pausar destaques"} className="ml-1 flex h-11 w-11 items-center justify-center border-l border-hairline text-mist transition-colors hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    {paused ? <path d="M8 5v14l11-7z" /> : <path d="M6 5h4v14H6zm8 0h4v14h-4z" />}
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live={paused || focused || reduceMotion ? "polite" : "off"} aria-atomic="true">Destaque {index + 1} de {count}: {current.title}</p>
    </section>
  );
}
