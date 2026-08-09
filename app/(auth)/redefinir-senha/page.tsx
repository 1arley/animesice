"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Wordmark } from "@/components/common/Wordmark";
import { passwordError } from "@/lib/password";

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const pwErr = passwordError(newPassword, confirmPassword);
    if (pwErr) {
      setError(pwErr);
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Erro ao redefinir senha. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm border border-hairline bg-panel p-8">
      <div className="mb-6 text-center">
        <Wordmark className="text-2xl" />
        <h1 className="mt-4 font-display text-display-lg text-snow">
          Redefinir Senha
        </h1>
      </div>

      {error && (
        <div role="alert" className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
          Senha redefinida com sucesso. Redirecionando para login...
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Token
            </span>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              className="field font-mono text-caption"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Nova Senha
            </span>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Confirmar Senha
            </span>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </label>

          <button type="submit" disabled={loading} className="btn-ice w-full justify-center">
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-body-sm text-mist">
        <Link href="/login" className="text-ice transition-colors hover:opacity-70">
          Voltar para login
        </Link>
      </p>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div className="text-mist">Carregando...</div>}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}
