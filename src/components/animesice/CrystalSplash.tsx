"use client";

import { useEffect, useRef, useState } from "react";
import { CrystalMotion } from "@/components/animesice/CrystalMotion";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Só roda uma vez por sessão (guardrail da identidade: abertura de
 *  conteúdo nunca repete dentro da mesma sessão). */
const SESSION_KEY = "animesice:splash-seen";
const REVEAL_MS = 2000;
const LEAVE_MS = 250;

/**
 * Abertura da marca no primeiro acesso da sessão: o cristal nasce fora de
 * foco, o glow acende e a varredura de luz cruza — o gesto assinatura.
 * Guardrails do artefato: dispensável a qualquer toque/tecla (nunca
 * bloqueia navegação), e não roda de novo na mesma sessão.
 *
 * O mecanismo de dismiss é instalado SEMPRE, independente do storage: com
 * o StrictMode o effect roda 2x em dev e a 1ª rodada já grava o flag de
 * sessão — se a montagem de timers/listeners dependesse do `seen`, a 2ª
 * rodada pularia e a overlay ficaria presa cobrindo o site, travando os
 * cliques até um reload. Uma trava a mais força o desmonte mesmo que o
 * estado de fase se percam numa re-renderização ou em que a interação
 * nunca aconteça (primeira visita em mobile não interage).
 */
export function CrystalSplash() {
  const reduce = usePrefersReducedMotion();
  // Começa "gone" para nunca flashar a abertura em quem já a viu na sessão
  // (o SSR não conhece sessionStorage); a exibição só acontece pós-hidratação.
  const [phase, setPhase] = useState<"show" | "leaving" | "gone">("gone");
  const dismissed = useRef(false);

  useEffect(() => {
    // Toque/navegação por dedo: pulamos a abertura — no mobile o LCP/perceived
    // load custa caro (o splash cobriria a tela por 2s em cada sessão nova) e o
    // cristal já respira no loading e no wordmark. Desktop mantém o gesto.
    if (window.matchMedia("(pointer: coarse)").matches) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* sem storage */
      }
      return;
    }

    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* storage indisponível: mostra a abertura mesmo assim */
    }
    if (reduce) return;

    if (!seen) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* sem storage: segue mostrando */
      }
      setPhase("show");
    }

    const timers: number[] = [];
    const dismiss = () => {
      if (dismissed.current) return;
      dismissed.current = true;
      timers.forEach((t) => window.clearTimeout(t));
      timers.length = 0;
      setPhase("leaving");
      timers.push(window.setTimeout(() => setPhase("gone"), LEAVE_MS));
    };

    // Auto-exibida mesmo sem interação + trava de segurança que desmonta a
    // overlay de qualquer jeito (cobre perda de estado em re-renderização).
    timers.push(window.setTimeout(dismiss, REVEAL_MS));
    timers.push(
      window.setTimeout(() => {
        dismissed.current = true;
        setPhase("gone");
      }, REVEAL_MS + LEAVE_MS),
    );
    window.addEventListener("keydown", dismiss);
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("touchstart", dismiss, { passive: true });

    return () => {
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
    </div>
  );
}

export default CrystalSplash;