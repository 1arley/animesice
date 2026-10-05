"use client";

import { useCallback, useEffect, useState } from "react";

export const GACHA_WISHLIST_PAGE_SIZE = 24;

type WishlistPages = {
  cardsPage: number;
  setsPage: number;
};

function readPage(params: URLSearchParams, key: keyof WishlistPages): number {
  const page = Number(params.get(key) ?? 1);
  return Number.isInteger(page) && page > 0 && page <= 100000 ? page : 1;
}

export function useGachaWishlistPagination() {
  const [pages, setPages] = useState<WishlistPages>({
    cardsPage: 1,
    setsPage: 1,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setPages({
        cardsPage: readPage(params, "cardsPage"),
        setsPage: readPage(params, "setsPage"),
      });
    };

    syncFromUrl();
    setReady(true);
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const setPage = useCallback(
    (key: keyof WishlistPages, page: number, replace = false) => {
      const nextPage =
        Number.isInteger(page) && page > 0 ? Math.min(page, 100000) : 1;
      const url = new URL(window.location.href);
      if (nextPage === 1) url.searchParams.delete(key);
      else url.searchParams.set(key, String(nextPage));

      const href = `${url.pathname}${url.search}${url.hash}`;
      if (replace) window.history.replaceState(window.history.state, "", href);
      else window.history.pushState(window.history.state, "", href);

      setPages((current) => ({ ...current, [key]: nextPage }));
    },
    [],
  );

  const setCardsPage = useCallback(
    (page: number, replace = false) => setPage("cardsPage", page, replace),
    [setPage],
  );
  const setSetsPage = useCallback(
    (page: number, replace = false) => setPage("setsPage", page, replace),
    [setPage],
  );

  return {
    cardsPage: pages.cardsPage,
    setsPage: pages.setsPage,
    setCardsPage,
    setSetsPage,
    ready,
  };
}
