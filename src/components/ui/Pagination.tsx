/**
 * Pagination — navegação anterior/próxima com contador.
 * Fonte única: /lancamentos, /buscar e admin usavam markup duplicado.
 *
 * Os destinos são rotas server-rendered. Links HTML deliberados evitam uma
 * transição RSC concorrente ser perdida e preservam abertura em nova aba,
 * histórico e fallback sem JavaScript.
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
        <a href={hrefFor(page - 1)} className="btn-ghost">
          ← Anterior
        </a>
      ) : (
        <span className="btn-ghost opacity-40">← Anterior</span>
      )}
      <span className="font-mono text-body-sm text-mist tabular-nums">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <a href={hrefFor(page + 1)} className="btn-ghost">
          Próxima →
        </a>
      ) : (
        <span className="btn-ghost opacity-40">Próxima →</span>
      )}
    </nav>
  );
}
