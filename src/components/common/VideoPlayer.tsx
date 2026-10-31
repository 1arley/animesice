"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type Hls from "hls.js";
import { safeImageSrc } from "@/lib/url";
import { isProxyEmbed, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface VideoPlayerProps {
  /** URL da mídia. Já vem envolvida pelo proxy de mídia backend
   *  (/embed/media?url=...) p/ contornar anti-hotlinking + IP-vínculo. */
  src: string;
  posterUrl?: string;
  /** URL de iframe interno (proxy). Se presente e interna, renderiza iframe.
   *  Embed externo direto NÃO é mais suportado (anúncios + XFO). */
  embedUrl?: string | null;
  /** Para rastreamento de progresso */
  animeSlug?: string;
  episodeNumber?: number;
  nextEpisode?: number | null;
  /** Título para acessibilidade do iframe */
  animeTitle?: string;
  /** Retoma neste ponto depois de uma recuperação de source. */
  startAt?: number;
  /** Disparado apenas para erro fatal do elemento de vídeo. */
  onPlaybackError?: (currentTime: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
}

/** Embed do YouTube (youtube-nocookie.com/embed/<id>): fonte sem .mp4
 *  server-side (YouTube bloqueia IPs datacenter). Reproduz via iframe no
 *  browser do usuário — mesmo mecanismo que a fonte (meusanimes) usa. */
export function isYouTubeEmbed(url: string): boolean {
  return /youtube(?:-nocookie)?\.com\/(?:embed|watch|shorts)\//i.test(url);
}

/**
 * Detecta player Blogger (blogger.com/video.g?token=...).
 * Quando o backend não consegue resolver o token para .mp4 via Chromium,
 * devolve o token embrulhado em /embed/proxy — o iframe sandboxed não
 * consegue reproduzir (CSP impede requests same-origin ao googlevideo).
 */
export function isBloggerEmbed(url: string): boolean {
  if (/blogger\.com\/video\.g\?token=/i.test(url)) return true;
  try {
    if (url.includes("/embed/proxy?")) {
      const u = new URL(url);
      const inner = u.searchParams.get("url");
      if (inner && /blogger\.com\/video\.g\?token=/i.test(inner)) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function VideoPlayer({
  src,
  posterUrl,
  embedUrl,
  animeSlug,
  episodeNumber,
  nextEpisode,
  animeTitle,
  startAt,
  onPlaybackError,
  onTimeUpdate,
}: VideoPlayerProps) {
  const bloggerSource =
    embedUrl && isBloggerEmbed(embedUrl)
      ? embedUrl
      : src && isBloggerEmbed(src)
        ? src
        : null;

  if (bloggerSource) {
    return (
      <BloggerFallback
        onRetry={() => onPlaybackError?.(0)}
        animeTitle={animeTitle}
        episodeNumber={episodeNumber}
      />
    );
  }

  if (embedUrl && isProxyEmbed(embedUrl)) {
    return (
      <EmbedPlayer
        embedUrl={embedUrl}
        animeSlug={animeSlug}
        episodeNumber={episodeNumber}
        nextEpisode={nextEpisode}
        animeTitle={animeTitle}
      />
    );
  }
  if (src && isYouTubeEmbed(src)) {
    return (
      <EmbedPlayer
        embedUrl={src}
        animeSlug={animeSlug}
        episodeNumber={episodeNumber}
        nextEpisode={nextEpisode}
        animeTitle={animeTitle}
      />
    );
  }
  return (
    <NativeVideoPlayer
      src={src}
      posterUrl={posterUrl}
      animeSlug={animeSlug}
      episodeNumber={episodeNumber}
      nextEpisode={nextEpisode}
      animeTitle={animeTitle}
      startAt={startAt}
      onPlaybackError={onPlaybackError}
      onTimeUpdate={onTimeUpdate}
    />
  );
}

/** Modo embed interno (iframe via proxy do backend): sem XFO, carrega direto. */
function EmbedPlayer({
  embedUrl,
  animeSlug,
  episodeNumber,
  nextEpisode,
  animeTitle,
}: {
  embedUrl: string;
  animeSlug?: string;
  episodeNumber?: number;
  nextEpisode?: number | null;
  animeTitle?: string;
}) {
  const title =
    animeTitle && episodeNumber != null
      ? `${animeTitle} — Episódio ${episodeNumber}`
      : "Player de vídeo";

  useEffect(() => {
    if (!animeSlug || episodeNumber == null) return;
    fetch(`${API_URL}/episode/${animeSlug}/${episodeNumber}/views`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, [animeSlug, episodeNumber]);

  return (
    <div className="relative">
      {animeSlug && nextEpisode != null && (
        <Link
          href={`/animes/${animeSlug}/${nextEpisode}`}
          aria-label={`Pular para o episódio ${nextEpisode}`}
          className="absolute right-3 top-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 bg-ink/85 px-3 font-mono text-caption font-medium text-snow shadow-lg backdrop-blur-sm transition-colors hover:border-ice/60 hover:text-ice focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice"
        >
          Próximo episódio
          <span aria-hidden="true">›</span>
        </Link>
      )}
      <iframe
        src={embedUrl}
        title={title}
        allowFullScreen
        className="video-frame"
        style={{ border: 0 }}
      />
    </div>
  );
}

/**
 * Fallback para fontes Blogger: quando o backend não consegue resolver o token
 * para .mp4 via Chromium, o player iframe sandboxed não funciona (CSP bloqueia
 * requests ao googlevideo). Mostra mensagem explicativa + botão de retry que
 * dispara re-extração.
 */
function BloggerFallback({
  onRetry,
  animeTitle,
  episodeNumber,
}: {
  onRetry: () => void;
  animeTitle?: string;
  episodeNumber?: number;
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    setRetrying(true);
    onRetry();
  }, [onRetry]);

  return (
    <div className="video-frame flex flex-col items-center justify-center gap-4 text-center">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-mist"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </svg>
      <div>
        <p className="text-body-sm text-snow font-medium">
          Vídeo indisponível no momento
        </p>
        <p className="mt-1 text-caption text-mist">
          A fonte está sendo re-extraída. Tente novamente em alguns segundos.
        </p>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        disabled={retrying}
        className="btn-ghost"
      >
        {retrying ? "Re-extraindo..." : "Tentar novamente"}
      </button>
    </div>
  );
}

function NativeVideoPlayer({
  src,
  posterUrl,
  animeSlug,
  episodeNumber,
  nextEpisode,
  animeTitle,
  startAt,
  onPlaybackError,
  onTimeUpdate,
}: {
  src: string;
  posterUrl?: string;
  animeSlug?: string;
  episodeNumber?: number;
  nextEpisode?: number | null;
  animeTitle?: string;
  startAt?: number;
  onPlaybackError?: (currentTime: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const [fatalError, setFatalError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [watchToast, setWatchToast] = useState(0);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (nextEpisodeCountdown === null || !animeSlug || nextEpisode == null) return;
    if (nextEpisodeCountdown === 0) {
      router.push(`/animes/${animeSlug}/${nextEpisode}`);
      return;
    }
    const timer = window.setTimeout(
      () =>
        setNextEpisodeCountdown((countdown) =>
          countdown === null ? null : countdown - 1,
        ),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [animeSlug, nextEpisode, nextEpisodeCountdown, router]);

  useEffect(() => {
    if (!watchToast) return;
    const timer = setTimeout(() => setWatchToast(0), 4000);
    return () => clearTimeout(timer);
  }, [watchToast]);

  const safeSrc = safeImageSrc(src) ?? src;
  const safePoster = safeImageSrc(posterUrl, animeSlug, episodeNumber);
  const isM3u8 = safeSrc.toLowerCase().includes(".m3u8");

  const onPlaybackErrorRef = useRef(onPlaybackError);
  useEffect(() => {
    onPlaybackErrorRef.current = onPlaybackError;
  }, [onPlaybackError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setFatalError(false);

    let recoveryRequested = false;
    const requestRecovery = () => {
      if (recoveryRequested) return;
      recoveryRequested = true;
      setFatalError(true);
      onPlaybackErrorRef.current?.(video.currentTime || startAt || 0);
    };

    // Certas CDNs/proxies não encerram a resposta quando a URL assinada
    // expirou. Nesse cenário o elemento não dispara `error`: permanece sem
    // metadata e o botão de play fica desabilitado. O watchdog transforma a
    // falha silenciosa no mesmo refresh forçado usado para erros explícitos.
    const metadataWatchdog = window.setTimeout(() => {
      if (video.readyState === HTMLMediaElement.HAVE_NOTHING) requestRecovery();
    }, 10_000);
    const clearMetadataWatchdog = () => window.clearTimeout(metadataWatchdog);

    const resume = () => {
      clearMetadataWatchdog();
      if (startAt && Number.isFinite(startAt) && video.duration > startAt) {
        video.currentTime = startAt;
      }
    };
    const fatal = requestRecovery;
    video.addEventListener("loadedmetadata", resume);
    video.addEventListener("error", fatal);

    if (!isM3u8) {
      video.src = safeSrc;
      return () => {
        clearMetadataWatchdog();
        video.removeEventListener("loadedmetadata", resume);
        video.removeEventListener("error", fatal);
        video.removeAttribute("src");
        video.load();
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = safeSrc;
      return () => {
        clearMetadataWatchdog();
        video.removeEventListener("loadedmetadata", resume);
        video.removeEventListener("error", fatal);
        video.removeAttribute("src");
        video.load();
      };
    }

    let hls: Hls | null = null;
    let destroyed = false;

    import("hls.js")
      .then(({ default: HlsCtor }) => {
        if (destroyed) return;
        if (!HlsCtor || !HlsCtor.isSupported()) {
          video.src = safeSrc;
          return;
        }
        hls = new HlsCtor({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          startFragPrefetch: true,
        });

        hls.on(HlsCtor.Events.ERROR, (_event, data) => {
          if (destroyed) return;
          if (data.fatal) {
            switch (data.type) {
              case HlsCtor.ErrorTypes.NETWORK_ERROR:
                hls?.startLoad();
                break;
              case HlsCtor.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                setFatalError(true);
                onPlaybackErrorRef.current?.(video.currentTime || startAt || 0);
                break;
            }
          }
        });

        hls.loadSource(safeSrc);
        hls.attachMedia(video);
      })
      .catch(() => {
        if (destroyed) return;
        video.src = safeSrc;
      });

    return () => {
      clearMetadataWatchdog();
      video.removeEventListener("loadedmetadata", resume);
      video.removeEventListener("error", fatal);
      destroyed = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
      video.removeAttribute("src");
      video.load();
    };
  }, [safeSrc, isM3u8, startAt, retryAttempt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !animeSlug || episodeNumber == null) return;

    let viewsSent = false;
    let progressTimer: ReturnType<typeof setInterval> | null = null;

    async function sendProgress(
      progress: number,
      duration: number,
      completed?: boolean,
    ) {
      if (!user) return;
      try {
        const res = await fetch(
          `${API_URL}/watch-history/${animeSlug}/${episodeNumber}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              progress: Math.floor(progress),
              duration: Math.floor(duration),
              completed,
            }),
          },
        );
        if (res.ok) {
          const data = (await res.json().catch(() => null)) as {
            watchCredited?: number;
          } | null;
          if (data?.watchCredited) setWatchToast(data.watchCredited);
        }
      } catch {
        // silent
      }
    }

    function onPlay() {
      setNextEpisodeCountdown(null);
      if (!viewsSent) {
        viewsSent = true;
        fetch(`${API_URL}/episode/${animeSlug}/${episodeNumber}/views`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
      }
      progressTimer = setInterval(() => {
        if (video && video.duration > 0) {
          sendProgress(video.currentTime, video.duration);
        }
      }, 15000);
    }

    function onPause() {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (video && video.duration > 0) {
        sendProgress(video.currentTime, video.duration);
      }
    }

    function onEnded() {
      if (nextEpisode != null) setNextEpisodeCountdown(5);
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (video && video.duration > 0) {
        sendProgress(video.duration, video.duration, true);
      }
    }

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [animeSlug, episodeNumber, nextEpisode, user, retryAttempt]);

  const retry = useCallback(() => {
    setFatalError(false);
    // O estado de erro desmonta o <video>, portanto o ref ainda está nulo
    // neste clique. A tentativa força o efeito da fonte a rodar novamente
    // depois que o elemento for remontado.
    setRetryAttempt((attempt) => attempt + 1);
  }, []);

  if (fatalError) {
    return (
      <div className="video-frame flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-body-sm text-mist">Falha ao carregar o vídeo.</p>
        <button type="button" onClick={retry} className="btn-ghost">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {animeSlug && nextEpisode != null && (
        <Link
          href={`/animes/${animeSlug}/${nextEpisode}`}
          aria-label={`Pular para o episódio ${nextEpisode}`}
          className="absolute right-3 top-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 bg-ink/85 px-3 font-mono text-caption font-medium text-snow shadow-lg backdrop-blur-sm transition-colors hover:border-ice/60 hover:text-ice focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice"
        >
          Próximo episódio
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      )}
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        poster={safePoster}
        aria-label={
          animeTitle && episodeNumber != null
            ? `${animeTitle} — Episódio ${episodeNumber}`
            : "Player de vídeo"
        }
        className="video-frame"
        onTimeUpdate={(event) =>
          onTimeUpdate?.(event.currentTarget.currentTime)
        }
      />
      {nextEpisodeCountdown !== null && nextEpisode != null && (
        <div className="absolute inset-x-3 top-1/2 z-10 mx-auto flex w-fit -translate-y-1/2 flex-col items-center gap-2 rounded-lg border border-hairline bg-ink/90 px-5 py-4 text-center shadow-xl backdrop-blur-sm">
          <p className="text-body-sm text-snow">
            Próximo episódio em {nextEpisodeCountdown}…
          </p>
          <button
            type="button"
            onClick={() => setNextEpisodeCountdown(null)}
            className="min-h-11 rounded-md border border-white/20 px-4 font-mono text-caption text-mist transition-colors hover:border-ice/60 hover:text-snow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice"
          >
            Cancelar
          </button>
        </div>
      )}
      {watchToast > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute right-3 bottom-3 rounded-full border border-hairline bg-panel/90 px-3 py-1.5 text-body-sm text-snow shadow-lg"
        >
          +{watchToast} Cristais por assistir
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
