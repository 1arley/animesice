"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type Hls from "hls.js";
import type { Socket } from "socket.io-client";
import { safeImageSrc } from "@/lib/url";
import { API_URL, isProxyEmbed } from "@/lib/api";
import { isYouTubeEmbed } from "@/components/common/VideoPlayer";

interface SyncedVideoPlayerProps {
  src: string;
  posterUrl?: string;
  embedUrl?: string | null;
  animeSlug?: string;
  episodeNumber?: number;
  animeTitle?: string;
  socket: Socket | null;
  roomSlug: string;
  isHost: boolean;
}

interface PlayerSyncPayload {
  currentTime: number;
  isPlaying: boolean;
  origin: string;
}

const SYNC_TOLERANCE_SEC = 0.75;
const SYNC_DEBOUNCE_MS = 500;
const TIME_SYNC_INTERVAL_MS = 5000;
const APPLYING_SYNC_GUARD_MS = 800;

export function SyncedVideoPlayer({
  src,
  posterUrl,
  embedUrl,
  animeSlug,
  episodeNumber,
  animeTitle,
  socket,
  roomSlug,
  isHost,
}: SyncedVideoPlayerProps) {
  if (embedUrl && (isProxyEmbed(embedUrl) || isYouTubeEmbed(embedUrl))) {
    return (
      <EmbedPlayer
        embedUrl={embedUrl}
        animeSlug={animeSlug}
        episodeNumber={episodeNumber}
        animeTitle={animeTitle}
        socket={socket}
        roomSlug={roomSlug}
        isHost={isHost}
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
        socket={socket}
        roomSlug={roomSlug}
        isHost={isHost}
      />
    );
  }
  return (
    <NativeSyncedPlayer
      src={src}
      posterUrl={posterUrl}
      animeSlug={animeSlug}
      episodeNumber={episodeNumber}
      animeTitle={animeTitle}
      socket={socket}
      roomSlug={roomSlug}
      isHost={isHost}
    />
  );
}

function EmbedPlayer({
  embedUrl,
  animeSlug,
  episodeNumber,
  animeTitle,
  socket,
  roomSlug,
  isHost,
}: {
  embedUrl: string;
  animeSlug?: string;
  episodeNumber?: number;
  animeTitle?: string;
  socket: Socket | null;
  roomSlug: string;
  isHost: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastSyncSentRef = useRef(0);
  const [bridgeStatus, setBridgeStatus] = useState<
    "connecting" | "ready" | "unavailable"
  >("connecting");
  const title =
    animeTitle && episodeNumber != null
      ? `${animeTitle} — Episodio ${episodeNumber}`
      : "Player de video";

  useEffect(() => {
    if (!animeSlug || episodeNumber == null) return;
    fetch(`${API_URL}/episode/${animeSlug}/${episodeNumber}/views`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, [animeSlug, episodeNumber]);

  const postToBridge = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "animesice:watch-party", ...message },
      "*",
    );
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== iframeRef.current?.contentWindow ||
        event.data?.type !== "animesice:watch-party"
      ) return;

      const eventName = event.data.event as string;
      if (eventName === "bridge-ready" || eventName === "ready") {
        setBridgeStatus("ready");
        postToBridge({ command: "setRole", role: isHost ? "host" : "viewer" });
        postToBridge({ command: "getState" });
        return;
      }
      if (eventName === "unavailable") {
        setBridgeStatus("unavailable");
        return;
      }
      if (eventName === "autoplay-blocked") {
        setBridgeStatus("ready");
        return;
      }
      if (eventName !== "state" || !socket?.connected) return;

      if (!isHost) {
        socket.emit("requestSync", { slug: roomSlug });
        return;
      }
      if (!Number.isFinite(event.data.currentTime)) return;
      const now = Date.now();
      if (now - lastSyncSentRef.current < SYNC_DEBOUNCE_MS) return;
      lastSyncSentRef.current = now;
      socket.emit("playerSync", {
        slug: roomSlug,
        currentTime: event.data.currentTime,
        isPlaying: Boolean(event.data.isPlaying),
      });
    };

    window.addEventListener("message", onMessage);
    const unavailableTimer = window.setTimeout(() => {
      setBridgeStatus((status) => status === "connecting" ? "unavailable" : status);
    }, 8000);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(unavailableTimer);
    };
  }, [isHost, postToBridge, roomSlug, socket]);

  useEffect(() => {
    if (!socket) return;
    const onPlayerSync = (data: PlayerSyncPayload) => {
      if (!isHost) postToBridge({ command: "apply", ...data });
    };
    const requestSync = () => {
      postToBridge({ command: "setRole", role: isHost ? "host" : "viewer" });
      if (!isHost) socket.emit("requestSync", { slug: roomSlug });
    };
    socket.on("playerSync", onPlayerSync);
    socket.on("connect", requestSync);
    requestSync();
    return () => {
      socket.off("playerSync", onPlayerSync);
      socket.off("connect", requestSync);
    };
  }, [isHost, postToBridge, roomSlug, socket]);

  return (
    <div className="relative">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        allowFullScreen
        allow="autoplay; fullscreen"
        onLoad={() => {
          setBridgeStatus("connecting");
          postToBridge({ command: "setRole", role: isHost ? "host" : "viewer" });
          postToBridge({ command: "getState" });
        }}
        className="video-frame"
        style={{ border: 0 }}
      />
      <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-caption text-mist">
        {bridgeStatus === "ready"
          ? isHost ? "Host · embed sincronizado" : "Embed sincronizado"
          : bridgeStatus === "unavailable"
            ? "Este player não oferece sincronização"
            : "Conectando ao player..."}
      </div>
    </div>
  );
}

