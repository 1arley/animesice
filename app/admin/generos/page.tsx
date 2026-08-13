"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import type { Genre } from "@/types";

export default function AdminGenerosPage() {
  const { user } = useAuth();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadGenres = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminListGenres();
      setGenres(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar gêneros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPrivileged(user)) return;
    loadGenres();
  }, [user, loadGenres]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim() || !name.trim()) {
      setError("Slug e nome são obrigatórios.");
      return;
    }
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await api.adminCreateGenre({ slug: slug.trim(), name: name.trim() });
      setGenres((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccess(`Gênero "${created.name}" criado.`);
      setSlug("");
      setName("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao criar gênero.");
    } finally {
      setCreating(false);
    }
  }

  function slugify(input: string): string {
    return input
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  }

  const filteredGenres = search
    ? genres.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : genres;

  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-display text-display-xl text-snow">Gêneros</h1>
        <span className="badge badge-muted">
          <span className="badge-dot bg-ice" />
          {genres.length} total
        </span>
      </div>
      <p className="text-body-sm text-mist">
        Cadastrar e listar gêneros disponíveis no catálogo.
      </p>

      {error && (
        <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
          {success}
        </div>
      )}

      <section className="mt-6 admin-card p-5">
        <h2 className="shelf-label">Novo gênero</h2>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Ação"
              className="field"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acao"
              className="field font-mono"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={creating} className="btn-ice">
              {creating ? "Criando..." : "Criar"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6">
        <div className="flex items-center gap-3">
          <h2 className="shelf-label">Lista</h2>
          <input
            type="search"
            placeholder="Filtrar..."
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => setSearch(value), 100);
            }}
            className="ml-auto w-full max-w-xs border border-hairline bg-panel px-3 py-1.5 text-body-sm text-snow placeholder:text-mist focus:border-ice focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="admin-empty mt-4">Carregando...</div>
        ) : filteredGenres.length === 0 ? (
          <div className="admin-empty mt-4">
            {search ? `Nenhum gênero encontrado para "${search}".` : "Nenhum gênero cadastrado."}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto border border-hairline">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Slug</th>
                </tr>
              </thead>
              <tbody>
                {filteredGenres.map((g) => (
                  <tr key={g.id}>
                    <td className="text-snow">{g.name}</td>
                    <td>
                      <code className="text-mist">{g.slug}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
