"use client";

import { useEffect, useRef } from "react";

export function CrystalCanvas({ active }: { active: boolean }) {
  const threeHost = useRef<HTMLDivElement>(null);
  const pixiHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !threeHost.current || !pixiHost.current) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void import("./crystal-scene.js").then(({ mountCrystalScene }) => {
      if (cancelled) return;
      dispose = mountCrystalScene(threeHost.current!, pixiHost.current!);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [active]);

  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
    <div ref={threeHost} className="absolute inset-0" />
    <div ref={pixiHost} className="absolute inset-0 mix-blend-screen" />
  </div>;
}
