"use client";

import Link from "next/link";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { useGachaWishlist } from "@/lib/use-gacha-wishlist";

export function ProfileWishlist({ userId }: { userId: string }) {
  const {
    setCardsPage,
    setSetsPage,
    data: wishlist,
    loading: paging,
    error,
    retry: retryPage,
  } = useGachaWishlist(userId);

  if (!wishlist) {
    return (
      <section aria-labelledby="profile-wishlist-heading">
        <h2
          id="profile-wishlist-heading"
          className="font-display text-display-sm text-snow"
        >
          Wishlist
        </h2>
        {error ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-signal">
            {/* O alert fica só na mensagem: envolver o botão faz o leitor de
                tela anunciar "Tentar novamente" junto com o erro. */}
            <p role="alert">{error}</p>
            <button
              type="button"
              onClick={retryPage}
              className="btn-ghost min-h-11 px-4"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="skeleton mt-5 h-48" aria-busy="true" />
        )}
      </section>
    );
  }

  if (wishlist.private)
    return <p className="text-mist">Esta wishlist é privada.</p>;
  if (wishlist.meta.cards === 0 && wishlist.meta.sets === 0) {
    return <p className="text-mist">Nenhum desejo público ainda.</p>;
  }

  return (
    <section aria-labelledby="profile-wishlist-heading">
      <h2
        id="profile-wishlist-heading"
        className="font-display text-display-sm text-snow"
      >
        Wishlist
      </h2>
      {error && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-signal">
          <p role="alert">{error}</p>
          <button
            type="button"
            onClick={retryPage}
            className="btn-ghost min-h-11 px-4"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <section
        aria-labelledby="profile-wishlist-sets-heading"
        aria-busy={paging}
        className="mt-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id="profile-wishlist-sets-heading"
            className="font-display text-body-lg text-snow"
          >
            Conjuntos
          </h3>
          {wishlist.meta.sets > 0 && (
            <p className="text-caption text-mist tabular-nums">
              {wishlist.sets.length} de {wishlist.meta.sets}
            </p>
          )}
        </div>
        {wishlist.meta.sets === 0 ? (
          <p className="mt-3 text-mist">Nenhum conjunto desejado.</p>
        ) : wishlist.sets.length === 0 ? (
          <p className="mt-3 text-mist">Nenhum conjunto nesta página.</p>
        ) : (
          <div
            className={`mt-4 grid gap-3 sm:grid-cols-2 ${paging ? "opacity-60" : ""}`}
          >
            {wishlist.sets.map((set) => (
              <Link
                key={set.id}
                href={`/gacha/enciclopedia?view=sets&animeId=${set.animeId}`}
                className="border border-hairline bg-panel p-4 hover:border-ice"
              >
                <span className="text-body-md text-snow">
                  {set.anime.title}
                </span>
                <span className="mt-1 block text-caption text-mist">
                  {set.owned}/{set.total} cartas ·{" "}
                  {set.complete
                    ? "Completo"
                    : `${set.total - set.owned} faltantes`}
                </span>
              </Link>
            ))}
          </div>
        )}
        <PaginationControls
          page={wishlist.meta.setsPage}
          totalPages={wishlist.meta.setsTotalPages}
          onPageChange={setSetsPage}
          label="Paginação dos conjuntos desejados"
          busy={paging}
        />
      </section>

      <section
        aria-labelledby="profile-wishlist-cards-heading"
        aria-busy={paging}
        className="mt-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id="profile-wishlist-cards-heading"
            className="font-display text-body-lg text-snow"
          >
            Cartas
          </h3>
          {wishlist.meta.cards > 0 && (
            <p className="text-caption text-mist tabular-nums">
              {wishlist.cards.length} de {wishlist.meta.cards}
            </p>
          )}
        </div>
        {wishlist.meta.cards === 0 ? (
          <p className="mt-3 text-mist">Nenhuma carta desejada.</p>
        ) : wishlist.cards.length === 0 ? (
          <p className="mt-3 text-mist">Nenhuma carta nesta página.</p>
        ) : (
          <div
            className={`mt-4 grid gap-3 sm:grid-cols-2 ${paging ? "opacity-60" : ""}`}
          >
            {wishlist.cards.map((entry) => (
              <Link
                key={entry.id}
                href={`/gacha/enciclopedia?view=cards&animeId=${entry.card.animeId ?? ""}`}
                className="border border-hairline bg-panel p-4 hover:border-ice"
              >
                <span className="text-body-md text-snow">
                  {entry.card.name}
                </span>
                <span className="mt-1 block text-caption text-mist">
                  {entry.complete ? "Concluída" : entry.priority}
                </span>
              </Link>
            ))}
          </div>
        )}
        <PaginationControls
          page={wishlist.meta.cardsPage}
          totalPages={wishlist.meta.cardsTotalPages}
          onPageChange={setCardsPage}
          label="Paginação das cartas desejadas"
          busy={paging}
        />
      </section>
    </section>
  );
}
