"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { safeImageSrc } from "@/lib/url";
import { timeAgo } from "@/lib/time";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Stars } from "@/components/profile/Stars";
import { Avatar } from "@/components/common/Avatar";
import type { PublicActivityEvent, SocialUser } from "@/types";

/**
 * FeedActivityItem — evento de atividade pública no feed social (watch,
 * rating, favorite, comment) com o autor em destaque, no padrão do
 * ProfileActivity, mas com o usuário próprio de cada evento.
 */
export function FeedActivityItem({
  event,
  user,
}: {
  event: PublicActivityEvent;
  user: SocialUser;
}) {
  const authorName = user.name?.trim() || user.userName || "Usuário";
  const authorHref = `/users/${user.userName ?? user.id}`;

  const cover = event.type === "comment" ? null : safeImageSrc(event.anime.coverImage);
  const animeTitle =
    event.type === "comment"
      ? (event.anime?.title ?? "um anime")
      : event.anime.title;
  const animeSlug =
    event.type === "comment" ? event.anime?.slug : event.anime.slug;

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="card-scan relative w-10 shrink-0 overflow-hidden bg-hairline" style={{ aspectRatio: "2 / 3" }}>
        {cover ? (
          <Image src={cover} alt="" fill sizes="40px" className="object-cover" />
        ) : event.type === "comment" ? (
          <span className="absolute inset-0 flex items-center justify-center text-mist">
            <CommentGlyph />
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-mono text-caption text-mist">—</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-body-sm leading-snug text-mist">
          <Link href={authorHref} className="font-medium text-snow transition-colors hover:text-ice">
            {authorName}
          </Link>{" "}
          <EventVerb event={event} />{" "}
          {animeSlug ? (
            <Link href={`/animes/${animeSlug}`} className="font-medium text-ice transition-colors hover:text-snow">
              {animeTitle}
            </Link>
          ) : (
            <span className="text-mist">{animeTitle}</span>
          )}
          {event.type === "watch" && (
            <span className="font-mono text-caption text-mist/70"> — EP {event.episodeNumber}</span>
          )}
        </p>
        {event.type === "comment" && event.content && (
          <p className="mt-0.5 line-clamp-2 text-body-sm text-mist/80">
            “{event.content}”
            {event.edited && <span className="ml-1 text-caption text-mist/50">(editado)</span>}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {event.type === "rating" && <Stars score={event.score} />}
        {event.type === "comment" && (
          <CommentLike commentId={event.id} initial={event.likeCount} />
        )}
        <span className="font-mono text-caption text-mist/60">
          {timeAgo(event.createdAt)}
        </span>
      </div>
    </div>
  );
}

/** Like de comentário — mesma funcionalidade do ProfileActivity. */
function CommentLike({
  commentId,
  initial,
}: {
  commentId: string;
  initial: number;
}) {
  const { user } = useAuth();
  const [count, setCount] = useState(initial);
  const [liked, setLiked] = useState(false);

  async function handleLike() {
    if (!user) return;
    const before = count;
    setCount((c) => c + (liked ? -1 : 1));
    setLiked((l) => !l);
    try {
      const res = await api.toggleCommentLike(commentId);
      setLiked(res.liked);
    } catch {
      setCount(before);
      setLiked((l) => !l);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLike}
      disabled={!user}
      title={user ? "Curtir comentário" : "Entre para curtir"}
      className={`inline-flex items-center gap-1 font-mono text-caption transition-colors ${
        liked ? "text-signal" : "text-mist/60 hover:text-signal"
      } ${user ? "cursor-pointer" : "cursor-default"}`}
    >
      <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 13.5S1.5 9.7 1.5 5.5A3.3 3.3 0 0 1 8 4a3.3 3.3 0 0 1 6.5 1.5C14.5 9.7 8 13.5 8 13.5Z"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 ? count : ""}
    </button>
  );
}

function CommentGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
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

function EventVerb({ event }: { event: PublicActivityEvent }) {
  switch (event.type) {
    case "watch":
      return <span>assistiu</span>;
    case "rating":
      return <span>avaliou</span>;
    case "favorite":
      return <span>favoritou</span>;
    case "comment":
      return <span>comentou em</span>;
  }
}
