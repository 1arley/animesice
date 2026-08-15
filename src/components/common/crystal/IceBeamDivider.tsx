"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import type gsap from "gsap";
import { DividerSvg } from "@/components/common/crystal/DividerSvg";
import { useFinePointer } from "@/lib/use-fine-pointer";

/**
 * IceBeamDivider — "feixe de sinal" que separa o hero do momento de cristal.
 *
 * O feixe "liga" ao entrar na viewport: o núcleo cresce a partir do centro e
 * os fragmentos de gelo entram pelas laterais.
 *
 * Performance mobile: no celular (pointer coarse) e com reduced-motion o SVG
 * renderiza estático e visível — o beam não obedece a gsap, que só importa no
 * desktop.
 */
export function IceBeamDivider() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const fine = useFinePointer();

  useEffect(() => {
    if (reduce || !fine || !ref.current) return;

    let killed = false;
    let ctx: gsap.Context | null = null;

    import("@/lib/gsap").then(({ gsap }) => {
      if (killed || !ref.current) return;
      const beam = ref.current?.querySelector('[id="beam"]');
      const shardL = ref.current?.querySelector('[id="shard-left"]');
      const shardR = ref.current?.querySelector('[id="shard-right"]');

      ctx = gsap.context(() => {
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
      });
    });

    return () => {
      killed = true;
      ctx?.revert();
    };
  }, [reduce, fine]);

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