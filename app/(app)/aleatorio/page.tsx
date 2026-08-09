import { redirect } from "next/navigation";
import type { Anime } from "@/types";
import { serverFetchJson } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function AleatorioPage() {
  const anime = await serverFetchJson<Anime | null>(`/anime/random`, 0);

  if (!anime) {
    return (
      <div className="mx-auto max-w-shelf px-4 py-6">
        <h1 className="shelf-label">Nenhum anime disponível</h1>
        <p className="text-body-sm text-mist">Cadastre animes no painel admin primeiro.</p>
      </div>
    );
  }

  redirect(`/animes/${anime.slug}`);
}
