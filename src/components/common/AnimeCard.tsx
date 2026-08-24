import Link from "next/link";
import type { Anime } from "@/types";
import { safeImageSrc, upgradeImageUrl } from "@/lib/url";
import { blur } from "@/lib/blur";
import { statusLabel, isOnAir } from "@/lib/status";
import { SpotlightCard } from "@/components/core/SpotlightCard";
import { AdaptiveImage } from "@/components/common/AdaptiveImage";

export interface AnimeCardProps {
  anime: Pick<Anime, "slug" | "title" | "coverImage" | "rating" | "ageRating" | "status" | "audio">;
  /**
   * Posição na prateleira. Imagens above-the-fold (0..3) recebem `priority`
   * para acelerar o LCP; o resto usa lazy nativo.
   */
  priority?: boolean;
  /**
   * Spotlight (brilho que segue o cursor). Por padrão ligado nos rails;
   * as grades densas da home desligam para não empilhar efeitos no mesmo
   * frame — aí o hover é só o lift + card-scan.
   */
  spotlight?: boolean;
  /** Versão silenciosa para prateleiras editoriais: arte e título primeiro. */
  variant?: "standard" | "poster";
  /** Posição real em listas ordenadas, como avaliação e tendência. */
  rank?: number;
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
export function AnimeCard({ anime, priority = false, spotlight = true, variant = "standard", rank }: AnimeCardProps) {
  const age = anime.ageRating;
  const dub = anime.audio === "DUBLADO";
  const onAir = isOnAir(anime.status);
  const cover = safeImageSrc(anime.coverImage);
  const desktopCover = upgradeImageUrl(anime.coverImage);

  const card = (
    <Link
      href={`/animes/${anime.slug}`}
      prefetch
      title={anime.title}
      className="group relative block bg-panel transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_16px_32px_-14px_rgba(2,4,8,0.9)] focus-visible:outline-offset-4 active:translate-y-0 active:scale-[0.98] active:duration-100"
    >
      {rank !== undefined && (
        <span className="absolute left-0 top-0 z-10 min-w-9 bg-snow px-2 py-1 font-display text-xl font-bold leading-none text-ink" aria-label={`Posição ${rank}`}>
          {String(rank).padStart(2, "0")}
        </span>
      )}
      <div className="card-scan relative" style={{ aspectRatio: "2 / 3" }}>
        {cover ? (
          <AdaptiveImage
            src={cover}
            desktopSrc={desktopCover}
            alt={anime.title}
            fill
            sizes="(max-width: 480px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
            priority={priority}
            placeholder="blur"
            blurDataURL={blur.portrait}
            className="object-cover opacity-90 transition-opacity duration-500 ease-out group-hover:opacity-100"
            quality={80}
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
        {rank === undefined && age && (age.includes("A16") || age.includes("A18")) && (
          <span className="absolute left-1.5 top-1.5 bg-signal px-1.5 py-0.5 font-mono text-caption font-medium text-ink">
            {age}
          </span>
        )}
      </div>

      {variant === "standard" && (
        <div className="edge-tag">
          <span>
            {onAir && <span className="edge-tag-live" aria-hidden="true" />}
            {statusLabel(anime.status)}
          </span>
          <span aria-label={dub ? "Dublado" : "Legendado"}>{dub ? "Dub" : "Leg"}</span>
        </div>
      )}

      {/* Título abaixo da edge-tag, fora da arte. */}
      <span className="block px-2.5 pb-2.5 pt-2">
        <span className="line-clamp-2 block font-sans text-body-sm font-medium text-snow transition-colors group-hover:text-ice">{anime.title}</span>
        {variant === "poster" && (
          <span className="mt-1 flex items-center gap-2 font-sans text-label text-mist">
            <span className={onAir ? "text-signal" : undefined}>{onAir ? "No ar" : statusLabel(anime.status)}</span>
            <span aria-hidden="true" className="text-hairline">/</span>
            <span>{dub ? "Dublado" : "Legendado"}</span>
          </span>
        )}
      </span>
      </Link>
  );

  if (!spotlight) return card;
  return <SpotlightCard className="h-full">{card}</SpotlightCard>;
}
