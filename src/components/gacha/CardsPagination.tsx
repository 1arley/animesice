"use client";

/**
 * CardsPagination — paginação numérica com elipses para /gacha/cartas.
 *
 * Gera a janela de páginas: sempre exibe primeira, última, a página
 * atual e suas vizinhas. Elipses preenchem as lacunas. Usa botões
 * porque a página é client-side e não tem href canônico por página.
 *
 * @example
 * <CardsPagination page={3} pages={20} onPageChange={setPage} />
 */
export function CardsPagination({
  page,
  pages,
  onPageChange,
}: {
  page: number;
  pages: number;
  onPageChange: (next: number) => void;
}) {
  if (pages <= 1) return null;

  // Gera a lista de slots: número ou "…"
  const slots = buildSlots(page, pages);

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
      aria-label="Paginação de cartas"
    >
      {/* Anterior */}
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
        className="flex h-10 min-w-[2.5rem] items-center justify-center border border-hairline bg-panel px-3 font-mono text-body-sm text-snow transition-colors hover:bg-ink/60 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ←
      </button>

      {slots.map((slot, i) =>
        slot === "…" ? (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={`ellipsis-${i}`}
            aria-hidden="true"
            className="flex h-10 w-8 items-center justify-center font-mono text-body-sm text-mist select-none"
          >
            …
          </span>
        ) : (
          <button
            key={slot}
            type="button"
            aria-label={`Ir para a página ${slot}`}
            aria-current={slot === page ? "page" : undefined}
            onClick={() => onPageChange(slot as number)}
            className={`flex h-10 min-w-[2.5rem] items-center justify-center border font-mono text-body-sm transition-colors ${
              slot === page
                ? "border-ice/70 bg-ice/10 text-snow shadow-[inset_0_-2px_0_rgba(56,189,248,0.8)]"
                : "border-hairline bg-panel text-mist hover:bg-ink/60 hover:text-snow"
            }`}
          >
            {slot}
          </button>
        ),
      )}

      {/* Próxima */}
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Próxima página"
        className="flex h-10 min-w-[2.5rem] items-center justify-center border border-hairline bg-panel px-3 font-mono text-body-sm text-snow transition-colors hover:bg-ink/60 disabled:cursor-not-allowed disabled:opacity-30"
      >
        →
      </button>
    </nav>
  );
}

/**
 * Monta a lista de slots exibidos:
 * - Sempre mostra a primeira e última página.
 * - Janela de ±2 em torno da página atual.
 * - Elipses onde há saltos > 1.
 */
function buildSlots(current: number, total: number): (number | "…")[] {
  // Páginas que devem sempre aparecer
  const visible = new Set<number>();
  visible.add(1);
  visible.add(total);
  for (let d = -2; d <= 2; d++) {
    const p = current + d;
    if (p >= 1 && p <= total) visible.add(p);
  }

  const sorted = Array.from(visible).sort((a, b) => a - b);
  const slots: (number | "…")[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i]!;
    if (prev !== undefined && curr - prev > 1) {
      slots.push("…");
    }
    slots.push(curr);
  }

  return slots;
}
