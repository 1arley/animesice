"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BlogForm } from "@/components/blog/BlogForm";
import { api, ApiError } from "@/lib/api";
import type { BlogPost } from "@/types";

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { params.then(({ id }) => api.adminGetBlogPost(id)).then(setPost).catch((cause) => setError(cause instanceof ApiError ? cause.message : "Não foi possível carregar o artigo.")); }, [params]);
  return <div className="mx-auto max-w-4xl"><Link href="/admin/blog" className="text-body-sm text-mist hover:text-ice">← Blog</Link>{error ? <div role="alert" className="mt-4 border border-signal/40 bg-signal/10 p-3 text-signal">{error}</div> : !post ? <div className="admin-empty mt-4">Carregando artigo…</div> : <><div className="mt-4 flex flex-wrap items-center gap-3"><h1 className="font-display text-display-xl text-snow">Editar artigo</h1><span className={`badge ${post.published ? "badge-ice" : "badge-muted"}`}>{post.published ? "Publicado" : "Rascunho"}</span></div><p className="mt-1 text-body-sm text-mist"><Link href={`/blog/${post.slug}`} className="text-ice hover:underline">Ver página pública ↗</Link></p><BlogForm post={post} /></>}</div>;
}
