"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface WishlistButtonProps {
  cardId?: string;
  animeId?: string | null;
  initialWishlisted: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export function WishlistButton({
  cardId,
  animeId,
  initialWishlisted,
  disabled = false,
  compact = false,
}: WishlistButtonProps) {
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <Link href="/login" className="btn-ghost px-3 py-2 text-caption">
        Quero obter
      </Link>
    );
  }

  async function toggle() {
    if (loading || disabled || (!cardId && !animeId)) return;
    const next = !wishlisted;
    setWishlisted(next);
    setLoading(true);
    try {
      if (cardId) {
        if (next) await api.gachaWishlistCard(cardId);
        else await api.gachaWishlistCardDelete(cardId);
      } else if (animeId) {
        if (next) await api.gachaWishlistSet(animeId);
        else await api.gachaWishlistSetDelete(animeId);
      }
    } catch {
      setWishlisted(!next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading || disabled}
      aria-pressed={wishlisted}
      className={`${wishlisted ? "btn-ice" : "btn-ghost"} px-3 py-2 text-caption ${compact ? "" : "mt-3 w-full"}`}
    >
      {loading ? "..." : wishlisted ? "Na wishlist" : "Quero obter"}
    </button>
  );
}
