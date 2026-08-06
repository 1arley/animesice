"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Wordmark } from "@/components/common/Wordmark";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const target = safeNext(next);
      router.push(target);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm border border-hairline bg-panel p-8">
        <div className="mb-6 text-center">
          <Wordmark className="text-2xl" />
          <h1 className="mt-4 font-display text-display-lg text-ink">Entrar</h1>
        </div>

        {error && (
          <div role="alert" className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Email
            </span>
            <input
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="field"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Senha
            </span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="field"
            />
          </label>

          <div className="flex items-center justify-end">
            <Link
              href="/recuperar-senha"
              className="text-caption text-mist transition-colors hover:text-ice"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn-ice w-full justify-center">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-body-sm text-mist">
          Não tem conta?{" "}
          <Link href="/register" className="text-ice transition-colors hover:opacity-70">
            Cadastrar
          </Link>
        </p>
      </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-mist">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}

/** Só aceita caminho absoluto no próprio site — bloqueia open redirect. */
function safeNext(next: string | null): string {
  if (!next) return "/";
  try {
    const u = new URL(next, "http://animesice.local");
    return u.origin === "http://animesice.local" ? next : "/";
  } catch {
    return "/";
  }
}
