"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type UserIdentity = {
  id?: string | null;
  name?: string | null;
  userName?: string | null;
  avatar?: string | null;
  bio?: string | null;
};

export function UserProfilePreview({
  user,
  children,
  className = "",
  ariaLabel,
}: {
  user?: UserIdentity | null;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const identifier = user?.userName?.trim() || user?.id?.trim();
  if (!identifier) return <>{children}</>;

  const profileHref = `/usuarios/${encodeURIComponent(identifier)}`;
  const displayName =
    user?.name?.trim() || user?.userName || user?.id || "Usuário";

  return (
    <Link
      href={profileHref}
      className={className}
      aria-label={ariaLabel ?? `Perfil de ${displayName}`}
    >
      {children}
    </Link>
  );
}
