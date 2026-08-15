"use client";

import Image from "next/image";
import { motion, useTransform, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { blur } from "@/lib/blur";

interface HeroCharacterProps {
  src: string;
  priority?: boolean;
  scrollY: MotionValue<number>;
  charX: MotionValue<number>;
  charY: MotionValue<number>;
  isMobile: boolean;
}

export function HeroCharacter({
  src,
  priority = false,
  scrollY,
  charX,
  charY,
  isMobile,
}: HeroCharacterProps) {
  const reduceMotion = usePrefersReducedMotion();
  const scale = "scale(1.08)";
  const scrollShift = useTransform(scrollY, [0, 400], [0, -30]);

  const translateY = useTransform(
    [charY, scrollShift] as MotionValue<number>[],
    ([cy, sy]: number[]) => `${cy + sy}px`,
  );

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{
        x: reduceMotion || isMobile ? undefined : charX,
        // Parallax de scroll desligado no toque: no scroll nativo do mobile
        // o spring descreveria y a cada frame do gesture (custoso em Android
        // médio) para um efeito de poucos px. Desktop mantém.
        y: reduceMotion || isMobile ? undefined : translateY,
        scale: reduceMotion ? 1 : 1.15,
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        sizes="100vw"
        quality={80}
        placeholder="blur"
        blurDataURL={blur.landscape}
        className="object-cover"
        style={{ transform: scale }}
      />
    </motion.div>
  );
}
