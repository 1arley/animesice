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
import { GachaEssences } from "@/components/gacha/GachaEssences";
import { GachaInventorySubnav } from "@/components/gacha/GachaInventorySubnav";
import { GachaPageSkeleton } from "@/components/gacha/GachaPageSkeleton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { BonusShardIcon, SHARD_ICONS } from "@/components/gacha/BonusShardIcon";
import { SearchField } from "@/components/ui/SearchField";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import {
  clearOperationId,
  gachaConditionLabel,
  getInventoryFragmentStats,
  getOrCreateOperationId,
  isCardEligibleForStone,
  isStoneKind,
  nextConditionLabel,
  pendingOperationRoute,
  readPendingOperationKeys,
  STONE_FRAGMENTS,
  upgradedValue,
  type StoneKind,
} from "@/lib/gacha-inventory";
import type { GachaEconomyInventory, GachaPull } from "@/types";

const GATEWAY_PREVIEWS = [
  { src: "/gacha/holo_gem.png", tone: "foil", key: "HOLO" },
  { src: "/gacha/gold_gem.png", tone: "foil", key: "GOLD" },
  { src: "/gacha/titanita.png", tone: "stone", key: "TITANITA" },
  { src: "/gacha/magnetita.png", tone: "stone", key: "DRACONICA" },
] as const;

