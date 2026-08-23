import Link from "next/link";
import type { Anime } from "@/types";
import { blur } from "@/lib/blur";
import { safeImageSrc, upgradeImageUrl } from "@/lib/url";
import { AdaptiveImage } from "@/components/common/AdaptiveImage";

/** Card largo para escolhas editoriais. É um recorte de programação, não
 * outro poster na mesma grade. */
export function BroadcastCard({ anime, priority = false }: { anime: Anime; priority?: boolean }) {
  const safeBanner = safeImageSrc(anime.bannerImage);
  const art = safeBanner ?? safeImageSrc(anime.coverImage);
  const desktopArt = safeBanner
    ? upgradeImageUrl(safeBanner)
    : upgradeImageUrl(anime.coverImage);

  return (
    <Link
      href={`/animes/${anime.slug}`}
      className="group relative block min-h-[180px] overflow-hidden bg-panel focus-visible:outline-offset-4 sm:min-h-[220px]"
    >
      {art ? (
        <AdaptiveImage
          src={art}
          desktopSrc={desktopArt}
          alt=""
          fill
          sizes="(max-width: 768px) 86vw, 33vw"
          priority={priority}
          placeholder="blur"
          blurDataURL={blur.landscape}
          className="object-cover opacity-75 transition-opacity duration-500 ease-out group-hover:opacity-90"
          quality={80}
        />
      ) : (
        <div className="absolute inset-0 bg-hairline" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <span className="font-mono text-label uppercase tracking-[0.16em] text-mist">
          {[anime.year, anime.audio === "DUBLADO" ? "Dublado" : "Legendado"].filter(Boolean).join("  /  ")}
        </span>
        <h3 className="mt-1 line-clamp-2 max-w-md font-display text-2xl font-bold leading-none text-snow sm:text-3xl">
          {anime.title}
        </h3>
      </div>
    </Link>
  );
}
