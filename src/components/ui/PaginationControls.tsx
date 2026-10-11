"use client";

import { paginationSlots } from "@/lib/pagination";
import { PAGINATION_CLASSES } from "@/components/ui/paginationStyles";

/**
 * PaginationControls — navegação por páginas para listas paginadas no cliente.
 *
 * O `Pagination` existente serve às rotas renderizadas no servidor, onde o
 * destino é uma URL. Aqui a página vive em estado React, então o controle é um
 * botão que dispara `onPageChange` e mantém o foco na navegação.
 */

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  label,
  busy = false,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label: string;
  busy?: boolean;
}) {
  if (totalPages <= 1) return null;

  const go = (target: number) => {
    if (busy) return;
    const next = Math.min(Math.max(target, 1), totalPages);
    if (next === page) return;
    onPageChange(next);
  };

  return (
    <nav
      aria-label={label}
      className={PAGINATION_CLASSES.nav}
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={busy || page <= 1}
        aria-label="Página anterior"
        className={`${PAGINATION_CLASSES.arrow} disabled:cursor-not-allowed disabled:opacity-30`}
      >
        ←
      </button>

      {paginationSlots(page, totalPages).map((entry, index) =>
        entry === "…" ? (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={`gap-${index}`}
            aria-hidden="true"
            className={PAGINATION_CLASSES.ellipsis}
          >
            {entry}
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => go(entry)}
            disabled={busy}
            aria-current={entry === page ? "page" : undefined}
            aria-label={`Ir para a página ${entry}`}
            className={`${PAGINATION_CLASSES.page} ${entry === page ? PAGINATION_CLASSES.currentPage : `${PAGINATION_CLASSES.otherPage} disabled:opacity-40`}`}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={busy || page >= totalPages}
        aria-label="Próxima página"
        className={`${PAGINATION_CLASSES.arrow} disabled:cursor-not-allowed disabled:opacity-30`}
      >
        →
      </button>

      <span aria-live="polite" className="sr-only">
        {`Página ${page} de ${totalPages}`}
      </span>
    </nav>
  );
}
