import type { Anime } from "@/types";

export interface AnimeCardProps {
  anime: Pick<Anime, "slug" | "title" | "coverImage" | "rating" | "ageRating">;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  const age = anime.ageRating;
  return (
    <div className="divArticleLancamentos" title={anime.title}>
      <article className="containerAnimes">
        <a href={`/animes/${anime.slug}`} className="item">
          {anime.coverImage ? (
            <img
              src={anime.coverImage}
              loading="lazy"
              className="img-fluid imgAnimes"
              alt={anime.title}
            />
          ) : (
            <div
              className="img-fluid imgAnimes"
              style={{ background: "#222", aspectRatio: "2/3" }}
            />
          )}
          <div className="text-block">
            <h3 className="animeTitle">{anime.title}</h3>
          </div>
          {anime.rating != null && (
            <div className="text-block1 text-center">
              <span className="horaUltimosEps">{anime.rating.toFixed(2)}</span>
            </div>
          )}
          {age && (
            <div className="text-blockCapaAnimeTags text-blockCapaAnimeTagsDL">
              <span
                className="pr-1"
                style={{
                  backgroundColor: age.includes("A16") ? "#d50606" : "#e36722",
                }}
              >
                {age}
              </span>
            </div>
          )}
        </a>
      </article>
    </div>
  );
}
