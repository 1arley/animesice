"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { safeImageSrc } from "@/lib/url";
import { GACHA_TIERS, RARITY } from "@/components/gacha/GachaCard";
import type { GachaEncyclopedia } from "@/types";

function Encyclopedia() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const view = params.get("view") === "sets" ? "sets" : "cards";
  const animeId = params.get("animeId") ?? "";
  const isSets = view === "sets" && !animeId;
  const rawPage = Number(params.get("page") ?? 1);
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  const search = (params.get("search") ?? "").slice(0, 100);
  const rarity = params.get("rarity") ?? "";
  const ownership = params.get("ownership") ?? "all";
  const progress = params.get("progress") ?? "all";
  const query = new URLSearchParams({
    view: isSets ? "sets" : "cards",
    page: String(page),
    limit: isSets ? "20" : "24",
  });
  if (search) query.set("search", search);
  if (isSets) {
    if (["complete", "near"].includes(progress))
      query.set("progress", progress);
  } else {
    if (GACHA_TIERS.some((tier) => tier === rarity))
      query.set("rarity", rarity);
    if (["owned", "missing"].includes(ownership))
      query.set("ownership", ownership);
    if (animeId) query.set("animeId", animeId);
  }
  const queryString = query.toString();
  const requestKey = `${user?.id ?? "guest"}:${queryString}`;
  const [result, setResult] = useState<{
    key: string;
    data?: GachaEncyclopedia;
    error?: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const data = result?.key === requestKey ? result.data : undefined;
  const error = result?.key === requestKey ? result.error : undefined;

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    let cancelled = false;
    setResult(null);
    void api.gachaEncyclopedia(queryString, controller.signal).then(
      (data) => {
        if (!cancelled) setResult({ key: requestKey, data });
      },
      () => {
        if (!cancelled)
          setResult({
            key: requestKey,
            error: "Não foi possível carregar a enciclopédia.",
          });
      },
    );
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authLoading, queryString, requestKey, retry]);

  function href(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return `/gacha/encyclopedia?${next}`;
  }

  return (
    <main className="mx-auto max-w-shelf px-4 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-snow">
            Enciclopédia
          </h1>
          <p className="mt-2 text-body-sm text-mist">
            Descubra cartas e complete seus conjuntos.
          </p>
        </div>
        <Link href="/gacha/collection" className="btn-ghost px-4 py-3">
          Minha coleção
        </Link>
      </div>
      <nav
        aria-label="Visão da enciclopédia"
        className="mt-8 flex flex-wrap gap-3"
      >
        <Link
          href={href({
            view: "cards",
            animeId: "",
            title: "",
            progress: "",
            search: "",
          })}
          aria-current={view === "cards" ? "page" : undefined}
          className={`${view === "cards" ? "btn-ice" : "btn-ghost"} px-4 py-3`}
        >
          Explorar cartas
        </Link>
        <Link
          href={href({
            view: "sets",
            animeId: "",
            title: "",
            rarity: "",
            ownership: "",
            search: "",
          })}
          aria-current={view === "sets" ? "page" : undefined}
          className={`${view === "sets" ? "btn-ice" : "btn-ghost"} px-4 py-3`}
        >
          Completar conjuntos
        </Link>
      </nav>
      {animeId && (
        <div className="mt-6">
          <Link
            href={href({
              animeId: "",
              title: "",
              search: "",
              ownership: "",
              rarity: "",
              view: "sets",
            })}
            className="text-ice underline"
          >
            Voltar aos conjuntos
          </Link>
          <h2 className="mt-3 font-display text-body-lg text-snow">
            {params.get("title") || "Cartas do conjunto"}
          </h2>
        </div>
      )}
      <form
        key={search}
        onSubmit={(event) => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          router.push(
            href({ search: String(values.get("search") ?? "").trim() }),
          );
        }}
        className="mt-6 flex flex-wrap gap-3"
      >
        <input
          aria-label="Buscar personagem ou anime"
          name="search"
          type="search"
          maxLength={100}
          defaultValue={search}
          placeholder="Personagem ou anime"
          className="min-w-0 flex-1 border border-hairline bg-panel p-3 text-snow"
        />
        <button className="btn-ice px-4 py-3" type="submit">
          Buscar
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-3">
        {isSets ? (
          <select
            aria-label="Progresso dos conjuntos"
            value={progress}
            onChange={(event) =>
              router.push(href({ progress: event.target.value }))
            }
            className="max-w-full border border-hairline bg-panel p-3 text-snow"
          >
            <option value="all">Todos os conjuntos</option>
            <option value="near">Quase completos</option>
            <option value="complete">Completos</option>
          </select>
        ) : (
          <>
            <select
              aria-label="Raridade"
              value={rarity}
              onChange={(event) =>
                router.push(href({ rarity: event.target.value }))
              }
              className="max-w-full border border-hairline bg-panel p-3 text-snow"
            >
              <option value="">Todas as raridades</option>
              {GACHA_TIERS.map((tier) => (
                <option key={tier}>{tier}</option>
              ))}
            </select>
            <select
              aria-label="Posse das cartas"
              value={ownership}
              onChange={(event) =>
                router.push(href({ ownership: event.target.value }))
              }
              className="max-w-full border border-hairline bg-panel p-3 text-snow"
            >
              <option value="all">Todas as cartas</option>
              <option value="missing">Só faltantes</option>
              <option value="owned">Na coleção</option>
            </select>
          </>
        )}
      </div>
      {!authLoading && !user && (
        <p className="mt-4 text-body-sm text-mist">
          <Link href="/login" className="text-ice underline">
            Entre
          </Link>{" "}
          para acompanhar seu progresso.
        </p>
      )}
      {isSets && progress === "near" && (
        <p className="mt-4 text-body-sm text-mist">
          Conjuntos iniciados, ordenados por menos cartas faltantes.
        </p>
      )}
      {error ? (
        <div role="alert" className="mt-8 text-signal">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="btn-ghost mt-3 px-4 py-3"
          >
            Tentar novamente
          </button>
        </div>
      ) : !data ? (
        <div
          role="status"
          aria-label="Carregando enciclopédia"
          className="skeleton mt-8 h-80"
        />
      ) : (
        <>
          <p role="status" className="mt-6 text-body-sm text-mist">
            {data.meta.total} {isSets ? "conjuntos" : "cartas"}
          </p>
          {data.meta.total === 0 ? (
            <p className="mt-8 text-mist">
              Nenhum resultado para estes filtros.
            </p>
          ) : isSets ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.sets.map((set) => (
                <Link
                  key={set.animeId ?? "orphan"}
                  href={href({
                    animeId: set.animeId ?? "orphan",
                    title: set.animeTitle,
                    search: "",
                    rarity: "",
                    ownership: "",
                  })}
                  className="border border-hairline bg-panel p-5 transition-colors hover:border-ice"
                >
                  <h2 className="font-display text-body-lg text-snow">
                    {set.animeTitle}
                  </h2>
                  <p className="mt-3 text-body-sm text-mist">
                    {set.owned}/{set.total} cartas ·{" "}
                    {set.complete
                      ? "Completo"
                      : `${set.total - set.owned} faltantes`}
                  </p>
                  <progress
                    aria-label={`Progresso de ${set.animeTitle}`}
                    value={set.owned}
                    max={set.total}
                    className="mt-3 h-2 w-full accent-ice"
                  />
                  <span className="mt-3 block text-body-sm text-ice">
                    Ver cartas
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {data.cards.map((card) => {
                const art = safeImageSrc(card.image);
                return (
                  <article key={card.id}>
                    <div
                      className={`relative aspect-[3/4] overflow-hidden border bg-panel ${RARITY[card.rarity]?.border ?? "border-hairline"}`}
                    >
                      {art ? (
                        <Image
                          src={art}
                          alt={card.name}
                          fill
                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 16vw"
                          className={`object-cover ${card.owned ? "" : "grayscale"}`}
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-caption text-mist">
                          Sem imagem
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 border border-hairline bg-ink px-2 py-1 text-caption text-snow">
                        {card.owned ? "Na coleção" : "Falta"}
                      </span>
                    </div>
                    <h2 className="mt-2 text-body-sm text-snow">{card.name}</h2>
                    <p className="mt-1 text-caption text-mist">
                      {card.animeTitle ?? "Sem anime"} · {card.rarity}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
          {data.meta.totalPages > 1 && (
            <nav
              aria-label="Paginação da enciclopédia"
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              {page > 1 && (
                <Link
                  href={href({ page: String(page - 1) })}
                  className="btn-ghost px-4 py-3"
                >
                  Anterior
                </Link>
              )}
              <span className="text-body-sm text-mist">
                Página {page} de {data.meta.totalPages}
              </span>
              {page < data.meta.totalPages && (
                <Link
                  href={href({ page: String(page + 1) })}
                  className="btn-ghost px-4 py-3"
                >
                  Próxima
                </Link>
              )}
            </nav>
          )}
          {data.meta.total > 0 &&
            data.cards.length === 0 &&
            data.sets.length === 0 && (
              <Link
                href={href({ page: "1" })}
                className="mt-6 inline-block text-ice underline"
              >
                Voltar à primeira página
              </Link>
            )}
        </>
      )}
    </main>
  );
}

export default function EncyclopediaPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Carregando enciclopédia"
          className="skeleton mx-auto mt-8 h-80 max-w-shelf"
        />
      }
    >
      <Encyclopedia />
    </Suspense>
  );
}
