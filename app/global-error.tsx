"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CHUNK_ERROR_EVENT,
  CHUNK_RECOVERY_EXHAUSTED_EVENT,
  isChunkLoadError,
  retryChunkLoad,
} from "@/lib/chunk-recovery";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunk = isChunkLoadError(error);
  const [recoveryExhausted, setRecoveryExhausted] = useState(false);

  useEffect(() => {
    if (!isChunk) return;
    const handleExhausted = () => setRecoveryExhausted(true);
    window.addEventListener(CHUNK_RECOVERY_EXHAUSTED_EVENT, handleExhausted);
    return () =>
      window.removeEventListener(
        CHUNK_RECOVERY_EXHAUSTED_EVENT,
        handleExhausted,
      );
  }, [isChunk]);

  useEffect(() => {
    if (!isChunk) return;
    window.dispatchEvent(new Event(CHUNK_ERROR_EVENT));
  }, [isChunk]);

  const handleRetry = useCallback(() => {
    if (isChunk) {
      retryChunkLoad();
      return;
    }
    reset();
  }, [isChunk, reset]);

  return (
    <html lang="pt-BR">
      <body style={{ background: "#070B12", color: "#E8ECF1", fontFamily: "system-ui, sans-serif" }}>
        <div
          aria-hidden={isChunk && !recoveryExhausted}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem", textAlign: "center", visibility: isChunk && !recoveryExhausted ? "hidden" : "visible" }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Sinal interrompido</h1>
          <p style={{ marginTop: "0.5rem", opacity: 0.7 }}>
            {isChunk
              ? "Não foi possível atualizar o site automaticamente."
              : "Algo deu errado."}
          </p>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
            <button
              onClick={handleRetry}
              style={{ padding: "0.6rem 1.5rem", background: "#3B82F6", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 600 }}
            >
              Tentar novamente
            </button>
            <a
              href="/"
              style={{ padding: "0.6rem 1.5rem", background: "transparent", color: "#E8ECF1", border: "1px solid #334155", borderRadius: "0.5rem", cursor: "pointer", textDecoration: "none" }}
            >
              Voltar à prateleira
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
