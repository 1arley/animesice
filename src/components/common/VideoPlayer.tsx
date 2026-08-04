"use client";

import { useEffect, useRef, useState } from "react";

type HlsModule = typeof import("hls.js");

interface HlsInstance {
  loadSource(src: string): void;
  attachMedia(media: HTMLMediaElement): void;
  destroy(): void;
}

interface HlsStatic {
  isSupported(): boolean;
  new (config?: Record<string, unknown>): HlsInstance;
}

interface VideoPlayerProps {
  src: string;
  posterUrl?: string;
  /** URL de iframe externo. Se presente, renderiza iframe em vez do player de vídeo. */
  embedUrl?: string | null;
}

// Proxy interno do backend: mesmo dominio, sem XFO/CSP bloqueando iframe.
// Heuristica: URL contem "/embed/proxy?" — nao depende de XFO/PSP fallback.
function isProxyEmbed(url: string): boolean {
  return url.includes("/embed/proxy?");
}

export function VideoPlayer({ src, posterUrl, embedUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [blocked, setBlocked] = useState(false);

  // Modo embed externo (iframe).
  if (embedUrl) {
    // Proxy interno: iframe direto, sem tentar contornar XFO (nao ha bloqueio).
    if (isProxyEmbed(embedUrl)) {
      return (
        <iframe
          ref={iframeRef}
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

    // Embed direto (sem proxy): pode ter XFO/CSP. Detecta bloqueio via contentWindow.
    return (
      <>
        {!blocked ? (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title="Player externo"
            allowFullScreen
            style={{
              width: "100%",
              height: "70vh",
              minHeight: 360,
              border: 0,
              background: "#000",
            }}
            onError={() => setBlocked(true)}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "70vh",
              minHeight: 360,
              background: "#000",
              color: "#ffcc00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: 16,
            }}
          >
            <p>
              Embed bloqueado (X-Frame-Options/CSP). Use o proxy backend no
              painel admin para gerar uma URL de embed interna.
            </p>
          </div>
        )}
        <EmbedBlockDetector iframeRef={iframeRef} onBlocked={() => setBlocked(true)} />
      </>
    );
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: HlsInstance | null = null;
    let cancelled = false;

    const isM3u8 = src.toLowerCase().endsWith(".m3u8");

    // .mp4 -> navegacao nativa; .m3u8 -> hls.js se suportado, senao nativo (Safari).
    if (!isM3u8) {
      video.src = src;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    // Hls nativo (Safari/iOS): apenas apontar video.src.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    // dinamico client-only: hls.js.
    let mod: HlsModule | null = null;
    import("hls.js")
      .then((m: HlsModule) => {
        if (cancelled) return;
        const HlsCtor = (m.default ?? (m as unknown as HlsStatic)) as HlsStatic;
        if (!HlsCtor || !HlsCtor.isSupported()) {
          // fallback nativo caso hls.js nao suportado.
          video.src = src;
          return;
        }
        hls = new HlsCtor();
        hls.loadSource(src);
        hls.attachMedia(video);
      })
      .catch(() => {
        if (cancelled) return;
        video.src = src;
      });

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
      video.removeAttribute("src");
      video.load();
      mod = null;
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      poster={posterUrl}
      style={{
        width: "100%",
        background: "#000",
        maxHeight: "70vh",
      }}
    />
  );
}

// Tenta acessar contentWindow do iframe; se cross-origin bloqueado
// (XFO/CSP), o access dispara erro -> marca como bloqueado.
function EmbedBlockDetector({
  iframeRef,
  onBlocked,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onBlocked: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        // Acesso cross-origin lanca SecurityError quando XFO bloqueia.
        if (iframeRef.current && !iframeRef.current.contentWindow) {
          onBlocked();
        }
      } catch {
        onBlocked();
      }
    }, 1500);
    return () => window.clearTimeout(id);
  }, [iframeRef, onBlocked]);

  return null;
}

export default VideoPlayer;
