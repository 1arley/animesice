"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, API_URL } from "@/lib/api";
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
    fetch(`${API_URL}/rating/stats/${slug}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});

    if (user) {
      fetch(`${API_URL}/rating/me/${slug}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => data && setUserScore(data.score))
        .catch(() => {});
    }
  }, [slug, user]);

  async function handleRate(score: number) {
    if (!user || loading) return;
    setLoading(true);
    setHoverScore(null);
    try {
      await api.rateAnime(slug, score);
      setUserScore(score);

      const res = await fetch(`${API_URL}/rating/stats/${slug}`);
      const newStats = await res.json();
      setStats(newStats);
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
      const res = await fetch(`${API_URL}/rating/stats/${slug}`);
      setStats(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const displayScore = hoverScore ?? userScore;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            disabled={!user || loading}
            onMouseEnter={() => setHoverScore(n)}
            onMouseLeave={() => setHoverScore(null)}
            onClick={() => handleRate(n)}
            className={`text-lg transition-colors ${
              displayScore != null && n <= displayScore
                ? "text-ice"
                : "text-hairline"
            } ${user ? "hover:text-ice cursor-pointer" : "cursor-default"}`}
            title={`${n}/10`}
          >
            ★
          </button>
        ))}
      </div>
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
            className="font-display text-caption text-mist transition-colors hover:text-signal"
          >
            Remover meu voto
          </button>
        )}
        {!user && (
          <span className="font-display text-caption text-mist">
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
    fetch(`${API_URL}/anime/${slug}/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [slug]);

  if (!stats) return null;

  return (
    <div className="flex gap-4">
      <span className="font-display text-body-sm text-mist">
        ♡ {stats.favorites} favorito{stats.favorites !== 1 ? "s" : ""}
      </span>
      {stats.ratingCount > 0 && stats.ratingAverage != null && (
        <span className="font-display text-body-sm text-mist">
          ★ {stats.ratingAverage.toFixed(1)} ({stats.ratingCount})
        </span>
      )}
    </div>
  );
}
