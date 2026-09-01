"use client";

import { LazyMotion, domAnimation, type Transition } from "motion/react";
import * as m from "motion/react-m";
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * BlurText — reveal de texto por palavra/letra com desfoque, adaptado de
 * React Bits (github.com/DavidHDev/react-bits, MIT + Commons Clause).
 *
 * Diferenças para o AnimesIce:
 *  - `as`/`id`: o contêiner pode ser h1/h2/p/span (semântica de título
 *    preservada — o original é sempre <p>);
 *  - prefers-reduced-motion: renderiza o texto estático, sem animar;
 *  - os estilos vêm das classes passadas — o tema é do chamador.
 */

type BlurTextTag = "h1" | "h2" | "h3" | "p" | "span";

interface BlurTextProps {
  text: string;
  as?: BlurTextTag;
  id?: string;
  className?: string;
  /** Conteúdo estático renderizado depois das palavras animadas (ex.: um
   * badge de dados que não deve ser animado). Participa do flex-wrap do h1. */
  children?: ReactNode;
  /** Atraso entre passos, em ms. */
  delay?: number;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  /** Interseção: 0 dispara assim que entra na viewport. */
  threshold?: number;
  easing?: (t: number) => number;
  stepDuration?: number;
  onAnimationComplete?: () => void;
}

export function BlurText({
  text = "",
  as = "p",
  id,
  className = "",
  delay = 80,
  animateBy = "words",
  direction = "top",
  threshold = 0,
  easing,
  stepDuration = 0.3,
  onAnimationComplete,
  children,
}: BlurTextProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  const elements = animateBy === "words" ? text.split(" ") : text.split("");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.unobserve(node);
        }
      },
      { threshold, rootMargin: "0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  // Todos os hooks rodam incondicionalmente — o return de reduced-motion
  // vem depois do useMemo para não violar as regras de hooks.
  const defaultFrom: Record<string, string | number> =
    direction === "top"
      ? { filter: "blur(10px)", opacity: 0, y: -50 }
      : { filter: "blur(10px)", opacity: 0, y: 50 };

  const defaultTo: Array<Record<string, string | number>> = [
    { filter: "blur(5px)", opacity: 0.5, y: direction === "top" ? 5 : -5 },
    { filter: "blur(0px)", opacity: 1, y: 0 },
  ];

  const keyframes = useMemo(() => {
    const keys = new Set([
      ...Object.keys(defaultFrom),
      ...defaultTo.flatMap((s) => Object.keys(s)),
    ]);
    const frames: Record<string, Array<string | number>> = {};
    keys.forEach((k) => {
      frames[k] = [defaultFrom[k], ...defaultTo.map((s) => s[k])];
    });
    return frames;
    // defaultFrom/defaultTo derivam apenas de `direction`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  // Reduced motion: texto estático, sem desfoque nem movimento.
  if (reduceMotion) {
    return createElement(as, { id, className }, text, children);
  }

  const stepCount = defaultTo.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1),
  );

  return (
    <LazyMotion features={domAnimation}>
      {createElement(
        as,
        { id, ref, className: `flex flex-wrap ${className}` },
        ...elements.map((segment, index) => {
          const spanTransition: Transition = {
            duration: totalDuration,
            times,
            delay: (index * delay) / 1000,
            ease: easing ?? [0.2, 0.65, 0.25, 1],
          };
          return (
            <m.span
              key={index}
              initial={defaultFrom}
              animate={inView ? keyframes : defaultFrom}
              transition={spanTransition}
              onAnimationComplete={
                index === elements.length - 1 ? onAnimationComplete : undefined
              }
              style={{
                display: "inline-block",
              }}
            >
              {segment === " " ? "\u00A0" : segment}
              {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
            </m.span>
          );
        }),
        children,
      )}
    </LazyMotion>
  );
}
