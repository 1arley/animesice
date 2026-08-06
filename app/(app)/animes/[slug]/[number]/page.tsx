"use client";

import { useEffect, useState } from "react";
import { VideoPlayer } from "@/components/common/VideoPlayer";
import { AdSlot } from "@/components/ads/AdSlot";
import { api, ApiError, isProxyEmbed, type StreamSource } from "@/lib/api";
import type { Episode, Anime } from "@/types";
import { CommentSection } from "@/components/common/CommentSection";
import { EpisodeChat } from "@/components/common/EpisodeChat";

export default function WatchPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const [slug, setSlug] = useState("");
  const [number, setNumber] = useState<number | null>(null);

  useEffect(() => {
    params.then((p) => {
      setSlug(p.slug);
      setNumber(Number(p.number));
    });
  }, [params]);

  const [episode, setEpisode] = useState<(Episode & { anime: Anime }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<StreamSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);

  useEffect(() => {
    if (!slug || number == null) return;
    setLoading(true);
    api
      .getEpisode(slug, number)
      .then((ep) => setEpisode(ep))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar episódio."))
      .finally(() => setLoading(false));
  }, [slug, number]);

  async function loadSource() {
    if (!slug || number == null) return;
    setLoadingSource(true);
    setSourceError(null);
    setSource(null);
    try {
      const res = await api.streamSource(slug, number);
      setSource(res);
    } catch (e) {
      setSourceError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível obter o vídeo deste episódio.",
      );
    } finally {
      setLoadingSource(false);
    }
  }

  // Auto-carrega o source ao montar/trocar episódio — player pronto sem clique.
  useEffect(() => {
    if (!slug || number == null) return;
    loadSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, number]);

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

              <h1 className="font-display text-display-lg text-ink">
                {episode.anime.title}
              </h1>
              <p className="mt-1 font-display text-body-sm font-medium text-ice tabular-nums">
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

               <EpisodeChat animeSlug={slug} episodeNumber={episode.number} />

               {/* Próximo episódio */}
               {number != null && <NextEpisode slug={slug} number={number} />}

               <CommentSection episodeId={episode.id} title="Discussão do episódio" />
             </>
          ) : (
            <p className="text-body-sm text-mist">Episódio não encontrado.</p>
          )}
    </div>
  );
}

function NextEpisode({ slug, number }: { slug: string; number: number }) {
  const [hasNext, setHasNext] = useState<boolean | null>(null);
  useEffect(() => {
    api
      .getEpisode(slug, number + 1)
      .then(() => setHasNext(true))
      .catch(() => setHasNext(false));
  }, [slug, number]);
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
