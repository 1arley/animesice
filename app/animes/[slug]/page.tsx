import { notFound } from "next/navigation";
import { Footer } from "@/components/common/Footer";
import { SiteNav } from "@/components/common/SiteNav";
import { AuthButtons } from "@/components/common/AuthButtons";
import type { Anime } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function fetchAnime(slug: string): Promise<Anime | null> {
  try {
    const res = await fetch(`${API_URL}/anime/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Anime;
  } catch {
    return null;
  }
}

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anime = await fetchAnime(slug);
  if (!anime) notFound();

  const episodes = (anime.episodes ?? []).slice().sort((a, b) => a.number - b.number);

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
        <div className="container text-white py-3">
          <div className="row">
            <div className="col-md-4">
              {anime.coverImage && (
                <img
                  src={anime.coverImage}
                  alt={anime.title}
                  className="img-fluid"
                  style={{ borderRadius: 8 }}
                />
              )}
            </div>
            <div className="col-md-8">
              <h1>{anime.title}</h1>
              {anime.rating != null && (
                <p className="text-warning">
                  ★ {anime.rating.toFixed(2)}
                  {anime.ageRating ? ` · ${anime.ageRating}` : ""}
                  {anime.audio ? ` · ${anime.audio}` : ""}
                  {anime.status ? ` · ${anime.status}` : ""}
                </p>
              )}
              {anime.genres && anime.genres.length > 0 && (
                <p>
                  {anime.genres.map((g) => (
                    <span key={g.id} className="badge badge-secondary mr-1 ml-1">
                      {g.name}
                    </span>
                  ))}
                </p>
              )}
              <h3 className="h5">Sinopse</h3>
              <p style={{ whiteSpace: "pre-line" }}>
                {anime.synopsis || "Sem sinopse disponível."}
              </p>
            </div>
          </div>

          <h2 className="mt-4">Episódios</h2>
          {episodes.length === 0 ? (
            <p>Sem episódios cadastrados.</p>
          ) : (
            <div className="row">
              {episodes.map((ep) => (
                <a
                  key={ep.id}
                  href={`/animes/${slug}/${ep.number}`}
                  className="col-6 col-md-3 col-lg-2 mb-3"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="card bg-dark text-white">
                    {ep.thumbnailUrl ? (
                      <img
                        src={ep.thumbnailUrl}
                        className="card-img-top"
                        alt={`Episódio ${ep.number}`}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ background: "#222", aspectRatio: "16/9" }} />
                    )}
                    <div className="card-body p-2">
                      <span className="numEp">Episódio {ep.number}</span>
                      <div style={{ fontSize: 12, color: "#21d3ff" }}>
                        {ep.videoUrl ? "Disponível" : "Sem vídeo"}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
