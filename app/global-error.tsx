"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunk =
    error instanceof Error &&
    (error.message.toLowerCase().includes("loading chunk") ||
      error.message.toLowerCase().includes("failed to fetch dynamically imported module") ||
      error.name === "ChunkLoadError");

  return (
    <html lang="pt-BR">
      <body style={{ background: "#070B12", color: "#E8ECF1", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Sinal interrompido</h1>
          <p style={{ marginTop: "0.5rem", opacity: 0.7 }}>
            {isChunk ? "Recursos desatualizados. Recarregando..." : "Algo deu errado."}
          </p>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => (isChunk ? window.location.reload() : reset())}
              style={{ padding: "0.6rem 1.5rem", background: "#3B82F6", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 600 }}
            >
              Tentar novamente
            </button>
            <a
              href="/"
              onClick={(e) => {
                if (isChunk) {
                  e.preventDefault();
                  window.location.href = "/";
                }
              }}
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
