"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Anime } from "@/types";

export default function AdminImportPage() {
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

  return (
    <div className="mx-auto px-4 py-6" style={{ maxWidth: 720 }}>
      <p className="mb-4">
        <Link href="/admin" className="text-body-sm text-mist transition-colors hover:text-ice">
          ← Painel
        </Link>
      </p>
        <h1 className="font-display text-display-xl text-snow">Importar do AniList</h1>
        <p className="mt-2 text-body-sm text-mist">
          Busca metadados do anime no AniList (capa, banner, sinopse, gêneros,
          episódios) e cria no catálogo.
        </p>

        <form onSubmit={doImport} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              AniList ID (número)
            </span>
            <input
              className="field"
              value={anilistId}
              onChange={(e) => setAnilistId(e.target.value)}
              placeholder="ex: 101922"
              inputMode="numeric"
            />
          </label>

          <p className="text-center font-mono text-caption text-mist">— ou —</p>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Termo de busca
            </span>
            <input
              className="field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ex: Frieren"
            />
            <span className="mt-1 block text-caption text-mist">
              Usado quando o AniList ID estiver vazio.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Áudio padrão
            </span>
            <select
              className="field"
              value={audio}
              onChange={(e) => setAudio(e.target.value as "LEGENDADO" | "DUBLADO")}
            >
              <option value="LEGENDADO">Legendado</option>
              <option value="DUBLADO">Dublado</option>
            </select>
          </label>

          {error && (
            <p role="alert" className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-ice">
            {submitting ? "Importando..." : "Importar"}
          </button>
        </form>

        {result && (
          <div className="mt-6 border border-hairline bg-panel p-4">
            <p className="text-body-sm text-ice">Importado com sucesso!</p>
            <p className="mt-1 text-body text-snow">
              <strong>{result.title}</strong>{" "}
              <code className="text-mist">/{result.slug}</code>
            </p>
            <p className="mt-2 flex gap-3 text-body-sm">
              <Link href={`/animes/${result.slug}`} className="text-ice transition-colors hover:opacity-70">
                ver no site
              </Link>
              <span className="text-hairline">·</span>
              <Link href={`/admin/episode/${result.slug}/1`} className="text-ice transition-colors hover:opacity-70">
                editar ep 1
              </Link>
            </p>
          </div>
        )}
    </div>
  );
}
