import { AnimeCard } from "@/components/common/AnimeCard";
import type { Anime, Paginated } from "@/types";
import { serverFetchJson } from "@/lib/api-server";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const limit = 24;

  let results: Anime[] = [];
  let total = 0;
  let totalPages = 1;

  if (q) {
    const data = await serverFetchJson<Paginated<Anime>>(
      `/anime?page=${page}&limit=${limit}&search=${encodeURIComponent(q)}`,
      30,
    );
    results = data?.data ?? [];
    total = data?.meta?.total ?? results.length;
    totalPages = data?.meta?.totalPages ?? 1;
  }

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <h1 className="shelf-label">
            Buscar{" "}
            {q ? (
              <span className="shelf-label-data">“{q}”</span>
            ) : (
              <span className="shelf-label-data">digite acima</span>
            )}
          </h1>

          {!q ? (
            <p className="text-body-sm text-mist">
              Use a barra de busca no topo da página para encontrar títulos.
            </p>
          ) : results.length === 0 ? (
            <p className="text-body-sm text-mist">
              Nenhum resultado para <strong>{q}</strong>.
            </p>
          ) : (
            <>
              <p className="mb-4 text-body-sm text-mist">
                {total} resultado(s) — página {page} de {totalPages}
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {results.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>

              <nav className="mt-8 flex items-center gap-3" aria-label="Paginação">
                {page > 1 ? (
                  <a
                    href={`/buscar?q=${encodeURIComponent(q)}&page=${page - 1}`}
                    className="btn-ghost"
                  >
                    ← Anterior
                  </a>
                ) : (
                  <span className="btn-ghost opacity-40">← Anterior</span>
                )}
                <span className="font-display text-body-sm text-mist tabular-nums">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <a
                    href={`/buscar?q=${encodeURIComponent(q)}&page=${page + 1}`}
                    className="btn-ghost"
                  >
                    Próxima →
                  </a>
                ) : (
                  <span className="btn-ghost opacity-40">Próxima →</span>
                )}
              </nav>
            </>
          )}
    </div>
  );
}
