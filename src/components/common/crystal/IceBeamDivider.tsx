"use client";

import { useRef } from "react";
import { useReducedMotion } from "motion/react";
import { DividerSvg } from "@/components/common/crystal/DividerSvg";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * IceBeamDivider — "feixe de sinal" que separa o hero do momento de cristal.
 *
 * O feixe "liga" ao entrar na viewport: o núcleo cresce a partir do centro e
 * os fragmentos de gelo entram pelas laterais. É a micro-conexão visual de
 * uma seção para a outra, sem fade genérico.
 */
export function IceBeamDivider() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      if (reduce) return;
      const beam = ref.current?.querySelector('[id="beam"]');
      const shardL = ref.current?.querySelector('[id="shard-left"]');
      const shardR = ref.current?.querySelector('[id="shard-right"]');

      const tl = gsap.timeline({
        defaults: { ease: "expo.out" },
        scrollTrigger: { trigger: ref.current, start: "top 92%", once: true },
      });

      if (beam) {
        gsap.set(beam, { scaleX: 0, transformOrigin: "50% 50%" });
        tl.to(beam, { scaleX: 1, duration: 1.1 }, 0);
      }
      if (shardL) {
        gsap.set(shardL, { x: -18, y: 6, autoAlpha: 0 });
        tl.to(shardL, { x: 0, y: 0, autoAlpha: 1, duration: 0.8 }, 0.35);
      }
      if (shardR) {
        gsap.set(shardR, { x: 18, y: 6, autoAlpha: 0 });
        tl.to(shardR, { x: 0, y: 0, autoAlpha: 1, duration: 0.8 }, 0.35);
      }
    },
    { scope: ref, dependencies: [reduce] },
  );

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none mx-auto -mb-10 max-w-shelf px-4 opacity-80 sm:-mb-6 lg:-mb-12"
    >
      <div className="h-[72px] w-full sm:h-[96px]">
        <DividerSvg />
      </div>
    </div>
  );
}