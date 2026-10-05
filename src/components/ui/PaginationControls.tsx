"use client";

/**
 * PaginationControls — navegação por páginas para listas paginadas no cliente.
 *
 * O `Pagination` existente serve às rotas renderizadas no servidor, onde o
 * destino é uma URL. Aqui a página vive em estado React, então o controle é um
 * botão que dispara `onPageChange` e mantém o foco na navegação.
 */

/** Janela de páginas com elipses: 1 … 4 5 6 … 20 */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, totalPages, page]);
  for (const offset of [-1, 1]) {
    const candidate = page + offset;
    if (candidate > 1 && candidate < totalPages) pages.add(candidate);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) result.push("gap");
    result.push(value);
    previous = value;
  }
  return result;
}

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
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={busy || page <= 1}
        className="btn-ghost min-h-11 px-4 disabled:opacity-40"
      >
        <span aria-hidden="true">←</span> Anterior
      </button>

      {pageWindow(page, totalPages).map((entry, index) =>
        entry === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-body-sm text-mist"
          >
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => go(entry)}
            disabled={busy}
            aria-current={entry === page ? "page" : undefined}
            aria-label={`Página ${entry}`}
            className={
              entry === page
                ? "btn-ice min-h-11 min-w-11 px-3"
                : "btn-ghost min-h-11 min-w-11 px-3 disabled:opacity-40"
            }
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={busy || page >= totalPages}
        className="btn-ghost min-h-11 px-4 disabled:opacity-40"
      >
        Próxima <span aria-hidden="true">→</span>
      </button>

      <span aria-live="polite" className="sr-only">
        {`Página ${page} de ${totalPages}`}
      </span>
    </nav>
  );
}