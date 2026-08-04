"use client";

import { useEffect, useState } from "react";
import { Footer } from "@/components/common/Footer";
import { SiteNav } from "@/components/common/SiteNav";
import { AuthButtons } from "@/components/common/AuthButtons";
import { VideoPlayer } from "@/components/common/VideoPlayer";
import { api, ApiError } from "@/lib/api";
import type { Episode, Anime, StreamTokenResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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
  const [stream, setStream] = useState<StreamTokenResponse | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || number == null) return;
    setLoading(true);
    api
      .getEpisode(slug, number)
      .then((ep) => setEpisode(ep))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar episódio."))
      .finally(() => setLoading(false));
  }, [slug, number]);

  async function loadStream() {
    if (!slug || number == null) return;
    setStreamError(null);
    setStream(null);
    try {
      const res = await api.streamToken(slug, number);
      setStream(res);
    } catch (e) {
      setStreamError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível gerar o token de streaming. Você está logado?",
      );
    }
  }

  // Monta a URL do proxy de vídeo (suporta Range 206, seek funciona)
  const proxyUrl = stream
    ? `${API_URL}/stream/video?token=${encodeURIComponent(stream.token)}&expires=${stream.expires}&ip=${encodeURIComponent(stream.ip)}`
    : null;

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark">
        <a className="navbar-brand" href="/">
          <img src="/assets/img/lt/logo.webp" alt="AnimesIce" />
        </a>
        <div className="ml-auto">
          <AuthButtons />
        </div>
      </nav>
      <SiteNav />

      <div id="body-content">
        <div className="container text-white py-3">
          {loading ? (
            <p>Carregando...</p>
          ) : error ? (
            <div>
              <p style={{ color: "#ff6b6b" }}>{error}</p>
              <a href={`/animes/${slug}`} className="btn btn-outline-light">
                Voltar ao anime
              </a>
            </div>
          ) : episode ? (
            <>
              <h1>
                {episode.anime.title} — Episódio {episode.number}
              </h1>
              <p>
                <a href={`/animes/${slug}`} className="text-info">
                  ← Todos os episódios
                </a>
              </p>

              {episode.videoUrl || episode.embedUrl ? (
                <div>
                  {episode.embedUrl ? (
                    // Embed externo (iframe): sem token/proxy.
                    <div style={{ marginTop: 16 }}>
                      <VideoPlayer
                        src={""}
                        embedUrl={episode.embedUrl}
                        posterUrl={episode.thumbnailUrl ?? undefined}
                      />
                    </div>
                  ) : (
                    <>
                      {!stream && !streamError && (
                        <button
                          onClick={loadStream}
                          className="btn btn-info"
                          style={{ padding: "10px 20px", fontSize: 16 }}
                        >
                          ▶ Assistir
                        </button>
                      )}
                      {streamError && (
                        <p style={{ color: "#ff6b6b" }}>{streamError}</p>
                      )}
                      {proxyUrl && (
                        <div style={{ marginTop: 16 }}>
                          <VideoPlayer
                            src={proxyUrl}
                            posterUrl={episode.thumbnailUrl ?? undefined}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p style={{ color: "#ffcc00" }}>
                  Vídeo não disponível para este episódio. Um administrador
                  precisa cadastrar a URL do vídeo no{" "}
                  <a href="/admin/episodes" className="text-info">
                    painel admin
                  </a>
                  .
                </p>
              )}
            </>
          ) : (
            <p>Episódio não encontrado.</p>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
