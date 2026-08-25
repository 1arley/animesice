"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/time";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
import type { PostCommentItem, SocialPost } from "@/types";

/**
 * FeedPost — card de um post do feed: autor, texto, anime referenciado e
 * ações (curtir, comentar, compartilhar, excluir o próprio post).
 * Comentários carregam sob demanda quando a seção é aberta.
 */
export function FeedPost({
  post,
  onDelete,
  onShare,
}: {
  post: SocialPost;
  onDelete?: (id: string) => void;
  onShare?: (id: string, shareCount: number) => void;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.hasLiked);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [likeBusy, setLikeBusy] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostCommentItem[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(post._count.comments);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [shareCount, setShareCount] = useState(post.shareCount);
  const [shared, setShared] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isMine = !!user && user.id === post.user.id;
  const authorName = post.user.name?.trim() || post.user.userName || "Usuário";
  const authorHref = `/users/${post.user.userName ?? post.user.id}`;

  async function handleLike() {
    if (!user || likeBusy) return;
    setLikeBusy(true);
    const before = { liked, likeCount };
    setLiked((l) => !l);
    setLikeCount((c) => c + (liked ? -1 : 1));
    try {
      const res = await api.togglePostLike(post.id);
      setLiked(res.liked);
    } catch {
      setLiked(before.liked);
      setLikeCount(before.likeCount);
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleShare() {
    if (!user || shareBusy) return;
    setShareBusy(true);
    try {
      const res = await api.sharePost(post.id);
      setShareCount(res.shareCount);
      setShared(true);
      onShare?.(post.id, res.shareCount);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* silencioso */
    } finally {
      setShareBusy(false);
    }
  }

  async function openComments() {
    setCommentsOpen(true);
    if (comments.length > 0) return;
    setCommentsLoading(true);
    try {
      const res = await api.getPostComments(post.id, 1, 20);
      setComments(res.data ?? []);
      setCommentsPage(1);
      setCommentsHasMore(1 < (res.meta?.totalPages ?? 1));
    } catch {
      /* vazio */
    } finally {
      setCommentsLoading(false);
    }
  }

  async function loadMoreComments() {
    const next = commentsPage + 1;
    try {
      const res = await api.getPostComments(post.id, next, 20);
      setComments((prev) => [...prev, ...(res.data ?? [])]);
      setCommentsPage(next);
      setCommentsHasMore(next < (res.meta?.totalPages ?? 1));
    } catch {
      /* vazio */
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !commentText.trim() || commentBusy) return;
    setCommentBusy(true);
    setCommentError("");
    try {
      const created = await api.createPostComment(post.id, commentText.trim());
      setComments((prev) => [...prev, created]);
      setCommentsTotal((t) => t + 1);
      setCommentText("");
      setCommentsOpen(true);
    } catch (err) {
      setCommentError(
        err instanceof ApiError ? err.message : "Erro ao comentar.",
      );
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleDelete() {
    if (!isMine || deleting) return;
    if (!window.confirm("Excluir este post?")) return;
    setDeleting(true);
    try {
      await api.deletePost(post.id);
      onDelete?.(post.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <article className="border border-hairline bg-panel p-4">
      {/* Autor */}
      <header className="flex items-center gap-3">
        <Link href={authorHref}>
          <Avatar name={authorName} src={post.user.avatar} size={36} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={authorHref}
            className="block truncate font-medium text-snow transition-colors hover:text-ice"
          >
            {authorName}
          </Link>
          <p className="font-mono text-caption text-mist/70">
            @{post.user.userName ?? post.user.id} · {timeAgo(post.createdAt)}
          </p>
        </div>
        {isMine && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="font-mono text-caption text-mist/60 transition-colors hover:text-signal"
          >
            {deleting ? "…" : "Excluir"}
          </button>
        )}
      </header>

      {/* Conteúdo */}
      <p className="mt-3 whitespace-pre-line text-body text-snow">
        {post.content}
      </p>

      {post.anime && (
        <Link
          href={`/animes/${post.anime.slug}`}
          className="mt-3 flex items-center gap-3 border border-hairline bg-slate/40 p-2 transition-colors hover:border-ice/50"
        >
          {post.anime.coverImage ? (
            <div className="card-scan relative h-14 w-10 shrink-0 overflow-hidden bg-hairline">
              <Image
                src={safeImageSrc(post.anime.coverImage) ?? ""}
                alt={post.anime.title}
                fill
                sizes="40px"
                placeholder="blur"
                blurDataURL={blur.portrait}
                className="object-cover"
                quality={80}
              />
            </div>
          ) : (
            <div className="card-scan flex h-14 w-10 shrink-0 items-center justify-center bg-hairline font-mono text-caption text-mist">
              {post.anime.title[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-mono text-caption uppercase tracking-wider text-mist">
              falando sobre
            </p>
            <p className="truncate font-display text-body font-semibold text-ice">
              {post.anime.title}
            </p>
          </div>
        </Link>
      )}

      {/* Ações */}
      <footer className="mt-3 flex items-center gap-4 border-t border-hairline pt-3 font-mono text-caption">
        <button
          type="button"
          onClick={handleLike}
          disabled={!user || likeBusy}
          title={user ? "Curtir post" : "Entre para curtir"}
          className={`inline-flex min-h-11 items-center gap-1.5 py-2 transition-colors ${
            liked ? "text-signal" : "text-mist/70 hover:text-signal"
          } ${user ? "cursor-pointer" : "cursor-default"}`}
        >
          <HeartGlyph filled={liked} />
          {likeCount > 0 ? likeCount : "Curtir"}
        </button>

        <button
          type="button"
          onClick={openComments}
          className="inline-flex min-h-11 items-center gap-1.5 py-2 text-mist/70 transition-colors hover:text-ice"
        >
          <CommentGlyph />
          {commentsTotal > 0 ? commentsTotal : "Comentar"}
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={!user || shareBusy}
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 py-2 text-mist/70 transition-colors hover:text-ice disabled:cursor-default"
        >
          <ShareGlyph />
          {shared ? "Copiado!" : shareCount > 0 ? `Compartilhar · ${shareCount}` : "Compartilhar"}
        </button>
      </footer>

      {/* Comentários (sob demanda) */}
      {commentsOpen && (
        <div className="mt-3 space-y-2 border-t border-hairline pt-3">
          {commentsLoading ? (
            <div className="flex items-center justify-center py-4" aria-busy="true">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-ice border-t-transparent" />
              <span className="ml-2 font-mono text-caption text-mist/60">Carregando...</span>
            </div>
          ) : comments.length === 0 ? (
            <EmptyState
              text="Nenhum comentário ainda."
              variant="compact"
            />
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <Link href={`/users/${c.user.userName ?? c.user.id}`}>
                  <Avatar
                    name={c.user.name || c.user.userName}
                    src={c.user.avatar}
                    size={24}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm">
                    <Link
                      href={`/users/${c.user.userName ?? c.user.id}`}
                      className="font-medium text-ice transition-colors hover:text-snow"
                    >
                      {c.user.name || c.user.userName || "Usuário"}
                    </Link>{" "}
                    <span className="text-mist/80">{c.content}</span>
                  </p>
                  <p className="font-mono text-caption text-mist/50">
                    {timeAgo(c.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}

          {commentsHasMore && (
            <button
              type="button"
              onClick={loadMoreComments}
              className="btn-ghost px-3 py-1.5 text-caption"
            >
              Carregar mais
            </button>
          )}

          {commentError && (
            <p className="font-mono text-caption text-signal">{commentError}</p>
          )}

          {user && (
            <form
              onSubmit={handleComment}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={1000}
                placeholder="Escreva um comentário…"
                className="field flex-1"
              />
              <button
                type="submit"
                disabled={commentBusy || !commentText.trim()}
                className="btn-ghost"
              >
                {commentBusy ? "…" : "Enviar"}
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

function HeartGlyph({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 13.5S1.5 9.7 1.5 5.5A3.3 3.3 0 0 1 8 4a3.3 3.3 0 0 1 6.5 1.5C14.5 9.7 8 13.5 8 13.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2 2.5h12v9H6l-3.5 2.5v-2.5H2v-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 2l4 4-4 4V7.2C4.5 7.4 2.8 9 2.2 12c-.4-2.2.3-4.4 3.3-5.2L8 4.9V2Z"
        fill="currentColor"
      />
    </svg>
  );
}
