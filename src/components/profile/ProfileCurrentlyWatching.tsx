import Image from "next/image";
import Link from "next/link";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
import { timeAgo } from "@/lib/time";
import type { PublicAnimeListItem } from "@/types";
import { SectionLabel } from "@/components/common/SectionLabel";

/**
 * ProfileCurrentlyWatching — o que a pessoa está assistindo agora.
 * Progresso real: episódios assistidos / total do anime (episodeCount).
 * Sem progresso inventado: sem total, mostra só o episódio atual.
 */
export function ProfileCurrentlyWatching({
  items,
}: {
  items: PublicAnimeListItem[];
}) {
  if (items.length === 0) {
    return (
      <section>
        <SectionLabel level={2}>Agora assistindo</SectionLabel>
        <p className="text-body-sm text-mist/70">
          Não está acompanhando nenhum anime no momento.
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionLabel level={2}>Agora assistindo</SectionLabel>
      <div className="space-y-3">
        {items.slice(0, 3).map((item) => {
          const cover = safeImageSrc(item.anime.coverImage);
          const total = item.anime.episodeCount;
          const pct =
            total && total > 0
              ? Math.min(100, Math.round((item.episodesWatched / total) * 100))
              : null;
          return (
            <Link
              key={item.animeId}
              href={`/animes/${item.anime.slug}`}
              className="group flex items-center gap-4 border border-hairline bg-panel p-3 transition-colors hover:border-ice/40"
            >
              <div
                className="card-scan relative w-12 shrink-0 overflow-hidden bg-hairline"
                style={{ aspectRatio: "2 / 3" }}
              >
                {cover ? (
                  <Image
                    src={cover}
                    alt={item.anime.title}
                    fill
                    sizes="48px"
                    placeholder="blur"
                    blurDataURL={blur.portrait}
                    className="object-cover"
                    quality={80}
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-caption text-mist">
                    —
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-body font-medium text-snow transition-colors group-hover:text-ice">
                  {item.anime.title}
                </p>
                <p className="mt-0.5 font-mono text-caption text-mist">
                  {total
                    ? `Episódio ${item.episodesWatched} de ${total}`
                    : `Episódio ${item.episodesWatched}`}
                </p>
                {pct != null && (
                  <div className="mt-2 h-1 w-full bg-hairline">
                    <div
                      className="h-full bg-ice transition-[width] duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="hidden shrink-0 font-mono text-caption text-mist/60 sm:block">
                {timeAgo(item.updatedAt)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
