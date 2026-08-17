"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

type Rail = ComponentType;

/** Conteúdo autenticado abaixo da dobra: baixa API, modais e efeitos ao aproximar. */
export function DeferredPersonalizedRails() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [rails, setRails] = useState<{ Continue: Rail; Recommendations: Rail } | null>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    let cancelled = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      Promise.all([import("./ContinueWatchingRail"), import("./RecommendationsRail")]).then(
        ([continueModule, recommendationsModule]) => {
          if (!cancelled) setRails({ Continue: continueModule.ContinueWatchingRail, Recommendations: recommendationsModule.RecommendationsRail });
        },
      );
    }, { rootMargin: "400px" });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); };
  }, []);

  if (rails) return <><rails.Continue /><rails.Recommendations /></>;
  return <div ref={sentinel} className="h-px" aria-hidden="true" />;
}
