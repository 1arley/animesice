"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { GachaWishlistResponse } from "@/types";

export const GACHA_WISHLIST_PAGE_SIZE = 24;

type WishlistPages = {
  cardsPage: number;
  setsPage: number;
};

function readPage(
  params: Pick<URLSearchParams, "get">,
  key: keyof WishlistPages,
): number {
  const page = Number(params.get(key) ?? 1);
  return Number.isInteger(page) && page > 0 && page <= 100000 ? page : 1;
}

export function useGachaWishlist(userId?: string) {
  const searchParams = useSearchParams();
  const cardsPage = readPage(searchParams, "cardsPage");
  const setsPage = readPage(searchParams, "setsPage");
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState<{
    userId: string;
    data: GachaWishlistResponse;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedUserId, setFailedUserId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const data = loaded && loaded.userId === userId ? loaded.data : null;

  useEffect(() => {
    setReady(true);
  }, []);

  const setPage = useCallback(
    (key: keyof WishlistPages, page: number, replace = false) => {
      const nextPage =
        Number.isInteger(page) && page > 0 ? Math.min(page, 100000) : 1;
      const url = new URL(window.location.href);
      if (nextPage === 1) url.searchParams.delete(key);
      else url.searchParams.set(key, String(nextPage));

      const href = `${url.pathname}${url.search}${url.hash}`;
      if (replace) window.history.replaceState(null, "", href);
      else window.history.pushState(null, "", href);
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

  useEffect(() => {
    if (!userId || !ready) {
      setLoading(false);
      return;
    }
    if (
      data &&
      data.meta.cardsPage === cardsPage &&
      data.meta.setsPage === setsPage
    ) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setFailedUserId(null);
    void api
      .gachaWishlist(
        userId,
        {
          limit: GACHA_WISHLIST_PAGE_SIZE,
          cardsPage,
          setsPage,
        },
        controller.signal,
      )
      .then((result) => {
        if (cancelled) return;
        setLoaded({ userId, data: result });
        if (result.meta.cardsPage !== cardsPage)
          setCardsPage(result.meta.cardsPage, true);
        if (result.meta.setsPage !== setsPage)
          setSetsPage(result.meta.setsPage, true);
      })
      .catch(() => {
        if (!cancelled) setFailedUserId(userId);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    userId,
    ready,
    cardsPage,
    setsPage,
    setCardsPage,
    setSetsPage,
    retryCount,
    data,
  ]);

  return {
    cardsPage,
    setsPage,
    setCardsPage,
    setSetsPage,
    ready,
    data,
    loading,
    error:
      failedUserId === userId
        ? "Não foi possível carregar a wishlist. Tente novamente."
        : "",
    retry: () => setRetryCount((count) => count + 1),
  };
}
