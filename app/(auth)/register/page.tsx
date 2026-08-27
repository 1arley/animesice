"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Wordmark } from "@/components/common/Wordmark";
import { passwordError } from "@/lib/password";
import { TURNSTILE_SITEKEY, loadTurnstile } from "@/lib/turnstile";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>("");

  useEffect(() => {
    loadTurnstile()
      .then(() => {
        const t = window.turnstile;
        const el = widgetRef.current;
        if (t && el) {
          t.ready(() => {
            widgetIdRef.current = t.render(el, {
              sitekey: TURNSTILE_SITEKEY,
              action: "register",
              callback: (tk: string) => setToken(tk || ""),
              "expired-callback": () => setToken(""),
            });
          });
        }
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  function userNameError(): string | null {
    if (!userName) return null;
    if (!/^[a-z0-9_-]{3,20}$/.test(userName)) {
      return "Apelido: 3-20 caracteres, apenas minúsculas, números, _ ou -.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const pwErr = passwordError(password, confirmPassword);
    if (pwErr) {
      setError(pwErr);
      return;
    }

    const unErr = userNameError();
    if (unErr) {
      setError(unErr);
      return;
    }

    if (!token) {
      setError("Marque a caixa do captcha para continuar.");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, token, userName || undefined);
      router.push(`/verificar-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao cadastrar. Tente novamente.");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setToken("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm border border-hairline bg-panel p-8">
        <div className="mb-6 text-center">
          <Wordmark className="text-2xl" />
          <h1 className="mt-4 font-display text-display-lg text-snow">Cadastrar</h1>
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
              Apelido{" "}
              <span className="normal-case text-mist-soft">(opcional)</span>
            </span>
            <input
              type="text"
              placeholder="ex: john_doe"
              value={userName}
              onChange={(e) =>
                setUserName(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                )
              }
              autoComplete="username"
              className="field"
            />
            <span className="mt-1 block font-mono text-caption text-mist-soft">
              3-20 caracteres: minúsculas, números, _ ou -. Pode definir depois.
            </span>
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

          <div ref={widgetRef} className="flex justify-center" />

          <button type="submit" disabled={loading} className="btn-ice w-full justify-center">
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-body-sm text-mist">
          Já tem conta?{" "}
          <Link href="/login" className="text-ice transition-colors hover:text-snow hover:underline">
            Entrar
          </Link>
        </p>
      </div>
  );
}
