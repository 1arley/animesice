"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import { FieldLabel, Hint } from "@/components/admin/Field";
import { VideoUploadPanel } from "@/components/admin/VideoUploadPanel";
import { ScrapeImportPanel } from "@/components/admin/ScrapeImportPanel";
import { DeleteZone } from "@/components/admin/DeleteZone";
import type { Episode, Anime } from "@/types";

export default function AdminEditEpisodePage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { user } = useAuth();
  const router = useRouter();
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

  useEffect(() => {
    params.then((p) => {
      setSlug(p.slug);
      setNumber(Number(p.number));
    });
  }, [params]);

  useEffect(() => {
    if (!slug || number == null) return;
    if (!isPrivileged(user)) return;
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

  return (
    <div className="mx-auto px-4 py-6" style={{ maxWidth: 720 }}>
      <p className="mb-4">
        <Link href="/admin" className="text-body-sm text-mist transition-colors hover:text-ice">
          ← Painel
        </Link>
      </p>
        <h1 className="font-display text-display-xl text-snow">Editar episódio</h1>
        {episode && (
          <p className="mt-1 text-body-sm text-mist">
            {episode.anime.title} — EP {episode.number}
            <br />
            <Link href={`/animes/${slug}`} className="text-ice transition-colors hover:opacity-70">
              ver no site
            </Link>
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

            <VideoUploadPanel
              slug={slug}
              number={number ?? 1}
              onUploaded={setVideoUrl}
            />

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

            <ScrapeImportPanel
              onUseVideo={setVideoUrl}
              onUseIframe={setEmbedUrl}
            />

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

            {number != null && (
              <DeleteZone
                slug={slug}
                number={number}
                animeTitle={episode?.anime?.title ?? slug}
                onDeleted={() => router.push(`/animes/${slug}`)}
              />
            )}
          </form>
        )}
    </div>
  );
}
