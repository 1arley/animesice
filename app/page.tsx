import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import { AnimeCard } from "@/components/common/AnimeCard";
import { EpisodeCard } from "@/components/common/EpisodeCard";
import { AuthButtons } from "@/components/common/AuthButtons";
import type { Anime, Episode, Paginated } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const animesRes = await fetchJson<Paginated<Anime>>(`/anime?page=1&limit=12`);
  const latestRes = await fetchJson<(Episode & { anime: Anime })[]>(
    `/anime/latest-episodes?limit=12`,
  );

  const animes = animesRes?.data ?? [];
  const latest = latestRes ?? [];

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark">
        <a className="navbar-brand" href="/">
          <img src="/assets/img/lt/logo.webp" alt="AnimesIce" />
        </a>
        <div className="ml-auto">
          <AuthButtons />
        </div>
      </nav>

      <SiteNav />

      <div id="body-content">
        <div className="divAllHome">
          <div className="divSection">
            <h1 className="section2 text-white mx-2">Em lançamento</h1>
          </div>
          <div className="row mx-2">
            {animes.length === 0 ? (
              <p className="text-white mx-2">
                Nenhum anime no catálogo ainda. Rode o seed do backend.
              </p>
            ) : (
              animes.map((anime) => (
                <div key={anime.id} className="owl-item">
                  <AnimeCard anime={anime} />
                </div>
              ))
            )}
          </div>

          <div className="container eps">
            <div className="row">
              <div className="col-lg-12">
                <div className="divSectionUltimosEpsHome">
                  <h2 className="section2 text-white mx-2">
                    Últimos Episódios Adicionados
                  </h2>
                </div>
              </div>
            </div>
            <div className="card-group col-lg-12">
              <div className="row ml-1 mr-1 mr-md-2">
                {latest.length === 0 ? (
                  <p className="text-white mx-2">Sem episódios recentes.</p>
                ) : (
                  latest.map((ep) => <EpisodeCard key={ep.id} episode={ep} />)
                )}
              </div>
            </div>
          </div>

          <div className="divSection">
            <h1 className="section2 text-white mx-2">Destaques da semana</h1>
          </div>
          <div className="row mx-2">
            {animes.slice(0, 6).map((anime) => (
              <div key={`week-${anime.id}`} className="owl-item">
                <AnimeCard anime={anime} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
