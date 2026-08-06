"use client";

import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { isPrivileged } from "@/lib/role";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";

/**
 * Portão de acesso admin — uma única decisão para as 6 páginas /admin/**.
 * Renderiza o shell loading/negado (Header + SiteNav, sem Footer) ou, quando
 * autorizado, os children da página.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading || !user || !isPrivileged(user)) {
    return (
      <>
        <Header />
        <SiteNav />
        <main className="mx-auto max-w-shelf px-4 py-10 text-body-sm text-mist">
          {loading ? (
            "Carregando..."
          ) : (
            <>
              Acesso negado. Apenas administradores.{" "}
              <a href="/login" className="text-ice">
                Entrar
              </a>
              .
            </>
          )}
        </main>
      </>
    );
  }

  return <>{children}</>;
}
