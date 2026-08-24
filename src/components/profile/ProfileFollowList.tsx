"use client";

import Link from "next/link";
import { Avatar } from "@/components/common/Avatar";
import { FollowButton } from "@/components/social/FollowButton";
import { formatDate } from "@/lib/time";
import { SectionLabel } from "@/components/common/SectionLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import type { UserSearchResult } from "@/types";

/**
 * ProfileFollowList — quem segue / quem o perfil segue, em linhas
 * (avatar + nome + bio + botão seguir), divididas por hairline como
 * as demais listas do perfil. Paginação via `children` (Carregar mais).
 */
export function ProfileFollowList({
  title,
  emptyText,
  users,
  total,
  loading = false,
  children,
}: {
  title: string;
  /** Texto do estado vazio — contexto específico da lista (seguindo/followers). */
  emptyText?: string;
  users: UserSearchResult[];
  /** Total real (servidor) — exibido no rótulo da seção. */
  total?: number;
  /** Loading da primeira carga da tab (não confundir com vazio real). */
  loading?: boolean;
  /** Conteúdo extra abaixo da lista (ex.: botão "Carregar mais"). */
  children?: React.ReactNode;
}) {
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

  if (users.length === 0) {
    return (
      <section>
        <SectionLabel level={2}>{title}</SectionLabel>
        <EmptyState
          text={emptyText ?? "Nada por aqui ainda."}
          variant="compact"
        />
      </section>
    );
  }

  return (
    <section>
      <SectionLabel level={2}>
        {title} <span className="shelf-label-data">{total ?? users.length}</span>
      </SectionLabel>
      <ul className="divide-y divide-hairline border-y border-hairline">
        {users.map((u) => (
          <FollowRow key={u.id} user={u} />
        ))}
      </ul>
      {children}
    </section>
  );
}

function FollowRow({ user }: { user: UserSearchResult }) {
  const name = user.name?.trim() || user.userName || "Usuário";
  const href = `/users/${user.userName ?? user.id}`;

  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={href} className="group flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={name} src={user.avatar} size={44} />
        <div className="min-w-0">
          <p className="truncate font-display text-body font-semibold text-snow transition-colors group-hover:text-ice">
            {name}
          </p>
          <p className="truncate font-mono text-caption text-ice">
            @{user.userName ?? user.id}
          </p>
          {user.bio && (
            <p className="mt-0.5 line-clamp-1 text-body-sm text-mist/80">
              {user.bio}
            </p>
          )}
        </div>
      </Link>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <FollowButton
          userId={user.id}
          initialFollowing={user.isFollowing}
          compact
        />
        <span className="font-mono text-caption text-mist/70">
          desde {formatDate(user.createdAt)}
        </span>
      </div>
    </li>
  );
}
