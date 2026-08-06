"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function AuthButtons() {
  const { user, logout, logoutError } = useAuth();
  const [showErr, setShowErr] = useState(false);

  useEffect(() => {
    if (logoutError) setShowErr(true);
  }, [logoutError]);

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-body-sm text-mist transition-colors hover:text-ice">
          {user.name}
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
