"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import type { Anime, Genre } from "@/types";

function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

export default function AdminCreateAnimePage() {
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [synopsis, setSynopsis] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [rating, setRating] = useState("");
  const [status, setStatus] = useState("LANCAMENTO");
  const [audio, setAudio] = useState<"LEGENDADO" | "DUBLADO">("LEGENDADO");
  const [ageRating, setAgeRating] = useState("A14");
  const [genreSlugs, setGenreSlugs] = useState<string[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Anime | null>(null);

  useEffect(() => {
    if (user?.role !== "ADMIN" && user?.role !== "SUPERADMIN") return;
    api
      .adminListGenres()
      .then(setGenres)
      .catch(() => {});
  }, [user]);

  const computedSlug = slugTouched ? slug : slugify(title);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!title.trim()) {
      setError("Título é obrigatório.");
      return;
    }
    if (!computedSlug.trim()) {
      setError("Slug não pode ser vazio.");
      return;
    }

    setSubmitting(true);
    try {
      const anime = await api.adminCreateAnime({
        slug: computedSlug,
        title: title.trim(),
        synopsis: synopsis || undefined,
        coverImage: coverImage || undefined,
        bannerImage: bannerImage || undefined,
        rating: rating ? Number(rating) : undefined,
        status,
        audio,
        ageRating,
        genreSlugs: genreSlugs.length ? genreSlugs : undefined,
      });
      setResult(anime);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar anime.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <>
        <Header />
        <SiteNav />
        <main className="mx-auto max-w-shelf px-4 py-10 text-body-sm text-mist">Carregando...</main>
      </>
    );
  }
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
        <h1 className="font-display text-display-xl text-ink">Criar anime manual</h1>
        <p className="mt-2 text-body-sm text-mist">
          Cadastro manual de anime. Para metadados automáticos (capa, sinopse,
          gêneros), use a{" "}
          <a href="/admin/import" className="text-ice transition-colors hover:opacity-70">
            importação do AniList
          </a>.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Título *
            </span>
            <input
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Sousou no Frieren"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Slug (URL)
            </span>
            <input
              className="field"
              value={computedSlug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="gerado automaticamente do título"
            />
            <span className="mt-1 block text-caption text-mist">
              Identificador único na URL. Auto-gerado do título; editável se necessário.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Sinopse
            </span>
            <textarea
              className="field min-h-[80px]"
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Descrição do anime..."
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Capa (URL da imagem)
            </span>
            <input
              className="field"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://.../cover.jpg"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Banner (URL da imagem)
            </span>
            <input
              className="field"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="https://.../banner.jpg"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                Status
              </span>
              <select
                className="field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="LANCAMENTO">Lançamento</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="PAUSADO">Pausado</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                Áudio
              </span>
              <select
                className="field"
                value={audio}
                onChange={(e) => setAudio(e.target.value as "LEGENDADO" | "DUBLADO")}
              >
                <option value="LEGENDADO">Legendado</option>
                <option value="DUBLADO">Dublado</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                Rating (0-10)
              </span>
              <input
                className="field"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="ex: 8.5"
                inputMode="decimal"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                Classificação etária
              </span>
              <select
                className="field"
                value={ageRating}
                onChange={(e) => setAgeRating(e.target.value)}
              >
                <option value="A10">A10</option>
                <option value="A14">A14</option>
                <option value="A16">A16</option>
                <option value="A18">A18</option>
              </select>
            </label>
          </div>

          {genres.length > 0 && (
            <div>
              <span className="mb-2 block font-sans text-caption uppercase tracking-wider text-mist">
                Gêneros
              </span>
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => {
                  const active = genreSlugs.includes(g.slug);
                  return (
                    <button
                      key={g.slug}
                      type="button"
                      onClick={() => {
                        setGenreSlugs((prev) =>
                          prev.includes(g.slug)
                            ? prev.filter((s) => s !== g.slug)
                            : [...prev, g.slug],
                        );
                      }}
                      className={
                        active
                          ? "btn-ice text-caption"
                          : "btn-ghost text-caption"
                      }
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
              <span className="mt-1 block text-caption text-mist">
                {genreSlugs.length} selecionado(s)
              </span>
            </div>
          )}

          {error && (
            <p role="alert" className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-ice">
            {submitting ? "Criando..." : "Criar anime"}
          </button>
        </form>

        {result && (
          <div className="mt-6 border border-hairline bg-panel p-4">
            <p className="text-body-sm text-ice">Anime criado com sucesso!</p>
            <p className="mt-1 text-body text-ink">
              <strong>{result.title}</strong>{" "}
              <code className="text-mist">/{result.slug}</code>
            </p>
            <p className="mt-2 flex gap-3 text-body-sm">
              <a href={`/animes/${result.slug}`} className="text-ice transition-colors hover:opacity-70">
                ver no site
              </a>
              <span className="text-hairline">·</span>
              <a href={`/admin/episode/${result.slug}/1`} className="text-ice transition-colors hover:opacity-70">
                editar ep 1
              </a>
              <span className="text-hairline">·</span>
              <a href={`/admin/create-episode/${result.slug}`} className="text-ice transition-colors hover:opacity-70">
                criar episódio
              </a>
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
