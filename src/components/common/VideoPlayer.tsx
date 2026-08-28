"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Título para acessibilidade do iframe */
  animeTitle?: string;
  /** Retoma neste ponto depois de uma recuperação de source. */
  startAt?: number;
  /** Disparado apenas para erro fatal do elemento de vídeo. */
  onPlaybackError?: (currentTime: number) => void;
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
  } catch { /* ignore */ }
  return false;
}

export function VideoPlayer({
  src,
  posterUrl,
  embedUrl,
  animeSlug,
  episodeNumber,
  animeTitle,
  startAt,
  onPlaybackError,
}: VideoPlayerProps) {
  const bloggerSource = embedUrl && isBloggerEmbed(embedUrl)
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
      animeTitle={animeTitle}
      startAt={startAt}
      onPlaybackError={onPlaybackError}
    />
  );
}

/** Modo embed interno (iframe via proxy do backend): sem XFO, carrega direto. */
function EmbedPlayer({
  embedUrl,
  animeSlug,
  episodeNumber,
  animeTitle,
}: {
  embedUrl: string;
  animeSlug?: string;
  episodeNumber?: number;
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
    <iframe
      src={embedUrl}
      title={title}
      allowFullScreen
      className="video-frame"
      style={{ border: 0 }}
    />
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
  animeTitle,
  startAt,
  onPlaybackError,
}: {
  src: string;
  posterUrl?: string;
  animeSlug?: string;
  episodeNumber?: number;
  animeTitle?: string;
  startAt?: number;
  onPlaybackError?: (currentTime: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { user } = useAuth();
  const [fatalError, setFatalError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const safeSrc = safeImageSrc(src) ?? src;
  const safePoster = safeImageSrc(posterUrl);
  const isM3u8 = safeSrc.toLowerCase().endsWith(".m3u8");

  const onPlaybackErrorRef = useRef(onPlaybackError);
  onPlaybackErrorRef.current = onPlaybackError;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setFatalError(false);

    let recoveryRequested = false;
    const requestRecovery = () => {
      if (recoveryRequested) return;
      recoveryRequested = true;
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
        await fetch(`${API_URL}/watch-history/${animeSlug}/${episodeNumber}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progress: Math.floor(progress),
            duration: Math.floor(duration),
            completed,
          }),
        });
      } catch {
        // silent
      }
    }

    function onPlay() {
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
  }, [animeSlug, episodeNumber, user, retryAttempt]);

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
        <button
          type="button"
          onClick={retry}
          className="btn-ghost"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
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
    />
  );
}

export default VideoPlayer;
