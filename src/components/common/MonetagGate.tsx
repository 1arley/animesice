"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Gate que limita o Monetag a 1 popup por visita à página.
 *
 * O Monetag abre popups via window.open. Após o primeiro popup detectado,
 * bloqueamos chamadas subsequentes a window.open. Links normais da aplicação
 * mantêm seu comportamento nativo, inclusive target="_blank".
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

  return null;
}
