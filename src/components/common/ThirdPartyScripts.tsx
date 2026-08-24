"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { MonetagGate } from "./MonetagGate";

// Monetag ativo por padrão; desliga explicitamente com
// NEXT_PUBLIC_DISABLE_MONETAG=1.
const MONETAG_DISABLED = process.env.NEXT_PUBLIC_DISABLE_MONETAG === "1";

/**
 * Loader do Monetag — 1 anúncio por página.
 *
 * Em navegações SPA, o script Monetag precisa ser reinjetado para criar
 * novos anúncios. O MonetagGate controla a visibilidade (mostra só 1).
 */
export function ThirdPartyScripts() {
  const pathname = usePathname();

  // Ao navegar: reinjeta o script Monetag para gerar novo anúncio
  useEffect(() => {
    if (MONETAG_DISABLED) return;

    // Remove script anterior se existir
    const existing = document.querySelector(
      'script[data-zone="11528359"][src*="al5sm"]',
    );
    if (existing) existing.remove();

    // Injeta novo script após interação do usuário
    let injected = false;
    function inject() {
      if (injected) return;
      injected = true;

      const s = document.createElement("script");
      s.dataset.zone = "11528359";
      s.src = "https://al5sm.com/tag.min.js";
      (document.body || document.documentElement).appendChild(s);
    }

    // Gate de interação
    const gate = () => {
      window.removeEventListener("scroll", gate);
      window.removeEventListener("pointerdown", gate);
      window.removeEventListener("keydown", gate);
      setTimeout(inject, 300);
    };

    window.addEventListener("scroll", gate, { passive: true });
    window.addEventListener("pointerdown", gate, { passive: true });
    window.addEventListener("keydown", gate, { passive: true });

    return () => {
      window.removeEventListener("scroll", gate);
      window.removeEventListener("pointerdown", gate);
      window.removeEventListener("keydown", gate);
    };
  }, [pathname]);

  return (
    <>
      {!MONETAG_DISABLED && <MonetagGate />}
    </>
  );
}
