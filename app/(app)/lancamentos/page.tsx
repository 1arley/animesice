import { AnimeCard } from "@/components/common/AnimeCard";
import type { Anime } from "@/types";
import { serverFetchJson } from "@/lib/api-server";
import type { AnimeFilters } from "@/types";

export const dynamic = "force-dynamic";

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const limit = 24;

  const data = await serverFetchJson<{ data: Anime[]; meta: { total: number; totalPages: number } }>(
    `/anime?page=${page}&limit=${limit}&status=LANCAMENTO&sort=rating`,
    300,
  );

  const animes = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <h1 className="shelf-label">
        Em lançamento{" "}
        <span className="shelf-label-data">{total} títulos</span>
      </h1>
      {animes.length === 0 ? (
        <p className="text-body-sm text-mist">Nenhum anime em lançamento.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {animes.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
          <nav className="mt-8 flex items-center gap-3" aria-label="Paginação">
            {page > 1 ? (
              <a href={`/lancamentos?page=${page - 1}`} className="btn-ghost">← Anterior</a>
            ) : (
              <span className="btn-ghost opacity-40">← Anterior</span>
            )}
            <span className="font-display text-body-sm text-mist tabular-nums">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <a href={`/lancamentos?page=${page + 1}`} className="btn-ghost">Próxima →</a>
            ) : (
              <span className="btn-ghost opacity-40">Próxima →</span>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
