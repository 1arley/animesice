"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * SmoothScrollProvider — scroll suave (Lenis) sincronizado com o GSAP.
 *
 * Montado no layout do grupo `(app)`: cobre a prateleira pública (home, detalhe,
 * comunidade). Admin/auth seguem com scroll nativo.
 *
 * Decisões:
 *  - `syncTouch: false` → no toque o scroll é nativo (evita jank no mobile);
 *    o Lenis só suaviza wheel/trackpad.
 *  - `allowNestedScroll: true` → rails horizontais (overflow-x) rolam nativos.
 *  - reduced-motion → desmonta o Lenis (scroll 1:1), respeitando o usuário.
 *  - A cada rota (pathname) reseta scroll + ScrollTrigger.refresh() para
 *    recalcular as posições dos triggers depois do hydrate das imagens.
 */
export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let lenis: Lenis | null = null;
    let cancelled = false;
    let tickerRaf: ((time: number) => void) | null = null;

    // import() dinâmico: o Lenis (~20 KiB) fica no próprio chunk e só é
    // baixado quando há wheel/trackpad — celular (pointer coarse) nunca o
    // recebe no bundle inicial.
    import("lenis").then(({ default: LenisImpl }) => {
      if (cancelled) return;
      lenis = new LenisImpl({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.95,
        syncTouch: false,
        allowNestedScroll: true,
      });
      lenisRef.current = lenis;

      lenis.on("scroll", ScrollTrigger.update);
      tickerRaf = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(tickerRaf);
      gsap.ticker.lagSmoothing(0);
    });

    return () => {
      cancelled = true;
      if (tickerRaf) gsap.ticker.remove(tickerRaf);
      if (lenis) {
        lenis.destroy();
        lenisRef.current = null;
      }
    };
  }, [reduceMotion]);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
    // Depois do wipe da CrystalTransition (~550ms) o layout estabiliza.
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => clearTimeout(t);
  }, [pathname]);

  return <>{children}</>;
}
