"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
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
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erro ao entrar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a1a1a",
        padding: "1rem",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          backgroundColor: "#212121",
          borderRadius: 8,
          padding: "2rem",
        }}
      >
        <h1
          style={{
            color: "#fff",
            textAlign: "center",
            marginBottom: "1.5rem",
            fontFamily: "KoHo, sans-serif",
            textTransform: "uppercase",
          }}
        >
          Entrar
        </h1>

        {error && (
          <div
            style={{
              backgroundColor: "#dc3545",
              color: "#fff",
              padding: "10px",
              borderRadius: 4,
              marginBottom: "1rem",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 4,
                border: "none",
                backgroundColor: "#2a2a2a",
                color: "#fff",
                fontSize: 14,
                fontFamily: "Quicksand, sans-serif",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 4,
                border: "none",
                backgroundColor: "#2a2a2a",
                color: "#fff",
                fontSize: 14,
                fontFamily: "Quicksand, sans-serif",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 4,
              border: "none",
              backgroundColor: loading ? "#444" : "#21d3ff",
              color: loading ? "#888" : "#111",
              fontSize: 16,
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "Quicksand, sans-serif",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p
          style={{
            color: "#888",
            textAlign: "center",
            marginTop: "1.5rem",
            fontFamily: "Quicksand, sans-serif",
            fontSize: 14,
          }}
        >
          Não tem conta?{" "}
          <Link
            href="/register"
            style={{ color: "#21d3ff", textDecoration: "none" }}
          >
            Cadastrar
          </Link>
        </p>
      </div>
    </div>
  );
}
