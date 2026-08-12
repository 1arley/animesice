"use client";

import { motion, useAnimationFrame, useMotionValue, useTransform } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * GradientText — texto com gradiente animado, adaptado de
 * React Bits (github.com/DavidHDev/react-bits, MIT + Commons Clause).
 *
 * Re-tematizado para o AnimesIce:
 *  - sem o container pesado do original (mx-auto, borda, cursor, blur) —
 *    aqui é um <span> inline-block que herda a tipografia do chamador;
 *  - cores padrão da marca: gelo → neve → névoa (o "sinal" no branco frio);
 *  - prefers-reduced-motion: o gradiente fica parado na posição inicial
 *    (mantém a cor, elimina o movimento).
 */

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  /** Cores do rampe — o ciclo repete a primeira ao final (loop contínuo). */
  colors?: string[];
  /** Duração de um ciclo, em segundos. */
  animationSpeed?: number;
  direction?: "horizontal" | "vertical" | "diagonal";
  pauseOnHover?: boolean;
}

export function GradientText({
  children,
  className = "",
  colors = ["#45F0E0", "#E9EFF5", "#9FB0C1", "#45F0E0"],
  animationSpeed = 7,
  direction = "horizontal",
  pauseOnHover = false,
}: GradientTextProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const animationDuration = animationSpeed * 1000;

  useAnimationFrame((time) => {
    // Reduced motion: congelado no início (gradiente visível, sem mover).
    if (reduceMotion || paused) {
      lastTimeRef.current = null;
      return;
    }
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += delta;

    // Ciclo ida e volta (0 → 100 → 0): o brilho varre os dois sentidos.
    const fullCycle = animationDuration * 2;
    const cycleTime = elapsedRef.current % fullCycle;
    if (cycleTime < animationDuration) {
      progress.set((cycleTime / animationDuration) * 100);
    } else {
      progress.set(
        100 - ((cycleTime - animationDuration) / animationDuration) * 100,
      );
    }
  });

  const backgroundPosition = useTransform(progress, (p) =>
    direction === "vertical" ? `50% ${p}%` : `${p}% 50%`,
  );

  const angle =
    direction === "horizontal"
      ? "to right"
      : direction === "vertical"
        ? "to bottom"
        : "to bottom right";

  const gradientStyle = {
    backgroundImage: `linear-gradient(${angle}, ${colors.join(", ")})`,
    backgroundSize:
      direction === "horizontal"
        ? "300% 100%"
        : direction === "vertical"
          ? "100% 300%"
          : "300% 300%",
    backgroundRepeat: "repeat",
  };

  return (
    <motion.span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        ...gradientStyle,
        backgroundPosition,
        WebkitBackgroundClip: "text",
      }}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => pauseOnHover && setPaused(false)}
    >
      {children}
    </motion.span>
  );
}
