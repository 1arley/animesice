import { AnimeCard } from "@/components/common/AnimeCard";
import { Pagination } from "@/components/ui/Pagination";
import type { Metadata } from "next";
import type { Anime } from "@/types";
import { serverFetchJson } from "@/lib/api-server";
import type { AnimeFilters } from "@/types";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Em lançamento",
  description: "Animes em lançamento — novos episódios a cada semana.",
  alternates: { canonical: "/lancamentos" },
};

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
    { cache: "force-cache", next: { revalidate: 300, tags: ["lancamentos"] } },
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {animes.map((anime, i) => (
              <AnimeCard key={anime.id} anime={anime} priority={i < 6} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(p) => `/lancamentos?page=${p}`}
          />
        </>
      )}
    </div>
  );
}
