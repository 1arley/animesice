"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const MONETAG_ZONE = "11528359";

/**
 * Seletores CSS para containers típicos injetados pelo Monetag.
 * Inclui padrões documentados (social bar, interstitial) e genéricos
 * (qualquer elemento com data-zone ou src de al5sm).
 */
const AD_SELECTORS = [
  `[data-zone="${MONETAG_ZONE}"]`,
  "[data-zone]",
  '[id*="monetag"]',
  "[class*='monetag']",
  "#sb_wrapper",
  "#sb_loader",
  ".social-bar",
  "#interstitial-wrapper",
  "iframe[src*='al5sm']",
  "iframe[src*='monetag']",
].join(", ");

/**
 * Verifica se um elemento é um container de anúncio Monetag.
 */
function isMonetagAd(el: Element): boolean {
  if (el.matches(AD_SELECTORS)) return true;

  const tag = el.tagName?.toLowerCase();

  // <script data-zone="..."> do próprio loader — não é anúncio visível
  if (tag === "script" && el.getAttribute("data-zone")) return true;

  // Iframes do domínio Monetag
  if (tag === "iframe") {
    const src = el.getAttribute("src") || "";
    if (/al5sm|monetag/i.test(src)) return true;
  }

  // Overlays fixos com z-index alto que contenham markup Monetag
  if (el instanceof HTMLElement) {
    const { position, zIndex } = getComputedStyle(el);
    if (position === "fixed" && parseInt(zIndex, 10) >= 9000) {
      const html = el.outerHTML.slice(0, 500);
      if (/monetag|al5sm|sb_wrapper/i.test(html)) return true;
    }
  }

  return false;
}

/**
 * Gate que limita o Monetag a 1 único anúncio por visita à página.
 *
 * Controla dois vetores de injeção:
 * 1. Popups via window.open — após o primeiro, bloqueia chamadas subsequentes.
 * 2. Containers DOM — após o primeiro elemento Monetag detectado no DOM,
 *    quaisquer containers adicionais são removidos imediatamente.
 *
 * Ao navegar (mudança de pathname), o estado reseta.
 */
export function MonetagGate() {
  const pathname = usePathname();
  const fired = useRef(false);

  // Reset ao navegar
  useEffect(() => {
    fired.current = false;
  }, [pathname]);

  //1. Intercepta window.open — permite 1 popup, bloqueia subsequentes
  useEffect(() => {
    const original = window.open.bind(window);

    window.open = function (
      url?: string | URL,
      target?: string,
      features?: string,
    ) {
      if (!fired.current) {
        fired.current = true;
        return original(url, target, features);
      }
      return null;
    };

    return () => {
      window.open = original;
    };
  }, []);

  // 2. Monitora DOM — remove containers Monetag além do primeiro
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== 1) continue;
          const el = node as Element;

          if (!isMonetagAd(el)) continue;

          if (!fired.current) {
            // Primeiro anúncio: libera e marca como gasto
            fired.current = true;
          } else {
            // Anúncios adicionais: remove imediatamente
            el.remove();
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
