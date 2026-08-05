"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function AuthButtons() {
  const { user, logout } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-body-sm text-mist transition-colors hover:text-ice">
          {user.name}
        </Link>
        <button onClick={logout} className="btn-ghost">
          Sair
        </button>
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
