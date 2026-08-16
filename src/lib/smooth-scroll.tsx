"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";

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
 *  - Tanto Lenis quanto gsap/ScrollTrigger entram via `import()` dinâmico e
 *    só rodam em `pointer: fine` (desktop) — no celular nem são baixados.
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

  // O ScrollTrigger só existe depois do import() dinâmico do desktop. O efeito
  // de refresh por rota (abaixo) precisa saber se ele já está disponível — sem
  // isso o `ScrollTrigger.refresh()` explodiria com "ScrollTrigger is not
  // defined" quando o efeito rodasse antes do módulo carregar.
  const scrollTriggerRef = useRef<{ refresh: () => void } | null>(null);

  useEffect(() => {
    if (reduceMotion) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let lenis: Lenis | null = null;
    let cancelled = false;
    let tickerRaf: ((time: number) => void) | null = null;

    // gsap + ScrollTrigger (e Lenis) só para desktop: import() dinâmico tira
    // os ~112 KiB do gsap do bundle inicial e o celular nunca os executa.
    Promise.all([import("lenis"), import("@/lib/gsap")]).then(([lenisMod, gsapMod]) => {
      if (cancelled) return;
      const { gsap, ScrollTrigger } = gsapMod;
      scrollTriggerRef.current = { refresh: () => ScrollTrigger.refresh() };
      lenis = new lenisMod.default({
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
      scrollTriggerRef.current = null;
      const raf = tickerRaf;
      tickerRaf = null;
      if (raf) {
        import("@/lib/gsap").then(({ gsap }) => gsap.ticker.remove(raf));
      }
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
    // Depois do wipe da CrystalTransition (~550ms) o layout estabiliza e o
    // ScrollTrigger recalcula as posições — apenas se o gsap já carregou.
    const t = setTimeout(() => {
      scrollTriggerRef.current?.refresh();
    }, 600);
    return () => clearTimeout(t);
  }, [pathname]);

  return <>{children}</>;
}