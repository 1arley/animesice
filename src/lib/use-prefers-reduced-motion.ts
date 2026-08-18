"use client";

import { useEffect, useState } from "react";

/**
 * prefers-reduced-motion como estado React.
 *
 * O CSS global do site já mata animações CSS quando o usuário pede
 * movimento reduzido, mas animações JS (motion/canvas/WebGL) rodam fora
 * desse guard — os componentes de efeito devem consultar este hook.
 */
export function usePrefersReducedMotion(): boolean {
  // O primeiro render precisa ser idêntico no servidor e no navegador. Ler
  // matchMedia no inicializador fazia clientes com movimento reduzido gerar
  // uma árvore diferente do HTML SSR e disparava o erro de hidratação #418.
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduce;
}
