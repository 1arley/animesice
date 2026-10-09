"use client";

import type { ReactNode } from "react";
import { PaginationControls } from "@/components/ui/PaginationControls";

/**
 * Bloco de uma lista da wishlist (cartas ou conjuntos): cabeçalho com o
 * recorte sobre o total, empty state decidido pelo total — nunca pelo recorte
 * da página — e a paginação daquela lista. Os dois blocos são independentes,
 * então cada um recebe a sua própria página e o seu próprio total.
 */
export function WishlistSection({
  title,
  headingId,
  headingLevel = 2,
  count,
  total,
  page,
  totalPages,
  onPageChange,
  busy,
  emptyLabel,
  gridClassName,
  children,
}: {
  title: string;
  headingId: string;
  headingLevel?: 2 | 3;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  busy: boolean;
  emptyLabel: string;
  gridClassName: string;
  children: ReactNode;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading
          id={headingId}
          className="font-display text-body-lg text-snow"
        >
          {title}
        </Heading>
        {total > 0 && (
          <p className="text-caption text-mist tabular-nums">
            {count} de {total}
          </p>
        )}
      </div>
      {total === 0 ? (
        <p className="mt-3 text-mist">{emptyLabel}</p>
      ) : count === 0 ? (
        <p className="mt-3 text-mist">Nada em {title.toLowerCase()} nesta página.</p>
      ) : (
        <div
          aria-busy={busy}
          className={`mt-4 grid ${gridClassName} ${busy ? "opacity-60" : ""}`}
        >
          {children}
        </div>
      )}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        label={`Paginação de ${title.toLowerCase()}`}
        busy={busy}
      />
    </section>
  );
}

/** Falha de carga com retry — a lista some, o aviso e a ação ficam. */
export function WishlistLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-6 flex flex-wrap items-center gap-3 text-signal"
    >
      <p>{message}</p>
      <button type="button" onClick={onRetry} className="btn-ghost min-h-11 px-4">
        Tentar novamente
      </button>
    </div>
  );
}