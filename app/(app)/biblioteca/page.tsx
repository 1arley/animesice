"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AnimeCard } from "@/components/common/AnimeCard";
import type { Anime, Paginated, WatchHistoryItem } from "@/types";

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const [favorites, setFavorites] = useState<Anime[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [tab, setTab] = useState<"favorites" | "history">("favorites");

  useEffect(() => {
    if (!user) return;
    api.listFavorites().then((res) => setFavorites(res.data)).catch(() => {});
    api.getWatchHistory().then((res) => setHistory(res.data)).catch(() => {});
  }, [user]);

  if (loading) return <div className="mx-auto max-w-shelf px-4 py-8 text-mist">Carregando...</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-shelf px-4 py-8 text-mist">
        <a href="/login" className="text-ice underline">Entre</a> para acessar sua biblioteca.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shelf px-4 py-8">
      <h1 className="shelf-label">Minha biblioteca</h1>
      <div className="mb-6 flex gap-3 border-b border-hairline">
        <button onClick={() => setTab("favorites")} className={`pb-2 font-display text-body-sm ${tab === "favorites" ? "border-b-2 border-ice text-ice" : "text-mist"}`}>
          Favoritos {favorites.length > 0 && `(${favorites.length})`}
        </button>
        <button onClick={() => setTab("history")} className={`pb-2 font-display text-body-sm ${tab === "history" ? "border-b-2 border-ice text-ice" : "text-mist"}`}>
          Histórico {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {tab === "favorites" ? (
        favorites.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {favorites.map((anime) => <AnimeCard key={anime.id} anime={anime} />)}
          </div>
        ) : <p className="text-body-sm text-mist">Você ainda não favoritou nenhum anime.</p>
      ) : (
        history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item) => (
              <a key={item.episodeId} href={`/animes/${item.anime.slug}/${item.episode.number}`} className="flex items-center gap-4 border border-hairline bg-panel p-3 hover:border-ice">
                <div className="h-14 w-10 shrink-0 overflow-hidden bg-hairline">
                  {item.anime.coverImage && <img src={item.anime.coverImage} alt="" className="h-full w-full object-cover" />}
                </div>
                <div>
                  <p className="font-sans text-body font-medium text-ice">{item.anime.title}</p>
                  <p className="font-display text-caption text-mist">EP {item.episode.number} · {item.completed ? "Concluído" : "Em andamento"}</p>
                </div>
              </a>
            ))}
          </div>
        ) : <p className="text-body-sm text-mist">Seu histórico aparecerá aqui.</p>
      )}
    </div>
  );
}