function NativeSyncedPlayer({
  src,
  posterUrl,
  animeSlug,
  episodeNumber,
  animeTitle,
  socket,
  roomSlug,
  isHost,
}: {
  src: string;
  posterUrl?: string;
  animeSlug?: string;
  episodeNumber?: number;
  animeTitle?: string;
  socket: Socket | null;
  roomSlug: string;
  isHost: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const lastSyncSentRef = useRef<number>(0);
  const lastSyncPlayingRef = useRef<boolean | null>(null);
  const isApplyingSyncRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSyncRef = useRef<PlayerSyncPayload | null>(null);
  const guestUiHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [synced, setSynced] = useState(isHost);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [fatalError, setFatalError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [guestUiVisible, setGuestUiVisible] = useState(false);
  const [guestMuted, setGuestMuted] = useState(false);
  const [guestVolume, setGuestVolume] = useState(100);
  const [guestFullscreen, setGuestFullscreen] = useState(false);

  const safeSrc = safeImageSrc(src) ?? src;
  const safePoster = safeImageSrc(posterUrl);
  const isM3u8 = safeSrc.toLowerCase().endsWith(".m3u8");

  const sendSync = useCallback(
    (currentTime: number, isPlaying: boolean) => {
      if (!socket?.connected || !isHost) return;
      const now = Date.now();
      if (
        isPlaying === lastSyncPlayingRef.current &&
        now - lastSyncSentRef.current < SYNC_DEBOUNCE_MS
      ) return;
      lastSyncSentRef.current = now;
      lastSyncPlayingRef.current = isPlaying;
      socket.emit("playerSync", {
        slug: roomSlug,
        currentTime,
        isPlaying,
      });
    },
    [socket, roomSlug, isHost],
  );

  const applySync = useCallback((data: PlayerSyncPayload) => {
    const video = videoRef.current;
    if (!video) return;
    if (video.readyState === HTMLMediaElement.HAVE_NOTHING) {
      pendingSyncRef.current = data;
      return;
    }

    pendingSyncRef.current = null;
    const targetTime = data.currentTime;
    const diff = Math.abs(video.currentTime - targetTime);

    const playbackMatches = data.isPlaying ? !video.paused : video.paused;
    setSynced(diff < SYNC_TOLERANCE_SEC * 2 && playbackMatches);

    isApplyingSyncRef.current = true;
    if (diff >= SYNC_TOLERANCE_SEC) {
      video.currentTime = Math.max(0, targetTime);
    }

    if (data.isPlaying && video.paused) {
      video.play().then(() => {
        setPlaybackBlocked(false);
        setSynced(true);
      }).catch(() => {
        setPlaybackBlocked(true);
        setSynced(false);
      });
    } else if (!data.isPlaying && !video.paused) {
      video.pause();
      setSynced(diff < SYNC_TOLERANCE_SEC * 2);
    }

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      isApplyingSyncRef.current = false;
    }, APPLYING_SYNC_GUARD_MS);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const applyPendingSync = () => {
      if (pendingSyncRef.current) applySync(pendingSyncRef.current);
    };
    video.addEventListener("loadedmetadata", applyPendingSync);
    return () => video.removeEventListener("loadedmetadata", applyPendingSync);
  }, [applySync, retryAttempt]);

  useEffect(() => {
    if (!socket) return;

    const onPlayerSync = (data: PlayerSyncPayload) => {
      if (isHost) return;
      applySync(data);
    };

    socket.on("playerSync", onPlayerSync);

    const requestCurrentSync = () => {
      if (!isHost) socket.emit("requestSync", { slug: roomSlug });
    };
    socket.on("connect", requestCurrentSync);

    requestCurrentSync();

    return () => {
      socket.off("playerSync", onPlayerSync);
      socket.off("connect", requestCurrentSync);
    };
  }, [socket, roomSlug, isHost, applySync]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setFatalError(false);

    const handleVideoError = () => setFatalError(true);
    video.addEventListener("error", handleVideoError);

    if (!isM3u8) {
      video.src = safeSrc;
      return () => {
        video.removeEventListener("error", handleVideoError);
        video.removeAttribute("src");
        video.load();
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = safeSrc;
      return () => {
        video.removeEventListener("error", handleVideoError);
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
                hls?.destroy();
                hls = null;
                setFatalError(true);
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
      video.removeEventListener("error", handleVideoError);
      destroyed = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
      video.removeAttribute("src");
      video.load();
    };
  }, [safeSrc, isM3u8, retryAttempt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !animeSlug || episodeNumber == null) return;

    let viewsSent = false;
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    let timeSyncTimer: ReturnType<typeof setInterval> | null = null;

    async function sendProgress(progress: number, duration: number, completed?: boolean) {
      try {
        await fetch(`${API_URL}/watch-history/${animeSlug}/${episodeNumber}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress: Math.floor(progress), duration: Math.floor(duration), completed }),
        });
      } catch {}
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

      if (isHost) {
        sendSync(video!.currentTime, true);
        timeSyncTimer = setInterval(() => {
          const v = videoRef.current;
          if (v && !v.paused) {
            sendSync(v.currentTime, true);
          }
        }, TIME_SYNC_INTERVAL_MS);
      }
    }

    function onPause() {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (timeSyncTimer) {
        clearInterval(timeSyncTimer);
        timeSyncTimer = null;
      }
      if (video && video.duration > 0) {
        sendProgress(video.currentTime, video.duration);
      }
      if (isHost) {
        sendSync(video!.currentTime, false);
      }
    }

    function onSeeked() {
      if (isApplyingSyncRef.current) return;
      const v = videoRef.current;
      if (isHost && v) {
        sendSync(v.currentTime, !v.paused);
      }
    }

    function onEnded() {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (timeSyncTimer) {
        clearInterval(timeSyncTimer);
        timeSyncTimer = null;
      }
      if (video && video.duration > 0) {
        sendProgress(video.duration, video.duration, true);
      }
    }

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("ended", onEnded);
      if (progressTimer) clearInterval(progressTimer);
      if (timeSyncTimer) clearInterval(timeSyncTimer);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [animeSlug, episodeNumber, isHost, sendSync, retryAttempt]);

  const retry = useCallback(() => {
    setFatalError(false);
    setPlaybackBlocked(false);
    setSynced(isHost);
    pendingSyncRef.current = null;
    setRetryAttempt((attempt) => attempt + 1);
  }, [isHost]);

  const scheduleGuestUiHide = useCallback(() => {
    if (guestUiHideTimerRef.current) clearTimeout(guestUiHideTimerRef.current);
    guestUiHideTimerRef.current = setTimeout(() => {
      setGuestUiVisible(false);
    }, 3000);
  }, []);

  const showGuestUi = useCallback(() => {
    setGuestUiVisible(true);
    scheduleGuestUiHide();
  }, [scheduleGuestUiHide]);

  useEffect(() => {
    if (isHost) return;
    const video = videoRef.current;
    if (!video) return;
    const syncVolume = () => {
      setGuestMuted(video.muted);
      setGuestVolume(Math.round((video.volume || 0) * 100));
    };
    const syncFullscreen = () => {
      setGuestFullscreen(Boolean(document.fullscreenElement));
    };
    video.addEventListener("volumechange", syncVolume);
    video.addEventListener("loadedmetadata", syncVolume);
    document.addEventListener("fullscreenchange", syncFullscreen);
    syncVolume();
    return () => {
      video.removeEventListener("volumechange", syncVolume);
      video.removeEventListener("loadedmetadata", syncVolume);
      document.removeEventListener("fullscreenchange", syncFullscreen);
      if (guestUiHideTimerRef.current) clearTimeout(guestUiHideTimerRef.current);
    };
  }, [isHost]);

  const blockGuestVideoClick = useCallback((e: React.MouseEvent) => {
    if (isHost) return;
    e.preventDefault();
  }, [isHost]);

  if (fatalError) {
    return (
      <div
        className="video-frame flex flex-col items-center justify-center gap-3 text-center"
        role="alert"
      >
        <p className="text-body-sm text-mist">
          A reprodução sincronizada foi interrompida.
        </p>
        <button type="button" onClick={retry} className="btn-ghost">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div
      ref={videoContainerRef}
      className={`relative${!isHost ? " watch-party-guest" : ""}`}
      onPointerMove={!isHost ? showGuestUi : undefined}
      onPointerLeave={!isHost ? () => setGuestUiVisible(false) : undefined}
      onClick={!isHost ? showGuestUi : undefined}
    >
      <video
        ref={videoRef}
        controls={isHost}
        playsInline
        preload="metadata"
        poster={safePoster}
        aria-label={animeTitle && episodeNumber != null ? `${animeTitle} — Episodio ${episodeNumber}` : "Player de video"}
        className="video-frame"
        onClick={!isHost ? blockGuestVideoClick : undefined}
      />
      {!isHost && playbackBlocked && (
        <button
          type="button"
          onClick={() => {
            videoRef.current?.play().then(() => {
              setPlaybackBlocked(false);
              socket?.emit("requestSync", { slug: roomSlug });
            }).catch(() => {});
          }}
          className="absolute inset-0 m-auto h-fit w-fit rounded bg-black/80 px-4 py-2 text-body-sm font-medium text-snow"
        >
          Clique para ativar a reprodução sincronizada
        </button>
      )}
      {!isHost && (
        <div
          className={`absolute inset-x-0 bottom-0 flex items-center gap-3 px-3 pb-3 transition-opacity duration-200 ${
            guestUiVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <button
            type="button"
            aria-label={guestMuted ? "Ativar som" : "Silenciar"}
            onClick={() => {
              const video = videoRef.current;
              if (video) video.muted = !video.muted;
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-black/70 text-snow transition-colors hover:bg-black/90 hover:text-ice"
          >
            {guestMuted ? <MutedIcon /> : <VolumeIcon />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={guestVolume}
            onChange={(e) => {
              const video = videoRef.current;
              if (!video) return;
              const volume = Number(e.target.value) / 100;
              video.volume = volume;
              if (volume === 0) {
                video.muted = true;
              } else if (video.muted) {
                video.muted = false;
              }
            }}
            className="guest-volume w-24"
            aria-label="Volume"
          />
          <span className="flex-1" />
          <button
            type="button"
            aria-label={guestFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            onClick={() => {
              if (document.fullscreenElement) {
                void document.exitFullscreen();
              } else {
                void videoContainerRef.current?.requestFullscreen?.();
              }
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-black/70 text-snow transition-colors hover:bg-black/90 hover:text-ice"
          >
            {guestFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
          </button>
        </div>
      )}
      <div className="absolute top-2 right-2 flex items-center gap-2 rounded bg-black/70 px-2 py-1 text-caption">
        <span className={`h-2 w-2 rounded-full ${synced ? "bg-ice" : "bg-signal"}`} />
        <span className="text-mist">
          {isHost ? "Host" : synced ? "Sincronizado" : "Sincronizando..."}
        </span>
      </div>
    </div>
  );
}

function VolumeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

function FullscreenEnterIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function FullscreenExitIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

export default SyncedVideoPlayer;
