"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * MonetagGate — limita o Monetag a 1 único anúncio por visita à página.
 *
 * A abordagem anterior (MutationObserver + interceptação de window.open)
 * falhava porque o script Monetag injeta ads por múltiplos vetores:
 * document.write, iframes aninhadas, scripts dinâmicos que escapam do
 * observer, e timing assíncrono que cria race conditions.
 *
 * Nova abordagem:三层防线
 * 1. Bloqueia TODOS os scripts Monetag após o primeiro carregamento
 * 2. Remove todos os containers Monetag no DOM (including primiero)
 * 3. Intercepta window.open para bloquear popups adicionais
 *
 * O Monetag injeta apenas 1 anúncio (o que estava no DOM quando o script
 * carrega). Scripts subsequentes e seus anúncios são bloqueados.
 */

const MONETAG_SCRIPT_SRC = /al5sm\.com\/tag\.min\.js/;

/** Seletores CSS para containers típicos injetados pelo Monetag. */
const AD_SELECTORS = [
  '[data-zone]',
  '[id*="monetag"]',
  "[class*='monetag']",
  "#sb_wrapper",
  "#sb_loader",
  ".social-bar",
  "#interstitial-wrapper",
  "iframe[src*='al5sm']",
  "iframe[src*='monetag']",
].join(", ");

function isMonetagAd(el: Element): boolean {
  if (el.matches(AD_SELECTORS)) return true;

  const tag = el.tagName?.toLowerCase();
  if (!tag) return false;

  // Scripts Monetag (loader e injetados)
  if (tag === "script") {
    const src = el.getAttribute("src") || "";
    if (MONETAG_SCRIPT_SRC.test(src)) return true;
    if (el.getAttribute("data-zone")) return true;
  }

  // Iframes Monetag
  if (tag === "iframe") {
    const src = el.getAttribute("src") || "";
    if (/al5sm|monetag/i.test(src)) return true;
  }

  // Overlays fixos com z-index alto que contenham markup Monetag
  if (el instanceof HTMLElement) {
    try {
      const { position, zIndex } = getComputedStyle(el);
      if (position === "fixed" && parseInt(zIndex, 10) >= 9000) {
        const html = el.outerHTML.slice(0, 500);
        if (/monetag|al5sm|sb_wrapper/i.test(html)) return true;
      }
    } catch {
      // getComputedStyle pode falhar em elementos detached
    }
  }

  return false;
}

/** Remove todos os containers Monetag do DOM. */
function purgeMonetagAds(): number {
  let removed = 0;
  const all = document.querySelectorAll(AD_SELECTORS);
  all.forEach((el) => {
    el.remove();
    removed++;
  });
  return removed;
}

export function MonetagGate() {
  const pathname = usePathname();
  const scriptAllowed = useRef(true);
  const popupAllowed = useRef(true);

  // Reset ao navegar — permite 1 novo anúncio na nova página
  useEffect(() => {
    scriptAllowed.current = true;
    popupAllowed.current = true;
  }, [pathname]);

  // 1. Intercepta window.open — permite 1 popup, bloqueia subsequentes
  useEffect(() => {
    const original = window.open.bind(window);

    window.open = function (
      url?: string | URL,
      target?: string,
      features?: string,
    ) {
      if (popupAllowed.current) {
        popupAllowed.current = false;
        return original(url, target, features);
      }
      return null;
    };

    return () => {
      window.open = original;
    };
  }, []);

  // 2. Triple-layer defense via MutationObserver
  useEffect(() => {
    let firstAdSeen = false;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== 1) continue;
          const el = node as Element;

          // Layer 1: Bloqueia scripts Monetag após o primeiro
          if (
            el.tagName?.toLowerCase() === "script" &&
            el.getAttribute("src") &&
            MONETAG_SCRIPT_SRC.test(el.getAttribute("src") || "")
          ) {
            if (!firstAdSeen) {
              firstAdSeen = true;
            } else {
              el.remove();
              continue;
            }
          }

          // Layer 2: Detecta containers de anúncio
          if (isMonetagAd(el)) {
            if (!firstAdSeen) {
              firstAdSeen = true;
              // Primeiro anúncio: permite, mas agenda limpeza periódica
              // para remover anúncios que o script injeta assincronamente
              setTimeout(() => {
                const excess = document.querySelectorAll(
                  `[data-zone]:not(:first-child)`,
                );
                excess.forEach((e) => e.remove());
              }, 500);
            } else {
              // Anúncios adicionais: remove imediatamente
              el.remove();
            }
          }
        }

        // Layer 3: Observa atributos modificados (src mudanças em iframes/scripts)
        if (mutation.type === "attributes") {
          const el = mutation.target as Element;
          if (isMonetagAd(el) && firstAdSeen) {
            el.remove();
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "data-zone"],
    });

    // Limpeza periódica: remove anúncios Monetag excessivos a cada 2s por 10s
    let purgeCount = 0;
    const purgeInterval = setInterval(() => {
      if (purgeCount >= 5 || !scriptAllowed.current) {
        clearInterval(purgeInterval);
        return;
      }
      // Remove todos os data-zone exceto o primeiro
      const zones = document.querySelectorAll("[data-zone]");
      if (zones.length > 1) {
        Array.from(zones)
          .slice(1)
          .forEach((z) => z.remove());
      }
      // Remove iframes Monetag excessivos
      const iframes = document.querySelectorAll(
        "iframe[src*='al5sm'], iframe[src*='monetag']",
      );
      if (iframes.length > 1) {
        Array.from(iframes)
          .slice(1)
          .forEach((f) => f.remove());
      }
      purgeCount++;
    }, 2000);

    return () => {
      observer.disconnect();
      clearInterval(purgeInterval);
    };
  }, []);

  // 3. CSS nuclear: esconde qualquer anúncio Monetag que escape do JS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      /* Esconde containers Monetag além do primeiro */
      [data-zone]:not(:first-of-type),
      [id*="monetag"]:not(:first-of-type),
      [class*="monetag"]:not(:first-of-type),
      #sb_wrapper:not(:first-of-type),
      #sb_loader:not(:first-of-type),
      .social-bar:not(:first-of-type),
      #interstitial-wrapper:not(:first-of-type) {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  return null;
}
