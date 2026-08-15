"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * GradientText — texto com gradiente animado por CSS (keyframes).
 *
 * O sweep roda 100% em CSS (transform/paint leve e interrompível pelo
 * browser); a versão antiga usava `useAnimationFrame` — um rAF contínuo
 * por página que repintava o `background-position` a cada frame mesmo sem
 * ninguém ver (o header está em toda página do grupo).
 *
 * Fluidez:
 *  - `pointer: coarse` (celular) → gradiente estático (zero custo de
 *    animação; mantém a cor de marca).
 *  - `prefers-reduced-motion` → estático (respeita o usuário).
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
}: GradientTextProps) {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    const evaluate = () =>
      !mqReduce.matches && !mqCoarse.matches && direction === "horizontal";
    setLive(evaluate());
    const onChange = () => setLive(evaluate());
    mqReduce.addEventListener("change", onChange);
    mqCoarse.addEventListener("change", onChange);
    return () => {
      mqReduce.removeEventListener("change", onChange);
      mqCoarse.removeEventListener("change", onChange);
    };
  }, [direction]);

  const angle =
    direction === "horizontal"
      ? "to right"
      : direction === "vertical"
        ? "to bottom"
        : "to bottom right";

  const gradientStyle = {
    "--gradient-speed": `${animationSpeed * 2}s`,
    backgroundImage: `linear-gradient(${angle}, ${colors.join(", ")})`,
    backgroundSize:
      direction === "horizontal"
        ? "300% 100%"
        : direction === "vertical"
          ? "100% 300%"
          : "300% 300%",
    backgroundRepeat: "repeat",
  } as React.CSSProperties;

  return (
    <span
      className={`bg-clip-text text-transparent ${live ? "gradient-text-live" : ""} ${className}`}
      style={gradientStyle}
    >
      {children}
    </span>
  );
}