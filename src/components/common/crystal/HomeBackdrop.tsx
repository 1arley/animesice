"use client";

import { useEffect, useState } from "react";

/**
 * HomeBackdrop — ambiente de "madrugada": o campo de fragmentos de gelo
 * (bg-drift-loop.svg, animado por CSS) por trás de toda a home.
 *
 * - Só em desktop (>= 1024px); no toque o custo de 30 shards animados não
 *   compensa — a home já tem o hero (Aurora) como camada viva.
 * - prefers-reduced-motion → vira a versão estática (background.svg).
 * - `fixed inset-0 -z-10`: fica atrás do conteúdo, visível nos respiros
 *   entre painéis, sem competir com o corpo (glows + vinheta).
 */
export function HomeBackdrop() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setEnabled(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="home-backdrop pointer-events-none fixed inset-0 -z-10 opacity-[0.55]"
    />
  );
}