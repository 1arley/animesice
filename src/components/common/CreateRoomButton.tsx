"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError, type RoomInfo } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface CreateRoomButtonProps {
  animeSlug: string;
  episodeNumber: number;
}

export function CreateRoomButton({
  animeSlug,
  episodeNumber,
}: CreateRoomButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createRoom({ animeSlug, episodeNumber });
      setRoom(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Erro ao criar sala.",
      );
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!room) return;
    const link = `${window.location.origin}/room/${room.slug}`;
    navigator.clipboard.writeText(link);
  }

  if (!user) {
    return (
      <p className="mt-4 text-body-sm text-mist">
        <Link href="/login" className="text-ice underline">
          Entre
        </Link>{" "}
        para criar uma sala de watch party.
      </p>
    );
  }

  if (room) {
    const link = `${window.location.origin}/room/${room.slug}`;
    return (
      <div className="mt-4 border border-hairline bg-panel p-4">
        <p className="font-mono text-body-sm font-semibold text-ice">
          Sala criada!
        </p>
        <p className="mt-1 text-caption text-mist">
          Compartilhe este link com seus amigos:
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={link}
            readOnly
            aria-label="Link da sala"
            className="field flex-1"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button onClick={copyLink} className="btn-ice">
            Copiar
          </button>
          <a href={link} className="btn-ghost">
            Abrir
          </a>
        </div>
        <p className="mt-2 text-caption text-mist">
          Expira em 24 horas ou após 6h de inatividade.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleCreate}
        disabled={loading}
        className="btn-ghost"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
          <rect x="1" y="2" width="12" height="10" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <path d="M6 5l3.5 2-3.5 2z" />
        </svg>
        {loading ? "Criando..." : "Criar sala de watch party"}
      </button>
      {error && (
        <p className="mt-2 text-caption text-signal">{error}</p>
      )}
    </div>
  );
}
