import { AnimeCard } from "@/components/common/AnimeCard";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  animeFormatLabel,
  animeSeasonLabel,
  animeStatusLabel,
} from "@/lib/anime-labels";
import { PageTitle } from "@/components/ui/PageTitle";
import Link from "next/link";
import type { Metadata } from "next";
import type { Anime, Genre, Paginated, SortMode } from "@/types";
import { serverFetchJson } from "@/lib/api-server";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Buscar animes — Encontre por título, gênero, ano e mais",
  description: "Busque animes por título, gênero, ano, formato, status e mais. Encontre exatamente o que procura no AnimesIce.",
  alternates: { canonical: "/buscar" },
  openGraph: {
    title: "Buscar animes | AnimesIce",
    description: "Busque animes por título, gênero, ano, formato e mais.",
  },
};

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000];

type SearchParam = string | string[] | undefined;

/** Next.js 15 entrega params repetidos como string[] (ex.: checkboxes de
 * gênero marcados em conjunto, ou o form de /buscar que chegou a enviar
 * `q` duplicado). Normaliza para o primeiro valor — `.trim()`/`.includes()`
 * quebram com array. */
function first(v: SearchParam): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: SearchParam;
    search?: SearchParam;
    page?: SearchParam;
    genres?: SearchParam;
    status?: SearchParam;
    audio?: SearchParam;
    format?: SearchParam;
    year?: SearchParam;
    season?: SearchParam;
    sort?: SearchParam;
  }>;
}) {
  const sp = await searchParams;
  const qFromUrl = first(sp.q);
  const searchFromUrl = first(sp.search);
  const q = (qFromUrl ?? searchFromUrl ?? "").trim();
  const page = Math.max(1, Number(first(sp.page) ?? "1") || 1);
  const limit = 24;

  // Múltiplos gêneros chegam como array (um checkbox por slug); o backend
  // espera vírgula-separado, então junta explicitamente em vez de depender
  // da coerção implícita de String().
  const genresParam = Array.isArray(sp.genres) ? sp.genres.join(",") : sp.genres;
  const status = first(sp.status);
  const audio = first(sp.audio);
  const format = first(sp.format);
  const year = first(sp.year);
  const season = first(sp.season);
  const sort = first(sp.sort);

  // Hoisted outside the genre map — evita re-fatiar a string por item.
  const selectedGenres = new Set(genresParam?.split(",") ?? []);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (q) params.set("search", q);
  if (genresParam) params.set("genres", genresParam);
  if (status) params.set("status", status);
  if (audio) params.set("audio", audio);
  if (format) params.set("format", format);
  if (year) params.set("year", year);
  if (season) params.set("season", season);
  if (sort) params.set("sort", sort);

  /** Monta URL de paginação com os nomes públicos (q, não o search da API).
   *  Antes usava `params` (search=...) e a página lê q= — a busca se perdia
   *  na página 2 (0 resultados). Espelha o que o form envia. */
  const pageHref = (target: number) => {
    const p = new URLSearchParams();
    p.set("page", String(target));
    if (q) p.set("q", q);
    if (genresParam) p.set("genres", genresParam);
    if (status) p.set("status", status);
    if (audio) p.set("audio", audio);
    if (format) p.set("format", format);
    if (year) p.set("year", year);
    if (season) p.set("season", season);
    if (sort) p.set("sort", sort);
    return `/buscar?${p.toString()}`;
  };

  const [data, genreList] = await Promise.all([
    q || genresParam || status || audio || format || year || season || sort
      ? serverFetchJson<Paginated<Anime>>(`/anime?${params.toString()}`)
      : Promise.resolve(null),
    serverFetchJson<Genre[]>(`/genre`),
  ]);

  const results = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const hasQuery = Boolean(q || genresParam || status || audio || format || year || season || sort || searchFromUrl);

  // Collect active filters for display
  const activeFilters: string[] = [];
  if (q) activeFilters.push(`"${q}"`);
  if (audio) activeFilters.push(audio === "DUBLADO" ? "Dublado" : "Legendado");
  if (format) activeFilters.push(animeFormatLabel(format));
  if (status) activeFilters.push(animeStatusLabel(status));
  if (year) activeFilters.push(year);
  if (season) activeFilters.push(animeSeasonLabel(season));

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <PageTitle
        text="Buscar"
        badge={
          hasQuery ? (
            <>{total} resultado{total !== 1 ? "s" : ""}</>
          ) : (
            "filtros"
          )
        }
      />

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <span key={filter} className="border border-ice/40 bg-ice/10 px-2 py-0.5 font-sans text-caption text-ice">
              {filter}
            </span>
          ))}
          <Link href="/buscar" className="font-sans text-caption text-mist underline hover:text-ice">
            limpar filtros
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Filtros */}
        <aside className="w-full shrink-0 md:w-56">
          <form className="space-y-4" method="get" action="/buscar">
            {/* O input visível abaixo já envia name="q" — sem hidden duplicado,
                que gerava q=...&q=... (string[] no Next 15) e quebrava o .trim(). */}

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
                aria-label="Buscar por título"
                className="field"
              />
            </fieldset>

            {genreList && genreList.length > 0 && (
              <fieldset>
                <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                  Gêneros
                </legend>
                <div className="max-h-48 space-y-1 overflow-y-auto [scrollbar-width:thin]">
                  {genreList.map((g) => (
                    <label key={g.id} className="flex cursor-pointer items-center gap-2 text-body-sm text-mist transition-colors hover:text-ice">
                      <input
                        type="checkbox"
                        name="genres"
                        value={g.slug}
                        defaultChecked={selectedGenres.has(g.slug)}
                        className="accent-ice"
                      />
                      {g.name}
                      {g._count && (
                        <span className="font-mono text-caption text-mist-soft tabular-nums">
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
              <select name="audio" defaultValue={audio ?? ""} aria-label="Áudio" className="field">
                <option value="">Todos</option>
                <option value="LEGENDADO">Legendado</option>
                <option value="DUBLADO">Dublado</option>
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                Formato
              </legend>
              <select name="format" defaultValue={format ?? ""} aria-label="Formato" className="field">
                <option value="">Todos</option>
                <option value="TV">TV</option>
                <option value="MOVIE">Filme</option>
                <option value="OVA">OVA</option>
                <option value="ONA">ONA</option>
                <option value="SPECIAL">Especial</option>
                <option value="MUSIC">Música</option>
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                Status
              </legend>
              <select name="status" defaultValue={status ?? ""} aria-label="Status" className="field">
                <option value="">Todos</option>
                <option value="LANCAMENTO">Em lançamento</option>
                <option value="FINALIZADO">Finalizado</option>
                <option value="EM_BREVE">Em breve</option>
                <option value="PAUSADO">Pausado</option>
              </select>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                Ano
              </legend>
              <select name="year" defaultValue={year ?? ""} aria-label="Ano" className="field">
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
              <select name="season" defaultValue={season ?? ""} aria-label="Temporada" className="field">
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
              <select name="sort" defaultValue={sort ?? "rating"} aria-label="Ordenar por" className="field">
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
            <EmptyState
              text="Use os filtros ao lado ou a barra de busca para encontrar títulos."
              icon={
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="20" cy="20" r="14" />
                  <path d="M32 32l8 8" strokeLinecap="round" />
                </svg>
              }
            />
          ) : results.length === 0 ? (
            <EmptyState
              text="Nenhum resultado encontrado."
              action={
                <Link href="/buscar" className="text-body-sm text-ice hover:opacity-70">
                  Limpar filtros →
                </Link>
              }
            />
          ) : (
            <>
              <p className="mb-4 font-sans text-body-sm text-mist">
                <span className="font-mono font-semibold text-ice tabular-nums">{total}</span> resultado{total !== 1 ? "s" : ""} — página {page} de {totalPages}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {results.map((a) => (
                  <AnimeCard key={a.id} anime={a} />
                ))}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                hrefFor={pageHref}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
