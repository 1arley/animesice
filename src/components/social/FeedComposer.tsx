"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/common/Avatar";
import { displayName } from "@/lib/displayName";
import type { Anime, SocialPost } from "@/types";

/**
 * FeedComposer — caixa "O que você está assistindo?" com autocomplete de
 * anime (debounce 350ms) e contador de caracteres. Só aparece logado.
 */
export function FeedComposer({
  onPosted,
}: {
  onPosted: (post: SocialPost) => void;
}) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [anime, setAnime] = useState<{ id: string; title: string } | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim() || anime) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.listAnimes(1, 6, search.trim());
        setResults(res.data ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, anime]);

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || posting) return;
    setPosting(true);
    setError("");
    try {
      const post = await api.createPost({
        content: content.trim(),
        animeId: anime?.id,
      });
      setContent("");
      setAnime(null);
      setSearch("");
      onPosted(post);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao publicar.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-hairline bg-panel p-4"
    >
      <div className="flex items-start gap-3">
        <Avatar name={displayName(user)} src={user.avatar} size={36} />
        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={3}
            className="field w-full resize-none"
            placeholder="O que você está assistindo?"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div ref={boxRef} className="relative">
              {anime ? (
                <span className="inline-flex items-center gap-2 border border-ice/40 bg-ice/10 px-3 py-1.5 font-mono text-caption text-ice">
                  {anime.title}
                  <button
                    type="button"
                    onClick={() => {
                      setAnime(null);
                      setSearch("");
                    }}
                    aria-label="Remover anime"
                    className="text-mist transition-colors hover:text-signal"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Mencionar anime…"
                    className="w-44 bg-transparent px-1 py-1.5 font-mono text-caption text-mist placeholder:text-mist-soft focus:text-ice focus:outline-none"
                  />
                  {open && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-64 border border-hairline bg-panel shadow-lg shadow-black/40">
                      {searching ? (
                        <p className="px-3 py-2 font-mono text-caption text-mist">
                          Buscando…
                        </p>
                      ) : results.length === 0 ? (
                        <p className="px-3 py-2 font-mono text-caption text-mist-soft">
                          Nada encontrado
                        </p>
                      ) : (
                        results.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setAnime({ id: a.id, title: a.title });
                              setSearch("");
                              setOpen(false);
                            }}
                            className="block w-full px-3 py-2 text-left font-mono text-body-sm text-mist transition-colors hover:bg-slate hover:text-ice"
                          >
                            {a.title}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <span className="ml-auto font-mono text-caption text-mist-soft">
              {content.length}/2000
            </span>
          </div>

          {error && <p className="mt-2 text-body-sm text-signal">{error}</p>}

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={posting || !content.trim()}
              className="btn-ice"
            >
              {posting ? "Publicando…" : "Postar"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
