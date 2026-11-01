"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * FollowButton — botão seguir/deixar de seguir com estado otimista.
 * Some para o próprio perfil e para visitantes anônimos.
 */
export function FollowButton({
  userId,
  initialFollowing = false,
  compact = false,
  onToggle,
}: {
  userId: string;
  initialFollowing?: boolean;
  compact?: boolean;
  onToggle?: (following: boolean) => void;
}) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  if (!user || user.id === userId) return null;

  async function handle() {
    if (busy) return;
    setBusy(true);
    const before = following;
    setFollowing(!following);
    try {
      const res = await api.toggleFollow(userId);
      setFollowing(res.following);
      onToggle?.(res.following);
    } catch {
      setFollowing(before);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      aria-pressed={following}
      className={
        compact
          ? "btn-ghost px-3 py-1.5 text-caption"
          : "btn-ghost"
      }
    >
      {busy ? "…" : following ? "Seguindo ✓" : "Seguir"}
    </button>
  );
}
