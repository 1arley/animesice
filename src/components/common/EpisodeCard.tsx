import type { Episode, Anime } from "@/types";

type LatestEpisode = Pick<Episode, "number" | "title" | "thumbnailUrl" | "dateModified"> & {
  anime: Pick<Anime, "slug" | "title">;
};

export interface EpisodeCardProps {
  episode: LatestEpisode;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  const { anime } = episode;
  const href = `/animes/${anime.slug}/${episode.number}`;
  return (
    <div className="col-12 col-sm-6 col-md-4 col-lg-6 col-xl-3 divCardUltimosEpsHome" title={anime.title}>
      <article className="card cardUltimosEps" style={{ height: 185 }}>
        <a href={href}>
          {episode.thumbnailUrl ? (
            <img
              className="card-img-top imgAnimesUltimosEps"
              src={episode.thumbnailUrl}
              loading="lazy"
              alt={`${anime.title} - Episódio ${episode.number}`}
            />
          ) : (
            <div className="card-img-top imgAnimesUltimosEps" style={{ background: "#222", height: 185 }} />
          )}
          <div className="text-block-ep">
            <h3 className="animeTitle">{anime.title}</h3>
          </div>
        </a>
      </article>
      <div className="mb-1 pb-1">
        <span className="numEp">Episódio {episode.number}</span>
        {episode.dateModified && (
          <span
            className="mr-1 ep-dateModified"
            style={{ float: "right", color: "#21D3FF" }}
          >
            {formatDate(episode.dateModified)}
          </span>
        )}
      </div>
    </div>
  );
}
