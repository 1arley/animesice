"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Wordmark } from "@/components/common/Wordmark";
import { passwordError } from "@/lib/password";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const pwErr = passwordError(password, confirmPassword);
    if (pwErr) {
      setError(pwErr);
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm border border-hairline bg-panel p-8">
        <div className="mb-6 text-center">
          <Wordmark className="text-2xl" />
          <h1 className="mt-4 font-display text-display-lg text-ink">Cadastrar</h1>
        </div>

        {error && (
          <div role="alert" className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Nome
            </span>
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="field"
            />
          </label>

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
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="field"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
              Confirmar senha
            </span>
            <input
              type="password"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="field"
            />
          </label>

          <button type="submit" disabled={loading} className="btn-ice w-full justify-center">
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-body-sm text-mist">
          Já tem conta?{" "}
          <Link href="/login" className="text-ice transition-colors hover:opacity-70">
            Entrar
          </Link>
        </p>
      </div>
  );
}
