"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ADSENSE_CLIENT } from "@/lib/adsense";

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
 * O <ins> só é criado no cliente (depois do mount). Se fosse renderizado no
 * SSR, o script do AdSense injeta `data-ad-status`, `data-adsbygoogle-status`
 * e um <iframe> antes da hidratação — o que quebra a hidratação do React
 * ("Hydration failed ... regenerated on the client"). Aqui o React nunca
 * hidrata o <ins>: o script é dono exclusivo do nó.
 */
const AdSlot = memo(function AdSlot({
  slot,
  format = "auto",
  className = "",
  label = "Publicidade",
}: AdSlotProps) {
  const [mounted, setMounted] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense bloqueado (adblock) ou script ainda não carregou. */
    }
  }, [mounted]);

  return (
    <div className={`border border-hairline bg-panel px-3 py-2 ${className}`}>
      <span className="mb-1 block font-mono text-caption uppercase tracking-wider text-mist">
        {label}
      </span>
      {mounted ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : null}
    </div>
  );
});

export default AdSlot;
export { AdSlot };
