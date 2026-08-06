"use client";

import { useEffect, useRef } from "react";

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

export function AdSlot({
  slot,
  format = "auto",
  className = "",
  label = "Publicidade",
}: AdSlotProps) {
  const insRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* AdSense bloqueado (adblock) ou script ainda não carregou. */
    }
  }, []);

  return (
    <div className={`border border-hairline bg-panel px-3 py-2 ${className}`}>
      <span className="mb-1 block font-display text-caption uppercase tracking-wider text-mist">
        {label}
      </span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-2885915887212760"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default AdSlot;
