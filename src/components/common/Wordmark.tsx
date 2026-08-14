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
 * 1.035x e a varredura de luz cruza (0.32s) — o mesmo gesto do resto da marca.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  const microRef = useRef<HTMLSpanElement>(null);

  function firePulse() {
    const el = microRef.current;
    if (!el) return;
    el.classList.remove("crystal-micro-fired");
    void el.offsetWidth;
    el.classList.add("crystal-micro-fired");
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
          className="h-full w-full rounded-[4px] ring-1 ring-ice/25 transition-[box-shadow,filter] duration-300 group-hover:ring-ice/70 group-hover:shadow-[0_0_14px_-2px_rgba(69,240,224,0.55)]"
        />
        <span className="crystal-micro-sweep" aria-hidden="true" />
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