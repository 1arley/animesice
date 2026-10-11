"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/common/Avatar";
import { api, ApiError, safeImageSrc } from "@/lib/api";
import type { GachaSkinSpinActivity } from "@/types";

export function RecentSkinSpins() {
  const [spins, setSpins] = useState<GachaSkinSpinActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void api
      .gachaRecentSkinSpins()
      .then((result) => {
        if (!cancelled) setSpins(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Não foi possível carregar os giros recentes.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Carregando giros recentes"
        aria-busy="true"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="flex items-center gap-3 border border-hairline bg-panel p-3"
          >
            <div className="skeleton size-16 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-3 w-2/3" />
              <div className="skeleton h-3 w-4/5" />
              <div className="skeleton h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-300">
        {error}
        <button
          type="button"
          onClick={() => setRetry((current) => current + 1)}
          className="btn-ghost min-h-11 px-3"
        >
          Tentar novamente
        </button>
      </p>
    );
  }

  if (spins.length === 0) {
    return (
      <p role="status" className="border border-dashed border-hairline p-5 text-body-sm text-mist">
        Ainda não há giros públicos de skins para mostrar.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {spins.map((spin) => {
        const playerName =
          spin.user.name?.trim() ||
          (spin.user.userName ? `@${spin.user.userName}` : "Jogador");
        const skinImage = safeImageSrc(spin.skin.imageUrl);

        return (
          <article
            key={spin.id}
            className="flex min-w-0 items-center gap-3 border border-hairline bg-panel p-3"
          >
            <div className="relative size-16 shrink-0 overflow-hidden border border-hairline bg-ink">
              {skinImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={skinImage}
                  alt=""
                  width={128}
                  height={128}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="sr-only">Imagem indisponível</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar
                  name={playerName}
                  src={safeImageSrc(spin.user.avatar)}
                  size={28}
                />
                <p className="truncate text-sm text-snow">{playerName}</p>
              </div>
              <p className="mt-2 truncate text-body-sm text-ice">
                {spin.skin.name}
              </p>
              <time
                dateTime={spin.createdAt}
                className="mt-1 block text-caption text-mist"
              >
                {new Date(spin.createdAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </time>
            </div>
          </article>
        );
      })}
    </div>
  );
}
