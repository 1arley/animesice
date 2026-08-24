"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CrystalMotion } from "@/components/animesice/CrystalMotion";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Duração do wipe de transição, sincronizada com os keyframes. */
const WIPE_MS = 550;

/**
 * Transição de tela (identidade de motion): o wipe de 0.55s entre rotas —
 * o cristal vem de um foco curto e direcional enquanto o conteúdo troca.
 * Não bloqueia navegação: pointer-events none e sobreposição em fade rápido.
 */
export function CrystalTransition() {
  const pathname = usePathname();
  const reduce = usePrefersReducedMotion();
  const [active, setActive] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (reduce) {
      setActive(false);
      return;
    }
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    setActive(true);
    const t = window.setTimeout(() => setActive(false), WIPE_MS);
    return () => window.clearTimeout(t);
  }, [pathname, reduce]);

  // Não anima no primeiro carregamento — a abertura (CrystalSplash) cobre isso.
  if (reduce || !active) return null;

  return (
    <div
      className="crystal-transition pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-motion-void/45"
      aria-hidden="true"
    >
      <CrystalMotion mode="transition" size={120} />
    </div>
  );
}

export default CrystalTransition;