"use client";

import { useTransform, type MotionValue } from "motion/react";
import * as m from "motion/react-m";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

// Aurora (WebGL via ogl) é ornamentação — carrega só no cliente e só quando
// o hero realmente aparece em desktop (pointer fino e largura >= sm). Com
// ssr:false + gate isMobile, o chunk do ogl (~58 KiB) sai do bundle inicial:
// no mobile nada de WebGL ou download de ambiente duplicado.
const Aurora = dynamic(() =>
  import("@/components/core/Aurora").then((m) => m.Aurora),
  { ssr: false },
);

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
      <m.div
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

      {/* Aurora WebGL: ice-cyan atmospheric layer (dinâmico, só desktop) */}
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
