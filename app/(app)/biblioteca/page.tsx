"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { AnimeCard } from "@/components/common/AnimeCard";
import type { Anime, Paginated, WatchHistoryItem, UserAnimeListItem, WatchStatus } from "@/types";

type Tab = "watching" | "planning" | "completed" | "on_hold" | "dropped" | "favorites" | "history";

const TAB_LABELS: Record<Tab, string> = {
  watching: "Assistindo",
  planning: "Planejo ver",
  completed: "Concluídos",
  on_hold: "Em pausa",
  dropped: "Dropados",
  favorites: "Favoritos",
  history: "Histórico",
};

const TAB_STATUS: Record<Exclude<Tab, "favorites" | "history">, WatchStatus> = {
  watching: "WATCHING",
  planning: "PLANNING",
  completed: "COMPLETED",
  on_hold: "ON_HOLD",
  dropped: "DROPPED",
};

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("watching");
  const [favorites, setFavorites] = useState<Anime[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [watchlist, setWatchlist] = useState<UserAnimeListItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWatchlist = useCallback(async (status: WatchStatus) => {
    setLoadingData(true);
    setError(null);
    try {
      const res = await api.listAnimeList(1, 100, status);
      setWatchlist(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar lista.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const res = await api.listFavorites(1, 100);
      setFavorites(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar favoritos.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const res = await api.getWatchHistory(1, 50);
      setHistory(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar histórico.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (tab === "favorites") loadFavorites();
    else if (tab === "history") loadHistory();
    else loadWatchlist(TAB_STATUS[tab]);
  }, [user, tab, loadWatchlist, loadFavorites, loadHistory]);

  async function removeFromList(slug: string) {
    try {
      await api.removeAnimeList(slug);
      setWatchlist((prev) => prev.filter((item) => item.anime.slug !== slug));
    } catch {}
  }

  if (loading) return <div className="mx-auto max-w-shelf px-4 py-8 text-mist">Carregando...</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-shelf px-4 py-8 text-mist">
        <a href="/login" className="text-ice underline">Entre</a> para acessar sua biblioteca.
      </div>
    );
  }

  const tabs: Tab[] = ["watching", "planning", "completed", "on_hold", "dropped", "favorites", "history"];

  return (
    <div className="mx-auto max-w-shelf px-4 py-8">
      <h1 className="shelf-label">
        Minha biblioteca{" "}
        <span className="shelf-label-data">{user.userName ?? user.name ?? user.email}</span>
      </h1>

      <div className="mb-6 flex flex-wrap gap-3 border-b border-hairline">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 font-display text-body-sm transition-colors ${
              tab === t ? "border-b-2 border-ice text-ice" : "text-mist hover:text-ice"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      {loadingData ? (
        <p className="text-body-sm text-mist">Carregando...</p>
      ) : tab === "favorites" ? (
        favorites.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {favorites.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : (
          <EmptyState text="Você ainda não favoritou nenhum anime." />
        )
      ) : tab === "history" ? (
        history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item) => (
              <a
                key={item.episodeId}
                href={`/animes/${item.anime.slug}/${item.episode.number}`}
                className="flex items-center gap-4 border border-hairline bg-panel p-3 hover:border-ice"
              >
                <div className="h-14 w-10 shrink-0 overflow-hidden bg-hairline">
                  {item.anime.coverImage && (
                    <img src={item.anime.coverImage} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="font-sans text-body font-medium text-ice">{item.anime.title}</p>
                  <p className="font-mono text-caption text-mist">
                    EP {item.episode.number} · {item.completed ? "Concluído" : "Em andamento"}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState text="Seu histórico aparecerá aqui." />
        )
      ) : watchlist.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {watchlist.map((item) => (
            <div key={item.animeId} className="relative group">
              <AnimeCard anime={item.anime} />
              <button
                onClick={() => removeFromList(item.anime.slug)}
                className="absolute left-1 top-1 bg-ink/80 px-1.5 py-0.5 font-mono text-caption font-semibold text-signal opacity-0 transition-opacity group-hover:opacity-100 hover:bg-signal hover:text-ink"
                title="Remover da lista"
              >
                ×
              </button>
              {item.score != null && (
                <span className="absolute right-1 bottom-1 bg-ink/80 px-1 py-0.5 font-mono text-caption text-ice tabular-nums">
                  {item.score}/10
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text={`Sua lista de "${TAB_LABELS[tab]}" está vazia.`} />
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-body-sm text-mist">{text}</p>;
}
