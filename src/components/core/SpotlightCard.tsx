"use client";

import { useRef, useState, type MouseEvent, type ReactNode } from "react";

/**
 * SpotlightCard — brilho radial que segue o cursor, adaptado de
 * React Bits (github.com/DavidHDev/react-bits, MIT + Commons Clause).
 *
 * Re-tematizado para o AnimesIce:
 *  - sem cantos arredondados/bordas neutras forçadas — o wrapper só isola o
 *    glow; cantos e fundo ficam a cargo do chamador (tema do site);
 *  - a cor padrão é o gelo da marca em baixa opacidade (luz, não neon);
 *  - foco via teclado mantém o glow (focus-visible no filho aciona onFocus);
 *  - o glow é escrito direto no DOM (ref), sem re-render por mousemove —
 *    usado em grades de dezenas de cards.
 */

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(232, 223, 204, 0.14)",
  radius = 260,
}: {
  children: ReactNode;
  className?: string;
  /** Cor do glow — default: gelo da marca. */
  spotlightColor?: string;
  /** Raio do glow, em px. */
  radius?: number;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const node = divRef.current;
    const glow = glowRef.current;
    if (!node || !glow) return;
    const rect = node.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Mutação direta — nenhum re-render por movimento do mouse.
    glow.style.background = `radial-gradient(${radius}px circle at ${x}px ${y}px, ${spotlightColor}, transparent 70%)`;
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      onFocus={() => setOpacity(1)}
      onBlur={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{ opacity, background: "transparent" }}
      />
      {children}
    </div>
  );
}
