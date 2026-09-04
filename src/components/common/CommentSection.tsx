"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { HeartIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/time";
import type { CommentItem } from "@/types";
import { Avatar } from "@/components/common/Avatar";

interface CommentSectionProps {
  animeId?: string;
  episodeId?: string;
  title?: string;
}

export function CommentSection({ animeId, episodeId, title = "Comentários" }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchComments = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      const list = animeId
        ? await api.listAnimeComments(animeId, pageNum)
        : await api.listEpisodeComments(episodeId!, pageNum);

      if (append) {
        setComments((prev) => [...prev, ...list]);
      } else {
        setComments(list);
      }
      setHasMore(list.length >= 50);
    } catch {
      setError("Erro ao carregar comentários.");
    } finally {
      setLoading(false);
    }
  }, [animeId, episodeId]);

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const comment = await api.createComment({
        content: newComment,
        animeId,
        episodeId,
      });
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao comentar.");
    } finally {
      setSubmitting(false);
    }
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirmDeleteId) {
      setConfirmDeleteId(id);
      return;
    }
    if (id !== confirmDeleteId) {
      setConfirmDeleteId(id);
      return;
    }
    try {
      await api.deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao excluir.");
      setConfirmDeleteId(null);
    }
  }

  async function handleLike(id: string) {
    if (!user) return;
    setError("");
    try {
      const res = await api.toggleCommentLike(id);
      setComments((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                _count: {
                  ...(c._count ?? { likes: 0, replies: 0 }),
                  likes: Math.max(0, (c._count?.likes ?? 0) + (res.liked ? 1 : -1)),
                },
              }
            : c,
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao curtir.");
    }
  }

  return (
    <section className="mt-8">
      <h2 className="shelf-label">
        {title}{" "}
        {comments.length > 0 && (
          <span className="shelf-label-data">{comments.length}</span>
        )}
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex items-start gap-3">
            <Avatar
              name={user.userName || user.name}
              src={user.avatar}
              size={32}
            />
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              aria-label="Escrever comentário"
              maxLength={1000}
              rows={3}
              className="field w-full resize-none"
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-caption text-mist">
              {newComment.length}/1000
            </span>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="btn-ice"
            >
              {submitting ? "Enviando..." : "Comentar"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-4 text-body-sm text-mist">
          <Link href="/login" className="text-ice underline">Entre</Link> para comentar.
        </p>
      )}

      {error && (
        <p className="mb-4 text-body-sm text-signal">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8" aria-busy="true">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-ice border-t-transparent" />
          <span className="ml-2 text-body-sm text-mist">Carregando...</span>
        </div>
      ) : comments.length === 0 ? (
        <EmptyState
          text="Nenhum comentário ainda. Seja o primeiro!"
          variant="compact"
        />
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onDelete={handleDelete}
              onLike={handleLike}
              animeId={animeId}
              episodeId={episodeId}
              confirmingDelete={confirmDeleteId === comment.id}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => {
                const next = page + 1;
                setPage(next);
                fetchComments(next, true);
              }}
              className="btn-ghost"
            >
              Carregar mais
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function CommentRow({
  comment,
  currentUserId,
  onDelete,
  onLike,
  animeId,
  episodeId,
  confirmingDelete,
  onCancelDelete,
}: {
  comment: CommentItem;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  animeId?: string;
  episodeId?: string;
  confirmingDelete: boolean;
  onCancelDelete: () => void;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [reply, setReply] = useState("");
  const [replies, setReplies] = useState<CommentItem[]>(comment.replies ?? []);
  const [replyCount, setReplyCount] = useState(comment._count?.replies ?? 0);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [replyError, setReplyError] = useState("");

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    if (!currentUserId) {
      setReplyError("Faça login para responder.");
      return;
    }
    setReplyError("");
    try {
      const newReply = await api.createComment({
        content: reply,
        animeId,
        episodeId,
        parentId: comment.id,
      });
      setReplies((prev) => [...prev, newReply]);
      setReplyCount((prev) => prev + 1);
      setReply("");
      setShowReplyForm(false);
    } catch (err) {
      setReplyError(err instanceof ApiError ? err.message : "Não foi possível enviar a resposta.");
    }
  }

  async function loadAllReplies() {
    try {
      const res = await api.getCommentReplies(comment.id);
      setReplies(res.data);
      setShowAllReplies(true);
    } catch (err) {
      setReplyError(err instanceof ApiError ? err.message : "Não foi possível carregar as respostas.");
    }
  }

  const isOwner = currentUserId === comment.userId;
  const likeCount = comment._count?.likes ?? 0;

  return (
    <div className="border-l-2 border-hairline pl-4">
      <div className="flex items-start gap-3">
        <Avatar
          name={comment.user.userName || comment.user.name}
          src={comment.user.avatar}
          size={32}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-sans text-body-sm font-medium text-ice">
              {comment.user.userName || comment.user.name || "Anônimo"}
            </span>
            <span className="font-mono text-caption text-mist">
              {formatDate(comment.createdAt)}
            </span>
            {comment.edited && (
              <span className="text-caption text-mist">(editado)</span>
            )}
          </div>
          <p className="mt-1 whitespace-pre-line text-body text-mist">
            {comment.content}
          </p>
          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={() => onLike(comment.id)}
              aria-label="Curtir comentário"
              className="inline-flex min-h-11 items-center gap-1 px-2 py-2 font-mono text-caption text-mist transition-colors hover:text-ice"
            >
              <HeartIcon filled />
              {likeCount > 0 ? likeCount : ""}
            </button>
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="font-mono text-caption text-mist transition-colors hover:text-ice"
            >
              Responder
            </button>
            {isOwner && (
              confirmingDelete ? (
                <span className="inline-flex items-center gap-2">
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="font-mono text-caption text-signal transition-colors hover:opacity-70"
                  >
                    Confirmar?
                  </button>
                  <button
                    onClick={onCancelDelete}
                    className="font-mono text-caption text-mist transition-colors hover:text-ice"
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="font-mono text-caption text-mist transition-colors hover:text-signal"
                >
                  Excluir
                </button>
              )
            )}
            {replyCount > replies.length && !showAllReplies && (
              <button
                onClick={loadAllReplies}
                className="font-mono text-caption text-mist transition-colors hover:text-ice"
              >
                Ver {replyCount} respostas
              </button>
            )}
          </div>

          {replyError && (
            <p className="mt-2 text-caption text-signal">
              {replyError}{" "}
              {!currentUserId && (
                <Link href="/login" className="text-ice underline">Ir para login</Link>
              )}
            </p>
          )}

          {showReplyForm && currentUserId && (
            <form onSubmit={handleReply} className="mt-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Responda..."
                aria-label="Responder comentário"
                maxLength={1000}
                rows={2}
                className="field w-full resize-none"
              />
              <button type="submit" disabled={!reply.trim()} className="btn-ghost mt-2">
                Responder
              </button>
            </form>
          )}

          {replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {replies.map((r) => (
                <div key={r.id} className="border-l-2 border-hairline pl-3">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={r.user.userName || r.user.name}
                      src={r.user.avatar}
                      size={20}
                    />
                    <span className="font-sans text-body-sm font-medium text-ice">
                      {r.user.userName || r.user.name || "Anônimo"}
                    </span>
                    <span className="font-mono text-caption text-mist">
                      {formatDate(r.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line text-body-sm text-mist">
                    {r.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}