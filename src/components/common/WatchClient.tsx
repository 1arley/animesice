"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { EpisodeLoadingState } from "@/components/common/EpisodeLoadingState";
import { api, ApiError, isProxyEmbed, type StreamSource } from "@/lib/api";
import type { Episode, Anime } from "@/types";
import { CommentSection } from "@/components/common/CommentSection";
import { CreateRoomButton } from "@/components/common/CreateRoomButton";

const VideoPlayer = dynamic(
  () => import("@/components/common/VideoPlayer").then((m) => m.VideoPlayer),
  { ssr: false, loading: () => <EpisodeLoadingState /> },
);

interface WatchClientProps {
  slug: string;
  number: number;
  initialEpisode: Episode & { anime: Anime };
}

export function WatchClient({
  slug,
  number,
  initialEpisode,
}: WatchClientProps) {
  const [episode, setEpisode] = useState<(Episode & { anime: Anime }) | null>(
    initialEpisode,
  );
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<StreamSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const loadSourceId = useRef(0);
  const recoveryAttempts = useRef(0);
  const resumeAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .getEpisode(slug, number)
      .then((ep) => {
        if (!cancelled) setEpisode(ep);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof ApiError ? e.message : "Erro ao carregar episódio.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [slug, number]);

  const loadSource = useCallback(
    async (refresh = false) => {
      const id = ++loadSourceId.current;
      setLoadingSource(true);
      setSourceError(null);
      setSource(null);
      try {
        const res = await api.streamSource(slug, number, refresh);
        if (id === loadSourceId.current) setSource(res);
      } catch (e) {
        if (id === loadSourceId.current) {
          setSourceError(
            e instanceof ApiError
              ? e.message
              : "Não foi possível obter o vídeo deste episódio.",
          );
        }
      } finally {
        if (id === loadSourceId.current) setLoadingSource(false);
      }
    },
    [slug, number],
  );

  const recoverPlayback = useCallback(
    (currentTime: number) => {
      if (recoveryAttempts.current >= 1 || loadingSource) return;
      recoveryAttempts.current += 1;
      resumeAt.current = currentTime;
      void loadSource(true);
    },
    [loadSource, loadingSource],
  );

  useEffect(() => {
    recoveryAttempts.current = 0;
    resumeAt.current = 0;
    void loadSource();
  }, [loadSource]);

  if (error) {
    return (
      <div>
        <p className="mb-3 text-body-sm text-signal">{error}</p>
        <Link href={`/animes/${slug}`} className="btn-ghost">
          Voltar ao anime
        </Link>
      </div>
    );
  }

  if (!episode) {
    return <p className="text-body-sm text-mist">Carregando...</p>;
  }

  return (
    <>
      <p className="mb-3">
        <Link
          href={`/animes/${slug}`}
          className="text-body-sm text-mist transition-colors hover:text-ice"
        >
          ← Todos os episódios
        </Link>
      </p>

      <h1 className="font-display text-display-lg text-snow">
        {episode.anime.title}
      </h1>
      <p className="mt-1 font-mono text-body-sm font-medium text-ice tabular-nums">
        EP {episode.number}
      </p>

      <div className="mt-4">
        {episode.embedUrl && isProxyEmbed(episode.embedUrl) ? (
          <VideoPlayer
            src=""
            embedUrl={episode.embedUrl}
            posterUrl={episode.thumbnailUrl ?? undefined}
            animeSlug={slug}
            episodeNumber={episode.number}
            animeTitle={episode.anime.title}
          />
        ) : sourceError ? (
          <p className="text-body-sm text-signal">{sourceError}</p>
        ) : loadingSource ? (
          <EpisodeLoadingState />
        ) : source ? (
          <VideoPlayer
            src={source.src}
            embedUrl={source.embedUrl}
            posterUrl={source.thumbnailUrl ?? episode.thumbnailUrl ?? undefined}
            animeSlug={slug}
            episodeNumber={episode.number}
            animeTitle={episode.anime.title}
            startAt={resumeAt.current}
            onPlaybackError={recoverPlayback}
          />
        ) : (
          <p className="text-body-sm text-mist">
            Vídeo não disponível para este episódio.
          </p>
        )}
      </div>

      <CreateRoomButton animeSlug={slug} episodeNumber={episode.number} />

      <CommentSection episodeId={episode.id} title="Discussão do episódio" />

      {/* Navegação de episódios — Peak-End Rule: melhor experiência no fim */}
      <EpisodeNavigation slug={slug} number={number} />
    </>
  );
}

/**
 * EpisodeNavigation — navegação entre episódios com visual atraente.
 * Peak-End Rule: usuários lembram do fim da experiência.
 * Lei de Proximidade: botões agrupados por função (anterior/próximo).
 */
function EpisodeNavigation({ slug, number }: { slug: string; number: number }) {
  const [adjacent, setAdjacent] = useState<{
    previous: number | null;
    next: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getEpisodes(slug)
      .then((episodes) => {
        if (cancelled) return;
        const numbers = [...new Set(episodes.map((ep) => ep.number))].sort(
          (a, b) => a - b,
        );
        setAdjacent({
          previous: numbers.filter((value) => value < number).at(-1) ?? null,
          next: numbers.find((value) => value > number) ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setAdjacent({ previous: null, next: null });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, number]);

  if (adjacent && adjacent.previous === null && adjacent.next === null)
    return null;

  return (
    <div className="reveal mt-6 border-t border-hairline pt-6">
      <h3 className="mb-4 font-mono text-caption uppercase tracking-wider text-mist">
        Navegar entre episódios
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Episódio anterior */}
        {adjacent?.previous != null ? (
          <Link
            href={`/animes/${slug}/${adjacent.previous}`}
            className="group flex items-center gap-3 rounded-md border border-hairline bg-panel p-3 transition-all duration-200 hover:border-ice/40 hover:bg-ice/5"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-mist transition-colors group-hover:text-ice"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <div className="min-w-0">
              <p className="font-mono text-caption text-mist">
                Episódio anterior
              </p>
              <p className="truncate font-sans text-body-sm font-medium text-snow transition-colors group-hover:text-ice">
                EP {adjacent.previous}
              </p>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {/* Próximo episódio */}
        {adjacent === null ? (
          <div className="flex items-center justify-center rounded-md border border-hairline bg-panel p-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-ice border-t-transparent" />
            <span className="ml-2 font-mono text-caption text-mist">
              Verificando...
            </span>
          </div>
        ) : adjacent.next != null ? (
          <Link
            href={`/animes/${slug}/${adjacent.next}`}
            className="group flex items-center justify-end gap-3 rounded-md border border-hairline bg-panel p-3 transition-all duration-200 hover:border-ice/40 hover:bg-ice/5"
          >
            <div className="min-w-0 text-right">
              <p className="font-mono text-caption text-mist">
                Próximo episódio
              </p>
              <p className="truncate font-sans text-body-sm font-medium text-snow transition-colors group-hover:text-ice">
                EP {adjacent.next}
              </p>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-mist transition-colors group-hover:text-ice"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        ) : (
          <div className="flex items-center justify-center rounded-md border border-hairline bg-panel p-3">
            <span className="font-mono text-caption text-mist">
              Último episódio
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
