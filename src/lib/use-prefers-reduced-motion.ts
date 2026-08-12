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
  const [reduce, setReduce] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduce;
}
