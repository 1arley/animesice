"use client";

import Link from "next/link";
import { useCallback } from "react";

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = (error as Error).message.toLowerCase();
  return (
    msg.includes("loading chunk") ||
    msg.includes("loading css chunk") ||
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    error.name === "ChunkLoadError" ||
    error.name === "LoadingChunkError"
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const handleRetry = useCallback(() => {
    if (isChunkLoadError(error)) {
      window.location.reload();
      return;
    }
    reset();
  }, [error, reset]);

  const handleHome = useCallback(() => {
    if (isChunkLoadError(error)) {
      window.location.href = "/";
      return;
    }
  }, [error]);

  return (
    <div className="mx-auto flex max-w-shelf flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="font-display text-display-lg text-snow">
        Sinal interrompido
      </h1>
      <p className="mt-2 text-body-sm text-mist">
        {isChunkLoadError(error)
          ? "Recursos da página ficaram desatualizados. Recarregando..."
          : error.message || "Algo deu errado ao carregar esta página."}
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={handleRetry} className="btn-ice">
          Tentar novamente
        </button>
        <Link href="/" onClick={handleHome} className="btn-ghost">
          Voltar à prateleira
        </Link>
      </div>
    </div>
  );
}
