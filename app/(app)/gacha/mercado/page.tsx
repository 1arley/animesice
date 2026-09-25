"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { safeImageSrc } from "@/lib/url";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/common/Modal";
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
  if (cat === "CRYSTAL") return `${String(reward.amount ?? 0)} cristais`;
  if (cat === "KEY") return `${String(reward.amount ?? 1)} chave`;
  if (cat === "SPIN_RESET")
    return `${String(reward.amount ?? 1)} reset de giro (5 previews)`;
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
  if (hours <= 0) {
    return new Date(expiresAt).getTime() > Date.now() ? "<1 h" : "Expirado";
  }
  return hours >= 24 ? `${Math.ceil(hours / 24)} dias` : `${hours} h`;
}

function timeUntilReset(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  const minutes = 24 * 60 - hour * 60 - minute;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export default function GachaMarketPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<GachaEconomyInventory | null>(
    null,
  );
  const [cards, setCards] = useState<GachaEconomyListingItem[]>([]);
  const [skins, setSkins] = useState<GachaEconomyListingItem[]>([]);
  const [cardTotal, setCardTotal] = useState(0);
  const [skinTotal, setSkinTotal] = useState(0);
  const [cardPage, setCardPage] = useState(1);
  const [skinPage, setSkinPage] = useState(1);
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
  const [openedReward, setOpenedReward] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [openingTier, setOpeningTier] = useState<GachaBoxTier | null>(null);
  const [orderTarget, setOrderTarget] =
    useState<GachaEconomyListingItem | null>(null);
  const [orderPrice, setOrderPrice] = useState("");
  const [skinCopyId, setSkinCopyId] = useState("");
  const [skinPrice, setSkinPrice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchase, setPurchase] = useState<{
    name: string;
    price: number;
    run: () => Promise<boolean>;
  } | null>(null);
  const [resetCountdown, setResetCountdown] = useState(timeUntilReset);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [wallet, myListings, myOrders, shop, weekly, copies] =
        await Promise.all([
          api.gachaEconomyInventory(),
          api.gachaEconomyMyListings(),
          api.gachaEconomyMyOrders(),
          api.gachaEconomyShop(),
          api.gachaEconomyMission(),
          api.gachaEconomyOwnedSkins(),
        ]);
      setInventory(wallet);
      setMine(myListings.items);
      setOrders(myOrders.items);
      setOffers(shop);
      setMission(weekly);
      setOwnedSkins(copies.filter((copy) => copy.status === "ACTIVE"));
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Mercado indisponível. Tente carregar novamente.",
      );
    }
  }, [user]);

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
      setCardTotal(cardPage.total);
      setSkinTotal(skinPage.total);
      setCardPage(cardPage.page);
      setSkinPage(skinPage.page);
      setOdds(publicOdds);
      if (user) await api.gachaEconomyVisitMarket().catch(() => null);
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Mercado indisponível. Tente carregar novamente.",
      );
    } finally {
      setLoading(false);
    }
  }, [user, refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setResetCountdown(timeUntilReset()),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  async function act(
    key: string,
    action: () => Promise<unknown>,
    message: string,
    refreshBoard = false,
  ) {
    if (busy !== null) return false;
    setBusy(key);
    setError("");
    try {
      await action();
      toast(message, "success");
      await refresh();
      if (refreshBoard) {
        const [cardPage, skinPage] = await Promise.all([
          api.gachaEconomyListings("CARD"),
          api.gachaEconomyListings("SKIN"),
        ]);
        setCards(cardPage.items);
        setSkins(skinPage.items);
        setCardTotal(cardPage.total);
        setSkinTotal(skinPage.total);
        setCardPage(cardPage.page);
        setSkinPage(skinPage.page);
      }
      return true;
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Ação não concluída.",
      );
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function openBox(tier: GachaBoxTier) {
    const key = `open-${tier}`;
    setBusy(key);
    setError("");
    setOpeningTier(tier);
    try {
      const result = await api.gachaEconomyOpenBox(tier);
      setOpenedReward(result.reward);
      toast(`${BOX_LABEL[tier]} aberta.`, "success");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Ação não concluída.",
      );
    } finally {
      setBusy(null);
      setOpeningTier(null);
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
    const completed = await act(
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
    if (completed) {
      setOrderTarget(null);
      setOrderPrice("");
    }
  }

  async function listSkin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(skinPrice);
    if (!skinCopyId || !Number.isSafeInteger(price) || price < 1) {
      setError("Escolha cópia e informe preço inteiro positivo.");
      return;
    }
    const completed = await act(
      `skin-${skinCopyId}`,
      () => api.gachaEconomyCreateSkinListing(skinCopyId, price),
      "Skin anunciada por 7 dias.",
      true,
    );
    if (completed) {
      setSkinCopyId("");
      setSkinPrice("");
    }
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

  async function loadMore(type: "CARD" | "SKIN") {
    const nextPage = type === "CARD" ? cardPage + 1 : skinPage + 1;
    setBusy(`more-${type}`);
    try {
      const page = await api.gachaEconomyListings(type, nextPage);
      if (type === "CARD") {
        setCards((current) => [...current, ...page.items]);
        setCardPage(page.page);
        setCardTotal(page.total);
      } else {
        setSkins((current) => [...current, ...page.items]);
        setSkinPage(page.page);
        setSkinTotal(page.total);
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível carregar mais anúncios.",
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
            <p className="shelf-label">Gacha / Mercado</p>
            <h1 className="text-balance font-display text-3xl text-snow sm:text-4xl">
              Mercado de colecionador
            </h1>
            <p className="mt-2 max-w-xl text-pretty text-body-sm text-mist">
              Encontre sua próxima carta, abra caixas e negocie com outros
              colecionadores.
            </p>
          </div>
          <div className="w-full border border-hairline bg-panel px-5 py-4 sm:w-auto sm:min-w-56">
            <p className="text-caption text-mist">Seu saldo disponível</p>
            <p className="font-display text-3xl tabular-nums text-ice">
              {inventory ? inventory.available.toLocaleString("pt-BR") : "—"}
            </p>
            <p className="text-caption text-mist">cristais</p>
            {inventory && inventory.reserved > 0 && (
              <p className="text-caption tabular-nums text-mist">
                {inventory.reserved.toLocaleString("pt-BR")} reservado
              </p>
            )}
            <Link
              href="/gacha/cristais"
              className="mt-2 inline-flex min-h-11 items-center text-body-sm text-ice hover:underline"
            >
              Adicionar cristais
            </Link>
          </div>
        </div>
      </header>
      <nav
        aria-label="Seções do mercado"
        className="mt-4 flex flex-wrap gap-2 border-b border-hairline pb-4"
      >
        <a href="#market-Cartas" className="btn-ghost min-h-11 px-4">
          Cartas
        </a>
        <a href="#market-Skins" className="btn-ghost min-h-11 px-4">
          Skins
        </a>
        {user && (
          <>
            <a href="#shop-title" className="btn-ghost min-h-11 px-4">
              Seleção de hoje
            </a>
            <a href="#boxes-title" className="btn-ghost min-h-11 px-4">
              Caixas
            </a>
            <a href="#positions-title" className="btn-ghost min-h-11 px-4">
              Meus anúncios e ofertas
            </a>
          </>
        )}
        <Link
          href="/gacha/cristais#cosmetics"
          className="btn-ghost min-h-11 px-4"
        >
          Loja de capas
        </Link>
      </nav>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-5 border border-signal/50 bg-signal/10 p-4 text-body-sm text-signal"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            {!loading && (
              <button
                type="button"
                onClick={() => void load()}
                className="btn-ghost min-h-11 shrink-0 px-3 text-snow"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      )}

      {openedReward && (
        <aside
          role="status"
          aria-live="polite"
          className="market-reveal mt-5 flex flex-wrap items-center justify-between gap-4 border border-ice/40 bg-panel p-4"
        >
          {safeImageSrc(
            String(openedReward.imageUrl ?? openedReward.image ?? ""),
          ) && (
            <Image
              src={safeImageSrc(
                String(openedReward.imageUrl ?? openedReward.image),
              )!}
              alt={rewardLabel(openedReward)}
              width={72}
              height={96}
              className="market-reward-image object-cover"
            />
          )}
          <div>
            <h2 className="font-display text-body-sm text-ice">
              Recompensa da caixa
            </h2>
            <p className="mt-1 font-display text-xl text-snow">
              {rewardLabel(openedReward)}
            </p>
            {openedReward.category === "SPIN_RESET" && (
              <p className="mt-1 max-w-md text-caption text-mist">
                Reset guardado no inventário. Use após gastar os 5 previews da
                hora para liberar mais 5.
              </p>
            )}
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
        <div
          className="mt-8 space-y-5"
          aria-busy="true"
          aria-label="Carregando mercado"
        >
          <div className="skeleton h-28" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="skeleton h-56" />
            <div className="skeleton h-56" />
            <div className="skeleton h-56" />
          </div>
        </div>
      ) : (
        <>
          {user && offers.length > 0 && (
            <section aria-labelledby="shop-title" className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="shop-title"
                    className="scroll-mt-24 font-display text-2xl text-snow"
                  >
                    Seleção de hoje
                  </h2>
                  <p className="mt-1 text-body-sm text-mist">
                    Ofertas pessoais. Confira a arte e os detalhes antes de
                    comprar.
                  </p>
                </div>
                <span className="text-caption tabular-nums text-mist">
                  Renova em {resetCountdown} BRT
                </span>
              </div>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {offers.map((offer) => {
                  const name =
                    offer.card?.name ??
                    offer.skin?.name ??
                    (offer.itemType === "KEY" ? "Chave" : "Caixa Comum");
                  const rarity = offer.skin?.rarity ?? offer.card?.rarity;
                  const shortfall = Math.max(
                    0,
                    offer.price - (inventory?.available ?? 0),
                  );
                  return (
                    <li
                      key={offer.id}
                      className="flex min-w-0 flex-col border border-hairline bg-panel p-4"
                    >
                      <MarketArtwork
                        name={name}
                        image={offer.card?.image ?? offer.skin?.imageUrl}
                        details={[
                          offer.itemType === "SKIN"
                            ? "Skin"
                            : offer.itemType === "CARD"
                              ? "Carta"
                              : name,
                          rarity,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      />
                      <p className="mt-4 text-caption text-ice">
                        {offer.itemType === "SKIN"
                          ? "Skin"
                          : offer.itemType === "CARD"
                            ? "Carta"
                            : "Consumível"}
                        {rarity ? ` · ${rarity}` : ""}
                      </p>
                      <h3 className="mt-1 break-words font-display text-xl text-snow">
                        {name}
                      </h3>
                      <p className="mt-2 text-body-sm text-mist">
                        {offer.itemType === "SKIN"
                          ? "Uma cópia de skin para sua coleção."
                          : offer.itemType === "KEY"
                            ? "Abre uma caixa do seu inventário. A caixa é adquirida separadamente."
                            : offer.itemType === "COMMON_BOX"
                              ? "Recompensa aleatória. Precisa de 1 chave para abrir."
                              : "Uma carta para sua coleção."}
                      </p>
                      <div className="mt-auto pt-4">
                        <p className="font-display text-xl tabular-nums text-ice">
                          {offer.price.toLocaleString("pt-BR")} cristais{" "}
                          {offer.discount > 0 && (
                            <span className="text-caption text-snow">
                              · {offer.discount}% de desconto
                            </span>
                          )}
                        </p>
                        <p className="mt-2 text-caption text-mist">
                          {offer.purchasedAt
                            ? "Você já comprou esta oferta hoje."
                            : shortfall > 0
                              ? `Faltam ${shortfall.toLocaleString("pt-BR")} cristais.`
                              : "Disponível · 1 compra nesta oferta"}
                        </p>
                        <button
                          type="button"
                          disabled={
                            busy !== null ||
                            !!offer.purchasedAt ||
                            shortfall > 0
                          }
                          onClick={() => {
                            setError("");
                            setPurchase({
                              name,
                              price: offer.price,
                              run: () =>
                                act(
                                  `offer-${offer.id}`,
                                  () => api.gachaEconomyBuyOffer(offer.id),
                                  "Oferta comprada.",
                                  true,
                                ),
                            });
                          }}
                          className="btn-ice mt-3 min-h-11 w-full px-3 disabled:opacity-40"
                        >
                          {offer.purchasedAt ? "Comprado" : "Comprar"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {user && inventory && odds && (
            <section aria-labelledby="boxes-title" className="mt-9">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="boxes-title"
                    className="scroll-mt-24 font-display text-2xl text-snow"
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
                    : `Comprar chave · ${odds.keyPrice.toLocaleString("pt-BR")} cristais`}
                </button>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {(["COMMON", "RARE", "PREMIUM"] as const).map((tier) => {
                  const count = inventory[BOX_FIELD[tier]];
                  const canOpen = count > 0 && inventory.keys > 0;
                  return (
                    <article
                      key={tier}
                      className={`market-box border border-hairline bg-panel p-5 ${openingTier === tier ? "market-box-opening" : ""}`}
                    >
                      <svg
                        viewBox="0 0 120 96"
                        fill="none"
                        aria-hidden="true"
                        className={`mx-auto mb-5 h-24 w-32 ${tier === "PREMIUM" ? "text-amber-300" : tier === "RARE" ? "text-ice" : "text-mist"}`}
                      >
                        <path
                          d="M16 34 60 12l44 22v40L60 94 16 74Z"
                          fill="currentColor"
                          fillOpacity=".06"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="m16 34 44 22 44-22M60 56v38M38 23l44 22v18L60 74"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-display text-xl text-snow">
                          {BOX_LABEL[tier]}
                        </h3>
                        <span className="font-mono text-caption tabular-nums text-mist">
                          {count} caixa{count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-5 font-display text-2xl tabular-nums text-ice">
                        {odds.boxPrices[tier].toLocaleString("pt-BR")} cristais
                      </p>
                      <p className="mt-2 min-h-10 text-caption text-mist">
                        {count === 0
                          ? "Compre uma caixa para começar."
                          : inventory.keys === 0
                            ? "Você tem a caixa. Falta uma chave para abrir."
                            : "Pronta para abrir com uma das suas chaves."}
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
                          {busy === `buy-${tier}`
                            ? "Comprando…"
                            : "Comprar caixa"}
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

          <MarketSection
            title="Cartas"
            listings={cards}
            total={cardTotal}
            canLoadMore={cards.length < cardTotal}
            userReady={!!user}
            available={inventory?.available ?? 0}
            busy={busy}
            onLoadMore={() => void loadMore("CARD")}
            onBuy={(listing) => {
              setError("");
              setPurchase({
                name: itemName(listing),
                price: listing.price,
                run: () =>
                  act(
                    `buy-${listing.id}`,
                    () => api.gachaEconomyBuyListing("CARD", listing.id),
                    "Carta comprada.",
                    true,
                  ),
              });
            }}
            onOrder={(listing) => {
              setError("");
              setOrderTarget(listing);
            }}
            onHistory={(listing) => void showHistory(listing)}
          />
          <MarketSection
            title="Skins"
            listings={skins}
            total={skinTotal}
            canLoadMore={skins.length < skinTotal}
            userReady={!!user}
            available={inventory?.available ?? 0}
            busy={busy}
            onLoadMore={() => void loadMore("SKIN")}
            onBuy={(listing) => {
              setError("");
              setPurchase({
                name: itemName(listing),
                price: listing.price,
                run: () =>
                  act(
                    `buy-${listing.id}`,
                    () => api.gachaEconomyBuyListing("SKIN", listing.id),
                    "Skin comprada.",
                    true,
                  ),
              });
            }}
            onOrder={(listing) => {
              setError("");
              setOrderTarget(listing);
            }}
            onHistory={(listing) => void showHistory(listing)}
          />

          {purchase && (
            <Modal
              open
              title={`Comprar ${purchase.name}`}
              onClose={() => {
                if (!busy) setPurchase(null);
              }}
              footer={
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setPurchase(null)}
                  className="btn-ghost min-h-11 px-4"
                >
                  Cancelar
                </button>
              }
            >
              <p className="text-body-sm text-mist">
                Confira o valor antes de confirmar a compra.
              </p>
              <dl className="my-4 space-y-3 text-body-sm">
                <div className="flex justify-between gap-3">
                  <dt>Preço</dt>
                  <dd className="text-ice">
                    {purchase.price.toLocaleString("pt-BR")} cristais
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Saldo após a compra</dt>
                  <dd>
                    {Math.max(
                      0,
                      (inventory?.available ?? 0) - purchase.price,
                    ).toLocaleString("pt-BR")}{" "}
                    cristais
                  </dd>
                </div>
              </dl>
              {error && (
                <p role="alert" className="mb-3 text-body-sm text-signal">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={
                  busy !== null || (inventory?.available ?? 0) < purchase.price
                }
                onClick={async () => {
                  if (await purchase.run()) setPurchase(null);
                }}
                className="btn-ice min-h-11 w-full disabled:opacity-40"
              >
                {busy ? "Comprando…" : "Confirmar compra"}
              </button>
            </Modal>
          )}

          {history && (
            <Modal
              open
              onClose={() => setHistory(null)}
              title={`Histórico de ${history.name}`}
            >
              <p className="text-body-sm text-mist">
                Vendas dos últimos 30 dias
              </p>
              <dl className="mt-4 divide-y divide-hairline text-body-sm">
                <div className="flex justify-between py-3">
                  <dt className="text-mist">Vendas concluídas</dt>
                  <dd className="tabular-nums text-snow">
                    {history.data.volume}
                  </dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-mist">Preço mediano</dt>
                  <dd className="tabular-nums text-ice">
                    {history.data.median?.toLocaleString("pt-BR") ?? "—"}{" "}
                    cristais
                  </dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-mist">Menor / maior preço</dt>
                  <dd className="tabular-nums text-snow">
                    {history.data.min?.toLocaleString("pt-BR") ?? "—"} /{" "}
                    {history.data.max?.toLocaleString("pt-BR") ?? "—"}
                  </dd>
                </div>
              </dl>
            </Modal>
          )}

          {orderTarget && (
            <Modal
              open
              onClose={() => {
                if (!busy) setOrderTarget(null);
              }}
              title={`Ofertar por ${itemName(orderTarget)}`}
              footer={
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setOrderTarget(null)}
                  className="btn-ghost min-h-11 px-4"
                >
                  Cancelar
                </button>
              }
            >
              <form onSubmit={(event) => void createOrder(event)}>
                <p id="order-hint" className="text-body-sm text-mist">
                  Os cristais ficam reservados até a compra acontecer, a oferta
                  expirar ou você cancelar.
                </p>
                <label className="mt-5 block text-body-sm text-snow">
                  Sua oferta em cristais
                  <input
                    name="order-price"
                    type="number"
                    min={1}
                    max={inventory?.available}
                    step={1}
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    aria-describedby="order-hint"
                    value={orderPrice}
                    onChange={(event) => setOrderPrice(event.target.value)}
                    className="field mt-2 min-h-11 w-full"
                  />
                </label>
                {error && (
                  <p role="alert" className="mt-3 text-body-sm text-signal">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="btn-ice mt-4 min-h-11 w-full px-4"
                >
                  {busy ? "Reservando…" : "Reservar cristais"}
                </button>
              </form>
            </Modal>
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

          {user && (
            <section aria-labelledby="positions-title" className="mt-10">
              <h2
                id="positions-title"
                className="scroll-mt-24 font-display text-2xl text-snow"
              >
                Meus anúncios e ofertas
              </h2>
              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <PositionList
                  title="Anúncios"
                  empty="Nenhum anúncio ativo."
                  items={mine.map((listing) => ({
                    id: listing.id,
                    name: itemName(listing),
                    detail: `${listing.price.toLocaleString("pt-BR")} cristais · ${timeLeft(listing.expiresAt)}`,
                    cancel: async () => {
                      if (
                        !window.confirm(
                          "Cancelar este anúncio e devolver o item à coleção?",
                        )
                      )
                        return;
                      await act(
                        `cancel-${listing.id}`,
                        () =>
                          api.gachaEconomyCancelListing(
                            listing.itemType,
                            listing.id,
                          ),
                        "Anúncio cancelado.",
                        true,
                      );
                    },
                  }))}
                  busy={busy}
                />
                <PositionList
                  title="Ofertas de compra"
                  empty="Nenhuma oferta de compra ativa."
                  items={orders.map((order) => ({
                    id: order.id,
                    name:
                      order.card?.name ?? order.skin?.name ?? order.itemType,
                    detail: `${order.price.toLocaleString("pt-BR")} cristais · ${timeLeft(order.expiresAt)}`,
                    cancel: async () => {
                      if (
                        !window.confirm(
                          "Cancelar esta oferta e liberar os cristais?",
                        )
                      )
                        return;
                      await act(
                        `cancel-${order.id}`,
                        () => api.gachaEconomyCancelOrder(order.id),
                        "Oferta cancelada.",
                      );
                    },
                  }))}
                  busy={busy}
                />
              </div>
            </section>
          )}

          {odds && (
            <details className="mt-10 border border-hairline bg-panel p-5">
              <summary className="min-h-11 cursor-pointer font-display text-xl text-snow focus-visible:ring-2 focus-visible:ring-ice">
                Probabilidades das caixas · versão {odds.version ?? "inicial"}
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
  total,
  canLoadMore,
  userReady,
  available,
  busy,
  onLoadMore,
  onBuy,
  onOrder,
  onHistory,
}: {
  title: string;
  listings: GachaEconomyListingItem[];
  total: number;
  canLoadMore: boolean;
  userReady: boolean;
  available: number;
  busy: string | null;
  onLoadMore: () => void;
  onBuy: (listing: GachaEconomyListingItem) => void;
  onOrder: (listing: GachaEconomyListingItem) => void;
  onHistory: (listing: GachaEconomyListingItem) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visibleListings = normalizedQuery
    ? listings.filter((listing) =>
        [
          itemName(listing),
          listing.item.animeTitle,
          listing.item.card?.animeTitle,
          listing.item.rarity,
          listing.item.card?.rarity,
          listing.item.foil,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery),
      )
    : listings;

  return (
    <section className="mt-10" aria-labelledby={`market-${title}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id={`market-${title}`}
            className="scroll-mt-24 font-display text-2xl text-snow"
          >
            {title} no mercado
          </h2>
          <span className="text-caption tabular-nums text-mist">
            {normalizedQuery ? `${visibleListings.length} de ` : ""}
            {total} ativos
          </span>
        </div>
        <label className="w-full text-caption text-mist sm:w-auto">
          Buscar {title.toLocaleLowerCase("pt-BR")}
          <input
            type="search"
            name={`market-search-${title}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome ou anime…"
            autoComplete="off"
            className="field mt-1 min-h-11 w-full sm:w-56"
          />
        </label>
      </div>
      <p className="mt-3 text-caption text-mist" role="status">
        Busca nos {listings.length} anúncios carregados
        {canLoadMore ? "; carregue mais para ampliar os resultados." : "."}
      </p>
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="btn-ghost mt-2 min-h-11 px-3"
        >
          Limpar busca
        </button>
      )}
      {visibleListings.length === 0 ? (
        <p className="mt-4 border border-dashed border-hairline p-5 text-body-sm text-mist">
          {normalizedQuery
            ? "Nenhum anúncio corresponde à busca."
            : "Ainda não há anúncios nesta categoria. Volte mais tarde para ver novas ofertas."}
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleListings.map((listing) => (
            <li
              key={listing.id}
              className="min-w-0 border border-hairline bg-panel p-4"
            >
              <MarketArtwork
                name={itemName(listing)}
                image={
                  listing.item.image ??
                  listing.item.imageUrl ??
                  listing.item.card?.image
                }
                details={[
                  listing.item.rarity ?? listing.item.card?.rarity,
                  listing.item.foil,
                  listing.item.animeTitle ?? listing.item.card?.animeTitle,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-display text-lg text-snow">
                    {itemName(listing)}
                  </h3>
                  <p className="mt-1 break-words text-body-sm text-mist">
                    {[
                      listing.item.rarity ?? listing.item.card?.rarity,
                      listing.item.foil,
                      listing.item.animeTitle ?? listing.item.card?.animeTitle,
                    ]
                      .filter(Boolean)
                      .join(" · ") || listing.itemType}
                  </p>
                </div>
                <span className="shrink-0 text-right font-display text-body-sm tabular-nums text-ice">
                  {listing.price.toLocaleString("pt-BR")} cristais
                </span>
              </div>
              {listing.item.edition != null && (
                <p className="mt-2 text-caption text-mist">
                  Edição #{listing.item.edition}
                  {listing.item.condition != null
                    ? ` · Desgaste ${listing.item.condition.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`
                    : ""}
                </p>
              )}
              {userReady && available < listing.price && (
                <p className="mt-2 text-caption text-mist">
                  Faltam {(listing.price - available).toLocaleString("pt-BR")}{" "}
                  cristais.
                </p>
              )}
              <p className="mt-3 text-caption text-mist">
                Expira em {timeLeft(listing.expiresAt)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
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
                  Fazer oferta
                </button>
                <button
                  type="button"
                  disabled={
                    !userReady || busy !== null || available < listing.price
                  }
                  onClick={() => onBuy(listing)}
                  className="btn-ice col-span-2 min-h-11 disabled:opacity-40"
                >
                  {busy === `buy-${listing.id}` ? "Comprando…" : "Comprar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {canLoadMore && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={onLoadMore}
          className="btn-ghost mt-4 min-h-11 w-full disabled:opacity-40 sm:w-auto sm:px-5"
        >
          {busy === `more-${title === "Cartas" ? "CARD" : "SKIN"}`
            ? "Carregando…"
            : "Carregar mais"}
        </button>
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

function MarketArtwork({
  name,
  image,
  details,
}: {
  name: string;
  image?: string | null;
  details: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = safeImageSrc(image);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setZoom(false);
          setOpen(true);
        }}
        aria-label={`Ver detalhes de ${name}`}
        className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice"
      >
        <span className="flex h-64 items-center justify-center overflow-hidden bg-ink sm:h-72">
          {src && !failed ? (
            <Image
              src={src}
              alt={name}
              width={480}
              height={640}
              sizes="(max-width: 479px) 90vw, (max-width: 1023px) 45vw, 400px"
              onError={() => setFailed(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-body-sm text-mist">Imagem indisponível</span>
          )}
        </span>
        <span className="flex min-h-11 items-center justify-center border-b border-hairline text-body-sm text-ice group-hover:text-snow">
          Ver arte e detalhes
        </span>
      </button>
      {open && (
        <Modal
          open
          size="wide"
          onClose={() => setOpen(false)}
          title={name}
          footer={
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost min-h-11 px-4"
            >
              Fechar prévia
            </button>
          }
        >
          <p className="mb-4 break-words text-body-sm text-mist">{details}</p>
          {src && !failed ? (
            <>
              <button
                type="button"
                aria-pressed={zoom}
                onClick={() => setZoom(!zoom)}
                className="btn-ghost mb-3 min-h-11 px-4"
              >
                {zoom ? "Ajustar à tela" : "Ampliar 2×"}
              </button>
              <div
                tabIndex={0}
                role="region"
                aria-label="Arte ampliada; use a rolagem para explorar"
                className="max-h-[60dvh] overflow-auto overscroll-contain bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
              >
                <Image
                  src={src}
                  alt={name}
                  width={960}
                  height={1280}
                  sizes={zoom ? "1600px" : "800px"}
                  className={
                    zoom
                      ? "h-auto w-[200%] max-w-none"
                      : "mx-auto h-auto max-h-[60dvh] w-full object-contain"
                  }
                />
              </div>
              {zoom && (
                <p className="mt-2 text-caption text-mist">
                  Deslize ou role para explorar a imagem ampliada.
                </p>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-mist">
              Imagem indisponível para este item.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
