"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Modal as SharedModal } from "@/components/common/Modal";
import type { WatchStatus } from "@/types";

const STATUS_LABELS: Record<WatchStatus, string> = {
  PLANNING: "Planejo ver",
  WATCHING: "Assistindo",
  COMPLETED: "Concluído",
  ON_HOLD: "Em pausa",
  DROPPED: "Dropado",
};

interface AnimeListButtonProps {
  slug: string;
  className?: string;
}

/**
 * Botão "Adicionar à lista pessoal" — abre modal para escolher status,
 * nota, número de episódios assistidos, notas privadas e privacidade.
 * Lê o estado atual via `checkAnimeList` ao montar.
 */
export function AnimeListButton({ slug, className }: AnimeListButtonProps) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [inList, setInList] = useState(false);
  const [existing, setExisting] = useState<{
    status: WatchStatus;
    score: number | null;
    episodesWatched: number;
    notes: string | null;
    private: boolean;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [status, setStatus] = useState<WatchStatus>("PLANNING");
  const [score, setScore] = useState<string>("");
  const [episodesWatched, setEpisodesWatched] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [isPrivate, setIsPrivate] = useState(false);
  const userTouchedRef = useRef(false);

  async function refreshState() {
    setChecking(true);
    try {
      const res = await api.checkAnimeList(slug);
      setInList(res.inList);
      if (res.status) {
        setStatus(res.status as WatchStatus);
      }
    } catch {
      // silencioso — usuário pode não estar logado
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    refreshState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, slug]);

  function openModal() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: {
        status: WatchStatus;
        score?: number;
        episodesWatched?: number;
        notes?: string;
        private?: boolean;
      } = { status };
      if (score !== "") body.score = parseFloat(score);
      else if (inList) body.score = undefined;
      if (episodesWatched !== "") body.episodesWatched = parseInt(episodesWatched, 10);
      else body.episodesWatched = 0;
      if (notes.trim() !== "") body.notes = notes;
      else if (inList) body.notes = "";
      body.private = isPrivate;

      await api.upsertAnimeList(slug, body);
      await refreshState();
      setOpen(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Remover este anime da sua lista?")) return;
    setSaving(true);
    setError(null);
    try {
      await api.removeAnimeList(slug);
      await refreshState();
      setOpen(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao remover.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <Link href="/login" className={className ?? "btn-ghost"}>
        + Lista
      </Link>
    );
  }

  if (checking) {
    return (
      <button disabled className={className ?? "btn-ghost opacity-50"}>
        Lista...
      </button>
    );
  }

  return (
    <>
      <button
        onClick={openModal}
        className={
          inList
            ? `btn-ice ${className ?? ""}`.trim()
            : `btn-ghost ${className ?? ""}`.trim()
        }
        title={inList ? "Editar na lista" : "Adicionar à lista"}
      >
        {inList ? `✓ ${STATUS_LABELS[status]}` : "+ Lista"}
      </button>

      {open && (
        <SharedModal open={open} onClose={() => setOpen(false)} title={inList ? "Editar na lista" : "Adicionar à lista"}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="anime-list-status" className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
                Status
              </label>
              <select
                id="anime-list-status"
                value={status}
                onChange={(e) => {
                  userTouchedRef.current = true;
                  setStatus(e.target.value as WatchStatus);
                }}
                className="field"
              >
                {(Object.keys(STATUS_LABELS) as WatchStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="anime-list-score" className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
                  Nota (0-10)
                </label>
                <input
                  id="anime-list-score"
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={score}
                  onChange={(e) => {
                    userTouchedRef.current = true;
                    setScore(e.target.value);
                  }}
                  placeholder="—"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="anime-list-episodes" className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
                  Episódios assistidos
                </label>
                <input
                  id="anime-list-episodes"
                  type="number"
                  min="0"
                  value={episodesWatched}
                  onChange={(e) => {
                    userTouchedRef.current = true;
                    setEpisodesWatched(e.target.value);
                  }}
                  placeholder="0"
                  className="field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="anime-list-notes" className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
                Notas (privadas)
              </label>
              <textarea
                id="anime-list-notes"
                value={notes}
                onChange={(e) => {
                  userTouchedRef.current = true;
                  setNotes(e.target.value);
                }}
                rows={3}
                placeholder="Sua nota pessoal..."
                className="field"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => {
                  userTouchedRef.current = true;
                  setIsPrivate(e.target.checked);
                }}
                className="h-4 w-4 accent-ice"
              />
              <span className="text-body-sm text-snow">
                Lista privada (só você vê)
              </span>
            </label>

            {error && (
              <div className="border border-signal/40 bg-signal/10 p-3 text-caption text-signal">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="btn-ice">
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                Cancelar
              </button>
              {inList && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={saving}
                  className="btn-danger ml-auto"
                >
                  Remover
                </button>
              )}
            </div>
          </form>
        </SharedModal>
      )}
    </>
  );
}
