"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import type { ContinueWatchingItem } from "@/types";
import { API_URL } from "@/lib/api";
import { safeImageSrc } from "@/lib/url";

export function ContinueWatchingRail() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/watch-history/continue?limit=12`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || loading || items.length === 0) return null;

  return (
    <section className="mb-8" aria-labelledby="rail-continue">
      <h2 id="rail-continue" className="shelf-label">
        Continue assistindo{" "}
        <span className="shelf-label-data">{items.length}</span>
      </h2>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
        <div className="flex gap-3 snap-x">
          {items.map((item, i) => {
            const progressPercent = item.duration
              ? Math.min((item.progress / item.duration) * 100, 100)
              : 0;
            const thumb = safeImageSrc(item.episode.thumbnailUrl);
            return (
              <a
                key={item.episodeId}
                href={`/animes/${item.anime.slug}/${item.episode.number}`}
                className="group block min-w-[200px] shrink-0 snap-start"
              >
                <div className="relative overflow-hidden bg-panel" style={{ aspectRatio: "16 / 9" }}>
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={item.anime.title}
                      fill
                      sizes="(max-width: 480px) 50vw, 200px"
                      priority={i < 2}
                      className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
                      quality={75}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-hairline" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-hairline">
                    <div
                      className="h-full bg-ice"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <span className="mt-1.5 line-clamp-1 block font-sans text-body-sm font-medium text-snow transition-colors group-hover:text-ice">
                  {item.anime.title}
                </span>
                <p className="font-mono text-caption text-mist">
                  EP {item.episode.number}
                </p>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
