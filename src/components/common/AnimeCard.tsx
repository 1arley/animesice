import type { Anime } from "@/types";

export interface AnimeCardProps {
  anime: Pick<Anime, "slug" | "title" | "coverImage" | "rating" | "ageRating" | "status" | "audio">;
}

/** Status -> rótulo curto da edge-tag (condensado, nao mais de ~10 chars). */
function statusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s.includes("LANC")) return "No ar";
  if (s.includes("CONCL")) return "Fim";
  return s.slice(0, 8) || "Cat";
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

  return (
    <a
      href={`/animes/${anime.slug}`}
      title={anime.title}
      className="group block overflow-hidden bg-panel transition-colors hover:bg-hairline"
    >
      <div className="relative" style={{ aspectRatio: "2 / 3" }}>
        {anime.coverImage ? (
          <img
            src={anime.coverImage}
            loading="lazy"
            alt={anime.title}
            className="absolute inset-0 h-full w-full object-cover opacity-95 transition-opacity group-hover:opacity-100"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-hairline">
            <span className="font-display text-caption uppercase tracking-wider text-mist">
              sem capa
            </span>
          </div>
        )}

        {/* Rating: miúdo, canto sup.-dir., discrete — não cobre a arte. */}
        {anime.rating != null && (
          <span className="absolute right-1.5 top-1.5 bg-ink/80 px-1.5 py-0.5 font-display text-caption font-semibold text-ice tabular-nums">
            {anime.rating.toFixed(2)}
          </span>
        )}

        {/* Age rating: nota quente só quando há classificação restrita. */}
        {age && age.includes("A16") && (
          <span className="absolute left-1.5 top-1.5 bg-signal px-1.5 py-0.5 font-display text-caption font-semibold text-ink">
            {age}
          </span>
        )}
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
