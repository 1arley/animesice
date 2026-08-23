"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { StarIcon, HeartIcon } from "@/components/ui/icons";
import { ClickSpark } from "@/components/core/ClickSpark";
import type { RatingStats, AnimeStats } from "@/types";

interface RatingStarsProps {
  slug: string;
}

export function RatingStars({ slug }: RatingStarsProps) {
  const { user } = useAuth();
  const [userScore, setUserScore] = useState<number | null>(null);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api.getRatingStats(slug)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => {});

    if (user) {
      api.getUserRating(slug)
        .then((r) => {
          if (!cancelled && r) setUserScore(r.score);
        })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, [slug, user]);

  const refreshStats = useCallback(async () => {
    try {
      const s = await api.getRatingStats(slug);
      setStats(s);
    } catch {
      // silent
    }
  }, [slug]);

  async function handleRate(score: number) {
    if (!user || loading) return;
    setLoading(true);
    setHoverScore(null);
    try {
      await api.rateAnime(slug, score);
      setUserScore(score);
      await refreshStats();
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!user || loading) return;
    setLoading(true);
    try {
      await api.removeRating(slug);
      setUserScore(null);
      await refreshStats();
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const displayScore = hoverScore ?? userScore;

  return (
    <div className="flex flex-col gap-2">
      {/* Um ClickSpark para a fileira inteira: a faísca sai no ponto exato
          da estrela clicada — 10 canvases por página seria desperdício. */}
      <ClickSpark className="w-fit" sparkCount={10} sparkRadius={16} sparkSize={7}>
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label="Avaliação de 1 a 10 estrelas"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            disabled={!user || loading}
            onMouseEnter={() => setHoverScore(n)}
            onMouseLeave={() => setHoverScore(null)}
            onClick={() => handleRate(n)}
            role="radio"
            aria-checked={userScore === n}
            aria-label={`${n} de 10`}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                if (user && !loading) handleRate(Math.min(10, n + 1));
              } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                if (user && !loading) handleRate(Math.max(1, n - 1));
              } else if (e.key === "0") {
                e.preventDefault();
                if (user && !loading) handleRemove();
              }
            }}
            className={`p-1.5 transition-colors ${
              displayScore != null && n <= displayScore
                ? "text-ice"
                : "text-mist/40"
            } ${user ? "hover:text-ice cursor-pointer" : "cursor-default"}`}
            title={`${n}/10`}
          >
            <StarIcon filled={displayScore != null && n <= displayScore} />
          </button>
        ))}
      </div>
      </ClickSpark>
      <div className="flex items-center gap-3">
        {stats && (
          <span className="font-display text-body-sm text-mist">
            {stats.average != null
              ? `${stats.average.toFixed(1)} (${stats.count} voto${stats.count !== 1 ? "s" : ""})`
              : "Sem votos"}
          </span>
        )}
        {user && userScore && (
          <button
            onClick={handleRemove}
            disabled={loading}
            className="inline-flex min-h-11 items-center px-2 font-mono text-caption text-mist transition-colors hover:text-signal"
          >
            Remover meu voto
          </button>
        )}
        {!user && (
          <span className="font-mono text-caption text-mist">
            <a href="/login" className="text-ice underline">Entre</a> para avaliar
          </span>
        )}
      </div>
    </div>
  );
}

export function AnimeStatsDisplay({ slug }: { slug: string }) {
  const [stats, setStats] = useState<AnimeStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getAnimeStats(slug)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug]);

  if (!stats) return null;

  return (
    <div className="flex gap-4">
      <span className="inline-flex items-center gap-1 font-mono text-body-sm text-mist">
        <HeartIcon filled className="text-signal" />
        {stats.favorites} favorito{stats.favorites !== 1 ? "s" : ""}
      </span>
      {stats.ratingCount > 0 && stats.ratingAverage != null && (
        <span className="inline-flex items-center gap-1 font-mono text-body-sm text-mist">
          <StarIcon filled className="text-ice" />
          {stats.ratingAverage.toFixed(1)} ({stats.ratingCount})
        </span>
      )}
    </div>
  );
}
