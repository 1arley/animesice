"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { VideoPlayer } from "@/components/common/VideoPlayer";
import { AdSlot } from "@/components/ads/AdSlot";
import { api, ApiError, isProxyEmbed, type StreamSource } from "@/lib/api";
import type { Episode, Anime } from "@/types";
import { CommentSection } from "@/components/common/CommentSection";
import { CreateRoomButton } from "@/components/common/CreateRoomButton";

export default function WatchPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number: numberParam } = use(params);
  const number = Number(numberParam);
  const valid = Boolean(slug) && !Number.isNaN(number);

  const [episode, setEpisode] = useState<(Episode & { anime: Anime }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<StreamSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const loadSourceId = useRef(0);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getEpisode(slug, number)
      .then((ep) => {
        if (!cancelled) setEpisode(ep);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Erro ao carregar episódio.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [valid, slug, number]);

  const loadSource = useCallback(async () => {
    if (!valid) return;
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
  }, [valid, slug, number]);

  // Auto-carrega o source ao montar/trocar episódio — player pronto sem clique.
  useEffect(() => {
    if (!valid) return;
    loadSource();
  }, [loadSource, valid]);

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      {loading ? (
        <p className="text-body-sm text-mist">Carregando...</p>
      ) : error ? (
        <div>
          <p className="mb-3 text-body-sm text-signal">{error}</p>
          <a href={`/animes/${slug}`} className="btn-ghost">
            Voltar ao anime
          </a>
        </div>
      ) : episode ? (
        <>
          <p className="mb-3">
            <a
              href={`/animes/${slug}`}
              className="text-body-sm text-mist transition-colors hover:text-ice"
            >
              ← Todos os episódios
            </a>
          </p>

          <h1 className="font-display text-display-lg text-snow">
            {episode.anime.title}
          </h1>
          <p className="mt-1 font-mono text-body-sm font-medium text-ice tabular-nums">
            EP {episode.number}
          </p>

          <div className="mt-4">
            {/* Embed externo via proxy interno do backend (sem XFO/CSP). */}
            {episode.embedUrl && isProxyEmbed(episode.embedUrl) ? (
              <VideoPlayer
                src={""}
                embedUrl={episode.embedUrl}
                posterUrl={episode.thumbnailUrl ?? undefined}
                animeSlug={slug}
                episodeNumber={episode.number}
              />
            ) : sourceError ? (
              <p className="text-body-sm text-signal">{sourceError}</p>
            ) : loadingSource ? (
              <p className="text-body-sm text-mist">Carregando vídeo...</p>
            ) : source ? (
              <VideoPlayer
                src={source.src}
                posterUrl={source.thumbnailUrl ?? episode.thumbnailUrl ?? undefined}
                animeSlug={slug}
                episodeNumber={episode.number}
              />
            ) : (
              <p className="text-body-sm text-mist">
                Vídeo não disponível para este episódio.
              </p>
            )}
          </div>

          <AdSlot
            slot="0000000004"
            format="horizontal"
            className="mt-4 min-h-[90px]"
          />

          <CreateRoomButton animeSlug={slug} episodeNumber={episode.number} />

          {/* Próximo episódio */}
          {number != null && !Number.isNaN(number) && (
            <NextEpisode slug={slug} number={number} episodeCount={episode.anime.episodeCount} />
          )}

          <CommentSection episodeId={episode.id} title="Discussão do episódio" />
        </>
      ) : (
        <p className="text-body-sm text-mist">Episódio não encontrado.</p>
      )}
    </div>
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
    // Último episódio conhecido: não consulta o próximo (evita 404 desnecessário
    // p/ filmes/séries completas). Quando episodeCount é desconhecido, o 404 da
    // consulta abaixo é tratado como "não há próximo" — nunca como falha.
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
      <a
        href={`/animes/${slug}/${number + 1}`}
        className="btn-ghost"
      >
        Próximo episódio →
      </a>
    </p>
  );
}