"use client";

import { memo, useEffect, useState } from "react";
import { api } from "@/lib/api";

const cache = new Map<string, string>();

function toDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const CardBackSvg = memo(function CardBackSvg({
  backKey,
  className,
}: {
  backKey: string;
  className?: string;
}) {
  const [src, setSrc] = useState(() => cache.get(backKey) ?? null);

  useEffect(() => {
    const cached = cache.get(backKey);
    if (cached) {
      setSrc(cached);
      return;
    }
    setSrc(null);
    let cancelled = false;
    api
      .gachaCardBackSvg(backKey)
      .then((res) => {
        if (!cancelled) {
          const nextSrc = toDataUrl(res.svg);
          cache.set(backKey, nextSrc);
          setSrc(nextSrc);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [backKey]);

  if (!src) return null;

  return (
    // SVG stays in an image document instead of executing in the page DOM.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={className} aria-hidden="true" />
  );
});
