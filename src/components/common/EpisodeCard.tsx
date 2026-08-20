import Link from "next/link";
import type { Episode, Anime } from "@/types";
import { safeImageSrc, upgradeImageUrl } from "@/lib/url";
import { blur } from "@/lib/blur";
import { formatDate } from "@/lib/time";
import { SpotlightCard } from "@/components/core/SpotlightCard";
import { AdaptiveImage } from "@/components/common/AdaptiveImage";

type LatestEpisode = Pick<Episode, "number" | "title" | "thumbnailUrl" | "dateModified"> & {
  anime: Pick<Anime, "slug" | "title">;
};

export interface EpisodeCardProps {
  episode: LatestEpisode;
  priority?: boolean;
}

export function EpisodeCard({ episode, priority = false }: EpisodeCardProps) {
  const { anime } = episode;
  const href = `/animes/${anime.slug}/${episode.number}`;
  const thumb = safeImageSrc(episode.thumbnailUrl);
  const desktopThumb = upgradeImageUrl(episode.thumbnailUrl);

  return (
    <SpotlightCard className="h-full">
    <Link
      href={href}
      title={`${anime.title} — Episódio ${episode.number}`}
      className="group block overflow-hidden bg-panel transition-colors hover:bg-hairline"
    >
      <div className="card-scan relative" style={{ aspectRatio: "16 / 9" }}>
        {thumb ? (
          <AdaptiveImage
            src={thumb}
            desktopSrc={desktopThumb}
            alt={`${anime.title} — Episódio ${episode.number}`}
            fill
            sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            priority={priority}
            placeholder="blur"
            blurDataURL={blur.landscape}
            className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
            quality={80}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-hairline">
            <span className="font-mono text-caption uppercase tracking-wider text-mist">
              sem thumbnail
            </span>
          </div>
        )}

        {/* Nº do episódio: timecode do sinal, no canto. */}
        <span className="absolute bottom-1.5 left-1.5 bg-ink/80 px-1.5 py-0.5 font-mono text-caption font-medium text-ice tabular-nums">
          EP {episode.number}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2 px-2 py-2">
        <span className="line-clamp-1 flex-1 font-sans text-body-sm font-medium text-snow transition-colors group-hover:text-ice">
          {anime.title}
        </span>
        {episode.dateModified && (
          <time
            dateTime={episode.dateModified}
            className="shrink-0 font-mono text-caption text-mist tabular-nums"
          >
            {formatDate(episode.dateModified)}
          </time>
        )}
      </div>
    </Link>
    </SpotlightCard>
  );
}
