"use client";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

interface HeroParticlesProps {
  isMobile: boolean;
  bloodWar?: boolean;
}

export function HeroParticles({ isMobile, bloodWar = false }: HeroParticlesProps) {
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion || isMobile) return null;

  return <div className={`hero-dust ${bloodWar ? "hero-dust--blood" : ""} pointer-events-none absolute inset-0`} aria-hidden="true" />;
}
