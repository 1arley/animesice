"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Anime } from "@/types";

type AdminAnime = Anime & { _count: { episodes: number } };

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [animes, setAnimes] = useState<AdminAnime[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") return;
    api
      .adminListAnimes(1, 100)
      .then((res) => setAnimes(res.data))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Erro ao carregar animes."),
      );
  }, [user]);

  if (authLoading) return <p className="container text-white py-4">Carregando...</p>;

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return (
      <p className="container text-white py-4">
        Acesso negado. Apenas administradores. <a href="/login" className="text-info">Entrar</a>.
      </p>
    );
  }

  return (
    <div className="container text-white py-4">
      <h1>Painel admin</h1>
      <p>Logado como <strong>{user.email}</strong> ({user.role})</p>
      {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}

      <p className="mt-3">
        <a href="/admin/import" className="btn btn-info">
          Importar do AniList
        </a>
      </p>

      <h2 className="mt-4">Catálogo ({animes.length})</h2>
      <p className="text-muted">
        Para cadastrar a URL de vídeo de um episódio: abra o anime, copie o slug e
        o número do episódio e acesse{" "}
        <code>/admin/episode/[slug]/[numero]</code>.
      </p>

      <table className="table table-dark table-striped mt-3">
        <thead>
          <tr>
            <th>Título</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Eps</th>
            <th>Ver</th>
          </tr>
        </thead>
        <tbody>
          {animes.map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td><code>{a.slug}</code></td>
              <td>{a.status}</td>
              <td>{a._count.episodes}</td>
              <td>
                <a className="text-info" href={`/animes/${a.slug}`}>detalhe</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
