"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import type { Anime } from "@/types";

type AdminAnime = Anime & { _count: { episodes: number } };

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [animes, setAnimes] = useState<AdminAnime[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);

  function loadAnimes() {
    api
      .adminListAnimes(1, 100)
      .then((res) => setAnimes(res.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar animes."));
  }

  useEffect(() => {
    if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") return;
    loadAnimes();
  }, [user]);

  async function deleteAnime(slug: string) {
    setDeleting(slug);
    setError(null);
    try {
      await api.adminDeleteAnime(slug);
      setConfirmSlug(null);
      loadAnimes();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao deletar anime.");
    } finally {
      setDeleting(null);
    }
  }

  if (authLoading) {
    return (
      <>
        <Header />
        <SiteNav />
        <main className="mx-auto max-w-shelf px-4 py-10 text-body-sm text-mist">Carregando...</main>
      </>
    );
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return (
      <>
        <Header />
        <SiteNav />
        <main className="mx-auto max-w-shelf px-4 py-10 text-body-sm text-mist">
          Acesso negado. Apenas administradores.{" "}
          <a href="/login" className="text-ice">Entrar</a>.
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <SiteNav />
      <main className="mx-auto max-w-shelf px-4 py-6">
        <h1 className="font-display text-display-xl text-ink">Painel admin</h1>
        <p className="mt-1 text-body-sm text-mist">
          Logado como <span className="text-ice">{user.email}</span> ({user.role})
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/admin/create" className="btn-ice">+ Criar anime manual</a>
          <a href="/admin/import" className="btn-ghost">Importar do AniList</a>
        </div>

        <h2 className="mt-8 shelf-label">
          Catálogo <span className="shelf-label-data">{animes.length}</span>
        </h2>
        {error ? (
          <p className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">{error}</p>
        ) : animes.length === 0 ? (
          <p className="text-body-sm text-mist">
            Catálogo vazio. Crie um anime manualmente ou importe pelo AniList.
          </p>
        ) : (
          <div className="overflow-x-auto">
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
        )}
        <p className="mt-4 text-caption text-mist">
          Para editar ou cadastrar URLs de vídeo de um episódio: clique no título
          do anime acima e ajuste o número na URL, ou acesse{" "}
          <code className="text-mist">/admin/episode/[slug]/[numero]</code>.{" "}
          Para criar um episódio novo: clique em <strong>+ ep</strong> ao lado do anime.
        </p>
      </main>
      <Footer />
    </>
  );
}
