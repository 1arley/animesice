"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { PageTitle } from "@/components/ui/PageTitle";
import type { AnimeRequestItem } from "@/types";

export default function PedidosPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.createAnimeRequest({ title: title.trim(), notes: notes.trim() || undefined });
      setSuccess("Pedido criado com sucesso! Outros usuários podem votar agora.");
      setTitle("");
      setNotes("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar pedido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <PageTitle text="Pedidos de anime" badge="peça e vote" />

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 max-w-lg space-y-3 border border-hairline bg-panel p-4">
          <div>
            <label className="mb-1 block font-mono text-caption uppercase tracking-wider text-mist">
              Título do anime
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="field"
              placeholder="Ex: Frieren: Beyond Journey's End"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-caption uppercase tracking-wider text-mist">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
              className="field"
              placeholder="Link MAL, AniList, ou detalhes..."
            />
          </div>
          {error && <p className="text-body-sm text-signal">{error}</p>}
          {success && <p className="text-body-sm text-ice">{success}</p>}
          <button type="submit" disabled={loading} className="btn-ghost">
            {loading ? "Enviando..." : "Criar pedido"}
          </button>
        </form>
      ) : (
        <p className="mb-8 text-body-sm text-mist">
          <a href="/login" className="text-ice underline">Entre</a> para criar e votar em pedidos.
        </p>
      )}

      <p className="text-body-sm text-mist">Carregue a lista via /anime-requests na API.</p>
    </div>
  );
}
