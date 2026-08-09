import type { Anime } from "@/types";
import { safeImageSrc } from "@/lib/url";
import { statusLabel } from "@/lib/status";

export interface AnimeCardProps {
  anime: Pick<Anime, "slug" | "title" | "coverImage" | "rating" | "ageRating" | "status" | "audio">;
}

/**
 * Card de poster 2:3.
 * Signature: a ice edge-tag na borda inferior carregando status + áudio.
 * A arte do poster preenche o card; a UI fica fora da arte.
 * Rating vive no canto sup.-dir., miúdo, fora da arte.
 */
export function AnimeCard({ anime }: AnimeCardProps) {
  const age = anime.ageRating;
  const dub = anime.audio === "DUBLADO";
  const cover = safeImageSrc(anime.coverImage);

  return (
    <a
      href={`/animes/${anime.slug}`}
      title={anime.title}
      className="group block overflow-hidden bg-panel transition-all duration-200 hover:ring-1 hover:ring-ice/50 hover:ring-offset-0"
    >
      <div className="relative" style={{ aspectRatio: "2 / 3" }}>
        {cover ? (
          <img
            src={cover}
            loading="lazy"
            alt={anime.title}
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-hairline">
            <span className="font-display text-caption uppercase tracking-wider text-mist">
              sem capa
            </span>
          </div>
        )}

        {/* Rating: miúdo, canto sup.-dir., discrete — não cobre a arte. */}
        {anime.rating != null && anime.rating > 0 && (
          <span className="absolute right-1.5 top-1.5 bg-ink/85 px-1.5 py-0.5 font-display text-caption font-semibold text-ice tabular-nums backdrop-blur-sm transition-colors group-hover:bg-ice group-hover:text-ink">
            {anime.rating.toFixed(2)}
          </span>
        )}

        {/* Age rating: nota quente só quando há classificação restrita. */}
        {age && (age.includes("A16") || age.includes("A18")) && (
          <span className="absolute left-1.5 top-1.5 bg-signal px-1.5 py-0.5 font-display text-caption font-semibold text-ink">
            {age}
          </span>
        )}

        {/* Hover overlay: play icon */}
        <div className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/20 group-hover:opacity-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ice bg-ink/60 text-ice backdrop-blur-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
              <path d="M3 2l9 5-9 5z" />
            </svg>
          </span>
        </div>
      </div>

      {/* Signature: ice edge-tag — status + áudio. */}
      <div className="edge-tag">
        <span>{statusLabel(anime.status)}</span>
        <span aria-label={dub ? "Dublado" : "Legendado"}>
          {dub ? "Dub" : "Leg"}
        </span>
      </div>

      {/* Título abaixo da edge-tag, fora da arte. */}
      <h3 className="line-clamp-2 px-2 py-2 font-sans text-body-sm font-medium text-mist transition-colors group-hover:text-ice">
        {anime.title}
      </h3>
    </a>
  );
}
