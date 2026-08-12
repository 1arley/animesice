import Image from "next/image";
import { safeImageSrc } from "@/lib/url";

export interface PosterTileProps {
  slug: string;
  title: string;
  coverImage?: string | null;
  /** Progresso 0–100 (opcional) — barra de gelo na base do poster. */
  progress?: number | null;
  /** Rótulo de estado (ex. "Assistindo") — chip discreto no topo. */
  statusLabel?: string;
  /** Prioridade para imagens acima da dobra (LCP). */
  priority?: boolean;
}

/**
 * PosterTile — capa 2:3 reutilizável do perfil (favoritos, coleção, notas).
 * Mesma linguagem do AnimeCard: arte preenche o card, varredura de sinal no
 * hover, barra de progresso de gelo na base quando há progresso real.
 */
export function PosterTile({
  slug,
  title,
  coverImage,
  progress,
  statusLabel,
  priority = false,
}: PosterTileProps) {
  const cover = safeImageSrc(coverImage);
  const pct =
    progress != null && progress > 0
      ? Math.min(100, Math.round(progress))
      : null;

  return (
    <a
      href={`/animes/${slug}`}
      title={title}
      className="group block overflow-hidden bg-panel transition-all duration-200 hover:ring-1 hover:ring-ice/50"
    >
      <div className="card-scan relative" style={{ aspectRatio: "2 / 3" }}>
        {cover ? (
          <Image
            src={cover}
            alt={title}
            fill
            sizes="(max-width: 480px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 14vw"
            priority={priority}
            className="object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
            quality={75}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-hairline">
            <span className="font-mono text-caption uppercase tracking-wider text-mist">
              sem capa
            </span>
          </div>
        )}

        {statusLabel && (
          <span className="absolute left-1.5 top-1.5 bg-ink/85 px-1.5 py-0.5 font-mono text-caption font-medium text-ice backdrop-blur-sm">
            {statusLabel}
          </span>
        )}

        {pct != null && pct < 100 && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-ink/70">
            <div
              className="h-full bg-ice transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {pct != null && pct >= 100 && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-ice/80" />
        )}
      </div>
      <span className="line-clamp-2 block px-2 py-2 font-sans text-body-sm font-medium text-snow transition-colors group-hover:text-ice">
        {title}
      </span>
    </a>
  );
}
