"use client";

import Link from "next/link";
import { Avatar } from "@/components/common/Avatar";
import { FollowButton } from "@/components/social/FollowButton";
import { SpotlightCard } from "@/components/core/SpotlightCard";
import { formatDate } from "@/lib/time";
import type { UserSearchResult } from "@/types";

/**
 * UserCard — cartão compacto do diretório de usuários: avatar, nome,
 * @userName, bio truncada, stats e botão seguir. Link para o perfil público.
 */
export function UserCard({ user }: { user: UserSearchResult }) {
  const name = user.name?.trim() || user.userName || "Usuário";
  const href = `/users/${user.userName ?? user.id}`;

  return (
    <SpotlightCard className="flex h-full flex-col border border-hairline bg-panel p-4">
      <Link
        href={href}
        className="group flex items-center gap-3"
        aria-label={`Perfil de ${name}`}
      >
        <Avatar name={name} src={user.avatar} size={48} />
        <div className="min-w-0">
          <p className="truncate font-display text-body font-semibold text-snow transition-colors group-hover:text-ice">
            {name}
          </p>
          <p className="truncate font-mono text-caption text-ice">
            @{user.userName ?? user.id}
          </p>
        </div>
      </Link>

      {user.bio && (
        <p className="mt-2 line-clamp-2 text-body-sm text-mist">{user.bio}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-caption text-mist">
        <span>{user._count.ratings} aval.</span>
        <span>{user._count.comments} coment.</span>
        <span>{user._count.favorites} fav.</span>
      </div>

      {/* Spacer flex: mantém o rodapé na base do card (mt-auto) preservando
          o respiro mínimo de 12px (h-3) quando o card é o mais alto da linha. */}
      <div className="mt-auto h-3" aria-hidden="true" />
      <div className="flex items-center justify-between gap-2 border-t border-hairline pt-3">
        <span className="truncate font-mono text-caption text-mist/60">
          desde {formatDate(user.createdAt)}
        </span>
        <FollowButton userId={user.id} initialFollowing={user.isFollowing} compact />
      </div>
    </SpotlightCard>
  );
}
