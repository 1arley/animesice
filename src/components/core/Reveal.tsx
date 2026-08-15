"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Reveal — entrada de elemento único ativada por scroll.
 *
 * Substitui o `.reveal` CSS (que disparava tudo no mount, mesmo abaixo da
 * dobra) por um trigger de viewport real. `once: true` por padrão — a
 * prateleira não deve "brincar" de esconder/mostrar a cada volta de scroll.
 *
 * reduced-motion → renderiza direto (sem esconder conteúdo).
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 18,
  once = true,
  start = "top 88%",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      if (reduce) return;
      gsap.fromTo(
        ref.current,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.6,
          ease: "expo.out",
          delay,
          scrollTrigger: { trigger: ref.current, start, once },
        },
      );
    },
    { scope: ref, dependencies: [reduce, delay, y, once, start] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * RevealStagger — entrada em onda dos filhos diretos de um container
 * (grade de cards/rails). Sobe o container inteiro quando entra na
 * viewport e anima os filhos em cascata curta.
 *
 * Performance: anima `transform`/`opacity` apenas; `once: true` libera o
 * trigger após a primeira execução.
 */
export function RevealStagger({
  children,
  className = "",
  stagger = 0.05,
  y = 26,
  start = "top 86%",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      if (reduce) return;
      const els = Array.from(ref.current?.children ?? []);
      if (els.length === 0) return;
      gsap.set(els, { autoAlpha: 0, y });
      gsap.to(els, {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        ease: "expo.out",
        stagger,
        scrollTrigger: { trigger: ref.current, start, once: true },
      });
    },
    { scope: ref, dependencies: [reduce, stagger, y, start] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}