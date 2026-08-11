"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface FavoriteButtonProps {
  slug: string;
}

export function FavoriteButton({ slug }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.checkFavorite(slug)
      .then((data) => { if (!cancelled) setFavorited(data.favorited); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug, user]);

  async function handleToggle() {
    if (!user || loading) return;
    setLoading(true);
    try {
      const res = await api.toggleFavorite(slug);
      setFavorited(res.favorited);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <a href="/login" className="btn-ghost">
        <HeartIcon filled={false} />
        Favoritar
      </a>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`btn-ice ${favorited ? "opacity-80" : ""}`}
    >
      {loading ? (
        "..."
      ) : (
        <>
          <HeartIcon filled={favorited} />
          {favorited ? "Favoritado" : "Favoritar"}
        </>
      )}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 13.5S1.5 9.7 1.5 5.5A3.3 3.3 0 0 1 8 4a3.3 3.3 0 0 1 6.5 1.5C14.5 9.7 8 13.5 8 13.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
