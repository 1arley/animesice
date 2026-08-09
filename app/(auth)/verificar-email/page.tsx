"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Wordmark } from "@/components/common/Wordmark";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Informe seu email.");
      return;
    }
    if (code.length !== 8) {
      setError("O código deve ter 8 dígitos.");
      return;
    }

    setLoading(true);
    try {
      await api.verifyEmail(email, code);
      setSuccess("Conta verificada com sucesso! Redirecionando para login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao verificar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setSuccess("");
    if (!email) {
      setError("Informe seu email.");
      return;
    }
    setResending(true);
    try {
      const res = await api.resendVerification(email);
      setSuccess(res.message || "Código reenviado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao reenviar código.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="w-full max-w-sm border border-hairline bg-panel p-8">
      <div className="mb-6 text-center">
        <Wordmark className="text-2xl" />
        <h1 className="mt-4 font-display text-display-lg text-ink">Verificar Email</h1>
        <p className="mt-2 text-body-sm text-mist">
          Digite o código de 8 dígitos enviado para seu email.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}
      {success && (
        <div role="alert" className="mb-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
          {success}
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
            Código de verificação
          </span>
          <input
            type="text"
            placeholder="00000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            required
            maxLength={8}
            inputMode="numeric"
            className="field text-center tracking-[0.5em]"
          />
        </label>

        <button type="submit" disabled={loading} className="btn-ice w-full justify-center">
          {loading ? "Verificando..." : "Verificar"}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-body-sm text-mist transition-colors hover:text-ice disabled:opacity-50"
        >
          {resending ? "Enviando..." : "Reenviar código"}
        </button>
        <p className="text-body-sm text-mist">
          <Link href="/login" className="text-ice transition-colors hover:opacity-70">
            Voltar para login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-mist">Carregando...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
