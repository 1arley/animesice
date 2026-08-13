"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import type { AdminPostItem } from "@/lib/api";
import type { Paginated } from "@/types";

const PAGE_SIZE = 20;

const STATUS_FILTERS: Record<string, string> = {
  ALL: "Todas",
  VISIBLE: "Visíveis",
  HIDDEN_BY_MOD: "Ocultos",
};

export default function AdminPostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<AdminPostItem[]>([]);
  const [meta, setMeta] = useState<Paginated<AdminPostItem>["meta"] | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminListPosts(page, PAGE_SIZE, statusFilter === "ALL" ? undefined : statusFilter);
      setPosts(res.data);
      setMeta(res.meta);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar posts.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (!isPrivileged(user)) return;
    loadPosts();
  }, [user, loadPosts]);

  async function hidePost(id: string) {
    setActioning(id);
    try {
      await api.adminHidePost(id);
      await loadPosts();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao ocultar post.");
    } finally {
      setActioning(null);
    }
  }

  async function deletePost(id: string) {
    setActioning(id);
    try {
      await api.adminDeletePost(id);
      setConfirmDelete(null);
      await loadPosts();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao excluir post.");
    } finally {
      setActioning(null);
    }
  }

  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-display text-display-xl text-snow">Posts</h1>
        <span className="badge badge-muted">
          <span className="badge-dot bg-ice" />
          {total} total
        </span>
      </div>
      <p className="text-body-sm text-mist">
        Moderar posts do feed da comunidade.
      </p>

      {error && (
        <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(STATUS_FILTERS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(1); }}
            className={`admin-tab ${statusFilter === key ? "admin-tab-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-empty mt-4">Carregando...</div>
      ) : posts.length === 0 ? (
        <div className="admin-empty mt-4">Nenhum post encontrado.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="admin-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body-sm font-medium text-snow">
                      {post.user.userName ?? post.user.name ?? "—"}
                    </span>
                    {post.status === "HIDDEN_BY_MOD" ? (
                      <span className="badge badge-signal">
                        <span className="badge-dot bg-signal" />
                        Oculto
                      </span>
                    ) : (
                      <span className="badge badge-ice">
                        <span className="badge-dot bg-ice" />
                        Visível
                      </span>
                    )}
                    <span className="font-mono text-caption text-mist">
                      {post._count.likes} likes · {post._count.comments} comentários
                    </span>
                    <span className="font-mono text-caption text-mist">
                      {new Date(post.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-body-sm text-snow">
                    {post.content}
                  </p>
                  {post.anime && (
                    <p className="mt-1 text-caption text-ice/60">
                      Anime: {post.anime.title}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.status === "VISIBLE" && (
                    <button
                      onClick={() => hidePost(post.id)}
                      disabled={actioning === post.id}
                      className="btn-ghost btn-sm"
                    >
                      {actioning === post.id ? "..." : "Ocultar"}
                    </button>
                  )}
                  {confirmDelete === post.id ? (
                    <>
                      <button
                        onClick={() => deletePost(post.id)}
                        disabled={actioning === post.id}
                        className="btn-danger btn-sm"
                      >
                        {actioning === post.id ? "..." : "Confirmar?"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="btn-ghost btn-sm"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(post.id)}
                      disabled={actioning === post.id}
                      className="btn-ghost btn-sm text-signal"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Paginação">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <span className="font-display text-body-sm text-mist tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Próxima →
          </button>
        </nav>
      )}
    </>
  );
}
