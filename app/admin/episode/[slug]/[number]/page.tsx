"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Episode, Anime } from "@/types";

export default function AdminEditEpisodePage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { user, loading: authLoading } = useAuth();
  const [slug, setSlug] = useState("");
  const [number, setNumber] = useState<number | null>(null);

  const [episode, setEpisode] = useState<(Episode & { anime: Anime }) | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Importar de animefire (scrape) + embed via proxy
  const [animefireUrl, setAnimefireUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeVideos, setScrapeVideos] = useState<string[]>([]);
  const [scrapeIframes, setScrapeIframes] = useState<string[]>([]);

  useEffect(() => {
    params.then((p) => {
      setSlug(p.slug);
      setNumber(Number(p.number));
    });
  }, [params]);

  useEffect(() => {
    if (!slug || number == null) return;
    if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") return;
    setLoading(true);
    api
      .getEpisode(slug, number)
      .then((ep) => {
        setEpisode(ep);
        setVideoUrl(ep.videoUrl ?? "");
        setThumbnailUrl(ep.thumbnailUrl ?? "");
        setTitle(ep.title ?? "");
        setDuration(ep.duration ?? "");
        setEmbedUrl(ep.embedUrl ?? "");
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Erro ao carregar episódio."),
      )
      .finally(() => setLoading(false));
  }, [slug, number, user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || number == null) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.adminUpdateEpisode(slug, number, {
        title: title || undefined,
        videoUrl: videoUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        duration: duration || undefined,
        embedUrl: embedUrl || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || number == null || !uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      const updated = await api.adminUploadVideo(slug, number, uploadFile);
      setVideoUrl(updated.videoUrl ?? "");
      setUploadSuccess(true);
      setUploadFile(null);
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : "Erro no upload do vídeo.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function scrapeAnimefire(e: React.FormEvent) {
    e.preventDefault();
    if (!animefireUrl) return;
    setScraping(true);
    setScrapeError(null);
    setScrapeVideos([]);
    setScrapeIframes([]);
    try {
      const res = await api.embedScrape(animefireUrl);
      setScrapeVideos(res.videos ?? []);
      setScrapeIframes(res.iframes ?? []);
      if (!((res.videos ?? []).length || (res.iframes ?? []).length)) {
        setScrapeError("Nenhum vídeo encontrado nessa URL.");
      }
    } catch (err) {
      setScrapeError(
        err instanceof ApiError ? err.message : "Erro ao extrair vídeos.",
      );
    } finally {
      setScraping(false);
    }
  }

  function gerarEmbedProxy() {
    if (!animefireUrl) return;
    setEmbedUrl(api.embedProxyUrl(animefireUrl));
  }

  if (authLoading) return <p className="container text-white py-4">Carregando...</p>;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return (
      <p className="container text-white py-4">
        Acesso negado. <a href="/login" className="text-info">Entrar</a>.
      </p>
    );
  }

  return (
    <div className="container text-white py-4" style={{ maxWidth: 720 }}>
      <p>
        <a href="/admin" className="text-info">← Painel</a>
      </p>
      <h1>Editar episódio</h1>
      {episode && (
        <p className="text-muted">
          {episode.anime.title} — Ep {episode.number}
          <br />
          <a href={`/animes/${slug}`} className="text-info">ver no site</a>
        </p>
      )}

      {loading ? (
        <p>Carregando...</p>
      ) : error && !episode ? (
        <p style={{ color: "#ff6b6b" }}>{error}</p>
      ) : (
        <form onSubmit={save} style={{ marginTop: 16 }}>
          <div className="form-group">
            <label>URL do vídeo (.mp4 / .m3u8 legítimo)</label>
            <input
              className="form-control bg-dark text-white"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://...seu-arquivo.mp4"
            />
            <small className="text-muted">
              Servido via proxy do backend (suporta seek). Preencha só este campo
              para habilitar o player.
            </small>
          </div>

          <div className="form-group mt-3 p-3" style={{ border: "1px solid #444", borderRadius: 4 }}>
            <label>Upload de vídeo (Supabase)</label>
            <input
              type="file"
              accept="video/*,.m3u8,.ts"
              className="form-control bg-dark text-white"
              onChange={(e) => {
                setUploadFile(e.target.files?.[0] ?? null);
                setUploadError(null);
                setUploadSuccess(false);
              }}
            />
            <small className="text-muted">
              Envia o arquivo (.mp4/.m3u8/.ts) para o Supabase Storage e
              preenche a URL do vídeo acima automaticamente.
            </small>
            <button
              type="button"
              onClick={uploadVideo}
              disabled={uploading || !uploadFile}
              className="btn btn-info mt-2"
            >
              {uploading ? "Enviando..." : "Enviar"}
            </button>
            {uploadError && (
              <p style={{ color: "#ff6b6b" }} className="mt-2">{uploadError}</p>
            )}
            {uploadSuccess && (
              <p style={{ color: "#4eff9b" }} className="mt-2">
                Upload concluído! URL do vídeo preenchida.
              </p>
            )}
          </div>

          <div className="form-group mt-3">
            <label>URL de embed (iframe externo)</label>
            <input
              className="form-control bg-dark text-white"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://playerexterno.com/embed/... ou proxy interno"
            />
            <small className="text-muted">
              Se preenchido, o player usa este iframe em vez do vídeo via proxy.
              Para animefire, use o gerador de embed abaixo (proxy interno).
            </small>
          </div>

          <div
            className="form-group mt-3 p-3"
            style={{ border: "1px solid #444", borderRadius: 4 }}
          >
            <label>Importar de animefire (scrape)</label>
            <input
              className="form-control bg-dark text-white mt-2"
              value={animefireUrl}
              onChange={(e) => setAnimefireUrl(e.target.value)}
              placeholder="https://animefire.net/animes/.../episodio-..."
            />
            <div className="d-flex gap-2 mt-2 flex-wrap">
              <button
                type="button"
                onClick={scrapeAnimefire}
                disabled={scraping || !animefireUrl}
                className="btn btn-info"
              >
                {scraping ? "Extraindo..." : "Extrair vídeo"}
              </button>
              <button
                type="button"
                onClick={gerarEmbedProxy}
                disabled={!animefireUrl}
                className="btn btn-outline-info"
              >
                Gerar embed URL (iframe)
              </button>
            </div>
            <small className="text-muted d-block mt-2">
              Token vinculado ao IP do servidor; funciona localmente.
              Modo iframe via proxy do backend (sem XFO).
            </small>

            {scrapeError && (
              <p style={{ color: "#ff6b6b" }} className="mt-2">{scrapeError}</p>
            )}

            {scrapeVideos.length > 0 && (
              <div className="mt-3">
                <small className="text-muted">Vídeos .mp4 encontrados:</small>
                <ul className="mt-1">
                  {scrapeVideos.map((v, i) => (
                    <li key={i} className="text-break">
                      <a
                        href="#"
                        className="text-info"
                        onClick={(e) => {
                          e.preventDefault();
                          setVideoUrl(v);
                        }}
                      >
                        Usar esta URL
                      </a>{" "}
                      <code className="text-muted">{v}</code>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => setVideoUrl(scrapeVideos[0])}
                >
                  Usar primeira URL
                </button>
              </div>
            )}

            {scrapeIframes.length > 0 && (
              <div className="mt-3">
                <small className="text-muted">Iframes encontrados:</small>
                <ul className="mt-1">
                  {scrapeIframes.map((v, i) => (
                    <li key={i} className="text-break">
                      <a
                        href="#"
                        className="text-info"
                        onClick={(e) => {
                          e.preventDefault();
                          setEmbedUrl(v);
                        }}
                      >
                        Usar este iframe
                      </a>{" "}
                      <code className="text-muted">{v}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="form-group mt-3">
            <label>Thumbnail (URL)</label>
            <input
              className="form-control bg-dark text-white"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://.../thumb.jpg"
            />
          </div>

          <div className="form-group mt-3">
            <label>Título</label>
            <input
              className="form-control bg-dark text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group mt-3">
            <label>Duração</label>
            <input
              className="form-control bg-dark text-white"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="24 min"
            />
          </div>

          {error && <p style={{ color: "#ff6b6b" }} className="mt-3">{error}</p>}
          {saved && <p style={{ color: "#4eff9b" }} className="mt-3">Salvo!</p>}

          <button type="submit" disabled={saving} className="btn btn-info mt-3">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}
    </div>
  );
}
