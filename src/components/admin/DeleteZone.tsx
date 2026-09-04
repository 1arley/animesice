"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

interface DeleteZoneProps {
  slug: string;
  number: number;
  animeTitle: string;
  onDeleted: () => void;
}

/** Zona de exclusão do episódio — confirmado em dois passos. */
export function DeleteZone({ slug, number, animeTitle, onDeleted }: DeleteZoneProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteEpisode() {
    setDeleting(true);
    setError(null);
    try {
      await api.adminDeleteEpisode(slug, number);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao deletar episódio.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mt-6 border border-signal/30 bg-signal/5 p-4">
      <span className="block font-sans text-caption uppercase tracking-wider text-signal">
        Zona de exclusão
      </span>
      {error && (
        <p className="mt-2 text-caption text-signal">{error}</p>
      )}
      {confirmDelete ? (
        <div className="mt-2 flex items-center gap-3">
          <span className="text-body-sm text-signal">
            Confirmar exclusão do EP {number} de {animeTitle}?
          </span>
          <button
            type="button"
            onClick={deleteEpisode}
            disabled={deleting}
            className="btn-ice"
            style={{ background: "#FF6B4A", borderColor: "#FF6B4A", color: "#080C12" }}
          >
            {deleting ? "Excluindo..." : "Excluir definitivamente"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="btn-ghost"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="btn-ghost mt-2 text-signal"
        >
          Deletar este episódio
        </button>
      )}
    </div>
  );
}
