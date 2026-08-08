import { AnimeCard } from "@/components/common/AnimeCard";
import type { Anime, Genre, Paginated, SortMode } from "@/types";
import { serverFetchJson } from "@/lib/api-server";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    genres?: string;
    status?: string;
    audio?: string;
    format?: string;
    year?: string;
    season?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const limit = 24;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (q) params.set("search", q);
  if (sp.genres) params.set("genres", sp.genres);
  if (sp.status) params.set("status", sp.status);
  if (sp.audio) params.set("audio", sp.audio);
  if (sp.format) params.set("format", sp.format);
  if (sp.year) params.set("year", sp.year);
  if (sp.season) params.set("season", sp.season);
  if (sp.sort) params.set("sort", sp.sort);

  const [data, genres] = await Promise.all([
    q || sp.genres || sp.status || sp.audio || sp.format || sp.year || sp.season
      ? serverFetchJson<Paginated<Anime>>(`/anime?${params.toString()}`, 30)
      : Promise.resolve(null),
    serverFetchJson<Genre[]>(`/genre`, 300),
  ]);

  const results = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const hasQuery = q || sp.genres || sp.status || sp.audio || sp.format || sp.year || sp.season;

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <h1 className="shelf-label">
        Buscar{" "}
        {q ? (
          <span className="shelf-label-data">"{q}"</span>
        ) : (
          <span className="shelf-label-data">filtros</span>
        )}
      </h1>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Filtros */}
        <aside className="w-full shrink-0 md:w-56">
          <form className="space-y-4" method="get" action="/buscar">
            {q && <input type="hidden" name="q" value={q} />}

            {genres && genres.length > 0 && (
              <fieldset>
                <legend className="mb-2 font-display text-caption uppercase tracking-wider text-mist">
                  Gêneros
                </legend>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {genres.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-body-sm text-mist">
                      <input
                        type="checkbox"
                        name="genres"
                        value={g.slug}
                        defaultChecked={sp.genres?.includes(g.slug)}
                        className="accent-ice"
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset>
              <legend className="mb-2 font-display text-caption uppercase tracking-wider text-mist">
                Áudio
              </legend>
              <select name="audio" defaultValue={sp.audio ?? ""} className="w-full border border-hairline bg-panel px-2 py-1 text-body-sm text-ink">
                <option value="">Todos</option>
                <option value="LEGENDADO">Legendado</option>
                <option value="DUBLADO">Dublado</option>
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-display text-caption uppercase tracking-wider text-mist">
                Formato
              </legend>
              <select name="format" defaultValue={sp.format ?? ""} className="w-full border border-hairline bg-panel px-2 py-1 text-body-sm text-ink">
                <option value="">Todos</option>
                <option value="TV">TV</option>
                <option value="MOVIE">Filme</option>
                <option value="OVA">OVA</option>
                <option value="ONA">ONA</option>
                <option value="SPECIAL">Especial</option>
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-display text-caption uppercase tracking-wider text-mist">
                Status
              </legend>
              <select name="status" defaultValue={sp.status ?? ""} className="w-full border border-hairline bg-panel px-2 py-1 text-body-sm text-ink">
                <option value="">Todos</option>
                <option value="LANCAMENTO">Em lançamento</option>
                <option value="CONCLUIDO">Concluído</option>
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-display text-caption uppercase tracking-wider text-mist">
                Ordenar por
              </legend>
              <select name="sort" defaultValue={sp.sort ?? "rating"} className="w-full border border-hairline bg-panel px-2 py-1 text-body-sm text-ink">
                <option value="rating">Nota</option>
                <option value="recentlyAdded">Recentes</option>
                <option value="year">Ano</option>
                <option value="title">Título (A-Z)</option>
              </select>
            </fieldset>

            <button type="submit" className="btn-ghost w-full">Filtrar</button>
          </form>
        </aside>

        {/* Resultados */}
        <div className="flex-1">
          {!hasQuery ? (
            <p className="text-body-sm text-mist">
              Use os filtros acima ou a barra de busca no topo para encontrar títulos.
            </p>
          ) : results.length === 0 ? (
            <p className="text-body-sm text-mist">
              Nenhum resultado encontrado.
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
                  <a href={`/buscar?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`} className="btn-ghost">
                    ← Anterior
                  </a>
                ) : (
                  <span className="btn-ghost opacity-40">← Anterior</span>
                )}
                <span className="font-display text-body-sm text-mist tabular-nums">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <a href={`/buscar?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`} className="btn-ghost">
                    Próxima →
                  </a>
                ) : (
                  <span className="btn-ghost opacity-40">Próxima →</span>
                )}
              </nav>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
