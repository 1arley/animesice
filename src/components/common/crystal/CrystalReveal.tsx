"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { CrystalSvg } from "@/components/common/crystal/CrystalSvg";
import { gsap, useGSAP } from "@/lib/gsap";

const FLOAT_IDS = Array.from({ length: 10 }, (_, i) => `float-${String(i + 1).padStart(2, "0")}`);

/**
 * CrystalReveal — o momento assinatura da home.
 *
 * Um cristal de gelo "puxa foco" enquanto o usuário rola: sai desfocado,
 * encolhido, com fragmentos dispersos em órbita; o scrub converge os
 * fragmentos, foca as facetas e entrega a prateleira.
 *
 * Técnica: sticky + scrub (sem ScrollTrigger.pin) — nativo, compatível com
 * o Lenis e com o scroll de toque.
 *
 * Guias:
 *  - só em desktop (lg+); mobile na ~faz o foco-puxado para não virar muro.
 *  - reduced-motion → cristal estático, sem scrub.
 */
export function CrystalReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useGSAP(
    () => {
      if (reduce || !isDesktop) return;
      const stage = stageRef.current;
      if (!stage) return;

      const floats = FLOAT_IDS.map((id) => stage.querySelector(`[id="${id}"]`)).filter(
        (el): el is Element => el !== null,
      );

      // Estado inicial: fragmentos dispersos num anel, apagados.
      floats.forEach((el, i) => {
        const angle = (i / floats.length) * Math.PI * 2;
        const dist = 120 + (i % 5) * 30;
        gsap.set(el, {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.5,
          autoAlpha: 0,
        });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
        defaults: { ease: "none" },
      });

      tl.fromTo(
        stage,
        { filter: "blur(12px) brightness(0.7)", scale: 0.92 },
        { filter: "blur(0px) brightness(1)", scale: 1.06 },
        0,
      );

      tl.fromTo(
        captionRef.current,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0 },
        0.06,
      );

      // Convergência dos fragmentos (todos correm em paralelo desde o início).
      floats.forEach((el) => {
        tl.to(el, { x: 0, y: 0, autoAlpha: 1, duration: 0.7 }, 0);
      });
    },
    { scope: sectionRef, dependencies: [reduce, isDesktop] },
  );

  // Mobile e reduced-motion não recebem o "muro" de scroll —
  // a home continua um catálogo rápido, sem takeover de tela.
  if (reduce || !isDesktop) return null;

  return (
    <section
      ref={sectionRef}
      aria-hidden="true"
      className="relative hidden bg-ink lg:block"
      style={{ height: "185vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div ref={stageRef} className="absolute inset-0 will-change-transform">
          <CrystalSvg />
        </div>

        {/* Vinheta para segurar o contraste do texto sobre o campo de facetas. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(5,7,11,0.55) 100%)",
          }}
        />

        <div
          ref={captionRef}
          className="absolute bottom-8 left-8 flex items-center gap-3 font-mono text-caption uppercase tracking-[0.25em] text-mist/80"
        >
          <span className="h-1.5 w-1.5 bg-ice" aria-hidden="true" />
          Sinal da madrugada — foco puxado
        </div>
      </div>
    </section>
  );
}