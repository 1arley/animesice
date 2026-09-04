import Image from "next/image";
import Link from "next/link";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
import { timeAgo } from "@/lib/time";
import type { UserRating } from "@/types";
import { SectionLabel } from "@/components/common/SectionLabel";
import { Stars } from "./Stars";

/**
 * ProfileRatings — avaliações com opinião: poster, título, estrelas e nota.
 * Não é tabela — cada avaliação carrega a arte e o número.
 */
export function ProfileRatings({
  items,
  total,
}: {
  items: UserRating[];
  total: number;
}) {
  if (items.length === 0) {
    return (
      <section>
        <SectionLabel level={2}>Notas</SectionLabel>
        <p className="text-body-sm text-mist-soft">
          Nenhuma avaliação ainda.
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionLabel level={2}>
        Notas <span className="shelf-label-data">{total}</span>
      </SectionLabel>
      <div className="space-y-2">
        {items.map((r) => {
          const cover = safeImageSrc(r.anime.coverImage);
          return (
            <Link
              key={r.anime.id}
              href={`/animes/${r.anime.slug}`}
              className="group flex items-center gap-4 border border-hairline bg-panel p-3 transition-colors hover:border-ice/40"
            >
              <div
                className="card-scan relative w-12 shrink-0 overflow-hidden bg-hairline"
                style={{ aspectRatio: "2 / 3" }}
              >
                {cover ? (
                  <Image
                    src={cover}
                    alt={r.anime.title}
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
                  {r.anime.title}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Stars score={r.score} />
                  <span className="font-mono text-caption tabular-nums text-mist">
                    {r.score}/10
                  </span>
                </div>
              </div>
              <span className="hidden shrink-0 font-mono text-caption text-mist-soft sm:block">
                {timeAgo(r.createdAt)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
