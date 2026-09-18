"use client";

import Link from "next/link";
import type { GachaWishlistResponse } from "@/types";

export function ProfileWishlist({
  data,
  loading,
}: {
  data: GachaWishlistResponse | null;
  loading: boolean;
}) {
  if (loading) return <div className="skeleton h-48" />;
  if (data?.private)
    return <p className="text-mist">Esta wishlist é privada.</p>;
  if (!data || (data.cards.length === 0 && data.sets.length === 0)) {
    return <p className="text-mist">Nenhum desejo público ainda.</p>;
  }
  return (
    <section>
      <h2 className="font-display text-display-sm text-snow">Wishlist</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {data.sets.map((set) => (
          <Link
            key={set.id}
            href={`/gacha/enciclopedia?view=sets&animeId=${set.animeId}`}
            className="border border-hairline bg-panel p-4 hover:border-ice"
          >
            <span className="text-body-md text-snow">{set.anime.title}</span>
            <span className="mt-1 block text-caption text-mist">
              {set.owned}/{set.total} cartas ·{" "}
              {set.complete ? "Completo" : `${set.total - set.owned} faltantes`}
            </span>
          </Link>
        ))}
        {data.cards.map((entry) => (
          <Link
            key={entry.id}
            href={`/gacha/enciclopedia?view=cards&animeId=${entry.card.animeId ?? ""}`}
            className="border border-hairline bg-panel p-4 hover:border-ice"
          >
            <span className="text-body-md text-snow">{entry.card.name}</span>
            <span className="mt-1 block text-caption text-mist">
              {entry.complete ? "Concluída" : entry.priority}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
