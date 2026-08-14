import Link from "next/link";

/**
 * Pagination — navegação anterior/próxima com contador.
 * Fonte única: /lancamentos, /buscar e admin usavam markup duplicado.
 *
 * prefetch={false}: destinos de paginação são rotas dinâmicas (renderizam por
 * request) — o prefetch do App Router não aproveita e abre a Janela para um
 * race de deduplicação onde o clique "some" (URL não muda) quando o prefetch
 * RSC chega exatamente no meio do clique.
 */
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
    <nav className="mt-8 flex items-center gap-3" aria-label="Paginação">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} prefetch={false} className="btn-ghost">
          ← Anterior
        </Link>
      ) : (
        <span className="btn-ghost opacity-40">← Anterior</span>
      )}
      <span className="font-mono text-body-sm text-mist tabular-nums">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} prefetch={false} className="btn-ghost">
          Próxima →
        </Link>
      ) : (
        <span className="btn-ghost opacity-40">Próxima →</span>
      )}
    </nav>
  );
}
