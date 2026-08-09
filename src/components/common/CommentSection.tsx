"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { CommentItem } from "@/types";

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

  async function handleDelete(id: string) {
    if (!confirm("Excluir este comentário?")) return;
    try {
      await api.deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao excluir.");
    }
  }

  async function handleLike(id: string) {
    if (!user) return;
    try {
      await api.toggleCommentLike(id);
      setComments((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                _count: {
                  ...(c._count ?? { likes: 0, replies: 0 }),
                  likes: c._count?.likes ?? 0,
                },
              }
            : c
        )
      );
    } catch {
      // silent fail
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
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva um comentário..."
            maxLength={1000}
            rows={3}
            className="field w-full resize-none"
          />
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
          <a href="/login" className="text-ice underline">Entre</a> para comentar.
        </p>
      )}

      {error && (
        <p className="mb-4 text-body-sm text-signal">{error}</p>
      )}

      {loading ? (
        <p className="text-body-sm text-mist">Carregando...</p>
      ) : comments.length === 0 ? (
        <p className="text-body-sm text-mist">Nenhum comentário ainda. Seja o primeiro!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onDelete={handleDelete}
              onLike={handleLike}
              animeId={animeId}
              episodeId={episodeId}
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

function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onLike,
  animeId,
  episodeId,
}: {
  comment: CommentItem;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  animeId?: string;
  episodeId?: string;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [reply, setReply] = useState("");
  const [replies, setReplies] = useState<CommentItem[]>(comment.replies ?? []);
  const [replyCount, setReplyCount] = useState(comment._count?.replies ?? 0);
  const [showAllReplies, setShowAllReplies] = useState(false);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
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
    } catch {
      // silent
    }
  }

  async function loadAllReplies() {
    try {
      const res = await api.getCommentReplies(comment.id);
      setReplies(res.data);
      setShowAllReplies(true);
    } catch {
      // silent
    }
  }

  const isOwner = currentUserId === comment.userId;
  const likeCount = comment._count?.likes ?? 0;

  return (
    <div className="border-l-2 border-hairline pl-4">
      <div className="flex items-start gap-3">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden bg-hairline">
          {comment.user.avatar ? (
            <Image src={comment.user.avatar} alt="" fill sizes="32px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-caption text-mist">
              {(comment.user.name ?? "?")[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-sans text-body-sm font-medium text-ice">
              {comment.user.name ?? "Anônimo"}
            </span>
            <span className="font-mono text-caption text-mist">
              {new Date(comment.createdAt).toLocaleDateString("pt-BR")}
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
              className="inline-flex items-center gap-1 font-mono text-caption text-mist transition-colors hover:text-ice"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M8 13.5S1.5 9.7 1.5 5.5A3.3 3.3 0 0 1 8 4a3.3 3.3 0 0 1 6.5 1.5C14.5 9.7 8 13.5 8 13.5Z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
              {likeCount > 0 ? likeCount : ""}
            </button>
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="font-mono text-caption text-mist transition-colors hover:text-ice"
            >
              Responder
            </button>
            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                className="font-mono text-caption text-mist transition-colors hover:text-signal"
              >
                Excluir
              </button>
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

          {showReplyForm && currentUserId && (
            <form onSubmit={handleReply} className="mt-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Responda..."
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
                    <span className="font-sans text-body-sm font-medium text-ice">
                      {r.user.name ?? "Anônimo"}
                    </span>
                    <span className="font-mono text-caption text-mist">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
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
