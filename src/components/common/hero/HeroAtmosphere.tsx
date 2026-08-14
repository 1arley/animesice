"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { Aurora } from "@/components/core/Aurora";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

interface HeroAtmosphereProps {
  ambientColor?: string;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  isMobile: boolean;
}

export function HeroAtmosphere({
  ambientColor = "#1C2534",
  mouseX,
  mouseY,
  isMobile,
}: HeroAtmosphereProps) {
  const reduceMotion = usePrefersReducedMotion();

  const bgX = useTransform(mouseX, [-0.5, 0.5], ["-1%", "1%"]);
  const bgY = useTransform(mouseY, [-0.5, 0.5], ["-0.5%", "0.5%"]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient: deep atmospheric wash */}
      <motion.div
        className="absolute inset-0"
        style={{
          translateX: reduceMotion || isMobile ? undefined : bgX,
          translateY: reduceMotion || isMobile ? undefined : bgY,
          background: `radial-gradient(
            1200px 600px at 30% 40%,
            ${ambientColor}55,
            transparent 65%
          ),
          radial-gradient(
            800px 500px at 70% 60%,
            ${ambientColor}33,
            transparent 55%
          )`,
        }}
      />

      {/* Aurora WebGL: ice-cyan atmospheric layer */}
      {!reduceMotion && !isMobile && (
        <Aurora
          className="absolute inset-0 opacity-25"
          colorStops={["#0E141D", ambientColor, "#1C2534"]}
          speed={0.4}
          amplitude={0.5}
          blend={0.8}
        />
      )}

      {/* Bottom vignette to anchor the composition */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(100% 80% at 50% 42%, transparent 60%, rgba(2,4,8,0.5) 100%)",
        }}
      />
    </div>
  );
}
