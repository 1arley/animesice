"use client";

import Image from "next/image";
import { type MotionValue } from "motion/react";
import * as m from "motion/react-m";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { blur } from "@/lib/blur";

interface HeroCharacterProps {
  src: string;
  priority?: boolean;
  charX: MotionValue<number>;
  charY: MotionValue<number>;
  isMobile: boolean;
}

export function HeroCharacter({
  src,
  priority = false,
  charX,
  charY,
  isMobile,
}: HeroCharacterProps) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <m.div
      className="absolute inset-0 overflow-hidden"
      style={{
        x: reduceMotion || isMobile ? undefined : charX,
        y: reduceMotion || isMobile ? undefined : charY,
        // Over-scan mínimo: só o parallax do ponteiro vive nesta camada
        // (x ±10px, y ±5px). O de scroll ficou só no HeroEnvironment — antes o
        // over-scan de 1.242x (1.15 x 1.08) existia para cobrir os -30px do
        // scroll e ampliava a arte 1.7x: banner do AniList é 1900x400, não há
        // pixel para esse upscale. 1.05 cobre os 10px de x com folga.
        scale: reduceMotion || isMobile ? 1 : 1.05,
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        sizes="(min-width: 1400px) 1340px, 100vw"
        quality={80}
        placeholder="blur"
        blurDataURL={blur.landscape}
        className="object-cover"
      />
    </m.div>
  );
}
