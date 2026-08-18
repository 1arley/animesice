import { notFound } from "next/navigation";
import { AnimeCard } from "@/components/common/AnimeCard";
import type { GenreAnimesResponse } from "@/types";
import { serverFetchJson } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const limit = 24;

  const data = await serverFetchJson<GenreAnimesResponse>(
    `/genre/${slug}/animes?page=${page}&limit=${limit}`,
  );

  // Gênero inexistente: gera 404 real. Um 200 com texto "não encontrado"
  // vira soft-404 no Google (e, com streaming, noindex) — exatamente o que
  // as páginas não indexadas do Search Console mostravam.
  if (!data || !data.genre) notFound();

  const { genre, data: animes, meta } = data;

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <h1 className="shelf-label">
        {genre.name}{" "}
        <span className="shelf-label-data">{meta.total} títulos</span>
      </h1>

      {animes.length === 0 ? (
        // Gênero sem nenhum anime publicado ainda é uma página válida
        // (alguns gêneros reais têm 0 títulos publicados em prod). 404 aqui
        // quebraria links legítimos do índice /generos.
        <p className="text-body-sm text-mist">Nenhum anime neste gênero.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {animes.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>

          <nav className="mt-8 flex items-center gap-3" aria-label="Paginação">
            {page > 1 ? (
              <a href={`/generos/${slug}?page=${page - 1}`} className="btn-ghost">← Anterior</a>
            ) : (
              <span className="btn-ghost opacity-40">← Anterior</span>
            )}
            <span className="font-mono text-body-sm text-mist tabular-nums">
              {page} / {meta.totalPages}
            </span>
            {page < meta.totalPages ? (
              <a href={`/generos/${slug}?page=${page + 1}`} className="btn-ghost">Próxima →</a>
            ) : (
              <span className="btn-ghost opacity-40">Próxima →</span>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
