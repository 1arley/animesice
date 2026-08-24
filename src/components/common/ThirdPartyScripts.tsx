"use client";

import Script from "next/script";
import { MonetagGate } from "./MonetagGate";

// Monetag ativo por padrão; desliga explicitamente com
// NEXT_PUBLIC_DISABLE_MONETAG=1. Antes a ativação dependia de
// NEXT_PUBLIC_ENABLE_MONETAG=1 (opt-in), mas em produção a env não foi
// configurada — o loader nunca entrava no bundle e os anúncios não rodavam
// nem no mobile nem no desktop.
const MONETAG_DISABLED = process.env.NEXT_PUBLIC_DISABLE_MONETAG === "1";

export function ThirdPartyScripts() {
  return (
    <>
      {!MONETAG_DISABLED && (
        <>
        <MonetagGate />
        <Script
          id="monetag-loader"
          // O loader precisa existir deterministicamente no DOM; o código
          // interno ainda posterga a rede até load + interação/visibilidade.
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var fired = false;
                function inject() {
                  if (fired) return;
                  fired = true;
                  var s = document.createElement('script');
                  s.dataset.zone = '11528359';
                  s.src = 'https://al5sm.com/tag.min.js';
                  (document.body || document.documentElement).appendChild(s);
                }
                // CLS: monetag nunca roda no meio do paint — dispara só
                // depois do load e da primeira interação (scroll/toque/tecla),
                // o que for primeiro. Evita o layout shift pós-carregamento.
                var gate = function() {
                  window.removeEventListener('scroll', gate);
                  window.removeEventListener('pointerdown', gate);
                  window.removeEventListener('keydown', gate);
                  if (document.readyState === 'complete') {
                    setTimeout(inject, 250);
                  } else {
                    window.addEventListener('load', inject, { once: true });
                  }
                };
                window.addEventListener('scroll', gate, { passive: true });
                window.addEventListener('pointerdown', gate, { passive: true });
                window.addEventListener('keydown', gate, { passive: true });
                var anchor = document.querySelector('footer') || document.body;
                if ('IntersectionObserver' in window) {
                  var io = new IntersectionObserver(function(entries) {
                    if (entries.some(function(e) { return e.isIntersecting; })) {
                      gate();
                      io.disconnect();
                    }
                  }, { rootMargin: '200px' });
                  io.observe(anchor);
                } else {
                  window.addEventListener('load', gate, { once: true });
                }
              })();
            `,
          }}
        />
        </>
      )}

    </>
  );
}
