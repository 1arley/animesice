"use client";

import Image from "next/image";
import { motion, useTransform, type MotionValue } from "motion/react";
import { blur } from "@/lib/blur";

interface HeroEnvironmentProps {
  src?: string;
  scrollY: MotionValue<number>;
  envX: MotionValue<number>;
  envY: MotionValue<number>;
  isMobile: boolean;
}

export function HeroEnvironment({
  src,
  scrollY,
  envX,
  envY,
  isMobile,
}: HeroEnvironmentProps) {
  const scrollShift = useTransform(scrollY, [0, 300], [0, -15]);
  const blurAmount = isMobile ? "blur(6px)" : "blur(12px)";
  const opacity = isMobile ? 0.4 : 0.5;

  const translateX = envX;
  const translateY = useTransform(
    [envY, scrollY] as MotionValue<number>[],
    ([ey, sy]: number[]) => `${ey + (sy * -0.05)}px`,
  );

  if (!src) {
    return (
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #0E141D 0%, #141D29 50%, #070B12 100%)",
          filter: blurAmount,
          opacity,
        }}
      />
    );
  }

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{
        x: translateX,
        y: translateY,
        filter: blurAmount,
        opacity,
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        quality={60}
        placeholder="blur"
        blurDataURL={blur.landscape}
        className="object-cover scale-110"
        aria-hidden="true"
      />
    </motion.div>
  );
}
