"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { EpisodeLoadingState } from "@/components/common/EpisodeLoadingState";
import { api, ApiError, isProxyEmbed, type StreamSource } from "@/lib/api";
import { CrystalMotion } from "@/components/animesice/CrystalMotion";
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
  /** Source já resolvido via SSR pre-fetch — renderiza instantaneamente. */
  initialSource?: { src: string; embedUrl?: string; thumbnailUrl?: string } | { jobId: string } | null;
}

/** Máximo de tentativas de polling para extração assíncrona (~55s) */
const MAX_POLL_ATTEMPTS = 20;
/** Intervalo base de polling (ms) — rápido para capturar extrações recentes */
const POLL_INTERVAL_BASE = 300;
/** Fator de backoff — cresce suave até cap de 5s */
const POLL_BACKOFF = 1.25;
/** Cap máximo de intervalo de polling (ms) */
const POLL_MAX_INTERVAL = 5_000;

export function WatchClient({
  slug,
  number,
  initialEpisode,
  initialSource: initialSourceProp,
}: WatchClientProps) {
  const episode = initialEpisode;
  const [source, setSource] = useState<StreamSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionElapsed, setExtractionElapsed] = useState(0);
  const extractionStart = useRef(0);
  const loadSourceId = useRef(0);
  const recoveryAttempts = useRef(0);
  const resumeAt = useRef(0);

  // Timer de extração — mostra segundos enquanto o backend processa
  useEffect(() => {
    if (!extracting) { setExtractionElapsed(0); return; }
    extractionStart.current = Date.now();
    const id = setInterval(() => {
      setExtractionElapsed(Math.floor((Date.now() - extractionStart.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [extracting]);

  const loadSource = useCallback(
    async (refresh = false) => {
      const id = ++loadSourceId.current;
      setLoadingSource(true);
      setSourceError(null);
      setSource(null);
      setExtracting(false);
      try {
        const res = await api.streamSource(slug, number, refresh);
        if (id === loadSourceId.current) {
          setSource(res);
          api._sourceCache.set(slug, number, res);
        }
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

  /**
   * Tenta extração assíncrona com SSE (primário) e fallback para polling.
   *
   * Prioridade de resolução:
   * 1. initialSource (SSR pre-fetch) — se já é StreamSource, renderiza direto
   * 2. sessionStorage cache — hit = instantâneo
   * 3. SSE — detecção instantânea de conclusão
   * 4. Polling — fallback quando SSE falha ou não suportado
   */
  const loadSourceAsync = useCallback(async () => {
    const id = ++loadSourceId.current;
    setLoadingSource(true);
    setSourceError(null);
    setSource(null);

    // 1. Source vindo de SSR pre-fetch — renderiza imediatamente
    if (initialSourceProp && "src" in initialSourceProp && id === loadSourceId.current) {
      setSource(initialSourceProp as StreamSource);
      api._sourceCache.set(slug, number, initialSourceProp as StreamSource);
      setLoadingSource(false);
      return;
    }

    try {
      // 2. Check client-side cache (sessionStorage, 1h TTL)
      const cached = api._sourceCache.get(slug, number);
      if (cached && id === loadSourceId.current) {
        setSource(cached);
        setLoadingSource(false);
        return;
      }

      const res = await api.streamSourceAsync(slug, number);

      // Se já tem o source direto (vídeo existia), retorna
      if ("src" in res && id === loadSourceId.current) {
        setSource(res as StreamSource);
        api._sourceCache.set(slug, number, res as StreamSource);
        setLoadingSource(false);
        return;
      }

      // jobId = extração assíncrona em andamento
      if ("jobId" in res && id === loadSourceId.current) {
        setExtracting(true);
        const jobId = (res as { jobId: string }).jobId;

        // 3. Tenta SSE — detecção instantânea de conclusão
        let sseResolved = false;
        const cleanupSSERef = { fn: null as (() => void) | null };

        const ssePromise = new Promise<boolean>((resolve) => {
          cleanupSSERef.fn = api.streamSourceSSE(slug, number, {
            onSource: (source) => {
              if (id !== loadSourceId.current || sseResolved) return;
              sseResolved = true;
              setSource(source);
              api._sourceCache.set(slug, number, source);
              setExtracting(false);
              setLoadingSource(false);
              resolve(true);
            },
            onFailed: () => {
              if (id !== loadSourceId.current || sseResolved) return;
              sseResolved = true;
              setSourceError("Extração falhou. Tente novamente.");
              setExtracting(false);
              setLoadingSource(false);
              resolve(true);
            },
            onTimeout: () => {
              if (sseResolved) return;
              resolve(false);
            },
            onError: () => {
              if (sseResolved) return;
              resolve(false);
            },
          });
        });

        // Espera SSE por até 2s — se não resolveu, começa polling em paralelo
        const sseFastResolve = Promise.race([
          ssePromise,
          new Promise<boolean>((r) => setTimeout(() => r(false), 2_000)),
        ]);

        const sseHadResult = await sseFastResolve;
        if (sseHadResult || sseResolved) return; // SSE resolveu, não precisa de polling

        // 4. SSE não resolveu rápido — fallback para polling com backoff
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
          if (id !== loadSourceId.current) {
            cleanupSSERef.fn?.();
            return;
          }

          const delay = Math.min(
            POLL_INTERVAL_BASE * Math.pow(POLL_BACKOFF, attempt),
            POLL_MAX_INTERVAL,
          );
          await new Promise((r) => setTimeout(r, delay));

          if (id !== loadSourceId.current) {
            cleanupSSERef.fn?.();
            return;
          }

          try {
            const poll = await api.pollExtractionJob(slug, number, jobId);

            if ("src" in poll && id === loadSourceId.current) {
              const src = poll as StreamSource;
              setSource(src);
              api._sourceCache.set(slug, number, src);
              setExtracting(false);
              setLoadingSource(false);
              cleanupSSERef.fn?.();
              return;
            }

            if ("status" in poll) {
              const status = poll as { status: string; error?: string };
              if (status.status === "failed") {
                if (id === loadSourceId.current) {
                  setSourceError(
                    status.error ?? "Extração falhou. Tente novamente.",
                  );
                  setExtracting(false);
                  setLoadingSource(false);
                }
                cleanupSSERef.fn?.();
                return;
              }
              // completed — o backend já retorna o source no poll (sem round-trip)
              if (status.status === "completed") {
                // poll pode conter src diretamente ou ser status {completed, result:null}
                // Em ambos os casos, tenta getSource síncrono como fallback
                const source = await api.streamSource(slug, number);
                if (id === loadSourceId.current) {
                  setSource(source);
                  api._sourceCache.set(slug, number, source);
                  setExtracting(false);
                  setLoadingSource(false);
                }
                cleanupSSERef.fn?.();
                return;
              }
            }
          } catch {
            // Continua polling em caso de erro de rede
          }
        }

        cleanupSSERef.fn?.();

        // Esgotou tentativas — fallback para modo síncrono
        if (id === loadSourceId.current) {
          setExtracting(false);
          await loadSource();
        }
      }
    } catch (e) {
      if (id === loadSourceId.current) {
        // Fallback: tenta o modo síncrono normal
        try {
          const res = await api.streamSource(slug, number);
          if (id === loadSourceId.current) {
            setSource(res);
            api._sourceCache.set(slug, number, res);
          }
        } catch {
          if (id === loadSourceId.current) {
            setSourceError(
              e instanceof ApiError
                ? e.message
                : "Não foi possível obter o vídeo deste episódio.",
            );
          }
        }
      }
    } finally {
      if (id === loadSourceId.current) setLoadingSource(false);
    }
  }, [slug, number, loadSource, initialSourceProp]);

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
    void loadSourceAsync();
  }, [loadSourceAsync]);

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
        ) : extracting ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 border border-hairline bg-panel px-6 py-14 text-center">
            <CrystalMotion mode="loop" size={88} />
            <p className="text-body font-medium text-snow">
              <span
                className="mr-2 inline-block h-2 w-2 animate-blink bg-ice align-middle"
                aria-hidden="true"
              />
              Preparando episódio…
            </p>
            <p className="max-w-md text-body-sm text-mist">
              Extraindo vídeo da fonte. Às vezes demora de 3 a 8 segundos —
              vai pegando uma pipoca que o sinal já tá chegando!
            </p>
            {extractionElapsed > 3 && (
              <p
                aria-hidden="true"
                className="mt-1 font-mono text-caption uppercase tracking-wider text-ice tabular-nums"
              >
                {extractionElapsed}s / até 8s
              </p>
            )}
            {extractionElapsed > 8 && (
              <div role="status" className="mt-2 flex flex-col items-center gap-3">
                <p className="max-w-md text-body-sm text-signal">
                  Hmm, tá demorando mais que o esperado. O servidor de vídeo
                  pode estar lento — recarrega a página e tenta de novo:
                </p>
                <button
                  type="button"
                  className="btn-ice"
                  onClick={() => window.location.reload()}
                >
                  ↻ Recarregar página
                </button>
              </div>
            )}
          </div>
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
  const prefetched = useRef(new Set<number>());

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

  /**
   * Prefetch de stream source ao hover: aquece o cache do backend
   * para que a próxima navegação já tenha o vídeo pronto.
   */
  const prefetchEpisode = useCallback(
    (episodeNumber: number) => {
      if (prefetched.current.has(episodeNumber)) return;
      prefetched.current.add(episodeNumber);
      // Fire-and-forget: não bloqueia o UI, só aquece o cache do backend
      api.streamSourceAsync(slug, episodeNumber).catch(() => undefined);
    },
    [slug],
  );

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
            onMouseEnter={() => prefetchEpisode(adjacent.previous!)}
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
            onMouseEnter={() => prefetchEpisode(adjacent.next!)}
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
