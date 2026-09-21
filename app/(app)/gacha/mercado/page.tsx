"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/common/ToastProvider";
import type {
  GachaBoxTier,
  GachaEconomyInventory,
  GachaEconomyListingItem,
  GachaEconomyOdds,
  GachaEconomyOffer,
  GachaEconomyOrder,
  GachaMarketMission,
  GachaMarketHistory,
  GachaOwnedSkinCopy,
} from "@/types";

const BOX_LABEL: Record<GachaBoxTier, string> = {
  COMMON: "Comum",
  RARE: "Rara",
  PREMIUM: "Premium",
};

const BOX_FIELD: Record<
  GachaBoxTier,
  "commonBoxes" | "rareBoxes" | "premiumBoxes"
> = {
  COMMON: "commonBoxes",
  RARE: "rareBoxes",
  PREMIUM: "premiumBoxes",
};

function itemName(listing: GachaEconomyListingItem): string {
  return (
    listing.item.name ??
    listing.item.card?.name ??
    (listing.itemType === "CARD" ? "Carta" : "Skin")
  );
}

function rewardLabel(reward: Record<string, unknown> | null): string {
  if (!reward) return "";
  const cat = reward.category;
  if (cat === "CRYSTAL") return `${String(reward.amount ?? 0)} 💎`;
  if (cat === "KEY") return `${String(reward.amount ?? 1)} chave`;
  if (cat === "SPIN_RESET") return `${String(reward.amount ?? 1)} reset`;
  if (cat === "SKIN") return `Skin: ${String(reward.name ?? "?")}`;
  if (cat === "CARD")
    return `Carta ${String(reward.name ?? "?")}${reward.foil ? ` · ${String(reward.foil)}` : ""}`;
  if (cat === "CARD_BACK") return `Capa: ${String(reward.name ?? "?")}`;
  return cat ? String(cat) : "";
}

function timeLeft(expiresAt: string): string {
  const hours = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / 3_600_000,
  );
  if (hours <= 0) return "Expirado";
  return hours >= 24 ? `${Math.ceil(hours / 24)} dias` : `${hours} h`;
}

