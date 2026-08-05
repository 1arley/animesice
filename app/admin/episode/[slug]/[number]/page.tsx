"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import type { Episode, Anime } from "@/types";

type Source = "auto" | "animefire" | "animesonlinecc" | "meusanimes";

const SOURCES: { value: Source; label: string }[] = [
  { value: "auto", label: "Auto-detectar" },
  { value: "animefire", label: "animefire.io" },
  { value: "animesonlinecc", label: "animesonlinecc.to" },
  { value: "meusanimes", label: "meusanimes.blog" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
      {children}
    </span>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-caption text-mist">{children}</span>;
}

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Importar (scrape) + embed via proxy — multi-fonte.
  const [source, setSource] = useState<Source>("auto");
  const [sourceUrl, setSourceUrl] = useState("");
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
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar episódio."))
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
      setUploadError(err instanceof ApiError ? err.message : "Erro no upload do vídeo.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteEpisode() {
    if (!slug || number == null) return;
    setDeleting(true);
    setError(null);
    try {
      await api.adminDeleteEpisode(slug, number);
      window.location.href = `/animes/${slug}`;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao deletar episódio.");
    } finally {
      setDeleting(false);
    }
  }

  async function scrapeSource(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceUrl) return;
    setScraping(true);
    setScrapeError(null);
    setScrapeVideos([]);
    setScrapeIframes([]);
    try {
      const res = await api.embedScrape(sourceUrl, source === "auto" ? undefined : source);
      setScrapeVideos(res.videos ?? []);
      setScrapeIframes(res.iframes ?? []);
      if (!((res.videos ?? []).length || (res.iframes ?? []).length)) {
        setScrapeError("Nenhum vídeo encontrado nessa URL.");
      }
    } catch (err) {
      setScrapeError(err instanceof ApiError ? err.message : "Erro ao extrair vídeos.");
    } finally {
      setScraping(false);
    }
  }

  function gerarEmbedProxy() {
    if (!sourceUrl) return;
    setEmbedUrl(api.embedProxyUrl(sourceUrl));
  }

  if (authLoading)
    return (
      <>
        <Header />
        <SiteNav />
        <main className="mx-auto max-w-shelf px-4 py-10 text-body-sm text-mist">Carregando...</main>
      </>
    );
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return (
      <>
        <Header />
        <SiteNav />
        <main className="mx-auto max-w-shelf px-4 py-10 text-body-sm text-mist">
          Acesso negado. <a href="/login" className="text-ice">Entrar</a>.
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <SiteNav />
      <main className="mx-auto max-w-shelf px-4 py-6" style={{ maxWidth: 720 }}>
        <p className="mb-4">
          <a href="/admin" className="text-body-sm text-mist transition-colors hover:text-ice">
            ← Painel
          </a>
        </p>
        <h1 className="font-display text-display-xl text-ink">Editar episódio</h1>
        {episode && (
          <p className="mt-1 text-body-sm text-mist">
            {episode.anime.title} — EP {episode.number}
            <br />
            <a href={`/animes/${slug}`} className="text-ice transition-colors hover:opacity-70">
              ver no site
            </a>
          </p>
        )}

        {loading ? (
          <p className="mt-4 text-body-sm text-mist">Carregando...</p>
        ) : error && !episode ? (
          <p className="mt-4 text-body-sm text-signal">{error}</p>
        ) : (
          <form onSubmit={save} className="mt-6 space-y-5">
            <label className="block">
              <FieldLabel>URL do vídeo (.mp4 / .m3u8 legítimo)</FieldLabel>
              <input
                className="field"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://...seu-arquivo.mp4"
              />
              <Hint>
                Servido via proxy do backend (suporta seek). Preencha só este
                campo para habilitar o player.
              </Hint>
            </label>

            {/* Upload Supabase — área isolada por hairline. */}
            <fieldset className="border border-hairline p-4">
              <legend className="px-1 font-sans text-caption uppercase tracking-wider text-mist">
                Upload de vídeo (Supabase)
              </legend>
              <input
                type="file"
                accept="video/*,.m3u8,.ts"
                className="field"
                onChange={(e) => {
                  setUploadFile(e.target.files?.[0] ?? null);
                  setUploadError(null);
                  setUploadSuccess(false);
                }}
              />
              <Hint>
                Envia .mp4/.m3u8/.ts para o Supabase Storage e preenche a URL do
                vídeo acima automaticamente.
              </Hint>
              <div className="mt-3">
                <button type="button" onClick={uploadVideo} disabled={uploading || !uploadFile} className="btn-ghost">
                  {uploading ? "Enviando..." : "Enviar vídeo"}
                </button>
              </div>
              {uploadError && (
                <p className="mt-2 border border-signal/40 bg-signal/10 p-2 text-caption text-signal">
                  {uploadError}
                </p>
              )}
              {uploadSuccess && (
                <p className="mt-2 text-caption text-ice">Upload concluído — URL preenchida acima.</p>
              )}
            </fieldset>

            <label className="block">
              <FieldLabel>URL de embed (iframe externo)</FieldLabel>
              <input
                className="field"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://player.externo/embed/... ou proxy interno"
              />
              <Hint>
                Se preenchido, o player usa este iframe em vez do vídeo via proxy.
              </Hint>
            </label>

            {/* Importar de outra fonte — scrape + proxy. */}
            <fieldset className="border border-hairline p-4">
              <legend className="px-1 font-sans text-caption uppercase tracking-wider text-mist">
                Importar de outra fonte
              </legend>

              <label className="block">
                <FieldLabel>Fonte</FieldLabel>
                <select
                  className="field"
                  value={source}
                  onChange={(e) => setSource(e.target.value as Source)}
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <Hint>
                  <strong className="text-mist">Scrape</strong> extrai .mp4/.m3u8
                  direto da página (token vinculado ao IP do servidor — funciona
                  local). <strong className="text-mist">Embed URL</strong> gera um
                  iframe via proxy interno do backend (sem XFO), funciona p/ qualquer site.
                </Hint>
              </label>

              <label className="mt-3 block">
                <FieldLabel>URL do episódio</FieldLabel>
                <input
                  className="field"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://animefire.net/...  /  https://animesonlinecc.to/...  /  ..."
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={scrapeSource}
                  disabled={scraping || !sourceUrl}
                  className="btn-ice"
                >
                  {scraping ? "Extraindo..." : "Extrair vídeo"}
                </button>
                <button
                  type="button"
                  onClick={gerarEmbedProxy}
                  disabled={!sourceUrl}
                  className="btn-ghost"
                >
                  Gerar embed URL (iframe)
                </button>
              </div>

              {scrapeError && (
                <p className="mt-3 border border-signal/40 bg-signal/10 p-2 text-caption text-signal">
                  {scrapeError}
                </p>
              )}

              {scrapeVideos.length > 0 && (
                <div className="mt-3">
                  <span className="font-display text-caption uppercase tracking-wider text-mist">
                    Vídeos .mp4 encontrados
                  </span>
                  <ul className="mt-1.5 space-y-1">
                    {scrapeVideos.map((v, i) => (
                      <li key={i} className="break-all">
                        <a
                          href="#"
                          className="text-ice transition-colors hover:opacity-70"
                          onClick={(e) => {
                            e.preventDefault();
                            setVideoUrl(v);
                          }}
                        >
                          usar esta URL
                        </a>{" "}
                        <code className="text-caption text-mist">{v}</code>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="btn-ghost mt-2" onClick={() => setVideoUrl(scrapeVideos[0])}>
                    Usar primeira URL
                  </button>
                </div>
              )}

              {scrapeIframes.length > 0 && (
                <div className="mt-3">
                  <span className="font-display text-caption uppercase tracking-wider text-mist">
                    Iframes encontrados
                  </span>
                  <ul className="mt-1.5 space-y-1">
                    {scrapeIframes.map((v, i) => (
                      <li key={i} className="break-all">
                        <a
                          href="#"
                          className="text-ice transition-colors hover:opacity-70"
                          onClick={(e) => {
                            e.preventDefault();
                            setEmbedUrl(v);
                          }}
                        >
                          usar este iframe
                        </a>{" "}
                        <code className="text-caption text-mist">{v}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </fieldset>

            <label className="block">
              <FieldLabel>Thumbnail (URL)</FieldLabel>
              <input
                className="field"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://.../thumb.jpg"
              />
            </label>

            <label className="block">
              <FieldLabel>Título</FieldLabel>
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>

            <label className="block">
              <FieldLabel>Duração</FieldLabel>
              <input
                className="field"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="24 min"
              />
            </label>

            {error && (
              <p className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">{error}</p>
            )}
            {saved && (
              <p className="border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">Alterações salvas.</p>
            )}

            <button type="submit" disabled={saving} className="btn-ice">
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            <div className="mt-6 border border-signal/30 bg-signal/5 p-4">
              <span className="block font-sans text-caption uppercase tracking-wider text-signal">
                Zona de exclusão
              </span>
              {confirmDelete ? (
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-body-sm text-signal">
                    Confirmar exclusão do EP {number} de {episode?.anime?.title ?? slug}?
                  </span>
                  <button
                    type="button"
                    onClick={deleteEpisode}
                    disabled={deleting}
                    className="btn-ice"
                    style={{ background: "#FF7847", borderColor: "#FF7847", color: "#0B0E14" }}
                  >
                    {deleting ? "Excluindo..." : "Excluir definitivamente"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="btn-ghost"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="btn-ghost mt-2 text-signal"
                >
                  Deletar este episódio
                </button>
              )}
            </div>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
