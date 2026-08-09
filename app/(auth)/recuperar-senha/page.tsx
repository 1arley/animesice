"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Wordmark } from "@/components/common/Wordmark";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setResetToken(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSuccess(true);
      if (res.token) {
        setResetToken(res.token);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Erro ao solicitar redefinição. Tente novamente.",
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
            Recuperar Senha
          </h1>
        </div>

        {error && (
          <div role="alert" className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 space-y-3 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
            <p>
              Se o email existir, um link de redefinição foi enviado.
            </p>
            {resetToken && (
              <div className="border-t border-ice/20 pt-2">
                <p className="text-caption text-mist">
                  Modo dev — token retornado para teste:
                </p>
                <p className="font-mono text-caption break-all text-ice">
                  {resetToken}
                </p>
                <Link
                  href={`/redefinir-senha?token=${encodeURIComponent(resetToken)}`}
                  className="mt-1 inline-block text-caption text-ice underline hover:opacity-70"
                >
                  Ir para redefinição →
                </Link>
              </div>
            )}
          </div>
        )}

        {!success && (
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

            <button type="submit" disabled={loading} className="btn-ice w-full justify-center">
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-body-sm text-mist">
          Lembrou a senha?{" "}
          <Link href="/login" className="text-ice transition-colors hover:opacity-70">
            Voltar para login
          </Link>
        </p>
      </div>
  );
}
