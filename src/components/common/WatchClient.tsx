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

export function WatchClient({ slug, number, initialEpisode }: WatchClientProps) {
  const [episode, setEpisode] = useState<(Episode & { anime: Anime }) | null>(initialEpisode);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<StreamSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const loadSourceId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .getEpisode(slug, number)
      .then((ep) => {
        if (!cancelled) setEpisode(ep);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Erro ao carregar episódio.");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, number]);

  const loadSource = useCallback(async () => {
    const id = ++loadSourceId.current;
    setLoadingSource(true);
    setSourceError(null);
    setSource(null);
    try {
      const res = await api.streamSource(slug, number);
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
  }, [slug, number]);

  useEffect(() => {
    loadSource();
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
            posterUrl={source.thumbnailUrl ?? episode.thumbnailUrl ?? undefined}
            animeSlug={slug}
            episodeNumber={episode.number}
            animeTitle={episode.anime.title}
          />
        ) : (
          <p className="text-body-sm text-mist">
            Vídeo não disponível para este episódio.
          </p>
        )}
      </div>

      <CreateRoomButton animeSlug={slug} episodeNumber={episode.number} />

      <NextEpisode slug={slug} number={number} episodeCount={episode.anime.episodeCount} />

      <CommentSection episodeId={episode.id} title="Discussão do episódio" />
    </>
  );
}

function NextEpisode({
  slug,
  number,
  episodeCount,
}: {
  slug: string;
  number: number;
  episodeCount?: number | null;
}) {
  const [hasNext, setHasNext] = useState<boolean | null>(null);
  useEffect(() => {
    if (episodeCount != null && number >= episodeCount) {
      setHasNext(false);
      return;
    }
    api
      .getEpisode(slug, number + 1)
      .then(() => setHasNext(true))
      .catch(() => setHasNext(false));
  }, [slug, number, episodeCount]);
  if (hasNext === null || !hasNext) return null;
  return (
    <p className="mt-3">
      <Link href={`/animes/${slug}/${number + 1}`} className="btn-ghost">
        Próximo episódio →
      </Link>
    </p>
  );
}