export default function GachaMarketPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<GachaEconomyInventory | null>(
    null,
  );
  const [cards, setCards] = useState<GachaEconomyListingItem[]>([]);
  const [skins, setSkins] = useState<GachaEconomyListingItem[]>([]);
  const [mine, setMine] = useState<GachaEconomyListingItem[]>([]);
  const [orders, setOrders] = useState<GachaEconomyOrder[]>([]);
  const [offers, setOffers] = useState<GachaEconomyOffer[]>([]);
  const [ownedSkins, setOwnedSkins] = useState<GachaOwnedSkinCopy[]>([]);
  const [mission, setMission] = useState<GachaMarketMission | null>(null);
  const [odds, setOdds] = useState<GachaEconomyOdds | null>(null);
  const [history, setHistory] = useState<{
    name: string;
    data: GachaMarketHistory;
  } | null>(null);
  const [openedReward, setOpenedReward] = useState<Record<string, unknown> | null>(
    null,
  );
  const [orderTarget, setOrderTarget] =
    useState<GachaEconomyListingItem | null>(null);
  const [orderPrice, setOrderPrice] = useState("");
  const [skinCopyId, setSkinCopyId] = useState("");
  const [skinPrice, setSkinPrice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cardPage, skinPage, publicOdds] = await Promise.all([
        api.gachaEconomyListings("CARD"),
        api.gachaEconomyListings("SKIN"),
        api.gachaEconomyOdds(),
      ]);
      setCards(cardPage.items);
      setSkins(skinPage.items);
      setOdds(publicOdds);
      if (user) {
        const [wallet, myListings, myOrders, shop, weekly, copies] =
          await Promise.all([
            api.gachaEconomyInventory(),
            api.gachaEconomyMyListings().catch(() => ({
              items: [],
              page: 1,
              limit: 50,
              total: 0,
            })),
            api.gachaEconomyMyOrders().catch(() => ({
              items: [],
              page: 1,
              limit: 50,
              total: 0,
            })),
            api.gachaEconomyShop(),
            api.gachaEconomyVisitMarket().catch(() => null),
            api.gachaEconomyOwnedSkins(),
          ]);
        setInventory(wallet);
        setMine(myListings.items);
        setOrders(myOrders.items);
        setOffers(shop);
        setMission(weekly);
        setOwnedSkins(copies.filter((copy) => copy.status === "ACTIVE"));
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Mercado indisponível. Tente carregar novamente.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    key: string,
    action: () => Promise<unknown>,
    message: string,
  ) {
    setBusy(key);
    setError("");
    try {
      await action();
      toast(message, "success");
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Ação não concluída.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function openBox(tier: GachaBoxTier) {
    const key = `open-${tier}`;
    setBusy(key);
    setError("");
    try {
      const result = await api.gachaEconomyOpenBox(tier);
      setOpenedReward(result.reward);
      toast(`${BOX_LABEL[tier]} aberta.`, "success");
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Ação não concluída.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderTarget) return;
    const price = Number(orderPrice);
    if (!Number.isSafeInteger(price) || price < 1) {
      setError("Informe oferta em Crystal usando número inteiro positivo.");
      return;
    }
    await act(
      `order-${orderTarget.id}`,
      () =>
        api.gachaEconomyCreateOrder({
          itemType: orderTarget.itemType,
          itemId:
            orderTarget.itemType === "CARD"
              ? (orderTarget.item.cardId ?? orderTarget.item.id)
              : (orderTarget.item.skinId ?? orderTarget.item.id),
          price,
        }),
      "Ordem criada. Crystal reservado.",
    );
    setOrderTarget(null);
    setOrderPrice("");
  }

  async function listSkin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(skinPrice);
    if (!skinCopyId || !Number.isSafeInteger(price) || price < 1) {
      setError("Escolha cópia e informe preço inteiro positivo.");
      return;
    }
    await act(
      `skin-${skinCopyId}`,
      () => api.gachaEconomyCreateSkinListing(skinCopyId, price),
      "Skin anunciada por 7 dias.",
    );
    setSkinCopyId("");
    setSkinPrice("");
  }

  async function showHistory(listing: GachaEconomyListingItem) {
    setBusy(`history-${listing.id}`);
    setError("");
    try {
      const itemId =
        listing.itemType === "CARD"
          ? (listing.item.cardId ?? listing.item.id)
          : (listing.item.skinId ?? listing.item.id);
      setHistory({
        name: itemName(listing),
        data: await api.gachaEconomyHistory(listing.itemType, itemId),
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Histórico indisponível.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main id="body-content" className="mx-auto max-w-shelf px-4 pb-20 pt-8">
      <header className="border-b border-hairline pb-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="shelf-label">Gacha / Economia</p>
            <h1 className="text-balance font-display text-display-lg text-snow">
              Mercado de colecionador
            </h1>
            <p className="mt-2 max-w-xl text-pretty text-body-sm text-mist">
              Caixas, ofertas oficiais e negociações entre jogadores usam uma
              carteira única de Crystal.
            </p>
          </div>
          <div className="text-right">
            <p className="text-caption text-mist">Disponível</p>
            <p className="font-display text-3xl tabular-nums text-ice">
              {inventory ? inventory.available.toLocaleString("pt-BR") : "—"}
            </p>
            {inventory && inventory.reserved > 0 && (
              <p className="text-caption tabular-nums text-mist">
                {inventory.reserved.toLocaleString("pt-BR")} reservado
              </p>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mt-5 border border-signal/50 bg-signal/10 p-4 text-body-sm text-signal"
        >
          {error}
        </div>
      )}

      {openedReward && (
        <aside
          role="status"
          aria-live="polite"
          className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-ice/40 bg-panel p-4"
        >
          <div>
            <h2 className="font-display text-body-sm text-ice">
              Recompensa da caixa
            </h2>
            <p className="mt-1 font-display text-xl text-snow">
              {rewardLabel(openedReward)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenedReward(null)}
            className="btn-ghost min-h-11 px-3"
          >
            Fechar
          </button>
        </aside>
      )}

      {loading ? (
        <div className="skeleton mt-8 h-72" aria-busy="true" />
      ) : (
        <>
          {user && inventory && odds && (
            <section aria-labelledby="boxes-title" className="mt-9">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="boxes-title"
                    className="font-display text-2xl text-snow"
                  >
                    Caixas
                  </h2>
                  <p className="mt-1 text-body-sm text-mist">
                    Toda abertura consome 1 caixa e 1 chave.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    busy !== null || inventory.available < odds.keyPrice
                  }
                  onClick={() =>
                    void act("key", api.gachaEconomyBuyKey, "Chave comprada.")
                  }
                  className="btn-ghost min-h-11 px-4 disabled:opacity-40"
                >
                  {busy === "key"
                    ? "Comprando…"
                    : `Comprar chave · ${odds.keyPrice.toLocaleString("pt-BR")} 💎`}
                </button>
              </div>
              <div className="mt-4 grid border border-hairline md:grid-cols-3 md:divide-x md:divide-hairline">
                {(["COMMON", "RARE", "PREMIUM"] as const).map((tier) => {
                  const count = inventory[BOX_FIELD[tier]];
                  const canOpen = count > 0 && inventory.keys > 0;
                  return (
                    <article key={tier} className="bg-panel p-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-display text-xl text-snow">
                          {BOX_LABEL[tier]}
                        </h3>
                        <span className="font-mono text-caption tabular-nums text-mist">
                          {count} caixa{count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-5 font-display text-2xl tabular-nums text-ice">
                        {odds.boxPrices[tier].toLocaleString("pt-BR")} 💎
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={
                            busy !== null ||
                            inventory.available < odds.boxPrices[tier]
                          }
                          onClick={() =>
                            void act(
                              `buy-${tier}`,
                              () => api.gachaEconomyBuyBox(tier),
                              `${BOX_LABEL[tier]} comprada.`,
                            )
                          }
                          className="btn-ghost min-h-11 disabled:opacity-40"
                        >
                          Comprar
                        </button>
                        <button
                          type="button"
                          disabled={busy !== null || !canOpen}
                          onClick={() => void openBox(tier)}
                          className="btn-ice min-h-11 disabled:opacity-40"
                        >
                          {busy === `open-${tier}` ? "Abrindo…" : "Abrir"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-caption text-mist">
                <span>
                  {inventory.keys} chave{inventory.keys === 1 ? "" : "s"}
                </span>
                <span>
                  {inventory.spinResets} reset
                  {inventory.spinResets === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  disabled={busy !== null || inventory.spinResets < 1}
                  onClick={() =>
                    void act(
                      "spin-reset",
                      api.gachaEconomyUseReset,
                      "5 previews restaurados.",
                    )
                  }
                  className="min-h-11 border border-hairline px-3 text-caption text-ice disabled:opacity-40"
                >
                  Usar reset
                </button>
                <span>Fidelidade: {inventory.loyaltyDays}/10 dias</span>
                {inventory.loyaltyRarePlusReady && (
                  <span className="text-ice">Próxima carta Rara+</span>
                )}
              </div>
            </section>
          )}

          {user && (
            <section
              aria-labelledby="retention-title"
              className="mt-10 border-y border-hairline py-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2
                    id="retention-title"
                    className="font-display text-xl text-snow"
                  >
                    Ritual semanal
                  </h2>
                  <p className="mt-1 text-body-sm text-mist">
                    7 resgates em 10 dias liberam Caixa Rara + chave. Mercado: 3
                    visitas e anúncio ativo por 24 h.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null || inventory?.dailyClaimedToday}
                    onClick={() =>
                      void act(
                        "daily",
                        api.gachaEconomyDaily,
                        `+${odds?.dailyBonus ?? 350} Crystal resgatados.`,
                      )
                    }
                    className="btn-ghost min-h-11 px-4"
                  >
                    {inventory?.dailyClaimedToday
                      ? "Resgatado hoje"
                      : `Resgatar ${odds?.dailyBonus ?? 350}`}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null || !inventory?.weeklyRewardReady}
                    onClick={() =>
                      void act(
                        "weekly",
                        api.gachaEconomyWeekly,
                        "Recompensa de retenção resgatada.",
                      )
                    }
                    className="btn-ghost min-h-11 px-4 disabled:opacity-40"
                  >
                    Caixa semanal
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null || !mission?.ready}
                    onClick={() =>
                      void act(
                        "mission",
                        api.gachaEconomyClaimMission,
                        "Chave da missão resgatada.",
                      )
                    }
                    className="btn-ice min-h-11 px-4 disabled:opacity-40"
                  >
                    Missão {mission ? `${mission.visits}/3` : "0/3"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {user && offers.length > 0 && (
            <section aria-labelledby="shop-title" className="mt-10">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2
                    id="shop-title"
                    className="font-display text-2xl text-snow"
                  >
                    Seleção de hoje
                  </h2>
                  <p className="mt-1 text-body-sm text-mist">
                    Ofertas pessoais. Cada vaga permite 1 compra.
                  </p>
                </div>
                <span className="text-caption text-mist">Renova 00:00 BRT</span>
              </div>
              <ul className="mt-4 grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-3">
                {offers.map((offer) => (
                  <li
                    key={offer.id}
                    className="flex min-w-0 items-center justify-between gap-3 bg-panel p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-body-sm text-snow">
                        {offer.card?.name ??
                          offer.skin?.name ??
                          (offer.itemType === "KEY" ? "Chave" : "Caixa Comum")}
                      </p>
                      <p className="mt-1 text-caption tabular-nums text-mist">
                        {offer.price.toLocaleString("pt-BR")} 💎
                        {offer.discount > 0 ? ` · -${offer.discount}%` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={
                        busy !== null ||
                        !!offer.purchasedAt ||
                        (inventory?.available ?? 0) < offer.price
                      }
                      onClick={() =>
                        void act(
                          `offer-${offer.id}`,
                          () => api.gachaEconomyBuyOffer(offer.id),
                          "Oferta comprada.",
                        )
                      }
                      className="btn-ghost min-h-11 shrink-0 px-3 disabled:opacity-40"
                    >
                      {offer.purchasedAt ? "Comprado" : "Comprar"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <MarketSection
            title="Cartas"
            listings={cards}
            userReady={!!user}
            busy={busy}
            onBuy={(listing) =>
              void act(
                `buy-${listing.id}`,
                () => api.gachaEconomyBuyListing("CARD", listing.id),
                "Carta comprada.",
              )
            }
            onOrder={setOrderTarget}
            onHistory={(listing) => void showHistory(listing)}
          />
          <MarketSection
            title="Skins"
            listings={skins}
            userReady={!!user}
            busy={busy}
            onBuy={(listing) =>
              void act(
                `buy-${listing.id}`,
                () => api.gachaEconomyBuyListing("SKIN", listing.id),
                "Skin comprada.",
              )
            }
            onOrder={setOrderTarget}
            onHistory={(listing) => void showHistory(listing)}
          />

          {history && (
            <aside
              aria-live="polite"
              className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-hairline bg-panel p-4"
            >
              <div>
                <h3 className="font-display text-body-sm text-snow">
                  Histórico de {history.name}
                </h3>
                <p className="mt-1 text-caption tabular-nums text-mist">
                  30 dias · {history.data.volume} vendas · mediana{" "}
                  {history.data.median?.toLocaleString("pt-BR") ?? "—"} 💎 ·
                  faixa {history.data.min?.toLocaleString("pt-BR") ?? "—"}–
                  {history.data.max?.toLocaleString("pt-BR") ?? "—"} 💎
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistory(null)}
                className="btn-ghost min-h-11 px-3"
              >
                Fechar
              </button>
            </aside>
          )}

          {orderTarget && (
            <form
              onSubmit={(event) => void createOrder(event)}
              className="mt-5 flex flex-wrap items-end gap-3 border border-ice/40 bg-panel p-4"
            >
              <label className="min-w-48 flex-1 text-body-sm text-mist">
                Oferta por {itemName(orderTarget)}
                <input
                  name="order-price"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  autoComplete="off"
                  value={orderPrice}
                  onChange={(event) => setOrderPrice(event.target.value)}
                  className="field mt-2 min-h-11 w-full"
                />
              </label>
              <button
                type="submit"
                disabled={busy !== null}
                className="btn-ice min-h-11 px-4"
              >
                Reservar Crystal
              </button>
              <button
                type="button"
                onClick={() => setOrderTarget(null)}
                className="btn-ghost min-h-11 px-4"
              >
                Cancelar
              </button>
            </form>
          )}

          {user && ownedSkins.length > 0 && (
            <form
              onSubmit={(event) => void listSkin(event)}
              className="mt-10 grid gap-3 border border-hairline bg-panel p-5 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
            >
              <label className="text-body-sm text-mist">
                Anunciar cópia de skin
                <select
                  name="skin-copy"
                  value={skinCopyId}
                  onChange={(event) => setSkinCopyId(event.target.value)}
                  className="field mt-2 min-h-11 w-full"
                >
                  <option value="">Escolha cópia</option>
                  {ownedSkins.map((copy) => (
                    <option key={copy.id} value={copy.id}>
                      {copy.name} · {copy.rarity}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-body-sm text-mist">
                Preço em Crystal
                <input
                  name="skin-price"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  autoComplete="off"
                  value={skinPrice}
                  onChange={(event) => setSkinPrice(event.target.value)}
                  className="field mt-2 min-h-11 w-full"
                />
              </label>
              <button
                type="submit"
                disabled={busy !== null}
                className="btn-ice min-h-11 px-4"
              >
                Anunciar por 7 dias
              </button>
            </form>
          )}

          {user && (mine.length > 0 || orders.length > 0) && (
            <section aria-labelledby="positions-title" className="mt-10">
              <h2
                id="positions-title"
                className="font-display text-2xl text-snow"
              >
                Suas posições
              </h2>
              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <PositionList
                  title="Anúncios"
                  empty="Nenhum anúncio ativo."
                  items={mine.map((listing) => ({
                    id: listing.id,
                    name: itemName(listing),
                    detail: `${listing.price.toLocaleString("pt-BR")} 💎 · ${timeLeft(listing.expiresAt)}`,
                    cancel: () =>
                      act(
                        `cancel-${listing.id}`,
                        () =>
                          api.gachaEconomyCancelListing(
                            listing.itemType,
                            listing.id,
                          ),
                        "Anúncio cancelado.",
                      ),
                  }))}
                  busy={busy}
                />
                <PositionList
                  title="Ordens"
                  empty="Nenhuma ordem ativa."
                  items={orders.map((order) => ({
                    id: order.id,
                    name:
                      order.card?.name ?? order.skin?.name ?? order.itemType,
                    detail: `${order.price.toLocaleString("pt-BR")} 💎 · ${timeLeft(order.expiresAt)}`,
                    cancel: () =>
                      act(
                        `cancel-${order.id}`,
                        () => api.gachaEconomyCancelOrder(order.id),
                        "Ordem cancelada.",
                      ),
                  }))}
                  busy={busy}
                />
              </div>
            </section>
          )}

          {odds && (
            <details className="mt-10 border border-hairline bg-panel p-5">
              <summary className="cursor-pointer font-display text-xl text-snow focus-visible:ring-2 focus-visible:ring-ice">
                Odds públicas · versão {odds.version ?? "inicial"}
              </summary>
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                {(["COMMON", "RARE", "PREMIUM"] as const).map((tier) => (
                  <div key={tier}>
                    <h3 className="font-display text-body-sm text-ice">
                      Caixa {BOX_LABEL[tier]}
                    </h3>
                    <dl className="mt-2 space-y-1 text-caption text-mist">
                      {Object.entries(odds.categories[tier] ?? {}).map(
                        ([name, chance]) => (
                          <div
                            key={name}
                            className="flex justify-between gap-4"
                          >
                            <dt>{name}</dt>
                            <dd className="tabular-nums">{chance}%</dd>
                          </div>
                        ),
                      )}
                    </dl>
                  </div>
                ))}
              </div>
            </details>
          )}

          {!user && (
            <div className="mt-10 border border-ice/30 bg-panel p-5 text-body-sm text-mist">
              <Link href="/login" className="text-ice hover:text-snow">
                Entre
              </Link>{" "}
              para comprar, anunciar e criar ordens.
            </div>
          )}
        </>
      )}
    </main>
  );
}

function MarketSection({
  title,
  listings,
  userReady,
  busy,
  onBuy,
  onOrder,
  onHistory,
}: {
  title: string;
  listings: GachaEconomyListingItem[];
  userReady: boolean;
  busy: string | null;
  onBuy: (listing: GachaEconomyListingItem) => void;
  onOrder: (listing: GachaEconomyListingItem) => void;
  onHistory: (listing: GachaEconomyListingItem) => void;
}) {
  return (
    <section className="mt-10" aria-labelledby={`market-${title}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`market-${title}`} className="font-display text-2xl text-snow">
          {title} no mercado
        </h2>
        <span className="text-caption tabular-nums text-mist">
          {listings.length} ativos
        </span>
      </div>
      {listings.length === 0 ? (
        <p className="mt-4 border border-dashed border-hairline p-5 text-body-sm text-mist">
          Nenhum anúncio. Ordem de compra pode iniciar liquidez quando item
          aparecer.
        </p>
      ) : (
        <ul className="mt-4 grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.id} className="min-w-0 bg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-body-sm text-snow">
                    {itemName(listing)}
                  </h3>
                  <p className="mt-1 truncate text-caption text-mist">
                    {[
                      listing.item.rarity ?? listing.item.card?.rarity,
                      listing.item.foil,
                      listing.item.animeTitle ?? listing.item.card?.animeTitle,
                    ]
                      .filter(Boolean)
                      .join(" · ") || listing.itemType}
                  </p>
                </div>
                <span className="shrink-0 font-display tabular-nums text-ice">
                  {listing.price.toLocaleString("pt-BR")} 💎
                </span>
              </div>
              <p className="mt-3 text-caption text-mist">
                Expira em {timeLeft(listing.expiresAt)}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => onHistory(listing)}
                  className="btn-ghost min-h-11 disabled:opacity-40"
                >
                  Histórico
                </button>
                <button
                  type="button"
                  disabled={!userReady || busy !== null}
                  onClick={() => onOrder(listing)}
                  className="btn-ghost min-h-11 disabled:opacity-40"
                >
                  Criar ordem
                </button>
                <button
                  type="button"
                  disabled={!userReady || busy !== null}
                  onClick={() => onBuy(listing)}
                  className="btn-ice min-h-11 disabled:opacity-40"
                >
                  Comprar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PositionList({
  title,
  empty,
  items,
  busy,
}: {
  title: string;
  empty: string;
  items: Array<{
    id: string;
    name: string;
    detail: string;
    cancel: () => Promise<unknown>;
  }>;
  busy: string | null;
}) {
  return (
    <div>
      <h3 className="font-display text-xl text-snow">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-body-sm text-mist">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-hairline border border-hairline bg-panel">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-body-sm text-snow">{item.name}</p>
                <p className="text-caption tabular-nums text-mist">
                  {item.detail}
                </p>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void item.cancel()}
                className="btn-ghost min-h-11 shrink-0 px-3 disabled:opacity-40"
              >
                Cancelar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
