import type { PublicFavoriteItem } from "@/types";
import { SectionLabel } from "@/components/common/SectionLabel";
import { PosterTile } from "./PosterTile";

/**
 * ProfileFavorites — favoritos como capas, não como lista.
 * Poster-first: cada item é a arte do anime; o texto fica fora da arte.
 */
export function ProfileFavorites({
  items,
  total,
}: {
  items: PublicFavoriteItem[];
  total: number;
}) {
  if (items.length === 0) {
    return (
      <section>
        <SectionLabel level={2}>Favoritos</SectionLabel>
        <p className="text-body-sm text-mist/70">
          Nenhum favorito ainda.
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionLabel level={2}>
        Favoritos <span className="shelf-label-data">{total}</span>
      </SectionLabel>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {items.map((f) => (
          <PosterTile
            key={f.anime.id}
            slug={f.anime.slug}
            title={f.anime.title}
            coverImage={f.anime.coverImage}
          />
        ))}
      </div>
    </section>
  );
}
