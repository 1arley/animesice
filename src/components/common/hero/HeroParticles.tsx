"use client";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

interface HeroParticlesProps {
  partX?: unknown;
  isMobile: boolean;
}

export function HeroParticles({ isMobile }: HeroParticlesProps) {
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion || isMobile) return null;

  return <div className="hero-dust pointer-events-none absolute inset-0" aria-hidden="true" />;
}
