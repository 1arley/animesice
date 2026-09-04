"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { UserCard } from "@/components/social/UserCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import type { UserSearchResult } from "@/types";

const LIMIT = 24;

type SortKey = "recommended" | "active" | "new";

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recomendados" },
  { key: "active", label: "Mais ativos" },
  { key: "new", label: "Novos" },
];

export default function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce da busca (300ms) — evita request a cada tecla.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const load = useCallback(
    async (targetPage: number, reset: boolean) => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.searchUsers({
          search: debounced.trim() || undefined,
          sort,
          page: targetPage,
          limit: LIMIT,
        });
        setUsers((prev) => (reset ? res.data ?? [] : [...prev, ...(res.data ?? [])]));
        setPage(targetPage);
        setTotalPages(res.meta?.totalPages ?? 1);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [debounced, sort],
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  function handleSort(next: SortKey) {
    if (next === sort) return;
    setSort(next);
  }

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <PageTitle text="Usuários" badge="perfis públicos da comunidade" />

      {/* Busca */}
      <div className="mt-4 max-w-xl">
        <div className="relative">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou @apelido…"
            aria-label="Buscar usuários"
            className="field w-full pl-9"
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-soft"
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-4 flex items-center gap-1 border-b border-hairline">
        {SORT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleSort(tab.key)}
            aria-pressed={sort === tab.key}
            className={`min-h-11 border-b-2 px-4 py-3 font-mono text-body-sm uppercase tracking-wider transition-colors ${
              sort === tab.key
                ? "border-ice text-ice"
                : "border-transparent text-mist hover:text-snow"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-6">
        {error ? (
          <EmptyState text="Não foi possível carregar os usuários. Tente novamente." />
        ) : loading && users.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-40" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            text={
              debounced.trim()
                ? "Ninguém encontrado com esse nome. Tente outra busca."
                : "Nenhum perfil público por aqui ainda."
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
          </div>
        )}

        {page < totalPages && users.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => load(page + 1, false)}
              disabled={loading}
              className="btn-ghost"
            >
              {loading ? "Carregando…" : "Carregar mais"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
