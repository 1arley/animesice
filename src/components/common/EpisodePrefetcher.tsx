"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

const MAX_CONCURRENT = 3;
const BATCH_DELAY_MS = 200;

/**
 * Prefetch em background de episódios visíveis na página.
 * Throttle: no máximo 3 extrações simultâneas, com 200ms entre batches.
 * Compartilha o Set de "já prefetchado" com PrefetchEpisodeLink para
 * evitar requests duplicados.
 */
export function EpisodePrefetcher({
  episodes,
}: {
  episodes: { animeSlug: string; episodeNumber: number }[];
}) {
  const prefetchedRef = useRef(new Set<string>());

  useEffect(() => {
    const queue = episodes.filter((ep) => {
      const key = `${ep.animeSlug}:${ep.episodeNumber}`;
      if (prefetchedRef.current.has(key)) return false;
      const cached = api._sourceCache.get(ep.animeSlug, ep.episodeNumber);
      if (cached) return false;
      prefetchedRef.current.add(key);
      return true;
    });

    if (queue.length === 0) return;

    let cancelled = false;
    let index = 0;

    async function processBatch() {
      const batch = queue.slice(index, index + MAX_CONCURRENT);
      index += MAX_CONCURRENT;

      await Promise.allSettled(
        batch.map((ep) =>
          api.streamSourceAsync(ep.animeSlug, ep.episodeNumber).catch(() => {}),
        ),
      );

      if (!cancelled && index < queue.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        processBatch();
      }
    }

    processBatch();
    return () => {
      cancelled = true;
    };
  }, [episodes]);

  return null;
}
