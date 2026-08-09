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

  if (!data) {
    return (
      <div className="mx-auto max-w-shelf px-4 py-6">
        <h1 className="shelf-label">Gênero não encontrado</h1>
        <p className="text-body-sm text-mist">O gênero solicitado não existe.</p>
      </div>
    );
  }

  const { genre, data: animes, meta } = data;

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <h1 className="shelf-label">
        {genre.name}{" "}
        <span className="shelf-label-data">{meta.total} títulos</span>
      </h1>

      {animes.length === 0 ? (
        <p className="text-body-sm text-mist">Nenhum anime neste gênero.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
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
            <span className="font-display text-body-sm text-mist tabular-nums">
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
