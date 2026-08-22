"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { BlogPost } from "@/types";

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const result = await api.adminListBlogPosts(1, 100); setPosts(Array.isArray(result) ? result : result.data ?? []); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível carregar os artigos."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(post: BlogPost) {
    if (!window.confirm(`Excluir “${post.title}”? Esta ação não pode ser desfeita.`)) return;
    setDeleting(post.id); setError(null);
    try { await api.adminDeleteBlogPost(post.id); setPosts((items) => items.filter((item) => item.id !== post.id)); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível excluir o artigo."); }
    finally { setDeleting(null); }
  }

  return <>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-3"><h1 className="font-display text-display-xl text-snow">Blog</h1><span className="badge badge-muted"><span className="badge-dot bg-ice" />{posts.length} artigos</span></div><p className="mt-1 text-body-sm text-mist">Publique guias, notícias e listas sem alterar o código do site.</p></div>
      <Link href="/admin/blog/novo" className="btn-ice min-h-11">Novo artigo</Link>
    </div>
    {error && <div role="alert" className="mt-5 flex items-center justify-between gap-3 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"><span>{error}</span><button type="button" className="underline" onClick={load}>Tentar novamente</button></div>}
    {loading ? <div className="admin-empty mt-6">Carregando artigos…</div> : posts.length === 0 ? <div className="admin-empty mt-6"><p>Nenhum artigo cadastrado.</p><Link href="/admin/blog/novo" className="mt-3 inline-block text-ice hover:underline">Criar o primeiro artigo</Link></div> : <div className="mt-6 overflow-x-auto border border-hairline"><table className="admin-table"><thead><tr><th>Artigo</th><th>Categoria</th><th>Status</th><th>Publicação</th><th className="text-right">Ações</th></tr></thead><tbody>{posts.map((post) => <tr key={post.id}><td><Link href={`/admin/blog/${post.id}`} className="font-medium text-snow hover:text-ice">{post.title}</Link><code className="mt-1 block text-caption text-mist">/{post.slug}</code></td><td>{post.category}</td><td><span className={`badge ${post.published ? "badge-ice" : "badge-muted"}`}><span className={`badge-dot ${post.published ? "bg-ice" : "bg-mist"}`} />{post.published ? "Publicado" : "Rascunho"}</span></td><td className="whitespace-nowrap font-mono text-caption">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("pt-BR") : "—"}</td><td><div className="flex min-w-max justify-end gap-2"><Link href={`/admin/blog/${post.id}`} className="admin-tab min-h-11">Editar</Link><button type="button" className="admin-tab min-h-11 text-signal" disabled={deleting === post.id} onClick={() => remove(post)}>{deleting === post.id ? "Excluindo…" : "Excluir"}</button></div></td></tr>)}</tbody></table></div>}
  </>;
}
