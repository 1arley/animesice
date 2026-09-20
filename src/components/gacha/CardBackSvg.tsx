"use client";

import { memo, useEffect, useState } from "react";
import { api } from "@/lib/api";

const cache = new Map<string, string>();

export const CardBackSvg = memo(function CardBackSvg({
  backKey,
  className,
}: {
  backKey: string;
  className?: string;
}) {
  const [svg, setSvg] = useState(() => cache.get(backKey) ?? null);

  useEffect(() => {
    if (svg || cache.has(backKey)) {
      if (cache.has(backKey)) setSvg(cache.get(backKey)!);
      return;
    }
    let cancelled = false;
    api
      .gachaCardBackSvg(backKey)
      .then((res) => {
        if (!cancelled) {
          cache.set(backKey, res.svg);
          setSvg(res.svg);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [backKey, svg]);

  if (!svg) return null;

  return (
    <div
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});
