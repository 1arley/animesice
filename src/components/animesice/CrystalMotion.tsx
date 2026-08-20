"use client";

import { useCallback, useMemo, useRef, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export type CrystalMotionMode = "reveal" | "loop" | "transition" | "micro";

export interface CrystalMotionProps {
  /** Modo da identidade de motion. */
  mode: CrystalMotionMode;
  /** Lado do cristal em px (número) ou qualquer CSS size (string). */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** O logo do motion é o cristal animado (sem fundo, sobre fundo preto que some
 *  via screen blend). O WebP estático fica como poster/fallback e no modo
 *  prefers-reduced-motion. O vídeo circula em splash/loading/transition. */
const LOGO_URL = "/images/logo.webp";
const VIDEO_URL = "/icons/crystal_animation_clean.webm";
const MOTE_COUNT = 14;

interface MoteStyle {
  "--x": string;
  "--y": string;
  "--s": string;
  "--o": string;
  "--d": string;
  "--dur": string;
}

/** Pseudoaleatorio deterministico: SSR e primeiro render do cliente precisam
 * produzir exatamente os mesmos estilos para a hidratacao do React. */
function moteValue(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * O cristal AnimesIce em 4 modos da identidade de motion:
 * reveal (abertura), loop (loading), transition (wipe) e micro (tap/hover).
 * A animação roda num <video> sem fundo (screen blend); os motes de gelo são
 * gerados em JS com custom props. Com `prefers-reduced-motion`, renderiza o
 * cristal estático, sem animação.
 */
export function CrystalMotion({
  mode,
  size = 220,
  className = "",
  style,
}: CrystalMotionProps) {
  const reduce = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const motes = useMemo<MoteStyle[]>(
    () =>
      Array.from({ length: MOTE_COUNT }, (_, index) => ({
        "--x": `${10 + moteValue(index, 1) * 80}%`,
        "--y": `${10 + moteValue(index, 2) * 80}%`,
        "--s": `${(1.5 + moteValue(index, 3) * 2.5).toFixed(1)}px`,
        "--o": (0.35 + moteValue(index, 4) * 0.45).toFixed(2),
        "--d": `${moteValue(index, 5).toFixed(2)}s`,
        "--dur": `${(2.8 + moteValue(index, 6) * 2.2).toFixed(2)}s`,
      })),
    [],
  );

  const rootStyle = {
    "--crystal-size": typeof size === "number" ? `${size}px` : size,
    ...style,
  } as CSSProperties;

  const firePulse = useCallback(() => {
    const el = rootRef.current;
    if (!el || mode !== "micro") return;
    el.classList.remove("crystal-pulsing");
    void el.offsetWidth;
    el.classList.add("crystal-pulsing");
  }, [mode]);

  if (reduce) {
    return (
      <div
        ref={rootRef}
        className={`crystal-motion ${className}`}
        style={rootStyle}
        data-mode={mode}
        aria-hidden="true"
      >
        <div className="crystal-wrap">
          {/* Mesmo elemento do SSR (<video>) para não quebrar a hidratação;
              sem autoplay/loop e preload="none": mostra só o poster estático. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            className="crystal-logo"
            src={VIDEO_URL}
            poster={LOGO_URL}
            muted
            playsInline
            preload="none"
            style={{ animation: "none", opacity: 1, filter: "none" }}
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`crystal-motion ${className}`}
      style={rootStyle}
      data-mode={mode}
      aria-hidden="true"
      onPointerDown={firePulse}
      onMouseEnter={firePulse}
    >
      <div className="crystal-wrap">
        <div className="crystal-glow" />
        <div className="crystal-motes">
          {motes.map((m, i) => (
            <span key={i} className="crystal-mote" style={m as CSSProperties} />
          ))}
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          className="crystal-logo crystal-video"
          src={VIDEO_URL}
          poster={LOGO_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default CrystalMotion;
