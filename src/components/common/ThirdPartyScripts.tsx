"use client";

import Script from "next/script";
import { MonetagGate } from "./MonetagGate";

// Monetag ativo por padrão; desliga explicitamente com
// NEXT_PUBLIC_DISABLE_MONETAG=1.
const MONETAG_DISABLED = process.env.NEXT_PUBLIC_DISABLE_MONETAG === "1";

/**
 * Loader do Monetag com proteções adicionais:
 * - Só injeta o script UMA vez por sessão (sessionStorage flag)
 * - Bloqueia qualquer tentativa de re-injeção pelo próprio script
 * - Interrompe o script Monetag após 3s para limitar anúncios
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
                  // Flag de sessão: só permite 1 load por aba
                  var KEY = 'animesice:monetag-loaded';
                  if (sessionStorage.getItem(KEY)) return;

                  var injected = false;
                  function inject() {
                    if (injected) return;
                    injected = true;
                    sessionStorage.setItem(KEY, '1');

                    var s = document.createElement('script');
                    s.dataset.zone = '11528359';
                    s.src = 'https://al5sm.com/tag.min.js';

                    // Intercepta o script Monetag: após carregar, monitora
                    // e remove scripts adicionais que ele possa criar
                    s.addEventListener('load', function() {
                      // Observa o DOM por 5s e remove qualquer script
                      // Monetag que o tag.min.js tente injetar
                      var mo = new MutationObserver(function(mutations) {
                        mutations.forEach(function(m) {
                          Array.from(m.addedNodes).forEach(function(node) {
                            if (node.nodeType !== 1) return;
                            var el = node;
                            if (el.tagName === 'SCRIPT') {
                              var src = el.src || '';
                              if (/al5sm\\.com/.test(src) && el !== s) {
                                el.remove();
                              }
                            }
                          });
                        });
                      });
                      mo.observe(document.documentElement, {
                        childList: true,
                        subtree: true
                      });
                      setTimeout(function() { mo.disconnect(); }, 5000);
                    });

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

                  // Safety net: força stop após 8s
                  setTimeout(function() {
                    injected = true;
                    sessionStorage.setItem(KEY, '1');
                  }, 8000);
                })();
              `,
            }}
          />
        </>
      )}
    </>
  );
}
