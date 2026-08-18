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

/** O logo do motion é o cristal isolado em fundo transparente — a mesma
 *  arte embutida no artefato animesice-motion-identity.html.
 *  WebP (11 KiB vs 92 KiB PNG): o cristal circula em splash/loading/transition
 *  e como máscara CSS; formato leve evita re-baixar 3x na primeira visita. */
const LOGO_URL = "/images/logo.webp";
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
 * A varredura de luz é mascarada pela alpha do próprio logo; os motes de
 * gelo são gerados em JS com custom props. Com `prefers-reduced-motion`,
 * renderiza o cristal estático, sem animação.
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
    "--crystal-mask": `url(${LOGO_URL})`,
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="crystal-logo"
            src={LOGO_URL}
            alt=""
            style={{ animation: "none", opacity: 1, filter: "none" }}
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="crystal-logo" src={LOGO_URL} alt="" />
        <div className="crystal-sweep" />
      </div>
    </div>
  );
}

export default CrystalMotion;
