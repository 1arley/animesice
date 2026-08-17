"use client";

import { useEffect, useState, type ComponentType } from "react";

/** Baixa canvas/motion da abertura após o primeiro gesto ou quando o browser está ocioso. */
export function DeferredCrystalSplash() {
  const [Splash, setSplash] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => import("./CrystalSplash").then(({ CrystalSplash }) => {
      if (!cancelled) setSplash(() => CrystalSplash);
    });
    const onInteraction = () => void load();
    window.addEventListener("pointerdown", onInteraction, { once: true, passive: true });
    window.addEventListener("keydown", onInteraction, { once: true });
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId: number = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(load, { timeout: 2500 })
      : Number(globalThis.setTimeout(load, 2000));
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      if (idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(idleId);
      else globalThis.clearTimeout(idleId);
    };
  }, []);

  return Splash ? <Splash /> : null;
}
