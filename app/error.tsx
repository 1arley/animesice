"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CHUNK_ERROR_EVENT,
  CHUNK_RECOVERY_EXHAUSTED_EVENT,
  isChunkLoadError,
  retryChunkLoad,
} from "@/lib/chunk-recovery";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error);
  const [recoveryExhausted, setRecoveryExhausted] = useState(false);

  useEffect(() => {
    if (!chunkError) return;
    const handleExhausted = () => setRecoveryExhausted(true);
    window.addEventListener(CHUNK_RECOVERY_EXHAUSTED_EVENT, handleExhausted);
    return () =>
      window.removeEventListener(
        CHUNK_RECOVERY_EXHAUSTED_EVENT,
        handleExhausted,
      );
  }, [chunkError]);

  useEffect(() => {
    if (!chunkError) return;
    window.dispatchEvent(new Event(CHUNK_ERROR_EVENT));
  }, [chunkError]);

  const handleRetry = useCallback(() => {
    if (chunkError) {
      retryChunkLoad();
      return;
    }
    reset();
  }, [chunkError, reset]);

  if (chunkError && !recoveryExhausted) {
    return <div className="min-h-[50vh] bg-night" aria-hidden="true" />;
  }

  return (
    <div className="mx-auto flex max-w-shelf flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="font-display text-display-lg text-snow">
        Sinal interrompido
      </h1>
      <p className="mt-2 text-body-sm text-mist">
        {chunkError
          ? "Não foi possível atualizar esta página automaticamente."
          : error.message || "Algo deu errado ao carregar esta página."}
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={handleRetry} className="btn-ice">
          Tentar novamente
        </button>
        <Link href="/" className="btn-ghost">
          Voltar à prateleira
        </Link>
      </div>
    </div>
  );
}
