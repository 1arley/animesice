"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Anime } from "@/types";

export default function AdminImportPage() {
  const { user, loading: authLoading } = useAuth();
  const [anilistId, setAnilistId] = useState("");
  const [search, setSearch] = useState("");
  const [audio, setAudio] = useState<"LEGENDADO" | "DUBLADO">("LEGENDADO");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Anime | null>(null);

  async function doImport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const id = anilistId.trim();
    const term = search.trim();
    if (!id && !term) {
      setError("Informe um AniList ID ou um termo de busca.");
      return;
    }

    setSubmitting(true);
    try {
      const anime = await api.adminImportAnime({
        anilistId: id ? Number(id) : undefined,
        search: term || undefined,
        audio,
      });
      setResult(anime);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao importar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading)
    return <p className="container text-white py-4">Carregando...</p>;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return (
      <p className="container text-white py-4">
        Acesso negado. <a href="/login" className="text-info">Entrar</a>.
      </p>
    );
  }

  return (
    <div className="container text-white py-4" style={{ maxWidth: 720 }}>
      <p>
        <a href="/admin" className="text-info">← Painel</a>
      </p>
      <h1>Importar do AniList</h1>
      <p className="text-muted">
        Busca metadados do anime no AniList (capa, banner, sinopse, gêneros,
        episódios) e cria no catálogo.
      </p>

      <form onSubmit={doImport} style={{ marginTop: 16 }}>
        <div className="form-group">
          <label>AniList ID (número)</label>
          <input
            className="form-control bg-dark text-white"
            value={anilistId}
            onChange={(e) => setAnilistId(e.target.value)}
            placeholder="ex: 101922"
            inputMode="numeric"
          />
        </div>

        <div className="text-center text-muted my-2">— ou —</div>

        <div className="form-group">
          <label>Termo de busca</label>
          <input
            className="form-control bg-dark text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ex: Frieren"
          />
          <small className="text-muted">
            Usado quando o AniList ID estiver vazio.
          </small>
        </div>

        <div className="form-group mt-3">
          <label>Áudio padrão</label>
          <select
            className="form-control bg-dark text-white"
            value={audio}
            onChange={(e) =>
              setAudio(e.target.value as "LEGENDADO" | "DUBLADO")
            }
          >
            <option value="LEGENDADO">LEGENDADO</option>
            <option value="DUBLADO">DUBLADO</option>
          </select>
        </div>

        {error && (
          <p style={{ color: "#ff6b6b" }} className="mt-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-info mt-3"
        >
          {submitting ? "Importando..." : "Importar"}
        </button>
      </form>

      {result && (
        <div className="mt-4" style={{ color: "#4eff9b" }}>
          <p>Importado com sucesso!</p>
          <p>
            <strong>{result.title}</strong>{" "}
            <code className="text-white">/{result.slug}</code>
          </p>
          <p>
            <a
              href={`/animes/${result.slug}`}
              className="text-info"
            >
              ver no site
            </a>{" "}
            ·{" "}
            <a
              href={`/admin/episode/${result.slug}/1`}
              className="text-info"
            >
              editar ep 1
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
