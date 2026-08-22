"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isLegacyBlogPost } from "@/lib/blog";
import { isPrivileged } from "@/lib/role";
import { useToast } from "@/components/common/ToastProvider";
import type { BlogPost } from "@/types";

export function BlogAdminActions({ post, detail = false }: { post: BlogPost; detail?: boolean }) {
  const { user } = useAuth(); const { toast } = useToast(); const router = useRouter(); const [deleting, setDeleting] = useState(false);
  if (!isPrivileged(user) || isLegacyBlogPost(post)) return null;
  async function remove() {
    if (!window.confirm(`Excluir “${post.title}”? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try { await api.adminDeleteBlogPost(post.id); toast("Artigo excluído.", "success"); detail ? router.replace("/blog") : router.refresh(); }
    catch (cause) { toast(cause instanceof ApiError ? cause.message : "Não foi possível excluir o artigo."); setDeleting(false); }
  }
  return <div className={`flex items-center gap-2 ${detail ? "" : "absolute bottom-3 right-3 z-10"}`} aria-label="Ações administrativas"><Link href={`/admin/blog/${post.id}`} className="admin-tab min-h-11 bg-panel" aria-label={`Editar ${post.title}`}>Editar</Link><button type="button" onClick={remove} disabled={deleting} className="admin-tab min-h-11 bg-panel text-signal" aria-label={`Excluir ${post.title}`}>{deleting ? "Excluindo…" : "Excluir"}</button></div>;
}
