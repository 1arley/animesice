import type { Episode, Anime } from "@/types";
import { safeImageSrc } from "@/lib/url";

type LatestEpisode = Pick<Episode, "number" | "title" | "thumbnailUrl" | "dateModified"> & {
  anime: Pick<Anime, "slug" | "title">;
};

export interface EpisodeCardProps {
  episode: LatestEpisode;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  const { anime } = episode;
  const href = `/animes/${anime.slug}/${episode.number}`;
  const thumb = safeImageSrc(episode.thumbnailUrl);

  return (
    <a
      href={href}
      title={`${anime.title} — Episódio ${episode.number}`}
      className="group block overflow-hidden bg-panel transition-colors hover:bg-hairline"
    >
      <div className="relative" style={{ aspectRatio: "16 / 9" }}>
        {thumb ? (
          <img
            src={thumb}
            loading="lazy"
            alt={`${anime.title} — Episódio ${episode.number}`}
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-hairline">
            <span className="font-display text-caption uppercase tracking-wider text-mist">
              sem thumbnail
            </span>
          </div>
        )}

        {/* Nº do episódio: tabular no canto. */}
        <span className="absolute bottom-1.5 left-1.5 bg-ink/80 px-1.5 py-0.5 font-display text-caption font-semibold text-ice tabular-nums">
          EP {episode.number}
        </span>

        {/* Botão de play sutil no hover — não no load. */}
        <span
          className="absolute inset-0 hidden items-center justify-center bg-ink/30 transition-colors group-hover:flex"
          aria-hidden="true"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ice bg-ink/60 text-ice">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <path d="M3 2l9 5-9 5z" />
            </svg>
          </span>
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2 px-2 py-2">
        <h3 className="line-clamp-1 flex-1 font-sans text-body-sm font-medium text-mist transition-colors group-hover:text-ice">
          {anime.title}
        </h3>
        {episode.dateModified && (
          <time
            dateTime={episode.dateModified}
            className="shrink-0 font-display text-caption text-mist tabular-nums"
          >
            {formatDate(episode.dateModified)}
          </time>
        )}
      </div>
    </a>
  );
}
