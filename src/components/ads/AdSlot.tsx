"use client";

import { memo, useEffect, useRef } from "react";
import {
  ADSENSE_CLIENT,
  ADSENSE_SLOT,
  ensureAdSenseScript,
} from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  /** Ad unit especifico. Padrao: NEXT_PUBLIC_ADSENSE_SLOT. */
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  className?: string;
  label?: string;
}

/**
 * Slot de anuncio do AdSense.
 *
 * O `<ins>` é renderizado no SSR (placeholder de altura fixa). O script do
 * AdSense só entra depois da hidratação (IntersectionObserver no useEffect),
 * então nunca injeta `data-ad-status`/`data-adsbygoogle-status`/`<iframe>`
 * antes do React hidratar o nó — depois disso o script é dono exclusivo dele.
 *
 * Performance:
 *   1. O script do AdSense e carregado sob demanda (ensureAdSenseScript) —
 *      so quando este slot se aproxima da viewport. Pagina sem scroll de
 *      anuncio nunca roda o ~1s de main-thread do AdSense/consent.
 *   2. O push para `adsbygoogle` e agendado via `requestIdleCallback`,
 *      nao `useEffect` sincrono. Evita forced reflow durante o paint.
 *   3. `rootMargin: '300px'` no IntersectionObserver garante que o slot
 *      so e ativado quando esta prestes a entrar em viewport — usuario
 *      rolando devagar nao paga o custo do iframe.
 */
const AdSlot = memo(function AdSlot({
  slot = ADSENSE_SLOT,
  format = "auto",
  className = "",
  label = "Publicidade",
}: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot || !containerRef.current || pushed.current) return;
    const node = containerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect();
          // Carrega o script do AdSense agora — ate aqui ele nem existia na
          // pagina. Adia para idle: impede forced reflow durante o paint.
          const fire = () => {
            if (pushed.current) return;
            pushed.current = true;
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch {
              /* AdSense bloqueado (adblock) ou script ainda nao carregou. */
            }
          };
          ensureAdSenseScript().then(() => {
            if ("requestIdleCallback" in window) {
              (window as Window & { requestIdleCallback?: (cb: () => void) => void })
                .requestIdleCallback?.(fire);
            } else {
              setTimeout(fire, 0);
            }
          });
          break;
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [slot]);

  // Sem ad unit configurado: nada e renderizado (sem caixa vazia no layout).
  if (!slot) return null;

  return (
    <div
      ref={containerRef}
      className={`border border-hairline bg-panel px-3 py-2 ${className}`}
    >
      <span className="mb-1 block font-mono text-caption uppercase tracking-wider text-mist">
        {label}
      </span>
      {/*
        O <ins> e renderizado no SSR como placeholder de altura fixa, evitando
        layout shift quando o script do AdSense injeta o iframe. O React nao
        e dono do no apos a hidratacao — o script manipula diretamente.
      */}
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: "90px" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
});

export default AdSlot;
export { AdSlot };
