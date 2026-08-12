"use client";

import { motion, useAnimationFrame, useMotionValue, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * ShinyText — brilho que varre o texto periodicamente, adaptado de
 * React Bits (github.com/DavidHDev/react-bits, MIT + Commons Clause).
 *
 * Re-tematizado: as cores vêm do chamador (aqui o padrão é gelo com um
 * brilho de neve por cima — o \"sinal\" passando). prefers-reduced-motion
 * renderiza o texto estático na cor base, sem gradiente animado.
 */

interface ShinyTextProps {
  text: string;
  className?: string;
  /** Cor base do texto. */
  color?: string;
  /** Cor do brilho que varre. */
  shineColor?: string;
  /** Largura do rampe do brilho, em graus. */
  spread?: number;
  /** Velocidade: segundos por varredura. */
  speed?: number;
  /** Se true, o brilho vai e volta; senão, repete sempre da esquerda. */
  yoyo?: boolean;
  direction?: "left" | "right";
  pauseOnHover?: boolean;
}

export function ShinyText({
  text,
  className = "",
  color = "#45F0E0",
  shineColor = "#E9EFF5",
  spread = 90,
  speed = 4,
  yoyo = false,
  direction = "left",
  pauseOnHover = false,
}: ShinyTextProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const directionRef = useRef(direction === "left" ? 1 : -1);

  const animationDuration = speed * 1000;

  useAnimationFrame((time) => {
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

    if (yoyo) {
      const fullCycle = animationDuration * 2;
      const cycleTime = elapsedRef.current % fullCycle;
      const p =
        cycleTime < animationDuration
          ? (cycleTime / animationDuration) * 100
          : 100 - ((cycleTime - animationDuration) / animationDuration) * 100;
      progress.set(directionRef.current === 1 ? p : 100 - p);
    } else {
      const cycleTime = elapsedRef.current % animationDuration;
      const p = (cycleTime / animationDuration) * 100;
      progress.set(directionRef.current === 1 ? p : 100 - p);
    }
  });

  useEffect(() => {
    directionRef.current = direction === "left" ? 1 : -1;
  }, [direction]);

  // p=0 → brilho fora à direita; p=100 → fora à esquerda.
  const backgroundPosition = useTransform(progress, (p) => `${150 - p * 2}% center`);

  const gradientStyle = useCallback(
    (): React.CSSProperties => ({
      backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
      backgroundSize: "200% auto",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
    }),
    [color, shineColor, spread],
  );

  // Reduced motion: texto estático na cor base, sem gradiente nem movimento.
  if (reduceMotion) {
    return (
      <span className={className} style={{ color }}>
        {text}
      </span>
    );
  }

  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{ ...gradientStyle(), backgroundPosition }}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => pauseOnHover && setPaused(false)}
    >
      {text}
    </motion.span>
  );
}
