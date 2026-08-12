"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-shelf flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="font-display text-display-lg text-snow">
        Sinal interrompido
      </h1>
      <p className="mt-2 text-body-sm text-mist">
        {error.message || "Algo deu errado ao carregar esta página."}
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn-ice">
          Tentar novamente
        </button>
        <Link href="/" className="btn-ghost">
          Voltar à prateleira
        </Link>
      </div>
    </div>
  );
}
