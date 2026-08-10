"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/common/Avatar";

function displayName(user: {
  userName: string | null;
  name: string | null;
}) {
  return user.userName || user.name || "Usuário";
}

export function AuthButtons() {
  const { user, logout, logoutError } = useAuth();
  const [showErr, setShowErr] = useState(false);

  useEffect(() => {
    if (logoutError) setShowErr(true);
  }, [logoutError]);

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex items-center gap-2 text-body-sm text-mist transition-colors hover:text-ice"
        >
          <Avatar name={displayName(user)} src={user.avatar} size={28} />
          {displayName(user)}
        </Link>
        <button
          onClick={async () => {
            await logout();
          }}
          className="btn-ghost"
        >
          Sair
        </button>
        {showErr && logoutError && (
          <span
            role="alert"
            className="text-caption text-signal"
            onClick={() => setShowErr(false)}
          >
            {logoutError}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="btn-ghost">
        Entrar
      </Link>
      <Link href="/register" className="btn-ice">
        Cadastrar
      </Link>
    </div>
  );
}
