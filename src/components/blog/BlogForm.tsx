"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { BlogPost, BlogPostInput } from "@/types";

function slugify(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function toLocalDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function BlogForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const slugEdited = useRef(Boolean(post));
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [description, setDescription] = useState(post?.description ?? "");
  const [category, setCategory] = useState(post?.category ?? "Guias");
  const [content, setContent] = useState(post?.content ?? "<p></p>");
  const [published, setPublished] = useState(post?.published ?? false);
  const [publishedAt, setPublishedAt] = useState(toLocalDate(post?.publishedAt ?? null));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (published && !publishedAt) setPublishedAt(toLocalDate(new Date().toISOString()));
  }, [published, publishedAt]);

  function changeTitle(value: string) {
    setTitle(value);
    if (!slugEdited.current) setSlug(slugify(value));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!title.trim() || !slug.trim() || !description.trim() || !category.trim() || !content.trim()) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    const dto: BlogPostInput = {
      title: title.trim(), slug: slugify(slug), description: description.trim(),
      category: category.trim(), content: content.trim(), published,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
    };
    setSaving(true);
    try {
      const saved = post
        ? await api.adminUpdateBlogPost(post.id, dto)
        : await api.adminCreateBlogPost(dto);
      router.push(`/admin/blog/${saved.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível salvar o artigo.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!post || !window.confirm(`Excluir “${post.title}”? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await api.adminDeleteBlogPost(post.id);
      router.push("/admin/blog");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível excluir o artigo.");
      setDeleting(false);
    }
  }

  const busy = saving || deleting;
  return (
    <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
      {error && <div role="alert" className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">{error}</div>}
      <section className="admin-card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-caption uppercase tracking-wider text-mist">Título *</span><input className="field" value={title} onChange={(e) => changeTitle(e.target.value)} maxLength={180} required /></label>
          <label className="block"><span className="mb-1.5 block text-caption uppercase tracking-wider text-mist">Slug *</span><input className="field font-mono" value={slug} onChange={(e) => { slugEdited.current = true; setSlug(slugify(e.target.value)); }} maxLength={120} required /><span className="mt-1 block text-caption text-mist">URL permanente do artigo.</span></label>
          <label className="block"><span className="mb-1.5 block text-caption uppercase tracking-wider text-mist">Categoria *</span><input className="field" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} required /></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-caption uppercase tracking-wider text-mist">Descrição *</span><textarea className="field min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={320} required /><span className="mt-1 block text-caption text-mist">Usada nos cards, mecanismos de busca e compartilhamentos.</span></label>
        </div>
      </section>

      <section className="admin-card p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="shelf-label mb-0">Conteúdo HTML *</h2><span className="font-mono text-caption text-mist">{content.length.toLocaleString("pt-BR")} caracteres</span></div>
        <textarea className="field min-h-[420px] resize-y font-mono text-body-sm leading-relaxed" value={content} onChange={(e) => setContent(e.target.value)} spellCheck={false} required />
        <p className="mt-2 text-caption text-mist">Use HTML sem scripts, iframes, formulários ou eventos inline. Esses elementos são removidos na página pública.</p>
      </section>

      <section className="admin-card grid gap-4 p-5 sm:grid-cols-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-hairline bg-ink/30 px-3 py-2"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-ice" /><span><strong className="block text-body-sm text-snow">Publicado</strong><span className="text-caption text-mist">Visível no blog, RSS e sitemap</span></span></label>
        <label className="block"><span className="mb-1.5 block text-caption uppercase tracking-wider text-mist">Data de publicação</span><input type="datetime-local" className="field" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} /></label>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
        <button className="btn-ice min-h-11" type="submit" disabled={busy}>{saving ? "Salvando…" : post ? "Salvar alterações" : "Criar artigo"}</button>
        <Link href="/admin/blog" className="btn-ghost min-h-11">Cancelar</Link>
        {post && <button className="btn-ghost ml-auto min-h-11 text-signal" type="button" onClick={remove} disabled={busy}>{deleting ? "Excluindo…" : "Excluir artigo"}</button>}
      </div>
    </form>
  );
}
