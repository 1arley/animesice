"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PaginationControls } from "@/components/ui/PaginationControls";
import type { GachaWishlistResponse } from "@/types";

const PAGE_SIZE = 24;

export function ProfileWishlist({
  userId,
  data,
  loading,
}: {
  userId: string;
  data: GachaWishlistResponse | null;
  loading: boolean;
}) {
  const [view, setView] = useState<GachaWishlistResponse | null>(data);
  const [cardsPage, setCardsPage] = useState(1);
  const [setsPage, setSetsPage] = useState(1);
  const [paging, setPaging] = useState(false);

  // O pai recarrega a wishlist ao abrir a aba; acompanha o dado novo e volta
  // para a primeira página em vez de manter a posição anterior.
  useEffect(() => {
    if (!data) return;
    setView(data);
    setCardsPage(1);
    setSetsPage(1);
  }, [data]);

  if (loading && !view) return <div className="skeleton h-48" />;
  if (view?.private)
    return <p className="text-mist">Esta wishlist é privada.</p>;
  if (!view || (view.meta.cards === 0 && view.meta.sets === 0)) {
    return <p className="text-mist">Nenhum desejo público ainda.</p>;
  }

  async function changePage(section: "cards" | "sets", target: number) {
    if (!view || paging) return;
    const nextCardsPage = section === "cards" ? target : cardsPage;
    const nextSetsPage = section === "sets" ? target : setsPage;
    setPaging(true);
    try {
      const result = await api.gachaWishlist(userId, {
        limit: PAGE_SIZE,
        cardsPage: nextCardsPage,
        setsPage: nextSetsPage,
      });
      setView(result);
      setCardsPage(result.meta.cardsPage);
      setSetsPage(result.meta.setsPage);
    } catch {
      // mantém a página atual — o usuário pode tentar de novo
    } finally {
      setPaging(false);
    }
  }

  return (
    <section>
      <h2 className="font-display text-display-sm text-snow">Wishlist</h2>
      <div
        aria-busy={paging}
        className={`mt-5 grid gap-3 sm:grid-cols-2 ${paging ? "opacity-60" : ""}`}
      >
        {view.sets.map((set) => (
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
        {view.cards.map((entry) => (
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
      <PaginationControls
        page={view.meta.setsPage}
        totalPages={view.meta.setsTotalPages}
        onPageChange={(target) => void changePage("sets", target)}
        label="Paginação dos conjuntos desejados"
        busy={paging}
      />
      <PaginationControls
        page={view.meta.cardsPage}
        totalPages={view.meta.cardsTotalPages}
        onPageChange={(target) => void changePage("cards", target)}
        label="Paginação das cartas desejadas"
        busy={paging}
      />
    </section>
  );
}
