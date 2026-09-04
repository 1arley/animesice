"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import type { Anime } from "@/types";
import { useIsMobile } from "@/lib/use-is-mobile";
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
    if (paused || reduceMotion || count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, reduceMotion, count, index]);

  if (count === 0) return null;
  const current = animes[Math.min(index, count - 1)]!;

  return (
    <section
      className="-mx-4 mb-6 sm:mx-0 sm:mb-8"
      aria-labelledby="hero-title"
      aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative sm:border sm:border-hairline bg-panel overflow-hidden">
        <div className="relative aspect-[4/3] sm:aspect-[21/9] lg:aspect-[2.4/1]">
          <AnimatePresence mode="wait" initial={false}>
            <HeroSlide
              key={current.id}
              anime={current}
              label={label}
              priority={index === 0}
              isMobile={isMobile}
            />
          </AnimatePresence>
        </div>

        {count > 1 && (
          <div className="absolute bottom-3 right-3 z-20 flex gap-0.5 sm:right-4 sm:gap-1.5">
            {animes.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Destaque ${i + 1}: ${a.title}`}
                aria-current={i === index}
                className="flex h-11 w-11 items-center justify-center transition-transform active:scale-90 sm:h-8 sm:w-8"
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 transition-[width,background-color] duration-300 ${
                    i === index ? "w-6 bg-ice" : "w-1.5 bg-mist/50 hover:bg-mist"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
