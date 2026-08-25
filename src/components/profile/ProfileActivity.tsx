"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
import { timeAgo } from "@/lib/time";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { PublicActivityEvent } from "@/types";
import { SectionLabel } from "@/components/common/SectionLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stars } from "./Stars";

interface ProfileActivityProps {
  events: PublicActivityEvent[];
  userName: string;
  /** Cabeçalho da seção — "Atividade recente" na overview, "Atividade" na tab. */
  title?: string;
  /** Total real (servidor) — exibido no rótulo da seção. Default: carregados. */
  total?: number;
  /** Loading da primeira carga da tab (não confundir com vazio real). */
  loading?: boolean;
  /** Conteúdo extra abaixo da lista (ex.: botão "Carregar mais"). */
  children?: React.ReactNode;
}

/**
 * ProfileActivity — o que a pessoa fez, em ordem cronológica.
 * Cada evento indica a ação, o anime relacionado e quando aconteceu.
 * Comentários mantêm o like (funcionalidade existente preservada).
 */
export function ProfileActivity({
  events,
  userName,
  title = "Atividade recente",
  total,
  loading = false,
  children,
}: ProfileActivityProps) {
  if (loading) {
    return (
      <section>
        <SectionLabel level={2}>{title}</SectionLabel>
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section>
        <SectionLabel level={2}>{title}</SectionLabel>
        <EmptyState
          text="Nenhuma atividade recente ainda."
          variant="compact"
        />
      </section>
    );
  }

  return (
    <section>
      <SectionLabel level={2}>
        {title}{" "}
        <span className="shelf-label-data">{total ?? events.length}</span>
      </SectionLabel>
      <ol className="divide-y divide-hairline border-y border-hairline">
        {events.map((ev, i) => (
          <ActivityRow
            key={`${ev.type}-${i}`}
            event={ev}
            userName={userName}
          />
        ))}
      </ol>
      {children}
    </section>
  );
}

function ActivityRow({
  event,
  userName,
}: {
  event: PublicActivityEvent;
  userName: string;
}) {
  const cover =
    event.type === "comment" ? null : safeImageSrc(event.anime.coverImage);
  const animeTitle =
    event.type === "comment"
      ? (event.anime?.title ?? "um anime")
      : event.anime.title;
  const animeSlug = event.type === "comment" ? event.anime?.slug : event.anime.slug;

  return (
    <li className="flex items-center gap-3 py-3">
      <div
        className="card-scan relative w-10 shrink-0 overflow-hidden bg-hairline"
        style={{ aspectRatio: "2 / 3" }}
      >
        {cover ? (
          <Image src={cover} alt={animeTitle} fill sizes="40px" placeholder="blur" blurDataURL={blur.portrait} className="object-cover" quality={80} />
        ) : event.type === "comment" ? (
          <span className="absolute inset-0 flex items-center justify-center text-mist">
            <CommentGlyph />
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-mono text-caption text-mist">
            —
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-body-sm leading-snug text-mist">
          <span className="font-medium text-snow">{userName}</span>{" "}
          <EventVerb event={event} />{" "}
          {animeSlug ? (
            <Link
              href={`/animes/${animeSlug}`}
              className="font-medium text-ice transition-colors hover:text-snow"
            >
              {animeTitle}
            </Link>
          ) : (
            <span className="text-mist">{animeTitle}</span>
          )}
          {event.type === "watch" && (
            <span className="font-mono text-caption text-mist/70">
              {" "}
              — EP {event.episodeNumber}
            </span>
          )}
        </p>
        {event.type === "comment" && event.content && (
          <p className="mt-0.5 line-clamp-2 text-body-sm text-mist/80">
            “{event.content}”
            {event.edited && (
              <span className="ml-1 text-caption text-mist/50">(editado)</span>
            )}
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
    </li>
  );
}

/** Like de comentário — funcionalidade existente preservada no feed. */
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
      aria-label={count > 0 ? `Curtir comentário (${count})` : "Curtir comentário"}
      className={`inline-flex min-h-11 items-center gap-1 px-2 py-2 font-mono text-caption transition-colors ${
        liked ? "text-signal" : "text-mist/70 hover:text-signal"
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
