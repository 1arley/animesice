"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type Hls from "hls.js";
import type { Socket } from "socket.io-client";
import { safeImageSrc } from "@/lib/url";
import { API_URL, isProxyEmbed } from "@/lib/api";

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
  updatedAt: number;
  origin: string;
}

const SYNC_TOLERANCE_SEC = 2;
const SYNC_DEBOUNCE_MS = 500;
const TIME_SYNC_INTERVAL_MS = 5000;

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
  if (embedUrl && isProxyEmbed(embedUrl)) {
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

  return (
    <div className="relative">
      <iframe
        src={embedUrl}
        title={title}
        allowFullScreen
        className="video-frame"
        style={{ border: 0 }}
      />
      <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-caption text-mist">
        {isHost ? "Host (embed sem sync)" : "Espectador (embed sem sync)"}
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
  const lastSyncSentRef = useRef<number>(0);
  const isApplyingSyncRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [synced, setSynced] = useState(true);

  const safeSrc = safeImageSrc(src) ?? src;
  const safePoster = safeImageSrc(posterUrl);
  const isM3u8 = safeSrc.toLowerCase().endsWith(".m3u8");

  const sendSync = useCallback(
    (currentTime: number, isPlaying: boolean) => {
      if (!socket?.connected || !isHost) return;
      const now = Date.now();
      if (now - lastSyncSentRef.current < SYNC_DEBOUNCE_MS) return;
      lastSyncSentRef.current = now;
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

    const elapsed = (Date.now() - data.updatedAt) / 1000;
    const targetTime = data.currentTime + (data.isPlaying ? elapsed : 0);
    const diff = Math.abs(video.currentTime - targetTime);

    setSynced(diff < SYNC_TOLERANCE_SEC * 2);

    if (diff < SYNC_TOLERANCE_SEC) return;

    isApplyingSyncRef.current = true;
    video.currentTime = targetTime;

    if (data.isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!data.isPlaying && !video.paused) {
      video.pause();
    }

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      isApplyingSyncRef.current = false;
    }, 500);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onPlayerSync = (data: PlayerSyncPayload) => {
      if (isHost) return;
      applySync(data);
    };

    socket.on("playerSync", onPlayerSync);

    if (!isHost) {
      socket.emit("requestSync", { slug: roomSlug });
    }

    return () => {
      socket.off("playerSync", onPlayerSync);
    };
  }, [socket, roomSlug, isHost, applySync]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isM3u8) {
      video.src = safeSrc;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = safeSrc;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    let hls: Hls | null = null;
    let cancelled = false;

    import("hls.js")
      .then(({ default: HlsCtor }) => {
        if (cancelled) return;
        if (!HlsCtor || !HlsCtor.isSupported()) {
          video.src = safeSrc;
          return;
        }
        hls = new HlsCtor();
        hls.loadSource(safeSrc);
        hls.attachMedia(video);
      })
      .catch(() => {
        if (cancelled) return;
        video.src = safeSrc;
      });

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
      video.removeAttribute("src");
      video.load();
    };
  }, [safeSrc, isM3u8]);

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
  }, [animeSlug, episodeNumber, isHost, sendSync]);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        controls
        poster={safePoster}
        aria-label={animeTitle && episodeNumber != null ? `${animeTitle} — Episodio ${episodeNumber}` : "Player de video"}
        className="video-frame"
      />
      <div className="absolute top-2 right-2 flex items-center gap-2 rounded bg-black/70 px-2 py-1 text-caption">
        <span className={`h-2 w-2 rounded-full ${synced ? "bg-ice" : "bg-signal"}`} />
        <span className="text-mist">
          {isHost ? "Host" : synced ? "Sincronizado" : "Sincronizando..."}
        </span>
      </div>
    </div>
  );
}

export default SyncedVideoPlayer;
