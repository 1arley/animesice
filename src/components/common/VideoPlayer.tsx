"use client";

import { useEffect, useRef } from "react";
import type Hls from "hls.js";
import { safeImageSrc } from "@/lib/url";
import { isProxyEmbed } from "@/lib/api";

interface VideoPlayerProps {
  /** URL da mídia. Já vem envolvida pelo proxy de mídia backend
   *  (/embed/media?url=...) p/ contornar anti-hotlinking + IP-vínculo. */
  src: string;
  posterUrl?: string;
  /** URL de iframe interno (proxy). Se presente e interna, renderiza iframe.
   *  Embed externo direto NÃO é mais suportado (anúncios + XFO). */
  embedUrl?: string | null;
}

/**
 * Branch puro, sem hooks: iframe (proxy interno) ou vídeo nativo/HLS.
 * A escolha de ramo fica fora dos componentes com efeitos — regras de hooks ok.
 */
export function VideoPlayer({ src, posterUrl, embedUrl }: VideoPlayerProps) {
  if (embedUrl && isProxyEmbed(embedUrl)) {
    return <EmbedPlayer embedUrl={embedUrl} />;
  }
  return <NativeVideoPlayer src={src} posterUrl={posterUrl} />;
}

/** Modo embed interno (iframe via proxy do backend): sem XFO, carrega direto. */
function EmbedPlayer({ embedUrl }: { embedUrl: string }) {
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

function NativeVideoPlayer({ src, posterUrl }: { src: string; posterUrl?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const safeSrc = safeImageSrc(src) ?? src;
  const safePoster = safeImageSrc(posterUrl);
  const isM3u8 = safeSrc.toLowerCase().endsWith(".m3u8");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // .mp4 -> navegacao nativa; .m3u8 -> hls.js se suportado, senao nativo (Safari).
    if (!isM3u8) {
      video.src = safeSrc;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    // Hls nativo (Safari/iOS): apenas apontar video.src.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = safeSrc;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    // Dinamico client-only: hls.js.
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
