"use client";

import { memo, useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ensureAdSenseScript } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  className?: string;
  label?: string;
}

/**
 * Slot de anúncio do AdSense.
 *
 * O `<ins>` só é criado no cliente (depois do mount). Se fosse renderizado no
 * SSR, o script do AdSense injeta `data-ad-status`, `data-adsbygoogle-status`
 * e um <iframe> antes da hidratação — o que quebra a hidratação do React
 * ("Hydration failed ... regenerated on the client"). Aqui o React nunca
 * hidrata o <ins>: o script é dono exclusivo do nó.
 *
 * Performance:
 *   1. O script do AdSense é carregado sob demanda (ensureAdSenseScript) —
 *      só quando este slot se aproxima da viewport. Página sem scroll de anúncio
 *      nunca roda o ~1s de main-thread do AdSense/consent.
 *   2. O push para `adsbygoogle` é agendado via `requestIdleCallback`,
 *      não `useEffect` síncrono. Evita forced reflow durante o paint.
 *   3. `rootMargin: '300px'` no IntersectionObserver garante que o slot
 *      só é ativado quando está prestes a entrar em viewport — usuário
 *      rolando devagar não paga o custo do iframe.
 */
const AdSlot = memo(function AdSlot({
  slot,
  format = "auto",
  className = "",
  label = "Publicidade",
}: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!containerRef.current || pushed.current) return;
    const node = containerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect();
          // Carrega o script do AdSense agora — até aqui ele nem existia na
          // página. Adia para idle: impede forced reflow durante o paint.
          const fire = () => {
            if (pushed.current) return;
            pushed.current = true;
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch {
              /* AdSense bloqueado (adblock) ou script ainda não carregou. */
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
  }, []);

  return (
    <div
      ref={containerRef}
      className={`border border-hairline bg-panel px-3 py-2 ${className}`}
    >
      <span className="mb-1 block font-mono text-caption uppercase tracking-wider text-mist">
        {label}
      </span>
      {/*
        O <ins> é renderizado no SSR como placeholder de altura fixa, evitando
        layout shift quando o script do AdSense injeta o iframe. O React não
        é dono do nó após a hidratação — o script manipula diretamente.
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
