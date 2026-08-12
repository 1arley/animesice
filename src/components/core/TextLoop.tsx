"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * TextLoop — frases rotativas com troca suave (a intenção do TextLoop do
 * React Bits; o componente atual lá é texto curvado em SVG, que exige gsap
 * e não cabe no visual reto/mono do site — esta é a variante de rotação).
 *
 * A frase atual sobe/desce com fade a cada `interval` ms. Com
 * prefers-reduced-motion fica parado na primeira frase.
 */

interface TextLoopProps {
  texts: string[];
  /** Intervalo entre trocas, em ms. */
  interval?: number;
  className?: string;
  /** Altura fixa evita o layout pulando entre frases de tamanhos diferentes. */
  fixedHeight?: boolean;
}

export function TextLoop({
  texts,
  interval = 2400,
  className = "",
  fixedHeight = false,
}: TextLoopProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion || texts.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % texts.length);
    }, interval);
    return () => clearInterval(id);
  }, [reduceMotion, texts.length, interval]);

  const current = texts[index % texts.length] ?? texts[0] ?? "";

  if (reduceMotion || texts.length < 2) {
    return <span className={className}>{texts[0]}</span>;
  }

  return (
    <span
      className={`relative inline-grid overflow-hidden align-bottom ${className}`}
      aria-live="off"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={current}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.65, 0.25, 1] }}
          className={fixedHeight ? "col-start-1 row-start-1" : "block"}
        >
          {current}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
