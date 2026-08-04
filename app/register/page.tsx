"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

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

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erro ao cadastrar. Tente novamente.");
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
          Cadastrar
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
              type="text"
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          <div style={{ marginBottom: "1rem" }}>
            <input
              type="password"
              placeholder="Senha (mín. 8 caracteres)"
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

          <div style={{ marginBottom: "1.5rem" }}>
            <input
              type="password"
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Cadastrando..." : "Cadastrar"}
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
          Já tem conta?{" "}
          <Link
            href="/login"
            style={{ color: "#21d3ff", textDecoration: "none" }}
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
