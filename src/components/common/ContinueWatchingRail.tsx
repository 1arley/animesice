"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { ContinueWatchingItem } from "@/types";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
import { SpotlightCard } from "@/components/core/SpotlightCard";
import { useToast } from "@/components/common/ToastProvider";
import { ClickSpark } from "@/components/core/ClickSpark";
import { Modal } from "@/components/common/Modal";

export function ContinueWatchingRail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ContinueWatchingItem | null>(null);

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

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const {
      anime: { slug },
      episode: { number },
      episodeId,
    } = pendingDelete;
    try {
      await api.deleteWatchHistory(slug, number);
      toast("Removido do histórico", "success");
      setItems((prev) => prev.filter((item) => item.episodeId !== episodeId));
    } catch (e) {
      toast(
        e instanceof ApiError ? e.message : "Erro ao remover do histórico",
        "error",
      );
    } finally {
      setPendingDelete(null);
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
                className="group/card h-full w-[80vw] shrink-0 snap-start sm:w-[200px]"
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
                      sizes="(max-width: 480px) 80vw, 200px"
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
                      role={progressPercent > 0 ? "progressbar" : undefined}
                      aria-label={progressPercent > 0 ? `Progresso do episódio ${item.episode.number}` : undefined}
                      aria-valuemin={progressPercent > 0 ? 0 : undefined}
                      aria-valuemax={progressPercent > 0 ? 100 : undefined}
                      aria-valuenow={progressPercent > 0 ? Math.round(progressPercent) : undefined}
                    />
                  </div>
                </div>
                <span className="mt-1.5 line-clamp-1 block font-sans text-body-sm font-medium text-snow transition-colors group-hover:text-ice">
                  {item.anime.title}
                </span>
                <p className="font-mono text-caption text-mist">
                  EP {item.episode.number}
                  {progressPercent > 0 && (
                    <span> · {Math.round(progressPercent)}% assistido</span>
                  )}
                </p>
              </Link>
              <ClickSpark
                sparkSize={6}
                sparkRadius={12}
                sparkCount={6}
                duration={250}
                className="absolute right-1 top-1 z-10"
              >
                <button
                  type="button"
                  onClick={() => setPendingDelete(item)}
                  className="flex h-11 w-11 items-center justify-center rounded-sm border border-hairline/60 bg-ink/70 text-mist-soft backdrop-blur-sm transition-colors duration-200 hover:border-ice/60 hover:bg-ink hover:text-ice"
                  aria-label={`Remover “${item.anime.title}”`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </ClickSpark>
              </SpotlightCard>
            );
          })}
        </div>
      </div>

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Remover do histórico?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button type="button" onClick={handleConfirmDelete} className="btn-danger">
              Remover
            </button>
          </>
        }
      >
        {pendingDelete ? (
          <p className="text-body-sm text-mist">
            Tem certeza de que deseja remover{" "}
            <span className="text-ice">
              “{pendingDelete.anime.title}” (EP {pendingDelete.episode.number})
            </span>{" "}
            do seu histórico?
          </p>
        ) : null}
      </Modal>
    </section>
  );
}
