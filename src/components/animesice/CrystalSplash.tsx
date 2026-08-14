"use client";

import { useEffect, useState } from "react";
import { CrystalMotion } from "@/components/animesice/CrystalMotion";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Só roda uma vez por sessão (guardrail da identidade: abertura de
 *  conteúdo nunca repete dentro da mesma sessão). */
const SESSION_KEY = "animesice:splash-seen";
const REVEAL_MS = 1100;
const LEAVE_MS = 250;

/**
 * Abertura da marca no primeiro acesso da sessão: o cristal nasce fora de
 * foco, o glow acende e a varredura de luz cruza — o gesto assinatura.
 * Guardrails do artefato: dispensável a qualquer toque/tecla (nunca
 * bloqueia navegação), e não roda de novo na mesma sessão.
 */
export function CrystalSplash() {
  const reduce = usePrefersReducedMotion();
  // Começa "gone" para nunca flashar a abertura em quem já a viu na sessão
  // (o SSR não conhece sessionStorage); a exibição só acontece pós-hidratação.
  const [phase, setPhase] = useState<"show" | "leaving" | "gone">("gone");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* storage indisponível: mostra a abertura mesmo assim */
    }
    if (seen || reduce) return;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* sem storage: segue mostrando */
    }
    setPhase("show");

    let alive = true;
    const timers: number[] = [];

    const dismiss = () => {
      if (!alive) return;
      timers.forEach((t) => window.clearTimeout(t));
      timers.length = 0;
      setPhase("leaving");
      timers.push(window.setTimeout(() => setPhase("gone"), LEAVE_MS));
    };

    timers.push(window.setTimeout(dismiss, REVEAL_MS));
    window.addEventListener("keydown", dismiss);
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("touchstart", dismiss, { passive: true });

    return () => {
      alive = false;
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("touchstart", dismiss);
    };
  }, [reduce]);

  if (phase === "gone") return null;

  return (
    <div
      className={`crystal-splash pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center bg-motion-void ${
        phase === "leaving" ? "is-leaving" : ""
      }`}
      aria-hidden="true"
    >
      <CrystalMotion mode="reveal" size={240} />
      <p className="mt-10 font-mono text-caption uppercase tracking-[0.18em] text-motion-glacier/60">
        AnimesIce · toque para continuar
      </p>
    </div>
  );
}

export default CrystalSplash;
