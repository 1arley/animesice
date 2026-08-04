"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function AuthButtons() {
  const { user, logout } = useAuth();

  // Aparece desde a primeira renderização (SSR), antes do useEffect resolver a
  // sessão. Antes este componente retornava null no loading, fazendo os botões
  // de login "sumirem" até a hidratação.
  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontSize: 14,
            fontFamily: "Quicksand, sans-serif",
            color: "#fff",
          }}
        >
          {user.name}
        </span>
        <button
          onClick={logout}
          style={{
            padding: "8px 16px",
            backgroundColor: "#2a2a2a",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "Quicksand, sans-serif",
          }}
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Link
        href="/login"
        style={{
          padding: "8px 16px",
          backgroundColor: "transparent",
          color: "#21d3ff",
          border: "1px solid #21d3ff",
          borderRadius: 4,
          textDecoration: "none",
          fontSize: 14,
          fontFamily: "Quicksand, sans-serif",
        }}
      >
        Entrar
      </Link>
      <Link
        href="/register"
        style={{
          padding: "8px 16px",
          backgroundColor: "#21d3ff",
          color: "#111",
          border: "none",
          borderRadius: 4,
          textDecoration: "none",
          fontSize: 14,
          fontWeight: "bold",
          fontFamily: "Quicksand, sans-serif",
        }}
      >
        Cadastrar
      </Link>
    </div>
  );
}
