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

  // Bug #4 fix: if neither id is provided, render nothing — a silent no-op
  // button gives no feedback and confuses users. We bail out early instead.
  if (!cardId && !animeId) return null;

  if (!user) {
    return (
      <Link href="/login" className="btn-ghost px-3 py-2 text-caption">
        Quero obter
      </Link>
    );
  }

  // Bug #3 fix: the `disabled` prop should only block *adding* to the wishlist.
  // Removal must always be possible so the user can clean up after obtaining a
  // card. We achieve this by ignoring the `disabled` flag when the current
  // state is `wishlisted=true` (i.e. a click would be a removal).
  const effectivelyDisabled = disabled && !wishlisted;

  async function toggle() {
    if (loading || effectivelyDisabled) return;
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
      disabled={loading || effectivelyDisabled}
      aria-pressed={wishlisted}
      className={`${wishlisted ? "btn-ice" : "btn-ghost"} px-3 py-2 text-caption ${compact ? "" : "mt-3 w-full"}`}
    >
      {loading ? "..." : wishlisted ? "Na wishlist" : "Quero obter"}
    </button>
  );
}
