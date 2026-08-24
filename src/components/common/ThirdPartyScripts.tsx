"use client";

import Script from "next/script";
import { MonetagGate } from "./MonetagGate";

// Monetag ativo por padrão; desliga explicitamente com
// NEXT_PUBLIC_DISABLE_MONETAG=1.
const MONETAG_DISABLED = process.env.NEXT_PUBLIC_DISABLE_MONETAG === "1";

/**
 * Loader do Monetag — 1 anúncio por página.
 *
 * O MonetagGate (renderizado acima) cuida da limitação por página:
 * - Intercepta window.open para popups
 * - MutationObserver remove containers excessivos
 * - CSS esconde anúncios que escapam do JS
 *
 * Este loader apenas carrega o script Monetag após interação do usuário.
 * A flag sessionStorage foi removida porque impedia o carregamento em
 * navegações client-side (SPA).
 */
export function ThirdPartyScripts() {
  return (
    <>
      {!MONETAG_DISABLED && (
        <>
          <MonetagGate />
          <Script
            id="monetag-loader"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  var injected = false;
                  function inject() {
                    if (injected) return;
                    injected = true;

                    var s = document.createElement('script');
                    s.dataset.zone = '11528359';
                    s.src = 'https://al5sm.com/tag.min.js';
                    (document.body || document.documentElement).appendChild(s);
                  }

                  // Gate de interação: só injeta após scroll/toque/tecla
                  var gate = function() {
                    window.removeEventListener('scroll', gate);
                    window.removeEventListener('pointerdown', gate);
                    window.removeEventListener('keydown', gate);
                    if (document.readyState === 'complete') {
                      setTimeout(inject, 300);
                    } else {
                      window.addEventListener('load', function() {
                        setTimeout(inject, 300);
                      }, { once: true });
                    }
                  };

                  window.addEventListener('scroll', gate, { passive: true });
                  window.addEventListener('pointerdown', gate, { passive: true });
                  window.addEventListener('keydown', gate, { passive: true });

                  // Fallback: IntersectionObserver no footer
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
