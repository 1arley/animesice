"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { inventoryAmount } from "@/components/gacha/ItemRewardPicker";
import type { GachaEconomyInventory, GachaEconomyListingItem } from "@/types";

export function GachaItemMarket({
  inventory,
  marketReady,
  refresh,
  onOffer,
  refreshKey,
}: {
  inventory: GachaEconomyInventory | null;
  marketReady: boolean;
  refresh: () => Promise<unknown>;
  onOffer: (listing: GachaEconomyListingItem) => void;
  refreshKey: number;
}) {
  const { user } = useAuth();
  const [listings, setListings] = useState<GachaEconomyListingItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loadKey, setLoadKey] = useState(0);
  const [history, setHistory] = useState("");
  const catalog = inventory?.itemCatalog ?? [];
  const owned = inventory
    ? catalog.filter((item) => inventoryAmount(inventory, item.field) > 0)
    : [];
  const selected = catalog.find((item) => item.id === itemId);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .gachaEconomyListings("ITEM", page)
      .then((result) => {
        if (!cancelled) {
          setListings(result.items);
          setTotal(result.total);
        }
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Não foi possível carregar os anúncios.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, loadKey, refreshKey]);
  const transact = useCallback(
    async (operation: () => Promise<unknown>, success: string) => {
      if (busyRef.current) return false;
      busyRef.current = true;
      setBusy(true);
      setError("");
      setStatus("");
      try {
        await operation();
        setStatus(success);
        setLoadKey((key) => key + 1);
        await refresh();
        return true;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível confirmar. Atualize o mercado antes de tentar novamente.",
        );
        setLoadKey((key) => key + 1);
        void refresh();
        return false;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [refresh],
  );
  async function create(event: React.FormEvent) {
    event.preventDefault();
    const units = Number(quantity);
    const amount = Number(price);
    if (
      !itemId ||
      !Number.isSafeInteger(units) ||
      units < 1 ||
      units >
        (selected && inventory
          ? inventoryAmount(inventory, selected.field)
          : 0) ||
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > 2147483647
    ) {
      setError(
        "Escolha um item disponível, quantidade válida e preço inteiro em Crystals.",
      );
      return;
    }
    if (
      await transact(
        () =>
          api.gachaEconomyCreateItemListing({
            itemId,
            quantity: units,
            price: amount,
          }),
        "Anúncio criado. O lote está reservado.",
      )
    ) {
      setQuantity("1");
      setPrice("");
    }
  }
  const visible = listings.filter((listing) =>
    (listing.item.name ?? "")
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <section aria-labelledby="market-items-title" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="market-items-title"
            className="font-display text-2xl text-snow"
          >
            Itens no mercado
          </h2>
          <p className="mt-1 text-caption text-mist">
            {total} anúncios ativos · cada compra leva o lote inteiro
          </p>
        </div>
        <label className="text-caption text-mist">
          Buscar nos anúncios carregados
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field mt-1 min-h-11 w-full"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-signal">
          {error}
        </p>
      )}
      <p className="mt-3 text-body-sm text-ice" aria-live="polite">
        {status}
      </p>
      {history && (
        <p
          className="mt-3 border border-hairline p-3 text-body-sm text-mist"
          role="status"
        >
          {history}
        </p>
      )}
      {loading ? (
        <p className="mt-4 text-mist" role="status">
          Carregando itens…
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((listing) => {
            const units = listing.quantity ?? listing.item.quantity ?? 1;
            const own = listing.userId === user?.id;
            return (
              <li
                key={listing.id}
                className="border border-hairline bg-panel p-4"
              >
                <h3 className="font-display text-lg text-snow">
                  {listing.item.name ?? "Item"}
                </h3>
                <p className="mt-2 text-body-sm text-mist">
                  {units.toLocaleString("pt-BR")} unidades ·{" "}
                  {listing.price.toLocaleString("pt-BR")} Crystals pelo lote
                </p>
                <p className="mt-1 text-caption text-mist">
                  {listing.user?.name ??
                    listing.user?.userName ??
                    "Colecionador"}{" "}
                  · expira{" "}
                  {new Date(listing.expiresAt).toLocaleDateString("pt-BR")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {own ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="btn-ghost min-h-11 px-3 disabled:opacity-40"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Cancelar o anúncio e recuperar o lote reservado?",
                          )
                        )
                          void transact(
                            () =>
                              api.gachaEconomyCancelListing("ITEM", listing.id),
                            "Anúncio cancelado. Itens devolvidos.",
                          );
                      }}
                    >
                      Cancelar anúncio
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={
                          busy ||
                          !marketReady ||
                          (inventory?.available ?? 0) < listing.price
                        }
                        className="btn-ice min-h-11 px-3 disabled:opacity-40"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Comprar ${units}× ${listing.item.name ?? "item"} por ${listing.price} Crystals?`,
                            )
                          )
                            void transact(
                              () =>
                                api.gachaEconomyBuyListing("ITEM", listing.id),
                              "Lote comprado e adicionado ao inventário.",
                            );
                        }}
                      >
                        Comprar lote
                      </button>
                      <button
                        type="button"
                        disabled={busy || !marketReady}
                        onClick={() => onOffer(listing)}
                        className="btn-ghost min-h-11 px-3 disabled:opacity-40"
                      >
                        Propor troca
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    className="btn-ghost min-h-11 px-3"
                    onClick={() => {
                      void api
                        .gachaEconomyHistory(
                          "ITEM",
                          listing.item.itemId ?? listing.item.id,
                        )
                        .then((result) =>
                          setHistory(
                            result.median === null
                              ? "Ainda não há vendas deste item."
                              : `${listing.item.name}: mediana de ${result.median.toLocaleString("pt-BR")} Crystals por unidade em ${result.volume} venda(s).`,
                          ),
                        )
                        .catch(() =>
                          setError("Não foi possível consultar o histórico."),
                        );
                    }}
                  >
                    Histórico
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!loading && !visible.length && (
        <p className="mt-4 border border-hairline p-6 text-mist">
          Nenhum anúncio encontrado. Você pode anunciar itens do seu inventário.
        </p>
      )}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={loading || page <= 1}
          className="btn-ghost min-h-11 px-3 disabled:opacity-40"
          onClick={() => setPage((value) => value - 1)}
        >
          Anterior
        </button>
        <span className="text-body-sm text-mist">Página {page}</span>
        <button
          type="button"
          disabled={loading || page * 24 >= total}
          className="btn-ghost min-h-11 px-3 disabled:opacity-40"
          onClick={() => setPage((value) => value + 1)}
        >
          Próxima
        </button>
        <button
          type="button"
          onClick={() => setLoadKey((key) => key + 1)}
          className="btn-ghost min-h-11 px-3"
        >
          Atualizar
        </button>
      </div>
      {user && (
        <form
          onSubmit={(event) => void create(event)}
          className="mt-6 border border-hairline bg-panel p-4 sm:p-6"
        >
          <h3 className="font-display text-xl text-snow">Anunciar itens</h3>
          <p className="mt-2 text-body-sm text-mist">
            Escolha um tipo de item e a quantidade. O lote fica reservado e é
            vendido por inteiro.
          </p>
          <fieldset
            disabled={busy || !marketReady}
            className="mt-4 grid gap-3 sm:grid-cols-3"
          >
            <label className="text-body-sm text-snow">
              Item
              <select
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
                required
                className="field mt-2 min-h-11 w-full"
              >
                <option value="">Escolha um item</option>
                {owned.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ·{" "}
                    {inventory ? inventoryAmount(inventory, item.field) : 0}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-body-sm text-snow">
              Quantidade
              <input
                type="number"
                min={1}
                max={
                  selected && inventory
                    ? inventoryAmount(inventory, selected.field)
                    : 0
                }
                step={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
                className="field mt-2 min-h-11 w-full"
              />
            </label>
            <label className="text-body-sm text-snow">
              Preço total em Crystals
              <input
                type="number"
                min={1}
                max={2147483647}
                step={1}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
                className="field mt-2 min-h-11 w-full"
              />
            </label>
            <button
              className="btn-ice min-h-11 px-4 disabled:opacity-40 sm:col-span-3"
              disabled={!owned.length}
            >
              Anunciar lote
            </button>
          </fieldset>
          {!owned.length && (
            <p className="mt-3 text-caption text-mist">
              Seu inventário não tem itens disponíveis para anúncio.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
