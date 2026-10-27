"use client";

import Image from "next/image";
import { type MotionValue } from "motion/react";
import * as m from "motion/react-m";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { blur } from "@/lib/blur";
import { isOptimizableImageUrl } from "@/lib/url";

interface HeroCharacterProps {
  src: string;
  hasBanner: boolean;
  isAniListBanner: boolean;
  priority?: boolean;
  charX: MotionValue<number>;
  charY: MotionValue<number>;
  isMobile: boolean;
}

export function HeroCharacter({
  src,
  hasBanner,
  isAniListBanner,
  priority = false,
  charX,
  charY,
  isMobile,
}: HeroCharacterProps) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <m.div
      className={`absolute inset-y-0 overflow-hidden ${hasBanner ? "inset-x-0" : "right-0 w-[min(65vw,250px)] sm:w-[250px]"}`}
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
        unoptimized={!isOptimizableImageUrl(src)}
        fetchPriority={priority ? "high" : undefined}
        // AniList banners are 1900×400; account for object-cover cropping.
        sizes={isAniListBanner
          ? "(max-width: 639px) 356vw, (max-width: 767px) 204vw, (max-width: 1023px) 170vw, (max-width: 1399px) 148vw, 1989px"
          : hasBanner
            ? "(min-width: 1400px) 1340px, 100vw"
            : "(min-width: 640px) 250px, 65vw"}
        quality={100}
        placeholder="blur"
        blurDataURL={blur.landscape}
        className={hasBanner ? "object-cover" : "object-contain object-center"}
      />
    </m.div>
  );
}
