"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import { upgradeImageUrl } from "@/lib/url";
import type { Anime } from "@/types";
import { useHeroParallax } from "./hero-parallax";
import { HeroAtmosphere } from "./HeroAtmosphere";
import { HeroEnvironment } from "./HeroEnvironment";
import { HeroCharacter } from "./HeroCharacter";
import { HeroParticles } from "./HeroParticles";
import { HeroUI } from "./HeroUI";

interface HeroSlideProps {
  anime: Anime;
  label: string;
  priority: boolean;
  isMobile: boolean;
}

export const slideVariants = {
  exit: {
    filter: "blur(12px)",
    opacity: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.6, 1] as const },
  },
  enter: {
    filter: "blur(12px)",
    opacity: 0,
  },
  center: {
    filter: "blur(0px)",
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.2, 0.65, 0.25, 1] as const,
      opacity: { duration: 0.4 },
      filter: { duration: 0.6 },
    },
  },
};

export function HeroSlide({ anime, label, priority, isMobile }: HeroSlideProps) {
  const containerRef = useRef<HTMLElement>(null);
  const parallax = useHeroParallax(containerRef);

  const art = upgradeImageUrl(anime.bannerImage) ?? upgradeImageUrl(anime.coverImage);

  return (
    <motion.section
      ref={containerRef}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 overflow-hidden"
      aria-roledescription="slide"
    >
      {/* z-0: Atmosphere */}
      <HeroAtmosphere
        ambientColor="#1C2534"
        mouseX={parallax.mouseX}
        mouseY={parallax.mouseY}
        isMobile={isMobile}
      />

      {/* z-1: Environment (blurred midground) */}
      <HeroEnvironment
        src={art}
        scrollY={parallax.scrollY}
        envX={parallax.envX}
        envY={parallax.envY}
        isMobile={isMobile}
      />

      {/* z-2: Character (sharp foreground poster) */}
      <HeroCharacter
        src={art ?? ""}
        priority={priority}
        scrollY={parallax.scrollY}
        charX={parallax.charX}
        charY={parallax.charY}
        isMobile={isMobile}
      />

      {/* Fallback if no art */}
      {!art && (
        <div className="absolute inset-0 bg-gradient-to-br from-panel to-ink" />
      )}

      {/* z-3: Particles (CSS dust) */}
      <HeroParticles partX={parallax.partX} isMobile={isMobile} />

      {/* z-4: UI overlay */}
      <HeroUI anime={anime} label={label} isMobile={isMobile} />
    </motion.section>
  );
}
