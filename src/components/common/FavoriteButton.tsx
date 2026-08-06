"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, API_URL } from "@/lib/api";

interface FavoriteButtonProps {
  slug: string;
}

export function FavoriteButton({ slug }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetch(`${API_URL}/favorite/${slug}/check`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setFavorited(data.favorited))
        .catch(() => {});
    }
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
        ♡ Favoritar
      </a>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`btn-ice ${favorited ? "opacity-80" : ""}`}
    >
      {loading ? "..." : favorited ? "♥ Favoritado" : "♡ Favoritar"}
    </button>
  );
}
