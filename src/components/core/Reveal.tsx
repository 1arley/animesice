"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import type gsap from "gsap";
import { useFinePointer } from "@/lib/use-fine-pointer";

/**
 * Guard: ignora a "escondida inicial" se o elemento já cruzou o trigger —
 * evita flash de conteúdo visível virando oculto (e CLS) em janelas altas
 * ou quando o gsap resolve depois da entrada em viewport.
 */
function alreadyTriggered(el: HTMLElement, start: string): boolean {
  const m = start.match(/(\d+)%/);
  const pct = m ? parseInt(m[1], 10) / 100 : 0.88;
  return el.getBoundingClientRect().top <= window.innerHeight * pct;
}

/**
 * Reveal — entrada de elemento único ativada por scroll.
 *
 * Performance mobile: o gsap é importado só em `pointer: fine` (desktop).
 * No celular (e com reduced-motion) o conteúdo renderiza estático e visível —
 * nada de esconder à espera de JS, melhor LCP e sem a onda atrás de gsap.
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
  const fine = useFinePointer();

  useEffect(() => {
    if (reduce || !fine || !ref.current) return;
    if (alreadyTriggered(ref.current, start)) return;

    let killed = false;
    let ctx: gsap.Context | null = null;

    import("@/lib/gsap").then(({ gsap }) => {
      if (killed || !ref.current || alreadyTriggered(ref.current, start)) return;
      ctx = gsap.context(() => {
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
      });
    });

    return () => {
      killed = true;
      ctx?.revert();
    };
  }, [reduce, fine, delay, y, once, start]);

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
 * Mesma regra de performance do Reveal: gsap só desktop; mobile/reduced
 * renderizam a grade visível, sem o muro de autoAlpha.
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
  const fine = useFinePointer();

  useEffect(() => {
    if (reduce || !fine || !ref.current) return;
    if (alreadyTriggered(ref.current, start)) return;

    let killed = false;
    let ctx: gsap.Context | null = null;

    import("@/lib/gsap").then(({ gsap }) => {
      if (killed || !ref.current || alreadyTriggered(ref.current, start)) return;
      const els = Array.from(ref.current.children ?? []);
      if (els.length === 0) return;

      ctx = gsap.context(() => {
        gsap.set(els, { autoAlpha: 0, y });
        gsap.to(els, {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: "expo.out",
          stagger,
          scrollTrigger: { trigger: ref.current, start, once: true },
        });
      });
    });

    return () => {
      killed = true;
      ctx?.revert();
    };
  }, [reduce, fine, stagger, y, start]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}