"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { HeartIcon } from "@/components/ui/icons";
import { ClickSpark } from "@/components/core/ClickSpark";

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

  // Faísca de gelo no clique — micro-interação da ação de favoritar.
  if (!user) {
    return (
      <ClickSpark className="w-fit">
        <Link href="/login" className="btn-ghost">
          <HeartIcon filled={false} />
          Favoritar
        </Link>
      </ClickSpark>
    );
  }

  return (
    <ClickSpark className="w-fit">
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
    </ClickSpark>
  );
}
