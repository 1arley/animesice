"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Gate que limita o Monetag a 1 popup por visita à página.
 *
 * O Monetag abre popups via window.open. Após o primeiro popup detectado,
 * bloqueamos window.open para popups subsequentes e forçamos links
 * target="_blank" (externos/injetados) a abrirem na mesma aba.
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

  // Intercepta window.open — detecta popup e bloqueia subsequentes
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

  // Força links _blank externos a abrirem na mesma aba após o 1º popup
  useEffect(() => {
    function handleLink(e: MouseEvent) {
      if (!fired.current) return;
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey) return;

      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;

      if (a.getAttribute("target") === "_blank") {
        const href = a.getAttribute("href");
        if (href && !href.startsWith("/") && !href.startsWith("#")) {
          e.preventDefault();
          window.location.href = href;
        }
      }
    }

    document.addEventListener("click", handleLink, {
      capture: true,
      passive: false,
    });
    return () =>
      document.removeEventListener("click", handleLink, { capture: true });
  }, []);

  return null;
}
