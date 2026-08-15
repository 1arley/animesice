"use client";

import { useEffect, useState } from "react";

/**
 * `pointer: fine` (mouse/trackpad)? Começa `false` — o conteúdo é renderizado
 * estático (sem gsap) até `matchMedia` confirmar apontamento fino pós-
 * hidratação. Assim o celular não baixa nem executa o bundle do gsap.
 */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return fine;
}