"use client";

import Link from "next/link";
import { useRef } from "react";
import { GradientText } from "@/components/core/GradientText";

/**
 * Wordmark autoral AnimesIce.
 * O cristal de gelo do mascote (mesma arte do favicon em /images) é a marca;
 * "Animes" em snow (branco frio) para não sumir no fundo — antes usava ink,
 * que desaparecia.
 * Microinteração da identidade de motion: no toque/hover, o cristal pulsa a
 * 1.035x — o mesmo gesto do resto da marca.
 * A pulso usa a Web Animations API (WAAPI), que não força reflow síncrono
 * (o antigo `void el.offsetWidth` era lido em todo toque no wordmark).
 */
export function Wordmark({ className = "" }: { className?: string }) {
  const microRef = useRef<HTMLSpanElement>(null);

  function firePulse() {
    const micro = microRef.current;
    if (!micro) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    micro.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.035)", offset: 0.45 },
        { transform: "scale(1)" },
      ],
      { duration: 320, easing: "ease-out" },
    );
  }

  return (
    <Link
      href="/"
      aria-label="AnimesIce — home"
      onPointerDown={firePulse}
      onMouseEnter={firePulse}
      className={`group inline-flex items-center gap-2 font-display font-bold tracking-tight text-snow ${className}`}
    >
      <span
        ref={microRef}
        className="crystal-micro h-[1.15em] w-[1.15em] shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/animesice-mascot.svg"
          alt=""
          aria-hidden="true"
          className="h-full w-full rounded-[4px] ring-1 ring-ice/25 transition-[box-shadow,filter] duration-300 group-hover:ring-ice/70"
        />
      </span>
      <span>Animes</span>
      <span className="text-ice" aria-hidden="true">
        &#183;
      </span>
      {/* "Ice" com o gradiente da marca varrendo devagar — o sinal no logo. */}
      <GradientText className="text-[1em]">Ice</GradientText>
    </Link>
  );
}