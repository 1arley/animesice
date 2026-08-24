"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * MonetagGate — 1 anúncio por página.
 *
 * Comportamento:
 * - Home: usuário vê 1 anúncio. Enquanto estiver na home, nenhum outro.
 * - Navega para /anime/xyz: vê 1 novo anúncio. Enquanto estiver ali, nenhum outro.
 * - Volta para home: vê 1 novo anúncio.
 *
 * Como funciona:
 * 1. CSS esconde TODOS os containers Monetag
 * 2. MutationObserver detecta o primeiro e mostra ele
 * 3. Anúncios seguintes ficam escondidos (display: none)
 * 4. Ao navegar: limpa DOM e reseta flags
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

  if (tag === "script") {
    const src = el.getAttribute("src") || "";
    if (MONETAG_SCRIPT_SRC.test(src)) return true;
    if (el.getAttribute("data-zone")) return true;
  }

  if (tag === "iframe") {
    const src = el.getAttribute("src") || "";
    if (/al5sm|monetag/i.test(src)) return true;
  }

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
function purgeAllMonetagAds() {
  document.querySelectorAll(AD_SELECTORS).forEach((el) => el.remove());
}

export function MonetagGate() {
  const pathname = usePathname();
  const adAllowed = useRef(true);
  const popupAllowed = useRef(true);

  // Ao navegar: limpa anúncios antigos e reseta flags
  useEffect(() => {
    purgeAllMonetagAds();
    adAllowed.current = true;
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

  // 2. CSS: esconde TODOS os anúncios Monetag
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "monetag-gate-css";
    style.textContent = `
      [data-zone],
      [id*="monetag"],
      [class*="monetag"],
      #sb_wrapper,
      #sb_loader,
      .social-bar,
      #interstitial-wrapper,
      iframe[src*="al5sm"],
      iframe[src*="monetag"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  // 3. MutationObserver: mostra o PRIMEIRO anúncio, esconde o resto
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== 1) continue;
          const el = node as Element;

          if (!isMonetagAd(el)) continue;

          if (adAllowed.current) {
            // Primeiro anúncio: mostra e bloqueia os próximos
            adAllowed.current = false;
            (el as HTMLElement).style.display = "";
          }
          // Anúncios adicionais: ficam escondidos pelo CSS
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
