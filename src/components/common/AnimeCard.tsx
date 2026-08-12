import Image from "next/image";
import type { Anime } from "@/types";
import { safeImageSrc } from "@/lib/url";
import { statusLabel, isOnAir } from "@/lib/status";

export interface AnimeCardProps {
  anime: Pick<Anime, "slug" | "title" | "coverImage" | "rating" | "ageRating" | "status" | "audio">;
  /**
   * Posição na prateleira. Imagens above-the-fold (0..3) recebem `priority`
   * para acelerar o LCP; o resto usa lazy nativo.
   */
  priority?: boolean;
}

/**
 * Card de poster 2:3.
 * Signature: o ident de transmissão (edge-tag) na borda inferior carregando
 * status + áudio. Hover = varredura de sinal (card-scan), não zoom genérico.
 * A arte preenche o card; a UI fica fora da arte.
 *
 * Performance: usa next/image → AVIF/WebP automático. `sizes` correto garante
 * que o browser baixe o asset certo para a viewport, sem pedir 1 MB em mobile.
 */
export function AnimeCard({ anime, priority = false }: AnimeCardProps) {
  const age = anime.ageRating;
  const dub = anime.audio === "DUBLADO";
  const onAir = isOnAir(anime.status);
  const cover = safeImageSrc(anime.coverImage);

  return (
    <a
      href={`/animes/${anime.slug}`}
      title={anime.title}
      className="group block overflow-hidden bg-panel transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(2,4,8,0.85)] hover:ring-1 hover:ring-ice/50 active:translate-y-0 active:scale-[0.98]"
    >
      <div className="card-scan relative" style={{ aspectRatio: "2 / 3" }}>
        {cover ? (
          <Image
            src={cover}
            alt={anime.title}
            fill
            sizes="(max-width: 480px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
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

        {/* Rating: miúdo, canto sup.-dir., discrete — não cobre a arte. */}
        {anime.rating != null && anime.rating > 0 && (
          <span className="absolute right-1.5 top-1.5 bg-ink/85 px-1.5 py-0.5 font-mono text-caption font-medium text-ice tabular-nums backdrop-blur-sm">
            {anime.rating.toFixed(2)}
          </span>
        )}

        {/* Age rating: nota quente só quando há classificação restrita. */}
        {age && (age.includes("A16") || age.includes("A18")) && (
          <span className="absolute left-1.5 top-1.5 bg-signal px-1.5 py-0.5 font-mono text-caption font-medium text-ink">
            {age}
          </span>
        )}
      </div>

      {/* Signature: ident de transmissão — status + áudio. */}
      <div className="edge-tag">
        <span>
          {onAir && <span className="edge-tag-live" aria-hidden="true" />}
          {statusLabel(anime.status)}
        </span>
        <span aria-label={dub ? "Dublado" : "Legendado"}>
          {dub ? "Dub" : "Leg"}
        </span>
      </div>

      {/* Título abaixo da edge-tag, fora da arte. */}
      <span className="line-clamp-2 block px-2 py-2 font-sans text-body-sm font-medium text-snow transition-colors group-hover:text-ice">
        {anime.title}
      </span>
    </a>
  );
}
