"use client";

import { useEffect, useRef } from "react";
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
}

export function VideoPlayer({ src, posterUrl, embedUrl, animeSlug, episodeNumber }: VideoPlayerProps) {
  if (embedUrl && isProxyEmbed(embedUrl)) {
    return <EmbedPlayer embedUrl={embedUrl} animeSlug={animeSlug} episodeNumber={episodeNumber} />;
  }
  return <NativeVideoPlayer src={src} posterUrl={posterUrl} animeSlug={animeSlug} episodeNumber={episodeNumber} />;
}

/** Modo embed interno (iframe via proxy do backend): sem XFO, carrega direto. */
function EmbedPlayer({ embedUrl, animeSlug, episodeNumber }: { embedUrl: string; animeSlug?: string; episodeNumber?: number }) {
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
      title="Player"
      allowFullScreen
      style={{
        width: "100%",
        height: "70vh",
        minHeight: 360,
        border: 0,
        background: "#000",
      }}
    />
  );
}

function NativeVideoPlayer({ src, posterUrl, animeSlug, episodeNumber }: { src: string; posterUrl?: string; animeSlug?: string; episodeNumber?: number }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { user } = useAuth();

  const safeSrc = safeImageSrc(src) ?? src;
  const safePoster = safeImageSrc(posterUrl);
  const isM3u8 = safeSrc.toLowerCase().endsWith(".m3u8");

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

    async function sendProgress(progress: number, duration: number, completed?: boolean) {
      if (!user) return;
      try {
        await fetch(`${API_URL}/watch-history/${animeSlug}/${episodeNumber}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress: Math.floor(progress), duration: Math.floor(duration), completed }),
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
  }, [animeSlug, episodeNumber, user]);

  return (
    <video
      ref={videoRef}
      controls
      poster={safePoster}
      style={{
        width: "100%",
        background: "#000",
        maxHeight: "70vh",
      }}
    />
  );
}

export default VideoPlayer;

