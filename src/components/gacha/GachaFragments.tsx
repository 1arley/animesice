"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import * as m from "motion/react-m";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GachaInventorySubnav } from "@/components/gacha/GachaInventorySubnav";
import { GachaPageSkeleton } from "@/components/gacha/GachaPageSkeleton";
import { GachaStoneForge } from "@/components/gacha/GachaStoneForge";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  clearOperationId,
  FOIL_FRAGMENTS,
  FOIL_GEM_COST,
  gachaConditionLabel,
  getInventoryFragmentStats,
  getOwnedStoneSelection,
  getOrCreateOperationId,
  isStoneKind,
  pendingOperationRoute,
  readPendingOperationKeys,
  STONE_FRAGMENTS,
  type ItemOperation,
  type StoneKind,
} from "@/lib/gacha-inventory";
import type {
  GachaEconomyInventory,
  GachaFoil,
  GachaPull,
} from "@/types";

type FragmentCategory = "all" | "foil" | "stones";

const FRAGMENT_CATEGORIES: readonly { id: FragmentCategory; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "foil", label: "Foil e Gemas" },
  { id: "stones", label: "Pedras" },
];

const FRAG_EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function GachaFragments() {
  const { user, loading: authLoading } = useAuth();
  const currentUserIdRef = useRef(user?.id);
  useLayoutEffect(() => {
    currentUserIdRef.current = user?.id;
  }, [user?.id]);

  const [inventory, setInventory] = useState<GachaEconomyInventory | null>(
    null,
  );
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadTick, setLoadTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [category, setCategory] = useState<FragmentCategory>("all");
  const [onlyOwned, setOnlyOwned] = useState(false);

  // Estado de fragmentos e gemas de foil
  const [cards, setCards] = useState<GachaPull[]>([]);
  const [cardsResultKey, setCardsResultKey] = useState("");
  const [cardPage, setCardPage] = useState(1);
  const [cardTotalPages, setCardTotalPages] = useState(1);
  const [cardSearch, setCardSearch] = useState("");
  const [debouncedCardSearch, setDebouncedCardSearch] = useState("");
  const [collectionRetry, setCollectionRetry] = useState(0);
  const [cardsLoadError, setCardsLoadError] = useState(false);
  const [gemFoil, setGemFoil] = useState<GachaFoil>("HOLO");
  const [gemCardId, setGemCardId] = useState("");
  const [gemCard, setGemCard] = useState<GachaPull | null>(null);
  const [gemStatus, setGemStatus] = useState("");
  const [gemError, setGemError] = useState("");

  // Estado de fragmentos de pedras
  const [selectedKind, setSelectedKind] = useState<StoneKind>("TITANITA");
  const [quantity, setQuantity] = useState(1);
  const [stoneStatus, setStoneStatus] = useState("");
  const [stoneError, setStoneError] = useState("");
  const [reconcileNeeded, setReconcileNeeded] = useState(false);
  const [pendingInventoryOperation, setPendingInventoryOperation] =
    useState(false);
  const [forge, setForge] = useState<{
    result?: { kind: StoneKind; quantity: number };
    canDismiss?: boolean;
  } | null>(null);
  const [pendingRetry, setPendingRetry] = useState<{
    operation: ItemOperation;
    kind: StoneKind;
    quantity: number;
  } | null>(null);

  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const pendingOperations = useRef(new Map<string, string>());
  const craftButtonRef = useRef<HTMLButtonElement | null>(null);
  const stoneHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const stone =
    STONE_FRAGMENTS.find((entry) => entry.kind === selectedKind) ??
    STONE_FRAGMENTS[0]!;
  const gemType =
    FOIL_FRAGMENTS.find((entry) => entry.foil === gemFoil) ??
    FOIL_FRAGMENTS[0]!;

  const currentCardsKey = `${user?.id ?? ""}:${cardPage}:${cardSearch}`;
  const currentCardsRequestKey = `${user?.id ?? ""}:${cardPage}:${debouncedCardSearch}`;
  const currentCardsRequestKeyRef = useRef(currentCardsRequestKey);
  useLayoutEffect(() => {
    currentCardsRequestKeyRef.current = currentCardsRequestKey;
  }, [currentCardsRequestKey]);

  const gemCards =
    cardsResultKey === currentCardsKey
      ? cards.filter((card) => card.foil === "NORMAL")
      : [];

  const stats = useMemo(
    () => (inventory ? getInventoryFragmentStats(inventory) : null),
    [inventory],
  );

  const refreshInventory = useCallback(async () => {
    if (!user) return null;
    const userId = user.id;
    const current = await api.gachaEconomyInventory();
    if (currentUserIdRef.current !== userId) return null;
    setInventory(current);
    return current;
  }, [user]);

  const refreshCards = useCallback(async () => {
    if (!user) return false;
    try {
      const requestKey = currentCardsRequestKey;
      const result = await api.gachaCollection(
        user.id,
        cardPage,
        100,
        "value",
        "",
        "NORMAL",
        debouncedCardSearch,
      );
      if (currentCardsRequestKeyRef.current !== requestKey) return false;
      setCards(result.data);
      setCardsResultKey(`${user.id}:${cardPage}:${debouncedCardSearch}`);
      setCardTotalPages(Math.max(1, result.meta.totalPages));
      setCardPage((page) =>
        Math.min(page, Math.max(1, result.meta.totalPages)),
      );
      setCardsLoadError(false);
      return true;
    } catch (cause) {
      setCardsLoadError(true);
      throw cause;
    }
  }, [user, cardPage, debouncedCardSearch, currentCardsRequestKey]);

  const refreshAll = useCallback(async () => {
    const [current, cardsSynced] = await Promise.all([
      refreshInventory(),
      refreshCards(),
    ]);
    if (!current || !cardsSynced)
      throw new Error("A coleção mudou durante a atualização.");
  }, [refreshCards, refreshInventory]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setInventory(null);
      setCards([]);
      setCardsResultKey("");
      setLoadedUserId(null);
      setPendingRetry(null);
      setPendingInventoryOperation(false);
      setForge(null);
      setBusy("");
      busyRef.current = false;
      setReconcileNeeded(false);
      setLoadError("");
      pendingOperations.current.clear();
      setLoading(false);
      return;
    }

    let active = true;
    setInventory(null);
    setCards([]);
    setCardsResultKey("");
    setCardsLoadError(false);
    setGemCard(null);
    setGemCardId("");
    setCardSearch("");
    setDebouncedCardSearch("");
    setCardPage(1);
    setLoadedUserId(null);
    setLoadError("");
    setGemError("");
    setGemStatus("");
    setStoneError("");
    setStoneStatus("");
    setPendingRetry(null);
    setPendingInventoryOperation(false);
    setForge(null);
    setBusy("");
    busyRef.current = false;
    setReconcileNeeded(false);
    pendingOperations.current.clear();
    setLoading(true);

    void api
      .gachaEconomyInventory()
      .then((current) => {
        if (!active) return;
        setInventory(current);
        setLoadedUserId(user.id);
        const pendingKeys = readPendingOperationKeys(user.id);
        setPendingInventoryOperation(
          pendingKeys.some((key) => pendingOperationRoute(key) === "inventory"),
        );
        for (const suffix of pendingKeys) {
          const action = suffix.split(":");
          if (
            (action[0] === "buy" ||
              action[0] === "convert" ||
              action[0] === "craft") &&
            action.length === 3 &&
            isStoneKind(action[1])
          ) {
            const retryQuantity = Number(action[2]);
            if (Number.isInteger(retryQuantity) && retryQuantity > 0) {
              setSelectedKind(action[1]);
              setQuantity(retryQuantity);
              setPendingRetry({
                operation: action[0],
                kind: action[1],
                quantity: retryQuantity,
              });
              break;
            }
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setLoadedUserId(user.id);
        setLoadError(
          "Não foi possível carregar seus fragmentos. Tente atualizar novamente.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, user, loadTick]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCardSearch(cardSearch), 250);
    return () => clearTimeout(timer);
  }, [cardSearch]);

  useEffect(() => {
    if (!onlyOwned || pendingRetry || !inventory) return;
    const nextKind = getOwnedStoneSelection(selectedKind, inventory);
    if (nextKind !== selectedKind) {
      setSelectedKind(nextKind);
      setStoneStatus("");
    }
  }, [inventory, onlyOwned, pendingRetry, selectedKind]);

  useEffect(() => {
    if (!user || loadedUserId !== user.id) return;
    let active = true;
    const requestKey = currentCardsRequestKey;
    void api
      .gachaCollection(
        user.id,
        cardPage,
        100,
        "value",
        "",
        "NORMAL",
        debouncedCardSearch,
      )
      .then((result) => {
        if (!active || currentCardsRequestKeyRef.current !== requestKey) return;
        setCards(result.data);
        setCardsResultKey(`${user.id}:${cardPage}:${debouncedCardSearch}`);
        setCardTotalPages(Math.max(1, result.meta.totalPages));
        setCardPage((page) =>
          Math.min(page, Math.max(1, result.meta.totalPages)),
        );
        setCardsLoadError(false);
      })
      .catch(() => {
        if (active) {
          setCardsLoadError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [
    user,
    loadedUserId,
    cardPage,
    debouncedCardSearch,
    collectionRetry,
    currentCardsRequestKey,
  ]);

  async function handleCraftGem(entry: (typeof FOIL_FRAGMENTS)[number]) {
    if (
      !user ||
      !inventory ||
      busyRef.current ||
      pendingInventoryOperation ||
      !!pendingRetry ||
      inventory[entry.shards] < FOIL_GEM_COST
    )
      return;
    busyRef.current = true;
    const key = `gem-craft:${entry.foil}`;
    const { operationId, storageKey } = getOrCreateOperationId(
      pendingOperations.current,
      user.id,
      key,
    );
    setBusy(key);
    setGemError("");
    setGemStatus("");
    try {
      const updated = await api.gachaEconomyCraftGem({
        foil: entry.foil,
        operationId,
      });
      clearOperationId(pendingOperations.current, user.id, key, storageKey);
      setInventory(updated);
      setGemStatus(
        `Gema ${entry.label} fabricada. Restam ${updated[entry.shards]} fragmentos e você tem ${updated[entry.gems]} ${updated[entry.gems] === 1 ? "gema" : "gemas"}.`,
      );
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.statusCode < 500 &&
        cause.statusCode !== 408
      ) {
        clearOperationId(pendingOperations.current, user.id, key, storageKey);
      }
      setGemError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível fabricar a gema.",
      );
    } finally {
      setBusy("");
      busyRef.current = false;
    }
  }

  async function handleApplyGem() {
    if (
      !user ||
      !inventory ||
      busyRef.current ||
      pendingInventoryOperation ||
      !!pendingRetry
    ) {
      return;
    }
    const target = gemCard?.id === gemCardId ? gemCard : null;
    if (!target || target.foil !== "NORMAL" || inventory[gemType.gems] < 1) {
      return;
    }
    busyRef.current = true;
    const key = `gem-apply:${gemFoil}:${target.id}`;
    const { operationId, storageKey } = getOrCreateOperationId(
      pendingOperations.current,
      user.id,
      key,
    );
    setBusy("gem-apply");
    setGemError("");
    setGemStatus("");
    try {
      const updatedCard = await api.gachaEconomyApplyGem({
        foil: gemFoil,
        userCardId: target.id,
        operationId,
      });
      clearOperationId(pendingOperations.current, user.id, key, storageKey);
      setGemCardId("");
      setGemCard(null);
      setGemStatus(
        `Gema ${gemType.label} aplicada a ${target.card.name}. A carta agora tem foil ${updatedCard.foil} e valor de ${updatedCard.value.toLocaleString("pt-BR")} cristais.`,
      );
      try {
        await refreshAll();
      } catch {
        setGemError(
          "Gema aplicada; não foi possível atualizar os saldos. Atualize a página para sincronizar o inventário.",
        );
      }
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.statusCode < 500 &&
        cause.statusCode !== 408
      ) {
        clearOperationId(pendingOperations.current, user.id, key, storageKey);
      }
      setGemError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível aplicar a gema.",
      );
    } finally {
      setBusy("");
      busyRef.current = false;
    }
  }

  async function runStoneOperation(
    operation: ItemOperation,
    kind: StoneKind = selectedKind,
    retryQuantity = quantity,
  ) {
    const retrying =
      pendingRetry?.operation === operation &&
      pendingRetry.kind === kind &&
      pendingRetry.quantity === retryQuantity;
    if (
      !user ||
      !inventory ||
      busyRef.current ||
      reconcileNeeded ||
      (pendingInventoryOperation && !retrying) ||
      (pendingRetry &&
        (operation !== pendingRetry.operation ||
          kind !== pendingRetry.kind ||
          retryQuantity !== pendingRetry.quantity)) ||
      !Number.isInteger(retryQuantity) ||
      retryQuantity < 1
    )
      return;
    busyRef.current = true;
    const key = `${operation}:${kind}:${retryQuantity}`;
    const { operationId, storageKey } = getOrCreateOperationId(
      pendingOperations.current,
      user.id,
      key,
    );
    setBusy(key);
    setStoneError("");
    setStoneStatus("");
    const body = { operationId, kind, quantity: retryQuantity };
    let revealStarted = false;
    try {
      if (operation === "buy") await api.gachaEconomyBuyItem(body);
      else if (operation === "convert") await api.gachaEconomyConvertItem(body);
      else {
        const result = await api.gachaEconomyCraftItem(body);
        if (
          !result ||
          typeof result.kind !== "string" ||
          !result.kind.trim() ||
          !Number.isSafeInteger(result.quantity) ||
          result.quantity < 1
        ) {
          throw new Error("Resposta inválida da fabricação.");
        }
        revealStarted = true;
        setForge({
          result: { kind: result.kind, quantity: result.quantity },
        });
      }
      clearOperationId(pendingOperations.current, user.id, key, storageKey);
      setPendingRetry(null);
      setStoneStatus(
        operation === "craft"
          ? `Fabricação concluída: +${retryQuantity} pedra(s) de ${STONE_FRAGMENTS.find((entry) => entry.kind === kind)?.label ?? kind}.`
          : operation === "convert"
            ? "Fragmentos convertidos em cristais."
            : "Fragmentos adquiridos.",
      );
      await refreshInventory()
        .then(() => setReconcileNeeded(false))
        .catch(() => {
          setReconcileNeeded(true);
          setStoneError(
            "Operação concluída; saldos não atualizados. Atualize os saldos antes de outra ação.",
          );
        });
    } catch (cause) {
      setStoneError(
        `${cause instanceof Error ? cause.message : "Falha na operação."} Se houve timeout, tente novamente sem alterar o tipo ou a quantidade.`,
      );
      if (
        !(cause instanceof ApiError) ||
        cause.statusCode >= 500 ||
        cause.statusCode === 408
      ) {
        setPendingRetry({ operation, kind, quantity: retryQuantity });
        await refreshInventory().catch(() => undefined);
      } else {
        clearOperationId(pendingOperations.current, user.id, key, storageKey);
        setPendingRetry(null);
      }
    } finally {
      if (revealStarted) {
        setForge((current) => current && { ...current, canDismiss: true });
      } else {
        setBusy("");
        busyRef.current = false;
      }
    }
  }

  if (authLoading || loading || loadedUserId !== (user?.id ?? null)) {
    return <GachaPageSkeleton kind="fragments" />;
  }

  if (!user) {
    return (
      <main id="body-content" className="mx-auto max-w-shelf px-4 py-12">
        <div className="border border-hairline bg-panel p-6 sm:p-8">
          <p className="shelf-label">Gacha / Inventário · Fragmentos</p>
          <h1 className="font-display text-3xl text-snow">Fragmentos</h1>
          <p className="mt-3 max-w-xl text-body-sm text-mist">
            Entre na sua conta para acompanhar seus fragmentos de foil, forjar
            gemas permanentes e fabricar pedras de melhoria.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/entrar"
              className="btn-ice inline-flex min-h-11 items-center px-5"
            >
              Entrar
            </Link>
            <Link
              href="/gacha/inventario"
              className="btn-ghost inline-flex min-h-11 items-center px-4"
            >
              Voltar ao inventário
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loadError && !inventory) {
    return (
      <main id="body-content" className="mx-auto max-w-shelf px-4 py-12">
        <GachaInventorySubnav active="fragments" stats={null} />
        <div className="border border-signal/40 bg-panel p-6 sm:p-8">
          <h1 className="font-display text-2xl text-snow">
            Não foi possível carregar seus fragmentos
          </h1>
          <p role="alert" className="mt-2 text-body-sm text-signal">
            {loadError}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-ice min-h-11 px-4"
              onClick={() => setLoadTick((tick) => tick + 1)}
            >
              Tentar novamente
            </button>
            <Link
              href="/gacha/inventario"
              className="btn-ghost inline-flex min-h-11 items-center px-4"
            >
              Voltar ao inventário
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!inventory) return null;

  if (!inventory.itemConfig) {
    return (
      <main id="body-content" className="mx-auto max-w-shelf px-4 py-12">
        <GachaInventorySubnav active="fragments" stats={stats} />
        <div className="border border-hairline bg-panel p-6 sm:p-8">
          <h1 className="font-display text-3xl text-snow">
            Oficina de fragmentos indisponível
          </h1>
          <p className="mt-3 text-body-sm text-mist">
            A configuração da economia ainda não está disponível. Atualize em
            instantes.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-ghost min-h-11 px-4"
              onClick={() => setLoadTick((tick) => tick + 1)}
            >
              Atualizar
            </button>
            <Link
              href="/gacha/inventario"
              className="btn-ice inline-flex min-h-11 items-center px-4"
            >
              Voltar ao inventário
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const config = inventory.itemConfig;
  const recipe = config.item_recipes?.[selectedKind] ?? 0;
  const eligibility = config.item_eligibility?.[selectedKind];
  const buyPrice = config.item_shop_price?.[selectedKind] ?? 0;
  const convertValue = config.item_convert_value?.[selectedKind] ?? 0;
  const shopEnabled =
    config.item_shop_enabled?.[selectedKind] ?? buyPrice > 0;
  const dropAvailable = config.item_drop_available?.[selectedKind];
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1;

  const currentStoneShards = inventory[stone.shards];
  const maxCraftableStones =
    recipe > 0 ? Math.floor(currentStoneShards / recipe) : 0;

  const buyReason =
    buyPrice <= 0
      ? "Este item não está disponível para compra."
      : inventory.available < buyPrice * quantity
        ? "Saldo de cristais insuficiente."
        : "";
  const convertReason =
    currentStoneShards < quantity
      ? "Fragmentos insuficientes."
      : convertValue <= 0
        ? "Este fragmento não pode ser convertido."
        : "";
  const craftReason =
    recipe <= 0
      ? "Receita indisponível."
      : currentStoneShards < recipe * quantity
        ? `São necessários ${recipe * quantity} fragmentos.`
        : "";

  const visibleFoils = onlyOwned
    ? FOIL_FRAGMENTS.filter(
        (entry) => inventory[entry.shards] > 0 || inventory[entry.gems] > 0,
      )
    : FOIL_FRAGMENTS;

  const visibleStones = onlyOwned
    ? STONE_FRAGMENTS.filter(
        (entry) => inventory[entry.shards] > 0 || inventory[entry.items] > 0,
      )
    : STONE_FRAGMENTS;

  const showFoilSection = category === "all" || category === "foil";
  const showStonesSection = category === "all" || category === "stones";
  const hasAnyResources =
    !!stats &&
    (stats.totalFragments > 0 ||
      stats.totalFoilGems > 0 ||
      stats.totalReadyStones > 0);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <main
          id="body-content"
          className="gacha-fragments-page mx-auto max-w-shelf px-4 pb-16 pt-8"
        >
          <GachaInventorySubnav active="fragments" stats={stats} />

          {pendingInventoryOperation && (
            <p
              role="status"
              className="mb-4 border border-ice/30 bg-panel p-3 text-body-sm text-mist"
            >
              Há uma operação do inventário pendente. Resolva-a antes de iniciar
              outra ação.{" "}
              <Link
                className="font-medium text-ice underline"
                href="/gacha/inventario"
              >
                Abrir inventário
              </Link>
            </p>
          )}

          <header className="gacha-fragments-hero mb-8 p-5 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="shelf-label">Gacha / Inventário · Fragmentos</p>
                <h1 className="font-display text-3xl text-snow sm:text-4xl">
                  Fragmentos
                </h1>
                <p className="mt-2.5 text-body-sm text-mist">
                  Forje gemas permanentes com fragmentos de foil, aplique em
                  cartas elegíveis e transforme fragmentos minerais em pedras
                  para melhorar sua coleção.
                </p>
              </div>

              {stats && (
                <div className="grid grid-cols-2 gap-3 border border-ice/20 bg-ink/80 p-4 sm:grid-cols-3 lg:min-w-[26rem]">
                  <div>
                    <p className="font-mono text-caption uppercase tracking-wider text-mist">
                      Total de fragmentos
                    </p>
                    <p className="mt-1 font-mono text-2xl tabular-nums text-snow">
                      {stats.totalFragments.toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-0.5 text-caption text-mist">
                      {stats.totalFoilFragments.toLocaleString("pt-BR")} foil ·{" "}
                      {stats.totalStoneFragments.toLocaleString("pt-BR")} pedras
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-caption uppercase tracking-wider text-mist">
                      Forjáveis agora
                    </p>
                    <p className="mt-1 font-mono text-2xl tabular-nums text-ice">
                      {stats.totalCraftable.toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-0.5 text-caption text-mist">
                      {stats.craftableFoilGems} gemas · {stats.craftableStones}{" "}
                      pedras
                    </p>
                  </div>
                  <div className="col-span-2 border-t border-hairline pt-3 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                    <p className="font-mono text-caption uppercase tracking-wider text-mist">
                      Cristais disponíveis
                    </p>
                    <p className="mt-1 font-mono text-2xl tabular-nums text-snow">
                      {inventory.available.toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-0.5 text-caption text-mist">
                      {stats.totalFoilGems} gemas · {stats.totalReadyStones}{" "}
                      pedras prontas
                    </p>
                  </div>
                </div>
              )}
            </div>
          </header>

          {!hasAnyResources && (
            <section
              aria-label="Como obter fragmentos"
              className="mb-8 border border-hairline bg-panel p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <h2 className="font-display text-lg text-snow">
                    Você ainda não possui fragmentos no estoque
                  </h2>
                  <p className="mt-1.5 text-body-sm text-mist">
                    Queime cartas com foil na sua coleção para acumular
                    fragmentos de gemas, ou ganhe fragmentos minerais em giros
                    bônus e caixas do Gacha. Todas as receitas permanecem
                    disponíveis abaixo.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/gacha"
                    className="btn-ice min-h-11 px-4"
                  >
                    Girar agora
                  </Link>
                  <Link
                    href="/gacha/loja"
                    className="btn-ghost min-h-11 px-4"
                  >
                    Ver caixas
                  </Link>
                  <Link
                    href="/gacha/cartas"
                    className="btn-ghost min-h-11 px-4"
                  >
                    Minhas cartas
                  </Link>
                </div>
              </div>
            </section>
          )}

          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Categorias de fragmentos"
              className="inline-flex flex-wrap gap-1 border border-hairline bg-panel p-1"
            >
              {FRAGMENT_CATEGORIES.map((item) => {
                const active = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(item.id)}
                    className={`relative min-h-11 px-4 text-body-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                      active ? "text-ink" : "text-mist hover:text-snow"
                    }`}
                  >
                    {active && (
                      <m.span
                        layoutId="fragments-category-indicator"
                        aria-hidden="true"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 38,
                          mass: 0.8,
                        }}
                        className="absolute inset-0 bg-ice"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-pressed={onlyOwned}
              onClick={() => setOnlyOwned((value) => !value)}
              className={`min-h-11 border px-4 text-body-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                onlyOwned
                  ? "border-ice bg-ice/10 text-ice"
                  : "border-hairline bg-panel text-mist hover:border-ice/40 hover:text-snow"
              }`}
            >
              Somente com saldo
            </button>
          </div>

          {showFoilSection && (
            <section
              id="foil"
              className="mb-10 scroll-mt-6 border border-hairline bg-panel p-4 sm:p-6"
              aria-labelledby="foil-gems-heading"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="font-mono text-caption uppercase tracking-[0.16em] text-ice">
                    Acabamento permanente
                  </p>
                  <h2
                    id="foil-gems-heading"
                    className="mt-1 font-display text-2xl text-snow"
                  >
                    Fragmentos e gemas de foil
                  </h2>
                  <p className="mt-2 text-body-sm text-mist">
                    Cada gema exige 20 fragmentos do mesmo foil. A aplicação só
                    funciona em uma carta sua sem foil; foils existentes não
                    podem ser trocados.
                  </p>
                </div>
                {stats && (
                  <p className="font-mono text-caption tabular-nums text-mist">
                    {stats.totalFoilFragments.toLocaleString("pt-BR")}{" "}
                    fragmentos · {stats.totalFoilGems.toLocaleString("pt-BR")}{" "}
                    gemas prontas
                  </p>
                )}
              </div>

              {visibleFoils.length === 0 ? (
                <div className="mt-5 border border-hairline bg-ink p-6 text-center">
                  <p className="text-body-sm text-mist">
                    Nenhum fragmento ou gema de foil com saldo disponível.
                  </p>
                  <button
                    type="button"
                    className="btn-ghost mt-4 min-h-11 px-4"
                    onClick={() => setOnlyOwned(false)}
                  >
                    Mostrar todos os foils
                  </button>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {visibleFoils.map((entry, index) => {
                    const shards = inventory[entry.shards];
                    const gems = inventory[entry.gems];
                    const ready = shards >= FOIL_GEM_COST;
                    const remaining = Math.max(0, FOIL_GEM_COST - shards);
                    const ratio = Math.min(1, shards / FOIL_GEM_COST);

                    return (
                      <m.article
                        key={entry.foil}
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 0.22,
                          delay: Math.min(index, 5) * 0.035,
                          ease: FRAG_EASE_OUT,
                        }}
                        className="gacha-fragment-card flex flex-col border p-4"
                      >
                        <div
                          className="gacha-fragment-art h-28"
                          data-foil={entry.foil}
                        >
                          <Image
                            src={entry.image}
                            alt=""
                            width={96}
                            height={96}
                            className="h-24 w-24 object-contain"
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <h3 className="font-display text-lg text-snow">
                            {entry.label}
                          </h3>
                          <span
                            className={`border px-2 py-0.5 font-mono text-label ${
                              ready
                                ? "border-ice/50 bg-ice/10 text-ice"
                                : shards > 0
                                  ? "border-hairline bg-ink text-snow"
                                  : "border-hairline bg-ink text-mist"
                            }`}
                          >
                            {ready
                              ? "Pronta para forjar"
                              : shards > 0
                                ? `Faltam ${remaining}`
                                : "Sem saldo"}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1">
                          <p className="flex items-center justify-between text-sm text-mist">
                            Fragmentos:{" "}
                            <strong className="font-mono tabular-nums text-snow">
                              {shards}
                            </strong>
                          </p>
                          <p className="flex items-center justify-between text-sm text-mist">
                            Gemas:{" "}
                            <strong className="font-mono tabular-nums text-snow">
                              {gems}
                            </strong>
                          </p>
                        </div>

                        <div
                          role="progressbar"
                          aria-label={`Progresso de fabricação da gema ${entry.label}`}
                          aria-valuemin={0}
                          aria-valuemax={FOIL_GEM_COST}
                          aria-valuenow={Math.min(FOIL_GEM_COST, shards)}
                          className="gacha-fragment-progress-track mt-3 h-1.5"
                        >
                          <span
                            className="gacha-fragment-progress-fill bg-ice"
                            style={{ transform: `scaleX(${ratio})` }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleCraftGem(entry)}
                          disabled={
                            !!busy ||
                            shards < FOIL_GEM_COST ||
                            pendingInventoryOperation ||
                            !!pendingRetry
                          }
                          className="btn-ice gacha-fragment-action mt-4 min-h-11 w-full px-3 disabled:opacity-50"
                        >
                          {busy === `gem-craft:${entry.foil}`
                            ? "Fabricando…"
                            : "Fabricar gema · 20 fragmentos"}
                        </button>
                      </m.article>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 border border-hairline bg-ink/80 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg text-snow">
                      Aplicar gema em carta própria
                    </h3>
                    <p className="mt-1 text-caption text-mist">
                      Selecione uma gema disponível e uma carta sem foil da sua
                      coleção.
                    </p>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[18rem]">
                    <SearchField
                      id="gem-card-search"
                      name="gemCardSearch"
                      autoComplete="off"
                      spellCheck={false}
                      value={cardSearch}
                      onChange={(event) => {
                        setCardSearch(event.target.value);
                        setCardPage(1);
                      }}
                      placeholder="Buscar carta sem foil…"
                      aria-label="Buscar cartas sem foil"
                      containerClassName="flex-1"
                    />
                    {cardSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setCardSearch("");
                          setCardPage(1);
                        }}
                        className="btn-ghost min-h-11 shrink-0 px-3 text-caption"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end">
                  <div>
                    <label
                      htmlFor="gem-foil"
                      className="block text-sm text-mist"
                    >
                      Gema
                    </label>
                    <select
                      id="gem-foil"
                      value={gemFoil}
                      disabled={!!busy}
                      onChange={(event) => {
                        setGemFoil(event.target.value as GachaFoil);
                        setGemCardId("");
                        setGemCard(null);
                      }}
                      className="mt-2 h-11 w-full border border-hairline bg-ink px-3 text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60"
                    >
                      {FOIL_FRAGMENTS.map((entry) => (
                        <option key={entry.foil} value={entry.foil}>
                          {entry.label} · {inventory[entry.gems]} disponível(is)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="gem-card"
                      className="block text-sm text-mist"
                    >
                      Carta própria sem foil
                    </label>
                    <select
                      id="gem-card"
                      value={gemCardId}
                      onChange={(event) => {
                        const selected =
                          gemCards.find(
                            (card) => card.id === event.target.value,
                          ) ?? null;
                        setGemCard(selected);
                        setGemCardId(selected?.id ?? "");
                      }}
                      disabled={
                        !gemCards.length ||
                        !!busy ||
                        cardsResultKey !== currentCardsKey
                      }
                      className="mt-2 h-11 w-full border border-hairline bg-ink px-3 text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60"
                    >
                      <option value="">
                        {cardsResultKey !== currentCardsKey
                          ? "Carregando cartas…"
                          : gemCards.length
                            ? "Selecione uma carta"
                            : "Nenhuma carta sem foil"}
                      </option>
                      {gemCard &&
                        !gemCards.some((card) => card.id === gemCard.id) && (
                          <option value={gemCard.id}>
                            {gemCard.card.name} · selecionada
                          </option>
                        )}
                      {gemCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.card.name} ·{" "}
                          {card.conditionLabel ??
                            gachaConditionLabel(card.condition)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !gemCardId ||
                      inventory[gemType.gems] < 1 ||
                      !!busy ||
                      pendingInventoryOperation ||
                      !!pendingRetry
                    }
                    onClick={() => void handleApplyGem()}
                    className="btn-ice gacha-fragment-action min-h-11 px-4 disabled:opacity-50"
                  >
                    {busy === "gem-apply" ? "Aplicando…" : "Aplicar gema"}
                  </button>
                </div>

                {gemCard && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-ice/25 bg-panel px-4 py-3 text-body-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className="gacha-fragment-art h-11 w-11 shrink-0"
                        data-foil={gemType.foil}
                      >
                        <Image
                          src={gemType.image}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-display text-snow">
                          {gemCard.card.name}
                        </p>
                        <p className="text-caption text-mist">
                          {gemCard.conditionLabel ??
                            gachaConditionLabel(gemCard.condition)}{" "}
                          · Valor atual{" "}
                          <span className="font-mono tabular-nums text-snow">
                            {gemCard.value.toLocaleString("pt-BR")}
                          </span>{" "}
                          cristais
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-caption text-ice">
                      NORMAL → {gemType.label} (permanente)
                    </p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-mist">
                  <span className="tabular-nums">
                    {gemCards.length} cartas sem foil · página {cardPage}/
                    {cardTotalPages}
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="btn-ghost min-h-11 px-3 disabled:opacity-50"
                      disabled={
                        cardPage <= 1 ||
                        !!busy ||
                        cardsResultKey !== currentCardsKey
                      }
                      onClick={() => {
                        setCards([]);
                        setCardPage((page) => Math.max(1, page - 1));
                      }}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className="btn-ghost min-h-11 px-3 disabled:opacity-50"
                      disabled={
                        cardPage >= cardTotalPages ||
                        !!busy ||
                        cardsResultKey !== currentCardsKey
                      }
                      onClick={() => {
                        setCards([]);
                        setCardPage((page) =>
                          Math.min(cardTotalPages, page + 1),
                        );
                      }}
                    >
                      Próxima
                    </button>
                  </span>
                </div>

                <p className="mt-3 text-xs text-mist">
                  Cartas com foil não aceitam outra gema. O foil atual é
                  permanente.
                </p>

                {cardsLoadError && (
                  <p role="alert" className="mt-3 text-sm text-signal">
                    Não foi possível atualizar estas cartas.{" "}
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center px-1 underline"
                      onClick={() => {
                        setCardsLoadError(false);
                        setCollectionRetry((retry) => retry + 1);
                      }}
                    >
                      Tentar novamente
                    </button>
                  </p>
                )}

                <p
                  role="status"
                  aria-live="polite"
                  className="mt-3 min-h-5 text-sm text-ice"
                >
                  {gemStatus}
                </p>

                {gemError && (
                  <p role="alert" className="mt-3 text-sm text-signal">
                    {gemError}
                  </p>
                )}
              </div>
            </section>
          )}

          {showStonesSection && (
            <section
              id="pedras"
              className="scroll-mt-6 border border-hairline bg-panel p-4 sm:p-6"
              aria-labelledby="stone-heading"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="font-mono text-caption uppercase tracking-[0.16em] text-ice">
                    Forja mineral
                  </p>
                  <h2
                    id="stone-heading"
                    ref={stoneHeadingRef}
                    tabIndex={-1}
                    className="mt-1 font-display text-2xl text-snow focus:outline-none"
                  >
                    Fragmentos de pedras
                  </h2>
                  <p className="mt-2 text-body-sm text-mist">
                    Selecione um tipo de mineral para comprar fragmentos,
                    converter excedentes em cristais ou fabricar pedras prontas
                    para melhorar cartas.
                  </p>
                </div>
                <Link
                  href={`/gacha/inventario?pedra=${selectedKind}#melhorar-carta`}
                  className="btn-ghost min-h-11 px-4 text-body-sm"
                >
                  Usar pedras no inventário
                </Link>
              </div>

              {visibleStones.length === 0 ? (
                <div className="mt-5 border border-hairline bg-ink">
                  <EmptyState
                    variant="compact"
                    text="Você ainda não possui fragmentos ou pedras minerais com saldo."
                    action={
                      <button
                        type="button"
                        className="btn-ghost min-h-11 px-4"
                        onClick={() => setOnlyOwned(false)}
                      >
                        Mostrar todos os tipos
                      </button>
                    }
                  />
                </div>
              ) : (
                <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {visibleStones.map((item, index) => {
                      const current = inventory[item.shards];
                      const readyCount = inventory[item.items];
                      const needed = config.item_recipes?.[item.kind] ?? 0;
                      const ratio =
                        needed > 0 ? Math.min(1, current / needed) : 0;
                      const canCraft = needed > 0 && current >= needed;
                      const selected = selectedKind === item.kind;

                      return (
                        <m.button
                          key={item.kind}
                          type="button"
                          aria-pressed={selected}
                          disabled={!!pendingRetry}
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.22,
                            delay: Math.min(index, 5) * 0.035,
                            ease: FRAG_EASE_OUT,
                          }}
                          onClick={() => {
                            if (selectedKind !== item.kind) {
                              setSelectedKind(item.kind);
                            }
                            setStoneStatus("");
                          }}
                          className={`gacha-fragment-stone-btn flex min-h-11 flex-col justify-between border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60 ${
                            selected
                              ? "border-ice bg-ice/10 shadow-[0_0_24px_-8px_rgba(56,232,218,0.28)]"
                              : "border-hairline bg-ink hover:border-ice/50"
                          }`}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="flex items-center gap-3">
                              <span
                                className="gacha-fragment-art h-12 w-12 shrink-0"
                                data-stone={item.kind}
                              >
                                <Image
                                  src={item.image}
                                  alt=""
                                  width={44}
                                  height={44}
                                  className="h-10 w-10 object-contain"
                                />
                              </span>
                              <span>
                                <span className="block font-display text-base text-snow">
                                  {item.label}
                                </span>
                                <span className="mt-0.5 block font-mono text-xs tabular-nums text-mist">
                                  {current.toLocaleString("pt-BR")} /{" "}
                                  {needed.toLocaleString("pt-BR")} fragmentos
                                </span>
                              </span>
                            </span>
                            <span className="border border-hairline bg-panel px-2 py-0.5 font-mono text-xs tabular-nums text-ice">
                              {readyCount} prontas
                            </span>
                          </span>

                          <span className="mt-4 block">
                            <span className="flex items-center justify-between text-caption">
                              <span
                                className={
                                  canCraft ? "text-ice" : "text-mist"
                                }
                              >
                                {canCraft
                                  ? `${Math.floor(current / needed)} pedra(s) forjável(is)`
                                  : needed > 0
                                    ? `Faltam ${Math.max(0, needed - current)}`
                                    : "Receita indisponível"}
                              </span>
                              <span className="font-mono tabular-nums text-mist">
                                {Math.round(ratio * 100)}%
                              </span>
                            </span>
                            <span
                              role="progressbar"
                              aria-label={`Progresso de fabricação de ${item.label}`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(ratio * 100)}
                              className="gacha-fragment-progress-track mt-1.5 block h-1.5"
                            >
                              <span
                                className="gacha-fragment-progress-fill bg-ice"
                                style={{ transform: `scaleX(${ratio})` }}
                              />
                            </span>
                          </span>
                        </m.button>
                      );
                    })}
                  </div>

                  <div className="border border-hairline bg-ink/85 p-4 sm:p-5">
                    <div className="flex items-center gap-3 border-b border-hairline pb-4">
                      <div
                        className="gacha-fragment-art h-14 w-14 shrink-0"
                        data-stone={stone.kind}
                      >
                        <Image
                          src={stone.image}
                          alt=""
                          width={52}
                          height={52}
                          className="h-12 w-12 object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-xl text-snow">
                          {stone.label}
                        </h3>
                        {eligibility ? (
                          <p className="mt-0.5 text-caption text-mist">
                            Elegível: {eligibility.sourceConditions.join("/")} →
                            até {eligibility.maxCondition} (
                            {eligibility.foils.join(", ")})
                          </p>
                        ) : (
                          <p className="mt-0.5 text-caption text-mist">
                            Configuração de elegibilidade indisponível.
                          </p>
                        )}
                      </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                      <div className="border border-hairline bg-panel p-3">
                        <dt className="text-caption text-mist">Fragmentos</dt>
                        <dd className="mt-1 font-mono text-lg tabular-nums text-snow">
                          {currentStoneShards.toLocaleString("pt-BR")}
                        </dd>
                      </div>
                      <div className="border border-hairline bg-panel p-3">
                        <dt className="text-caption text-mist">Prontas</dt>
                        <dd className="mt-1 font-mono text-lg tabular-nums text-ice">
                          {inventory[stone.items].toLocaleString("pt-BR")}
                        </dd>
                      </div>
                      <div className="border border-hairline bg-panel p-3">
                        <dt className="text-caption text-mist">Receita</dt>
                        <dd className="mt-1 font-mono text-lg tabular-nums text-snow">
                          {recipe > 0 ? `${recipe} frag.` : "—"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          className="text-sm text-mist"
                          htmlFor="item-quantity"
                        >
                          Quantidade
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={!!pendingRetry}
                            onClick={() => setQuantity(1)}
                            className="min-h-11 min-w-11 border border-hairline bg-panel px-2.5 font-mono text-caption text-mist hover:border-ice/50 hover:text-snow disabled:opacity-50"
                          >
                            1×
                          </button>
                          {maxCraftableStones > 1 && (
                            <button
                              type="button"
                              disabled={!!pendingRetry}
                              onClick={() => setQuantity(maxCraftableStones)}
                              className="min-h-11 border border-hairline bg-panel px-2.5 font-mono text-caption text-ice hover:border-ice/50 disabled:opacity-50"
                            >
                              Máx. forjar ({maxCraftableStones})
                            </button>
                          )}
                          {currentStoneShards > 1 && convertValue > 0 && (
                            <button
                              type="button"
                              disabled={!!pendingRetry}
                              onClick={() => setQuantity(currentStoneShards)}
                              className="min-h-11 border border-hairline bg-panel px-2.5 font-mono text-caption text-mist hover:border-ice/50 hover:text-snow disabled:opacity-50"
                            >
                              Máx. converter ({currentStoneShards})
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        id="item-quantity"
                        type="number"
                        min={1}
                        max={2_147_483_647}
                        step={1}
                        disabled={!!pendingRetry}
                        value={quantity}
                        onChange={(event) =>
                          setQuantity(
                            Math.min(
                              2_147_483_647,
                              Math.max(1, Number(event.target.value) || 1),
                            ),
                          )
                        }
                        className="mt-2 h-11 w-full border border-hairline bg-ink px-3 font-mono tabular-nums text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60"
                      />
                    </div>

                    <div
                      className={`mt-4 grid gap-3 ${
                        shopEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"
                      }`}
                    >
                      {shopEnabled && (
                        <div>
                          <button
                            type="button"
                            onClick={() => void runStoneOperation("buy")}
                            disabled={
                              !validQuantity ||
                              !!busy ||
                              !!buyReason ||
                              reconcileNeeded ||
                              pendingInventoryOperation ||
                              !!pendingRetry
                            }
                            className="btn-ghost gacha-fragment-action min-h-11 w-full px-3 disabled:opacity-50"
                          >
                            Comprar fragmentos
                          </button>
                          <p className="mt-1 min-h-10 text-xs text-mist">
                            {buyReason ||
                              `${(buyPrice * quantity).toLocaleString("pt-BR")} cristais · ${buyPrice.toLocaleString("pt-BR")} cada`}
                          </p>
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => void runStoneOperation("convert")}
                          disabled={
                            !validQuantity ||
                            !!busy ||
                            !!convertReason ||
                            reconcileNeeded ||
                            pendingInventoryOperation ||
                            !!pendingRetry
                          }
                          className="btn-ghost gacha-fragment-action min-h-11 w-full px-3 disabled:opacity-50"
                        >
                          Converter
                        </button>
                        <p className="mt-1 min-h-10 text-xs text-mist">
                          {convertReason ||
                            `Recebe ${(convertValue * quantity).toLocaleString("pt-BR")} cristais`}
                        </p>
                      </div>
                      <div>
                        <button
                          ref={craftButtonRef}
                          type="button"
                          onClick={() => void runStoneOperation("craft")}
                          disabled={
                            !validQuantity ||
                            !!busy ||
                            !!craftReason ||
                            reconcileNeeded ||
                            pendingInventoryOperation ||
                            !!pendingRetry
                          }
                          className="btn-ice gacha-fragment-action min-h-11 w-full px-3 disabled:opacity-50"
                        >
                          {busy.startsWith("craft:")
                            ? "Fabricando…"
                            : "Fabricar pedra"}
                        </button>
                        <p className="mt-1 min-h-10 text-xs text-mist">
                          {craftReason ||
                            `Consome ${recipe * quantity} fragmentos`}
                        </p>
                      </div>
                    </div>

                    {dropAvailable === true ? (
                      <p className="mt-2 text-xs text-ice">
                        {shopEnabled
                          ? "Fonte ativa:"
                          : "Compra direta pausada no piloto. Fonte ativa:"}{" "}
                        caixas de gacha.{" "}
                        <Link
                          href="/gacha/loja#box-odds"
                          className="underline underline-offset-4"
                        >
                          Ver chances
                        </Link>
                      </p>
                    ) : dropAvailable === false ? (
                      <p className="mt-2 text-xs text-mist">
                        Nenhuma caixa ativa concede este item.
                        {shopEnabled
                          ? ""
                          : " A compra está pausada até existir uma fonte ativa."}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-mist">
                        Fonte em loot boxes indisponível para consulta.
                      </p>
                    )}

                    {inventory[stone.items] > 0 && (
                      <div className="mt-4 border-t border-hairline pt-4">
                        <Link
                          href={`/gacha/inventario?pedra=${stone.kind}#melhorar-carta`}
                          className="inline-flex min-h-11 items-center text-body-sm text-ice underline underline-offset-4"
                        >
                          Melhorar carta com {stone.label} no inventário →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p
                role="status"
                aria-live="polite"
                className="mt-4 min-h-5 text-sm text-ice"
              >
                {stoneStatus}
              </p>

              {stoneError && (
                <p role="alert" className="mt-3 text-sm text-signal">
                  {stoneError}
                </p>
              )}

              {reconcileNeeded && (
                <button
                  type="button"
                  onClick={() =>
                    void refreshInventory()
                      .then(() => {
                        setReconcileNeeded(false);
                        setStoneError("");
                      })
                      .catch(() =>
                        setStoneError(
                          "Ainda não foi possível reconciliar os saldos.",
                        ),
                      )
                  }
                  disabled={!!busy}
                  className="btn-ghost mt-3 min-h-11 px-4 disabled:opacity-50"
                >
                  Atualizar saldos
                </button>
              )}

              {pendingRetry && (
                <button
                  type="button"
                  onClick={() =>
                    void runStoneOperation(
                      pendingRetry.operation,
                      pendingRetry.kind,
                      pendingRetry.quantity,
                    )
                  }
                  disabled={!!busy || reconcileNeeded}
                  className="btn-ghost mt-3 min-h-11 px-4 disabled:opacity-50"
                >
                  Repetir a mesma operação com segurança
                </button>
              )}
            </section>
          )}
          {busy.startsWith("craft:") && (
            <GachaStoneForge
              result={forge?.result}
              canDismiss={forge?.canDismiss}
              onDismiss={() => {
                setForge(null);
                setBusy("");
                busyRef.current = false;
                requestAnimationFrame(() => {
                  if (
                    craftButtonRef.current?.isConnected &&
                    !craftButtonRef.current.disabled
                  ) {
                    craftButtonRef.current.focus();
                  } else {
                    stoneHeadingRef.current?.focus();
                  }
                });
              }}
            />
          )}
        </main>
      </MotionConfig>
    </LazyMotion>
  );
}
