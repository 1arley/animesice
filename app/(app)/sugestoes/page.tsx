"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

export default function SugestoesPage() {
  const { user } = useAuth();
  const [type, setType] = useState<"SUGGESTION" | "BUG">("SUGGESTION");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.createFeedback({ type, title: title.trim(), description: description.trim() });
      setSuccess("Feedback enviado! Obrigado.");
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <h1 className="shelf-label">
        Sugestões e bugs{" "}
        <span className="shelf-label-data">ajude a melhorar</span>
      </h1>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 max-w-lg space-y-3 border border-hairline bg-panel p-4">
          <div>
            <label className="mb-1 block font-mono text-caption uppercase tracking-wider text-mist">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "SUGGESTION" | "BUG")}
              className="field"
            >
              <option value="SUGGESTION">Sugestão</option>
              <option value="BUG">Bug</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block font-mono text-caption uppercase tracking-wider text-mist">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="field"
              placeholder="Resumo curto"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-caption uppercase tracking-wider text-mist">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={5}
              required
              className="field"
              placeholder="Descreva em detalhes..."
            />
          </div>
          {error && <p className="text-body-sm text-signal">{error}</p>}
          {success && <p className="text-body-sm text-ice">{success}</p>}
          <button type="submit" disabled={loading} className="btn-ghost">
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </form>
      ) : (
        <p className="mb-8 text-body-sm text-mist">
          <a href="/login" className="text-ice underline">Entre</a> para enviar feedback.
        </p>
      )}
    </div>
  );
}
