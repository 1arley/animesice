"use client";

import { useEffect, useState } from "react";

/**
 * É mobile? (cheap-first)
 *
 * Padrão conservador: começa `true` (assume mobile) no SSR e na primeira
 * renderização do cliente — o custo adicional (Aurora WebGL, imagem de
 * ambiente duplicada) só entra quando `matchMedia` confirma `pointer: fine`/
 * largura desktop pós-hidratação. No celular nenhum download extra ou shader
 * roda; no desktop a variante rica assume um frame depois sem CLS (camadas
 * absolutas decorativas).
 *
 * Mesmo inicial entre server/client => sem mismatch de hidratação.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobile;
}