import { paginationSlots } from "@/lib/pagination";
import { PAGINATION_CLASSES } from "@/components/ui/paginationStyles";

/** Paginação numérica para rotas cujo destino é uma URL. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (target: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className={PAGINATION_CLASSES.nav}
      aria-label="Paginação"
    >
      {page > 1 ? (
        <a
          href={hrefFor(page - 1)}
          aria-label="Página anterior"
          className={PAGINATION_CLASSES.arrow}
        >
          ←
        </a>
      ) : (
        <span
          aria-hidden="true"
          className={`${PAGINATION_CLASSES.arrow} opacity-30`}
        >
          ←
        </span>
      )}
      {paginationSlots(page, totalPages).map((entry, index) =>
        entry === "…" ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className={PAGINATION_CLASSES.ellipsis}
          >
            …
          </span>
        ) : (
          <a
            key={entry}
            href={hrefFor(entry)}
            aria-label={`Ir para a página ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            className={`${PAGINATION_CLASSES.page} ${entry === page ? PAGINATION_CLASSES.currentPage : PAGINATION_CLASSES.otherPage}`}
          >
            {entry}
          </a>
        ),
      )}
      {page < totalPages ? (
        <a
          href={hrefFor(page + 1)}
          aria-label="Próxima página"
          className={PAGINATION_CLASSES.arrow}
        >
          →
        </a>
      ) : (
        <span
          aria-hidden="true"
          className={`${PAGINATION_CLASSES.arrow} opacity-30`}
        >
          →
        </span>
      )}
      <span aria-live="polite" className="sr-only">
        Página {page} de {totalPages}
      </span>
    </nav>
  );
}
