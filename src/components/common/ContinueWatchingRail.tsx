"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { ContinueWatchingItem } from "@/types";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
import { SpotlightCard } from "@/components/core/SpotlightCard";
import { useToast } from "@/components/common/ToastProvider";
import { ClickSpark } from "@/components/core/ClickSpark";

export function ContinueWatchingRail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchContinue = useCallback((signal?: AbortSignal) => {
    return api.getContinueWatching(12, signal)
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (slug: string, episodeNumber: number, episodeId: string) => {
    if (confirmDeleteId === episodeId) {
      // Second click - confirm deletion
      setConfirmDeleteId(null);
      try {
        await api.deleteWatchHistory(slug, episodeNumber);
        toast("Removido do histórico", "success");
        setItems((prev) => prev.filter((item) => item.episodeId !== episodeId));
      } catch {
        toast("Erro ao remover do histórico", "error");
      }
    } else {
      // First click - show confirmation
      setConfirmDeleteId(episodeId);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => {
        setConfirmDeleteId((id) => (id === episodeId ? null : id));
      }, 3000);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    fetchContinue(ac.signal);
    return () => ac.abort();
  }, [user, pathname, fetchContinue]);

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
              <SpotlightCard
                key={item.episodeId}
                className="h-full min-w-[200px] shrink-0 snap-start"
              >
              <Link
                href={`/animes/${item.anime.slug}/${item.episode.number}`}
                className="group block overflow-hidden bg-panel"
              >
                <div className="relative overflow-hidden bg-panel" style={{ aspectRatio: "16 / 9" }}>
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={item.anime.title}
                      fill
                      sizes="(max-width: 480px) 50vw, 200px"
                      priority={i < 2}
                      placeholder="blur"
                      blurDataURL={blur.landscape}
                      className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
                      quality={80}
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
                  <ClickSpark sparkSize={6} sparkRadius={12} sparkCount={6} duration={250} className="absolute top-1 right-1 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(item.anime.slug, item.episode.number, item.episodeId);
                      }}
                      className="p-1 rounded-full bg-signal/90 text-snow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-signal hover:scale-110 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ice"
                      aria-label={confirmDeleteId === item.episodeId ? "Confirmar remoção" : "Remover do histórico"}
                    >
                      {confirmDeleteId === item.episodeId ? (
                        <span className="text-xs font-medium whitespace-nowrap px-1">Confirmar?</span>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </button>
                  </ClickSpark>
                </div>
                <span className="mt-1.5 line-clamp-1 block font-sans text-body-sm font-medium text-snow transition-colors group-hover:text-ice">
                  {item.anime.title}
                </span>
                <p className="font-mono text-caption text-mist">
                  EP {item.episode.number}
                </p>
              </Link>
              </SpotlightCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
