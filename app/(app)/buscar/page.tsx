import { AnimeCard } from "@/components/common/AnimeCard";
import type { Anime, Genre, Paginated, SortMode } from "@/types";
import { serverFetchJson } from "@/lib/api-server";

export const dynamic = "force-dynamic";

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000];

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
    q || sp.genres || sp.status || sp.audio || sp.format || sp.year || sp.season || sp.sort
      ? serverFetchJson<Paginated<Anime>>(`/anime?${params.toString()}`)
      : Promise.resolve(null),
    serverFetchJson<Genre[]>(`/genre`),
  ]);

  const results = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const hasQuery = q || sp.genres || sp.status || sp.audio || sp.format || sp.year || sp.season || sp.sort;

  // Collect active filters for display
  const activeFilters: string[] = [];
  if (q) activeFilters.push(`"${q}"`);
  if (sp.audio) activeFilters.push(sp.audio === "DUBLADO" ? "Dublado" : "Legendado");
  if (sp.format) activeFilters.push(sp.format);
  if (sp.status) activeFilters.push(sp.status === "LANCAMENTO" ? "Em lançamento" : "Finalizado");
  if (sp.year) activeFilters.push(sp.year);
  if (sp.season) activeFilters.push(sp.season);

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <h1 className="shelf-label">
        Buscar{" "}
        {hasQuery ? (
          <span className="shelf-label-data">{total} resultado{total !== 1 ? "s" : ""}</span>
        ) : (
          <span className="shelf-label-data">filtros</span>
        )}
      </h1>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {activeFilters.map((filter, i) => (
            <span key={i} className="border border-ice/40 bg-ice/10 px-2 py-0.5 font-sans text-caption text-ice">
              {filter}
            </span>
          ))}
          <a href="/buscar" className="font-sans text-caption text-mist underline hover:text-ice">
            limpar filtros
          </a>
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Filtros */}
        <aside className="w-full shrink-0 md:w-56">
          <form className="space-y-4" method="get" action="/buscar">
            {q && <input type="hidden" name="q" value={q} />}

            {/* Search input in sidebar */}
            <fieldset>
              <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                Busca
              </legend>
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Título..."
                className="field"
              />
            </fieldset>

            {genres && genres.length > 0 && (
              <fieldset>
                <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                  Gêneros
                </legend>
                <div className="max-h-48 space-y-1 overflow-y-auto [scrollbar-width:thin]">
                  {genres.map((g) => (
                    <label key={g.id} className="flex cursor-pointer items-center gap-2 text-body-sm text-mist transition-colors hover:text-ice">
                      <input
                        type="checkbox"
                        name="genres"
                        value={g.slug}
                        defaultChecked={sp.genres?.includes(g.slug)}
                        className="accent-ice"
                      />
                      {g.name}
                      {g._count && (
                        <span className="font-mono text-caption text-mist/60 tabular-nums">
                          {g._count.animes}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset>
              <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                Áudio
              </legend>
              <select name="audio" defaultValue={sp.audio ?? ""} className="field">
                <option value="">Todos</option>
                <option value="LEGENDADO">Legendado</option>
                <option value="DUBLADO">Dublado</option>
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                Formato
              </legend>
              <select name="format" defaultValue={sp.format ?? ""} className="field">
                <option value="">Todos</option>
                <option value="TV">TV</option>
                <option value="MOVIE">Filme</option>
                <option value="OVA">OVA</option>
                <option value="ONA">ONA</option>
                <option value="SPECIAL">Especial</option>
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                Status
              </legend>
              <select name="status" defaultValue={sp.status ?? ""} className="field">
                <option value="">Todos</option>
                <option value="LANCAMENTO">Em lançamento</option>
                <option value="FINALIZADO">Finalizado</option>
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                Ano
              </legend>
              <select name="year" defaultValue={sp.year ?? ""} className="field">
                <option value="">Todos</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                Temporada
              </legend>
              <select name="season" defaultValue={sp.season ?? ""} className="field">
                <option value="">Todas</option>
                <option value="WINTER">Inverno</option>
                <option value="SPRING">Primavera</option>
                <option value="SUMMER">Verão</option>
                <option value="FALL">Outono</option>
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                Ordenar por
              </legend>
              <select name="sort" defaultValue={sp.sort ?? "rating"} className="field">
                <option value="rating">Nota</option>
                <option value="recentlyAdded">Recentes</option>
                <option value="year">Ano</option>
                <option value="title">Título (A-Z)</option>
              </select>
            </fieldset>

            <button type="submit" className="btn-ice w-full">Filtrar</button>
          </form>
        </aside>

        {/* Resultados */}
        <div className="flex-1">
          {!hasQuery ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-4 text-mist/40">
                <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="2" />
                <path d="M32 32l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-body text-mist">
                Use os filtros ao lado ou a barra de busca para encontrar títulos.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-body text-mist">Nenhum resultado encontrado.</p>
              <a href="/buscar" className="mt-3 text-body-sm text-ice hover:opacity-70">
                Limpar filtros →
              </a>
            </div>
          ) : (
            <>
              <p className="mb-4 font-sans text-body-sm text-mist">
                <span className="font-mono font-semibold text-ice tabular-nums">{total}</span> resultado{total !== 1 ? "s" : ""} — página {page} de {totalPages}
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {results.map((a) => (
                  <AnimeCard key={a.id} anime={a} />
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
                <span className="font-mono text-body-sm text-mist tabular-nums">
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
