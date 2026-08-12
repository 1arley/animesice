"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import type { Episode, Anime } from "@/types";

export default function AdminCreateEpisodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { user } = useAuth();
  const [slug, setSlug] = useState("");
  const [anime, setAnime] = useState<Anime | null>(null);

  const [number, setNumber] = useState("1");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [duration, setDuration] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Episode | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug || !isPrivileged(user)) return;
    api
      .getAnime(slug)
      .then(setAnime)
      .catch(() => {});
  }, [slug, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!slug) {
      setError("Anime não identificado.");
      return;
    }
    const num = Number(number);
    if (!num || num < 1) {
      setError("Número do episódio deve ser um inteiro positivo.");
      return;
    }

    setSubmitting(true);
    try {
      const ep = await api.adminCreateEpisode(slug, {
        number: num,
        title: title || undefined,
        videoUrl: videoUrl || undefined,
        embedUrl: embedUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        duration: duration || undefined,
      });
      setResult(ep);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar episódio.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto px-4 py-6" style={{ maxWidth: 720 }}>
      <p className="mb-4">
        <Link href="/admin" className="text-body-sm text-mist transition-colors hover:text-ice">
          ← Painel
        </Link>
      </p>
        <h1 className="font-display text-display-xl text-snow">Criar episódio</h1>
        {anime && (
          <p className="mt-1 text-body-sm text-mist">
            <strong className="text-snow">{anime.title}</strong>{" "}
            <code className="text-mist">/{anime.slug}</code>
            <br />
            <Link href={`/animes/${anime.slug}`} className="text-ice transition-colors hover:opacity-70">
              ver no site
            </Link>
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Número do episódio *
            </span>
            <input
              className="field"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              inputMode="numeric"
              placeholder="ex: 1"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Título
            </span>
            <input
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Episódio 1 — A jornada começa"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              URL do vídeo (.mp4 / .m3u8)
            </span>
            <input
              className="field"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://...video.mp4"
            />
            <span className="mt-1 block text-caption text-mist">
              Servido via proxy do backend (suporta seek). Opcional — pode ser
              preenchido depois editando o episódio.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              URL de embed (iframe externo)
            </span>
            <input
              className="field"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://player.externo/embed/... ou proxy interno"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Thumbnail (URL)
            </span>
            <input
              className="field"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://.../thumb.jpg"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Duração
            </span>
            <input
              className="field"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="ex: 24 min"
            />
          </label>

          {error && (
            <p role="alert" className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-ice">
            {submitting ? "Criando..." : "Criar episódio"}
          </button>
        </form>

        {result && (
          <div className="mt-6 border border-hairline bg-panel p-4">
            <p className="text-body-sm text-ice">Episódio criado com sucesso!</p>
            <p className="mt-1 text-body text-snow">
              EP {result.number}
              {result.title ? ` — ${result.title}` : ""}
            </p>
            <p className="mt-2 flex gap-3 text-body-sm">
              <Link
                href={`/admin/episode/${slug}/${result.number}`}
                className="text-ice transition-colors hover:opacity-70"
              >
                editar episódio
              </Link>
              <span className="text-hairline">·</span>
              <Link
                href={`/animes/${slug}/${result.number}`}
                className="text-ice transition-colors hover:opacity-70"
              >
                ver no site
              </Link>
            </p>
          </div>
        )}
    </div>
  );
}
