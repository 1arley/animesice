"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import { AdminGate } from "@/components/common/AdminGate";
import { isPrivileged } from "@/lib/role";
import type { Anime, Paginated } from "@/types";

type AdminAnime = Anime & { _count: { episodes: number } };

const PAGE_SIZE = 50;

export default function AdminPage() {
  const { user } = useAuth();
  const [animes, setAnimes] = useState<AdminAnime[]>([]);
  const [meta, setMeta] = useState<Paginated<AdminAnime>["meta"] | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadAnimes = useCallback(
    (targetPage: number, targetSearch: string) => {
      api
        .adminListAnimes(targetPage, PAGE_SIZE, targetSearch || undefined)
        .then((res) => {
          setAnimes(res.data);
          setMeta(res.meta);
        })
        .catch((e) =>
          setError(e instanceof ApiError ? e.message : "Erro ao carregar animes."),
        );
    },
    [],
  );

  useEffect(() => {
    if (!isPrivileged(user)) return;
    loadAnimes(page, search);
  }, [user, page, loadAnimes, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadAnimes(1, value);
    }, 350);
  }

  async function deleteAnime(slug: string) {
    setDeleting(slug);
    setError(null);
    try {
      await api.adminDeleteAnime(slug);
      setConfirmSlug(null);
      loadAnimes(page, search);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao deletar anime.");
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  return (
    <AdminGate>
      <Header />
      <SiteNav />
      <main className="mx-auto max-w-shelf px-4 py-6">
        <h1 className="font-display text-display-xl text-snow">Painel admin</h1>
        <p className="mt-1 text-body-sm text-mist">
          Logado como <span className="text-ice">{user?.email}</span> ({user?.role})
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/admin/create" className="btn-ice">+ Criar anime manual</a>
          <a href="/admin/import" className="btn-ghost">Importar do AniList</a>
          <a href="/admin/moderacao" className="btn-ghost">Moderação</a>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <h2 className="shelf-label">
            Catálogo <span className="shelf-label-data">{total}</span>
          </h2>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Buscar por título ou slug…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="ml-auto w-full max-w-xs border border-hairline bg-panel px-3 py-1.5 text-body-sm text-snow placeholder:text-mist focus:border-ice focus:outline-none"
          />
        </div>

        {error ? (
          <p className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">{error}</p>
        ) : animes.length === 0 ? (
          <p className="mt-4 text-body-sm text-mist">
            {search
              ? `Nenhum anime encontrado para "${search}".`
              : "Catálogo vazio. Crie um anime manualmente ou importe pelo AniList."}
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-hairline text-caption uppercase tracking-wider text-mist">
                    <th className="py-2 pr-4 font-semibold">Título</th>
                    <th className="py-2 pr-4 font-semibold">Slug</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 text-right font-semibold">Eps</th>
                    <th className="py-2 pr-4 font-semibold">Ver</th>
                    <th className="py-2 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="font-sans text-body-sm">
                  {animes.map((a) => (
                    <tr key={a.id} className="border-b border-hairline/60 align-middle">
                      <td className="py-2 pr-4 text-mist">
                        <a
                          href={`/admin/episode/${a.slug}/1`}
                          className="transition-colors hover:text-ice"
                          title={`Editar episódios de ${a.title}`}
                        >
                          {a.title}
                        </a>
                      </td>
                      <td className="py-2 pr-4">
                        <code className="text-mist">{a.slug}</code>
                      </td>
                      <td className="py-2 pr-4 text-mist">{a.status}</td>
                      <td className="py-2 pr-4 text-right font-display tabular-nums text-mist">
                        {a._count.episodes}
                      </td>
                      <td className="py-2 pr-4">
                        <a href={`/animes/${a.slug}`} className="text-ice transition-colors hover:opacity-70">
                          detalhe
                        </a>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <a
                            href={`/admin/edit/${a.slug}`}
                            className="text-caption text-ice transition-colors hover:opacity-70"
                            title="Editar anime"
                          >
                            editar
                          </a>
                          <a
                            href={`/admin/create-episode/${a.slug}`}
                            className="text-caption text-ice transition-colors hover:opacity-70"
                            title="Criar episódio"
                          >
                            + ep
                          </a>
                          {confirmSlug === a.slug ? (
                            <>
                              <button
                                onClick={() => deleteAnime(a.slug)}
                                disabled={deleting === a.slug}
                                className="text-caption text-signal transition-colors hover:opacity-70"
                              >
                                {deleting === a.slug ? "..." : "confirmar?"}
                              </button>
                              <button
                                onClick={() => setConfirmSlug(null)}
                                className="text-caption text-mist transition-colors hover:opacity-70"
                              >
                                cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmSlug(a.slug)}
                              className="text-caption text-signal transition-colors hover:opacity-70"
                              title="Deletar anime"
                            >
                              deletar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
        )}

        <p className="mt-4 text-caption text-mist">
          Para editar ou cadastrar URLs de vídeo de um episódio: clique no título
          do anime acima e ajuste o número na URL, ou acesse{" "}
          <code className="text-mist">/admin/episode/[slug]/[numero]</code>.{" "}
          Para criar um episódio novo: clique em <strong>+ ep</strong> ao lado do anime.
        </p>
      </main>
      <Footer />
    </AdminGate>
  );
}
