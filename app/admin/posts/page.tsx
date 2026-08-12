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
      await loadPosts();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao excluir post.");
    } finally {
      setActioning(null);
    }
  }

  const totalPages = meta?.totalPages ?? 1;

  return (
    <>
      <h1 className="font-display text-display-xl text-snow">Moderar Posts</h1>
      <p className="mt-1 text-body-sm text-mist">
        Listar, ocultar e excluir posts do feed da comunidade.
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
            className={`px-3 py-1.5 font-mono text-caption uppercase tracking-wider transition-colors ${
              statusFilter === key
                ? "border border-ice text-ice"
                : "border border-hairline text-mist hover:text-ice"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-4 text-body-sm text-mist">Carregando...</p>
      ) : posts.length === 0 ? (
        <p className="mt-4 text-body-sm text-mist">Nenhum post encontrado.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="border border-hairline bg-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-caption text-mist">
                      {post.user.userName ?? post.user.name ?? "—"}
                    </span>
                    <span className={`font-mono text-caption uppercase ${
                      post.status === "HIDDEN_BY_MOD" ? "text-signal" : "text-ice/60"
                    }`}>
                      {post.status === "HIDDEN_BY_MOD" ? "Oculto" : "Visível"}
                    </span>
                    <span className="font-mono text-caption text-mist">
                      {post._count.likes} likes · {post._count.comments} comentários
                    </span>
                    <span className="font-mono text-caption text-mist">
                      {new Date(post.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-2 text-body-sm text-snow whitespace-pre-wrap break-words">
                    {post.content}
                  </p>
                  {post.anime && (
                    <p className="mt-1 text-caption text-ice/60">
                      Anime: {post.anime.title}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {post.status === "VISIBLE" && (
                    <button
                      onClick={() => hidePost(post.id)}
                      disabled={actioning === post.id}
                      className="text-caption text-signal transition-colors hover:opacity-70"
                    >
                      {actioning === post.id ? "..." : "ocultar"}
                    </button>
                  )}
                  <button
                    onClick={() => deletePost(post.id)}
                    disabled={actioning === post.id}
                    className="text-caption text-signal transition-colors hover:opacity-70"
                  >
                    {actioning === post.id ? "..." : "excluir"}
                  </button>
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