export function GachaInventory() {
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
  const [eligibleCards, setEligibleCards] = useState<GachaPull[]>([]);
  const [eligibleResultKey, setEligibleResultKey] = useState("");
  const [eligiblePage, setEligiblePage] = useState(1);
  const [eligibleTotalPages, setEligibleTotalPages] = useState(1);
  const [selectedKind, setSelectedKind] = useState<StoneKind>("TITANITA");
  const [selectedCard, setSelectedCard] = useState<GachaPull | null>(null);
  const [cardSearch, setCardSearch] = useState("");
  const [debouncedCardSearch, setDebouncedCardSearch] = useState("");
  const [collectionRetry, setCollectionRetry] = useState(0);
  const [eligibleLoadError, setEligibleLoadError] = useState(false);
  const [protectionQuantity, setProtectionQuantity] = useState(1);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reconcileNeeded, setReconcileNeeded] = useState(false);
  const [pendingProtectionRetry, setPendingProtectionRetry] = useState<{
    quantity: number;
  } | null>(null);
  const [pendingFragmentsOperation, setPendingFragmentsOperation] =
    useState(false);
  const [pendingUseRetry, setPendingUseRetry] = useState<{
    kind: StoneKind;
    userCardId: string;
  } | null>(null);

  const pendingOperations = useRef(new Map<string, string>());
  const busyRef = useRef(false);

  const stone =
    STONE_FRAGMENTS.find((entry) => entry.kind === selectedKind) ??
    STONE_FRAGMENTS[0]!;
  const currentEligibleKey = `${user?.id ?? ""}:${selectedKind}:${eligiblePage}:${cardSearch}`;
  const currentEligibleRequestKey = `${user?.id ?? ""}:${selectedKind}:${eligiblePage}:${debouncedCardSearch}`;
  const currentEligibleRequestKeyRef = useRef(currentEligibleRequestKey);
  useLayoutEffect(() => {
    currentEligibleRequestKeyRef.current = currentEligibleRequestKey;
  }, [currentEligibleRequestKey]);

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

  const refreshEligibleCards = useCallback(async () => {
    if (!user) return false;
    try {
      const requestKey = currentEligibleRequestKey;
      const result = await api.gachaCollection(
        user.id,
        eligiblePage,
        100,
        "value",
        "",
        "",
        debouncedCardSearch,
        selectedKind,
      );
      if (currentEligibleRequestKeyRef.current !== requestKey) return false;
      setEligibleCards(result.data);
      setEligibleResultKey(
        `${user.id}:${selectedKind}:${eligiblePage}:${debouncedCardSearch}`,
      );
      setEligibleTotalPages(Math.max(1, result.meta.totalPages));
      setEligiblePage((page) =>
        Math.min(page, Math.max(1, result.meta.totalPages)),
      );
      setEligibleLoadError(false);
      return true;
    } catch (cause) {
      setEligibleLoadError(true);
      throw cause;
    }
  }, [
    user,
    eligiblePage,
    debouncedCardSearch,
    selectedKind,
    currentEligibleRequestKey,
  ]);

  const refresh = useCallback(async () => {
    const [current, eligibleCardsSynced] = await Promise.all([
      refreshInventory(),
      refreshEligibleCards(),
    ]);
    if (!current || !eligibleCardsSynced)
      throw new Error("A coleção mudou durante a atualização.");
  }, [refreshEligibleCards, refreshInventory]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setInventory(null);
      setEligibleCards([]);
      setEligibleResultKey("");
      setLoadedUserId(null);
      setPendingProtectionRetry(null);
      setPendingUseRetry(null);
      setPendingFragmentsOperation(false);
      setReconcileNeeded(false);
      pendingOperations.current.clear();
      setLoading(false);
      return;
    }

    let active = true;
    setInventory(null);
    setEligibleCards([]);
    setEligibleResultKey("");
    setEligibleLoadError(false);
    setSelectedCard(null);
    setCardSearch("");
    setDebouncedCardSearch("");
    setEligiblePage(1);
    setLoadedUserId(null);
    setError("");
    setStatus("");
    setPendingProtectionRetry(null);
    setPendingUseRetry(null);
    setPendingFragmentsOperation(false);
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
        setPendingFragmentsOperation(
          pendingKeys.some((key) => pendingOperationRoute(key) === "fragments"),
        );
        let pendingUseFound = false;
        for (const suffix of pendingKeys) {
          const action = suffix.split(":");
          if (action[0] === "use" && isStoneKind(action[1])) {
            const kind = action[1];
            const userCardId = action.slice(2).join(":");
            pendingUseFound = true;
            setSelectedKind(kind);
            setPendingUseRetry({ kind, userCardId });
            void api
              .gachaOwnedCard(userCardId)
              .then(({ card }) => {
                if (active) setSelectedCard(card);
              })
              .catch(() => {
                if (active)
                  setError(
                    "Não foi possível carregar a carta da melhoria pendente.",
                  );
              });
            break;
          }
          if (
            action[0] === "buy" &&
            action[1] === "PROTECAO" &&
            Number.isInteger(Number(action[2]))
          ) {
            const retryQuantity = Number(action[2]);
            setProtectionQuantity(retryQuantity);
            setPendingProtectionRetry({ quantity: retryQuantity });
            break;
          }
        }

        if (!pendingUseFound && typeof window !== "undefined") {
          const queryStone = new URLSearchParams(window.location.search).get(
            "pedra",
          );
          if (isStoneKind(queryStone)) {
            setSelectedKind(queryStone);
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setLoadedUserId(user.id);
        setError(
          "Não foi possível carregar seu inventário. Tente atualizar a página.",
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
    if (!user || loadedUserId !== user.id) return;
    let active = true;
    const requestKey = currentEligibleRequestKey;
    void api
      .gachaCollection(
        user.id,
        eligiblePage,
        100,
        "value",
        "",
        "",
        debouncedCardSearch,
        selectedKind,
      )
      .then((result) => {
        if (!active || currentEligibleRequestKeyRef.current !== requestKey)
          return;
        setEligibleCards(result.data);
        setEligibleResultKey(
          `${user.id}:${selectedKind}:${eligiblePage}:${debouncedCardSearch}`,
        );
        setEligibleTotalPages(Math.max(1, result.meta.totalPages));
        setEligiblePage((page) =>
          Math.min(page, Math.max(1, result.meta.totalPages)),
        );
        setEligibleLoadError(false);
      })
      .catch(() => {
        if (active) {
          setEligibleLoadError(true);
          setError("Não foi possível atualizar as cartas elegíveis.");
        }
      });
    return () => {
      active = false;
    };
  }, [
    user,
    loadedUserId,
    eligiblePage,
    debouncedCardSearch,
    selectedKind,
    collectionRetry,
    currentEligibleRequestKey,
  ]);

  async function buyProtection(retryQuantity = protectionQuantity) {
    const retrying = pendingProtectionRetry?.quantity === retryQuantity;
    if (
      !user ||
      !inventory ||
      busyRef.current ||
      reconcileNeeded ||
      (pendingFragmentsOperation && !retrying) ||
      pendingUseRetry ||
      (pendingProtectionRetry &&
        retryQuantity !== pendingProtectionRetry.quantity) ||
      !Number.isInteger(retryQuantity) ||
      retryQuantity < 1
    )
      return;
    busyRef.current = true;
    const key = `buy:PROTECAO:${retryQuantity}`;
    const { operationId, storageKey } = getOrCreateOperationId(
      pendingOperations.current,
      user.id,
      key,
    );
    setBusy(key);
    setError("");
    setStatus("");
    try {
      await api.gachaEconomyBuyItem({
        operationId,
        kind: "PROTECAO",
        quantity: retryQuantity,
      });
      clearOperationId(pendingOperations.current, user.id, key, storageKey);
      setPendingProtectionRetry(null);
      setStatus("Operação concluída.");
      await refreshInventory()
        .then(() => setReconcileNeeded(false))
        .catch(() => {
          setReconcileNeeded(true);
          setError(
            "Operação concluída; saldos não atualizados. Atualize os saldos antes de outra ação.",
          );
        });
    } catch (cause) {
      setError(
        `${cause instanceof Error ? cause.message : "Falha na operação."} Se houve timeout, tente novamente sem alterar o tipo ou a quantidade.`,
      );
      if (
        !(cause instanceof ApiError) ||
        cause.statusCode >= 500 ||
        cause.statusCode === 408
      ) {
        setPendingProtectionRetry({ quantity: retryQuantity });
        await refreshInventory().catch(() => undefined);
      } else {
        clearOperationId(pendingOperations.current, user.id, key, storageKey);
        setPendingProtectionRetry(null);
      }
    } finally {
      setBusy("");
      busyRef.current = false;
    }
  }

  async function handleUseStone(retry = false) {
    if (!user) return;
    const action = retry
      ? pendingUseRetry
      : selectedCard
        ? { kind: selectedKind, userCardId: selectedCard.id }
        : null;
    if (
      !inventory ||
      !action ||
      busyRef.current ||
      reconcileNeeded ||
      (pendingFragmentsOperation && !retry) ||
      pendingProtectionRetry ||
      (pendingUseRetry && !retry)
    )
      return;
    busyRef.current = true;
    const key = `use:${action.kind}:${action.userCardId}`;
    const { operationId, storageKey } = getOrCreateOperationId(
      pendingOperations.current,
      user.id,
      key,
    );
    setBusy(key);
    setError("");
    try {
      await api.gachaEconomyUseItem({
        operationId,
        kind: action.kind,
        userCardId: action.userCardId,
      });
      clearOperationId(pendingOperations.current, user.id, key, storageKey);
      setPendingUseRetry(null);
      setSelectedCard(null);
      setStatus("Carta melhorada; saldos e coleção atualizados.");
      await refresh()
        .then(() => setReconcileNeeded(false))
        .catch(() => {
          setReconcileNeeded(true);
          setError(
            "Melhoria aplicada; saldos e coleção não atualizados. Atualize antes de outra ação.",
          );
        });
    } catch (cause) {
      if (
        !(cause instanceof ApiError) ||
        cause.statusCode >= 500 ||
        cause.statusCode === 408
      ) {
        setPendingUseRetry(action);
        setError(
          "Resultado incerto. Confirme novamente a mesma carta para repetir a operação com o mesmo identificador.",
        );
        await refresh().catch(() => undefined);
      } else {
        clearOperationId(pendingOperations.current, user.id, key, storageKey);
        setPendingProtectionRetry(null);
        setPendingUseRetry(null);
        setError(cause.message || "Falha ao melhorar a carta.");
      }
    } finally {
      setBusy("");
      busyRef.current = false;
    }
  }

  if (authLoading || loading || loadedUserId !== (user?.id ?? null)) {
    return <GachaPageSkeleton kind="inventory" />;
  }

  if (!user) {
    return (
      <main id="body-content" className="mx-auto max-w-shelf px-4 py-12">
        <div className="border border-hairline bg-panel p-6 sm:p-8">
          <p className="shelf-label">Gacha / Economia</p>
          <h1 className="font-display text-3xl text-snow">Inventário</h1>
          <p className="mt-3 text-body-sm text-mist">
            Entre para ver seus itens, essências, pedras e proteção.
          </p>
          <Link
            className="btn-ice mt-5 inline-flex min-h-11 items-center px-5"
            href="/entrar"
          >
            Entrar
          </Link>
        </div>
      </main>
    );
  }

  if (error && !inventory) {
    return (
      <main id="body-content" className="mx-auto max-w-shelf px-4 py-12">
        <div className="border border-signal/40 bg-panel p-6 sm:p-8">
          <p role="alert" className="text-body-sm text-signal">
            {error}
          </p>
          <button
            type="button"
            className="btn-ghost mt-4 min-h-11 px-4"
            onClick={() => setLoadTick((tick) => tick + 1)}
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  if (!inventory) return null;

  if (!inventory.itemConfig) {
    return (
      <main id="body-content" className="mx-auto max-w-shelf px-4 py-12">
        <GachaInventorySubnav active="inventory" stats={stats} />
        <div className="border border-hairline bg-panel p-6 sm:p-8">
          <h1 className="font-display text-3xl text-snow">
            Inventário temporariamente indisponível
          </h1>
          <p className="mt-3 text-body-sm text-mist">
            A configuração da economia ainda não está disponível. Atualize a
            página em instantes.
          </p>
          <button
            type="button"
            className="btn-ghost mt-5 min-h-11 px-4"
            onClick={() => setLoadTick((tick) => tick + 1)}
          >
            Atualizar
          </button>
        </div>
      </main>
    );
  }

  const config = inventory.itemConfig;
  const eligibleCardsForStone =
    eligibleResultKey === currentEligibleKey
      ? eligibleCards.filter((card) =>
          isCardEligibleForStone(card, selectedKind, config),
        )
      : [];

  const selectedNext = selectedCard
    ? nextConditionLabel(selectedCard.condition)
    : null;
  const afterCondition = selectedNext
    ? config.item_condition_anchor?.[
        selectedNext as keyof typeof config.item_condition_anchor
      ]
    : undefined;
  const afterValue =
    selectedCard && afterCondition != null
      ? upgradedValue(selectedCard, afterCondition, inventory)
      : null;

  const protectionPrice = config.item_shop_price?.PROTECAO ?? 0;
  const protectionReason =
    protectionPrice <= 0
      ? "Proteção indisponível para compra."
      : inventory.available < protectionPrice * protectionQuantity
        ? "Saldo de cristais insuficiente."
        : "";
  const protectionShopEnabled =
    config.item_shop_enabled?.PROTECAO ?? protectionPrice > 0;
  const validProtectionQuantity =
    Number.isSafeInteger(protectionQuantity) && protectionQuantity >= 1;

  return (
    <main
      id="body-content"
      className="gacha-inventory-page mx-auto max-w-shelf px-4 pb-16 pt-8"
    >
      <GachaInventorySubnav active="inventory" stats={stats} />

      {pendingFragmentsOperation && (
        <p
          role="status"
          className="mb-4 border border-ice/30 bg-panel p-3 text-body-sm text-mist"
        >
          Há uma operação de fragmentos pendente. Resolva-a antes de iniciar
          outra ação.{" "}
          <Link
            className="font-medium text-ice underline"
            href="/gacha/inventario/fragmentos"
          >
            Abrir fragmentos
          </Link>
        </p>
      )}

      <header className="gacha-inventory-hero mb-8 p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="shelf-label">Economia · Gacha</p>
            <h1 className="font-display text-3xl text-snow sm:text-4xl">
              Inventário
            </h1>
            <p className="mt-2.5 text-body-sm text-mist">
              Acompanhe seus saldos, abra essências, proteja rerolls e melhore
              suas cartas com pedras prontas sem alterar o foil.
            </p>
          </div>
          <Link
            href="/gacha/inventario/fragmentos"
            className="btn-ice gacha-fragment-action min-h-11 px-5"
          >
            Gerenciar fragmentos
          </Link>
        </div>
      </header>

      <section
        aria-label="Resumo dos saldos"
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8"
      >
        {[
          { label: "Cristais disponíveis", value: inventory.available },
          { label: "Cristais reservados", value: inventory.reserved },
          {
            label: "Caixas",
            value:
              inventory.commonBoxes +
              inventory.rareBoxes +
              inventory.premiumBoxes,
            detail: `${inventory.commonBoxes} comuns · ${inventory.rareBoxes} raras · ${inventory.premiumBoxes} premium`,
          },
          { label: "Chaves", value: inventory.keys },
          { label: "Resets", value: inventory.spinResets },
          {
            label: "Pedras prontas",
            value: stats?.totalReadyStones ?? 0,
          },
          {
            label: "Gemas de foil",
            value: stats?.totalFoilGems ?? 0,
          },
          { label: "Proteções", value: inventory.protecao },
        ].map(({ label, value, detail }) => (
          <div key={label} className="border border-hairline bg-panel p-4">
            <p className="text-xs text-mist">{label}</p>
            <p className="mt-2 font-mono text-xl tabular-nums text-snow">
              {value.toLocaleString("pt-BR")}
            </p>
            {detail && (
              <p className="mt-1 text-[10px] leading-4 text-mist">{detail}</p>
            )}
          </div>
        ))}
      </section>

      <section
        aria-labelledby="fragments-gateway-heading"
        className="gacha-inventory-gateway mb-8 p-5 sm:p-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-2">
              {GATEWAY_PREVIEWS.map((preview) => (
                <div
                  key={preview.key}
                  className="gacha-fragment-art h-12 w-12"
                  data-foil={preview.tone === "foil" ? preview.key : undefined}
                  data-stone={
                    preview.tone === "stone" ? preview.key : undefined
                  }
                >
                  <Image
                    src={preview.src}
                    alt=""
                    width={40}
                    height={40}
                    className="h-9 w-9 object-contain"
                  />
                </div>
              ))}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="fragments-gateway-heading"
                  className="font-display text-xl text-snow"
                >
                  Oficina de Fragmentos
                </h2>
                {stats && stats.totalCraftable > 0 && (
                  <span className="border border-ice/40 bg-ice/10 px-2 py-0.5 font-mono text-label text-ice">
                    {stats.totalCraftable.toLocaleString("pt-BR")} pronto(s)
                    para forjar
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-body-sm text-mist">
                Gerencie fragmentos e gemas de foil, converta excedentes em
                cristais e fabrique pedras de melhoria na página exclusiva.
              </p>
              {stats && (
                <p className="mt-2 font-mono text-caption tabular-nums text-snow">
                  {stats.totalFoilFragments.toLocaleString("pt-BR")} fragmentos
                  de foil · {stats.totalStoneFragments.toLocaleString("pt-BR")}{" "}
                  fragmentos de pedras
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/gacha/inventario/fragmentos"
              className="btn-ice gacha-fragment-action min-h-11 px-5"
            >
              Abrir oficina de fragmentos
            </Link>
          </div>
        </div>
      </section>

      <nav aria-label="Atalhos do gacha" className="mb-6 flex flex-wrap gap-2">
        <Link
          className="btn-ghost inline-flex min-h-11 items-center px-4"
          href="/gacha/inventario/fragmentos"
        >
          Fragmentos e gemas
        </Link>
        <Link
          className="btn-ghost inline-flex min-h-11 items-center px-4"
          href="/gacha/loja"
        >
          Ver caixas e probabilidades
        </Link>
        <Link
          className="btn-ghost inline-flex min-h-11 items-center px-4"
          href="/gacha/cartas"
        >
          Abrir coleção
        </Link>
      </nav>

      <GachaEssences
        inventory={inventory}
        refresh={refreshInventory}
        disabled={!!busy || reconcileNeeded || pendingFragmentsOperation}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section
          id="melhorar-carta"
          className="scroll-mt-6 border border-hairline bg-panel p-4 sm:p-6"
          aria-labelledby="upgrade-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-caption uppercase tracking-[0.16em] text-ice">
                Aprimoramento
              </p>
              <h2
                id="upgrade-heading"
                className="mt-1 font-display text-xl text-snow"
              >
                Melhorar uma carta
              </h2>
            </div>
            <Link
              href="/gacha/inventario/fragmentos#pedras"
              className="inline-flex min-h-11 items-center text-caption text-ice underline underline-offset-4"
            >
              Forjar mais pedras →
            </Link>
          </div>
          <p className="mt-2 text-sm text-mist">
            Escolha uma pedra pronta e aplique em uma carta elegível.
            Elegibilidade calculada pelas regras atuais da economia.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {STONE_FRAGMENTS.map((item) => {
              const readyCount = inventory[item.items];
              return (
                <button
                  key={item.kind}
                  type="button"
                  aria-pressed={selectedKind === item.kind}
                  disabled={!!pendingUseRetry}
                  onClick={() => {
                    if (selectedKind !== item.kind) {
                      setSelectedKind(item.kind);
                      setEligiblePage(1);
                      setEligibleCards([]);
                    }
                    setSelectedCard(null);
                    setStatus("");
                  }}
                  className={`gacha-fragment-stone-btn flex min-h-11 items-center justify-between gap-2 border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60 ${
                    selectedKind === item.kind
                      ? "border-ice bg-ice/10"
                      : "border-hairline bg-ink hover:border-ice/50"
                  }`}
                >
                  <span className="flex items-center gap-2 font-display text-sm text-snow">
                    {SHARD_ICONS[item.kind] && (
                      <BonusShardIcon kind={item.kind} className="h-5 w-5" />
                    )}
                    {item.label}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-ice">
                    {readyCount} prontas
                  </span>
                </button>
              );
            })}
          </div>

          <label
            className="mt-5 block text-sm text-mist"
            htmlFor="eligible-card"
          >
            Carta elegível para {stone.label}
          </label>
          <SearchField
            id="eligible-card-search"
            name="cardSearch"
            autoComplete="off"
            spellCheck={false}
            value={cardSearch}
            onChange={(event) => {
              setCardSearch(event.target.value);
              setEligiblePage(1);
            }}
            placeholder="Buscar por carta ou anime"
            aria-label="Buscar cartas"
            containerClassName="mt-2"
          />
          <select
            id="eligible-card"
            value={selectedCard?.id ?? ""}
            disabled={
              !!pendingUseRetry || eligibleResultKey !== currentEligibleKey
            }
            onChange={(event) =>
              setSelectedCard(
                eligibleCardsForStone.find(
                  (card) => card.id === event.target.value,
                ) ?? null,
              )
            }
            className="mt-2 h-11 w-full border border-hairline bg-ink px-3 text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60"
          >
            <option value="">Selecione uma carta</option>
            {selectedCard &&
              !eligibleCardsForStone.some(
                (card) => card.id === selectedCard.id,
              ) && (
                <option value={selectedCard.id}>
                  {selectedCard.card.name} · selecionada
                </option>
              )}
            {eligibleCardsForStone.map((card) => (
              <option key={card.id} value={card.id}>
                {card.card.name} ·{" "}
                {card.conditionLabel ?? gachaConditionLabel(card.condition)} ·{" "}
                {card.foil}
              </option>
            ))}
          </select>

          {eligibleResultKey !== currentEligibleKey ? (
            <p
              role="status"
              aria-live="polite"
              className="mt-3 text-sm text-mist"
            >
              Carregando cartas elegíveis…
            </p>
          ) : (
            eligibleCardsForStone.length === 0 && (
              <p className="mt-3 text-sm text-mist">
                {cardSearch.trim()
                  ? "Nenhuma carta elegível corresponde à busca."
                  : "Nenhuma carta elegível para esta pedra."}
              </p>
            )
          )}

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-mist">
            <span className="tabular-nums">
              {eligibleCardsForStone.length} cartas elegíveis · página{" "}
              {eligiblePage}/{eligibleTotalPages}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="btn-ghost min-h-11 px-3 disabled:opacity-50"
                disabled={
                  eligiblePage <= 1 ||
                  !!busy ||
                  eligibleResultKey !== currentEligibleKey
                }
                onClick={() => {
                  setEligibleCards([]);
                  setEligiblePage((page) => Math.max(1, page - 1));
                }}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn-ghost min-h-11 px-3 disabled:opacity-50"
                disabled={
                  eligiblePage >= eligibleTotalPages ||
                  !!busy ||
                  eligibleResultKey !== currentEligibleKey
                }
                onClick={() => {
                  setEligibleCards([]);
                  setEligiblePage((page) =>
                    Math.min(eligibleTotalPages, page + 1),
                  );
                }}
              >
                Próxima
              </button>
            </span>
          </div>

          {eligibleLoadError && (
            <p role="alert" className="mt-3 text-sm text-signal">
              Não foi possível atualizar as cartas elegíveis.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setEligibleLoadError(false);
                  setError("");
                  setCollectionRetry((retry) => retry + 1);
                }}
              >
                Tentar novamente
              </button>
            </p>
          )}

          {selectedCard && (
            <div className="mt-4 border border-hairline bg-ink p-4">
              <p className="font-display text-snow">{selectedCard.card.name}</p>
              <p className="mt-2 text-sm text-mist">
                Condição:{" "}
                {selectedCard.conditionLabel ??
                  gachaConditionLabel(selectedCard.condition)}{" "}
                → {selectedNext ?? "—"}
              </p>
              <p className="mt-1 text-sm text-mist">
                Valor:{" "}
                <span className="font-mono tabular-nums text-snow">
                  {selectedCard.value.toLocaleString("pt-BR")}
                </span>{" "}
                →{" "}
                <span className="font-mono tabular-nums text-ice">
                  {afterValue?.toLocaleString("pt-BR") ?? "indisponível"}
                </span>{" "}
                cristais
              </p>
              <p className="mt-1 text-sm text-mist">
                Foil mantido: {selectedCard.foil}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={
              !selectedCard ||
              !inventory[stone.items] ||
              !!busy ||
              afterValue == null ||
              reconcileNeeded ||
              (pendingFragmentsOperation && !pendingUseRetry) ||
              !!pendingProtectionRetry
            }
            onClick={() => setStatus("confirm-upgrade")}
            className="btn-ice gacha-fragment-action mt-4 min-h-11 w-full px-4 disabled:opacity-50"
          >
            Usar pedra
          </button>

          {!inventory[stone.items] && (
            <div className="mt-2 text-sm text-mist">
              <p>Fabrique ou obtenha uma pedra antes de melhorar uma carta.</p>
              <Link
                href="/gacha/inventario/fragmentos#pedras"
                className="mt-1 inline-flex min-h-11 items-center text-ice underline underline-offset-4"
              >
                Forjar pedras com fragmentos
              </Link>
            </div>
          )}

          <Link
            href="/gacha/cartas"
            className="mt-3 inline-flex min-h-11 items-center text-sm text-ice underline underline-offset-4"
          >
            Ver coleção completa
          </Link>
        </section>

        <section
          className="border border-hairline bg-panel p-4 sm:p-6"
          aria-labelledby="protection-heading"
        >
          <p className="font-mono text-caption uppercase tracking-[0.16em] text-ice">
            Consumível
          </p>
          <h2
            id="protection-heading"
            className="mt-2 font-display text-xl text-snow"
          >
            Proteção de reroll
          </h2>
          <p className="mt-2 text-sm text-mist">
            Usada ao refazer a condition de uma carta. Não pode ser fabricada
            nem convertida.
          </p>
          <p className="mt-5 border border-hairline bg-ink p-4 text-sm text-mist">
            No inventário:{" "}
            <strong className="font-mono text-lg tabular-nums text-snow">
              {inventory.protecao}
            </strong>
          </p>
          {config.item_drop_available?.PROTECAO === true ? (
            <p className="mt-4 text-sm text-ice">
              Disponível em loot boxes durante o piloto.
            </p>
          ) : config.item_drop_available?.PROTECAO === false ? (
            <p className="mt-4 text-sm text-mist">
              Nenhuma loot box ativa concede proteção agora.
            </p>
          ) : (
            <p className="mt-4 text-sm text-mist">
              Fonte em loot boxes indisponível para consulta.
            </p>
          )}
          <p className="mt-1 text-xs text-mist">
            <Link
              href="/gacha/loja#box-odds"
              className="text-ice underline underline-offset-4"
            >
              Ver probabilidades das caixas
            </Link>
          </p>
          {protectionShopEnabled ? (
            <div className="mt-5 border-t border-hairline pt-4">
              <label
                htmlFor="protection-quantity"
                className="block text-sm text-mist"
              >
                Quantidade
              </label>
              <input
                id="protection-quantity"
                type="number"
                min={1}
                max={2_147_483_647}
                step={1}
                disabled={
                  !!pendingProtectionRetry ||
                  !!pendingUseRetry ||
                  (pendingFragmentsOperation && !pendingProtectionRetry)
                }
                value={protectionQuantity}
                onChange={(event) =>
                  setProtectionQuantity(
                    Math.min(
                      2_147_483_647,
                      Math.max(1, Number(event.target.value) || 1),
                    ),
                  )
                }
                className="mt-2 h-11 w-full border border-hairline bg-ink px-3 font-mono tabular-nums text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void buyProtection(protectionQuantity)}
                disabled={
                  !validProtectionQuantity ||
                  !!busy ||
                  !!protectionReason ||
                  reconcileNeeded ||
                  !!pendingProtectionRetry ||
                  !!pendingUseRetry ||
                  (pendingFragmentsOperation && !pendingProtectionRetry)
                }
                className="btn-ghost gacha-fragment-action mt-3 min-h-11 w-full px-3 disabled:opacity-50"
              >
                Comprar proteção
              </button>
              <p className="mt-1 text-xs text-mist">
                {protectionReason ||
                  `${(protectionPrice * protectionQuantity).toLocaleString("pt-BR")} cristais · ${protectionPrice.toLocaleString("pt-BR")} cada`}
              </p>
            </div>
          ) : config.item_drop_available?.PROTECAO === true ? (
            <p className="mt-5 border-t border-hairline pt-4 text-sm text-mist">
              Compra direta pausada no piloto. Obtenha proteção em uma loot box.
            </p>
          ) : (
            <p className="mt-5 border-t border-hairline pt-4 text-sm text-signal">
              Compra direta pausada e nenhuma fonte ativa em loot boxes. A
              equipe precisa restaurar uma fonte antes de continuar.
            </p>
          )}
          <Link
            href="/gacha/cartas"
            className="mt-5 inline-flex min-h-11 items-center text-sm text-ice underline underline-offset-4"
          >
            Escolher carta para reroll
          </Link>
        </section>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-5 min-h-6 text-sm text-ice"
      >
        {status === "confirm-upgrade" ? "" : status}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-signal">
          {error}
        </p>
      )}
      {reconcileNeeded && (
        <button
          type="button"
          onClick={() =>
            void refresh()
              .then(() => {
                setReconcileNeeded(false);
                setError("");
              })
              .catch(() =>
                setError(
                  "Ainda não foi possível reconciliar saldos e coleção.",
                ),
              )
          }
          disabled={!!busy}
          className="btn-ghost mt-3 min-h-11 px-4 disabled:opacity-50"
        >
          Atualizar saldos e coleção
        </button>
      )}
      {pendingProtectionRetry && (
        <button
          type="button"
          onClick={() => void buyProtection(pendingProtectionRetry.quantity)}
          disabled={!!busy || reconcileNeeded || !!pendingUseRetry}
          className="btn-ghost mt-3 min-h-11 px-4 disabled:opacity-50"
        >
          Repetir a mesma operação com segurança
        </button>
      )}
      <ConfirmDialog
        open={status === "confirm-upgrade"}
        title="Confirmar melhoria?"
        confirmLabel={pendingUseRetry ? "Repetir com segurança" : "Usar pedra"}
        busyLabel="Melhorando…"
        busy={busy.startsWith("use:")}
        onCancel={() => setStatus("")}
        onConfirm={() => void handleUseStone(!!pendingUseRetry)}
      >
        {selectedCard && (
          <p className="mt-4 text-body-sm text-mist">
            Consumir 1 pedra {stone.label} para melhorar{" "}
            {selectedCard.card.name}:{" "}
            {selectedCard.conditionLabel ??
              gachaConditionLabel(selectedCard.condition)}{" "}
            para {selectedNext}. O foil {selectedCard.foil} será mantido.
          </p>
        )}
      </ConfirmDialog>
      {pendingUseRetry && status !== "confirm-upgrade" && (
        <button
          type="button"
          onClick={() => void handleUseStone(true)}
          disabled={!!busy || reconcileNeeded}
          className="btn-ghost mt-3 min-h-11 px-4 disabled:opacity-50"
        >
          Repetir a mesma melhoria com segurança
        </button>
      )}
    </main>
  );
}
