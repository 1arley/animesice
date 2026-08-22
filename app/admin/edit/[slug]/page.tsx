"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import type { Anime } from "@/types";

export default function AdminEditAnimePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [slug, setSlug] = useState("");
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loadingAnime, setLoadingAnime] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [rating, setRating] = useState("");
  const [status, setStatus] = useState("LANCAMENTO");
  const [ageRating, setAgeRating] = useState("A14");
  const [editorialSynopsis, setEditorialSynopsis] = useState("");
  const [editorialWhereToWatch, setEditorialWhereToWatch] = useState("");
  const [editorialDubbingInfo, setEditorialDubbingInfo] = useState("");
  const [editorialSeasonsInfo, setEditorialSeasonsInfo] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug || !isPrivileged(user)) return;
    setLoadingAnime(true);
    api
      .getAnime(slug)
      .then((a) => {
        setAnime(a);
        setTitle(a.title ?? "");
        setSynopsis(a.synopsis ?? "");
        setCoverImage(a.coverImage ?? "");
        setBannerImage(a.bannerImage ?? "");
        setRating(a.rating != null ? String(a.rating) : "");
        setStatus(
          ["COMPLETO", "CONCLUIDO"].includes(a.status ?? "")
            ? "FINALIZADO"
            : (a.status ?? "LANCAMENTO"),
        );
        setAgeRating(a.ageRating ?? "A14");
        setEditorialSynopsis(a.editorialSynopsis ?? "");
        setEditorialWhereToWatch(a.editorialWhereToWatch ?? "");
        setEditorialDubbingInfo(a.editorialDubbingInfo ?? "");
        setEditorialSeasonsInfo(a.editorialSeasonsInfo ?? "");
      })
      .catch((e) =>
        setLoadErr(e instanceof ApiError ? e.message : "Erro ao carregar anime."),
      )
      .finally(() => setLoadingAnime(false));
  }, [slug, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setError(null);
    setSaved(false);

    setSaving(true);
    try {
      await api.adminUpdateAnime(slug, {
        title: title.trim() || undefined,
        synopsis: synopsis || undefined,
        coverImage: coverImage || undefined,
        bannerImage: bannerImage || undefined,
        rating: rating ? Number(rating) : undefined,
        status,
        ageRating,
        editorialSynopsis: editorialSynopsis || undefined,
        editorialWhereToWatch: editorialWhereToWatch || undefined,
        editorialDubbingInfo: editorialDubbingInfo || undefined,
        editorialSeasonsInfo: editorialSeasonsInfo || undefined,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar anime.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!slug || !anime) return;
    if (!window.confirm(`Deletar "${anime.title}"? Esta ação é irreversível.`)) return;
    setSaving(true);
    try {
      await api.adminDeleteAnime(slug);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao deletar anime.");
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
        <h1 className="font-display text-display-xl text-snow">Editar anime</h1>
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

        {loadingAnime ? (
          <p className="mt-4 text-body-sm text-mist">Carregando...</p>
        ) : loadErr ? (
          <p className="mt-4 text-body-sm text-signal">{loadErr}</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                Título
              </span>
              <input
                className="field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                Sinopse
              </span>
              <textarea
                className="field min-h-[80px]"
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                Capa (URL)
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
                Banner (URL)
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
                  <option value="FINALIZADO">Finalizado</option>
                  <option value="EM_BREVE">Em breve</option>
                  <option value="PAUSADO">Pausado</option>
                </select>
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

            <fieldset className="space-y-4 border border-hairline bg-panel/30 p-4">
              <legend className="px-2 font-sans text-caption uppercase tracking-wider text-ice">
                Campos editoriais (CMS)
              </legend>

              <label className="block">
                <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                  Sinopse editorial
                </span>
                <textarea
                  className="field min-h-[80px]"
                  value={editorialSynopsis}
                  onChange={(e) => setEditorialSynopsis(e.target.value)}
                  placeholder="Sobrescreve a sinopse automática quando preenchido"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                  Onde assistir (custom)
                </span>
                <input
                  className="field"
                  value={editorialWhereToWatch}
                  onChange={(e) => setEditorialWhereToWatch(e.target.value)}
                  placeholder="Default: Assista no AnimesIce"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                  Info de dublagem (custom)
                </span>
                <input
                  className="field"
                  value={editorialDubbingInfo}
                  onChange={(e) => setEditorialDubbingInfo(e.target.value)}
                  placeholder="Ex: Dublagem brasileira pelo estúdio X"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                  Info de temporadas (custom)
                </span>
                <input
                  className="field"
                  value={editorialSeasonsInfo}
                  onChange={(e) => setEditorialSeasonsInfo(e.target.value)}
                  placeholder="Ex: 2 temporadas, 24 episódios no total"
                />
              </label>
            </fieldset>

            {error && (
              <p role="alert" className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
                {error}
              </p>
            )}
            {saved && (
              <p className="border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
                Alterações salvas.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="btn-ice">
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className="btn-ghost text-signal"
              >
                Deletar anime
              </button>
            </div>
          </form>
        )}
    </div>
  );
}
