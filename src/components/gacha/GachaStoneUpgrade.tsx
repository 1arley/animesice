"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SearchField } from "@/components/ui/SearchField";
import { api, ApiError } from "@/lib/api";
import {
  clearOperationId,
  gachaConditionLabel,
  getOrCreateOperationId,
  isCardEligibleForStone,
  nextConditionLabel,
  STONE_FRAGMENTS,
  upgradedValue,
  type StoneKind,
} from "@/lib/gacha-inventory";
import type { GachaEconomyInventory, GachaPull } from "@/types";

export interface PendingStoneUseRetry {
  kind: StoneKind;
  userCardId: string;
}

export function GachaStoneUpgrade({
  userId,
  inventory,
  selectedKind,
  onSelectKind,
  busy,
  tryBeginBusy,
  endBusy,
  pendingOperations,
  pendingUseRetry,
  setPendingUseRetry,
  lockedByOtherAction,
  reconcileNeeded,
  setReconcileNeeded,
  collectionVersion,
  onUpgradeComplete,
}: {
  userId: string;
  inventory: GachaEconomyInventory;
  selectedKind: StoneKind;
  onSelectKind: (kind: StoneKind) => void;
  busy: string;
  tryBeginBusy: (key: string) => boolean;
  endBusy: () => void;
  pendingOperations: RefObject<Map<string, string>>;
  pendingUseRetry: PendingStoneUseRetry | null;
  setPendingUseRetry: Dispatch<SetStateAction<PendingStoneUseRetry | null>>;
  lockedByOtherAction: boolean;
  reconcileNeeded: boolean;
  setReconcileNeeded: (value: boolean) => void;
  collectionVersion: number;
  onUpgradeComplete: () => Promise<void>;
}) {
  const [eligibleCards, setEligibleCards] = useState<GachaPull[]>([]);
  const [eligibleResultKey, setEligibleResultKey] = useState("");
  const [eligiblePage, setEligiblePage] = useState(1);
  const [eligibleTotalPages, setEligibleTotalPages] = useState(1);
  const [selectedCard, setSelectedCard] = useState<GachaPull | null>(null);
  const [cardSearch, setCardSearch] = useState("");
  const [debouncedCardSearch, setDebouncedCardSearch] = useState("");
  const [collectionRetry, setCollectionRetry] = useState(0);
  const [eligibleLoadError, setEligibleLoadError] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const stone =
    STONE_FRAGMENTS.find((entry) => entry.kind === selectedKind) ??
    STONE_FRAGMENTS[0]!;
  const currentEligibleKey = `${userId}:${selectedKind}:${eligiblePage}:${cardSearch}`;
  const currentEligibleRequestKey = `${userId}:${selectedKind}:${eligiblePage}:${debouncedCardSearch}`;
  const currentEligibleRequestKeyRef = useRef(currentEligibleRequestKey);
  useLayoutEffect(() => {
    currentEligibleRequestKeyRef.current = currentEligibleRequestKey;
  }, [currentEligibleRequestKey]);

  const prevKindRef = useRef(selectedKind);
  useEffect(() => {
    if (prevKindRef.current === selectedKind) return;
    prevKindRef.current = selectedKind;
    setEligiblePage(1);
    setEligibleCards([]);
    setStatus("");
    if (!pendingUseRetry || pendingUseRetry.kind !== selectedKind) {
      setSelectedCard(null);
    }
  }, [selectedKind, pendingUseRetry]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCardSearch(cardSearch), 250);
    return () => clearTimeout(timer);
  }, [cardSearch]);

  useEffect(() => {
    if (!pendingUseRetry) return;
    if (selectedCard?.id === pendingUseRetry.userCardId) return;
    let active = true;
    void api
      .gachaOwnedCard(pendingUseRetry.userCardId)
      .then(({ card }) => {
        if (active) setSelectedCard(card);
      })
      .catch(() => {
        if (active) {
          setError("Não foi possível carregar a carta da melhoria pendente.");
        }
      });
    return () => {
      active = false;
    };
  }, [pendingUseRetry, selectedCard?.id]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const requestKey = currentEligibleRequestKey;
    void api
      .gachaCollection(
        userId,
        eligiblePage,
        100,
        "value",
        "",
        "",
        debouncedCardSearch,
        selectedKind,
      )
      .then((result) => {
        if (!active || currentEligibleRequestKeyRef.current !== requestKey) {
          return;
        }
        setEligibleCards(result.data);
        setEligibleResultKey(
          `${userId}:${selectedKind}:${eligiblePage}:${debouncedCardSearch}`,
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
        }
      });
    return () => {
      active = false;
    };
  }, [
    userId,
    eligiblePage,
    debouncedCardSearch,
    selectedKind,
    collectionRetry,
    collectionVersion,
    currentEligibleRequestKey,
  ]);

  const refreshEligibleCards = useCallback(async () => {
    if (!userId) return false;
    try {
      const requestKey = currentEligibleRequestKey;
      const result = await api.gachaCollection(
        userId,
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
        `${userId}:${selectedKind}:${eligiblePage}:${debouncedCardSearch}`,
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
    userId,
    eligiblePage,
    debouncedCardSearch,
    selectedKind,
    currentEligibleRequestKey,
  ]);

  async function handleUseStone(retry = false) {
    const action = retry
      ? pendingUseRetry
      : selectedCard
        ? { kind: selectedKind, userCardId: selectedCard.id }
        : null;
    if (
      !action ||
      reconcileNeeded ||
      (lockedByOtherAction && !retry) ||
      (pendingUseRetry && !retry)
    ) {
      return;
    }
    const key = `use:${action.kind}:${action.userCardId}`;
    if (!tryBeginBusy(key)) return;
    const { operationId, storageKey } = getOrCreateOperationId(
      pendingOperations.current,
      userId,
      key,
    );
    setError("");
    try {
      await api.gachaEconomyUseItem({
        operationId,
        kind: action.kind,
        userCardId: action.userCardId,
      });
      clearOperationId(pendingOperations.current, userId, key, storageKey);
      setPendingUseRetry(null);
      setSelectedCard(null);
      setStatus("Carta melhorada; saldos e coleção atualizados.");
      await Promise.all([
        onUpgradeComplete(),
        refreshEligibleCards().then((synced) => {
          if (!synced) {
            throw new Error("A coleção mudou durante a atualização.");
          }
        }),
      ])
        .then(() => setReconcileNeeded(false))
        .catch(() => {
          setReconcileNeeded(true);
          setError(
            "Melhoria aplicada; saldos e coleção não atualizados. Atualize antes de outra ação.",
          );
        });
    } catch (cause) {
      setStatus("");
      if (
        !(cause instanceof ApiError) ||
        cause.statusCode >= 500 ||
        cause.statusCode === 408
      ) {
        setPendingUseRetry(action);
        setError(
          "Resultado incerto. Confirme novamente a mesma carta para repetir a operação com o mesmo identificador.",
        );
        await Promise.all([
          onUpgradeComplete(),
          refreshEligibleCards(),
        ]).catch(() => undefined);
      } else {
        clearOperationId(pendingOperations.current, userId, key, storageKey);
        setPendingUseRetry(null);
        setError(cause.message || "Falha ao melhorar a carta.");
      }
    } finally {
      endBusy();
    }
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

  return (
    <div
      id="melhorar-carta"
      className="mt-6 scroll-mt-6 border border-hairline bg-ink/80 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="upgrade-heading" className="font-display text-lg text-snow">
            Melhorar uma carta
          </h3>
          <p className="mt-1 text-caption text-mist">
            Escolha uma pedra pronta e aplique em uma carta elegível sem alterar
            o foil.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[18rem]">
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
            containerClassName="flex-1"
          />
          {cardSearch && (
            <button
              type="button"
              onClick={() => {
                setCardSearch("");
                setEligiblePage(1);
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
          <label htmlFor="upgrade-stone" className="block text-sm text-mist">
            Pedra
          </label>
          <select
            id="upgrade-stone"
            value={selectedKind}
            disabled={!!busy || !!pendingUseRetry || lockedByOtherAction}
            onChange={(event) =>
              onSelectKind(event.target.value as StoneKind)
            }
            className="mt-2 h-11 w-full border border-hairline bg-ink px-3 text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60"
          >
            {STONE_FRAGMENTS.map((item) => (
              <option key={item.kind} value={item.kind}>
                {item.label} · {inventory[item.items]} pronta(s)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="eligible-card" className="block text-sm text-mist">
            Carta elegível para {stone.label}
          </label>
          <select
            id="eligible-card"
            value={selectedCard?.id ?? ""}
            disabled={
              !!busy ||
              !!pendingUseRetry ||
              eligibleResultKey !== currentEligibleKey
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
            <option value="">
              {eligibleResultKey !== currentEligibleKey
                ? "Carregando cartas…"
                : eligibleCardsForStone.length
                  ? "Selecione uma carta"
                  : "Nenhuma carta elegível"}
            </option>
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
        </div>

        <button
          type="button"
          disabled={
            !selectedCard ||
            !inventory[stone.items] ||
            !!busy ||
            afterValue == null ||
            reconcileNeeded ||
            (lockedByOtherAction && !pendingUseRetry)
          }
          onClick={() => setStatus("confirm-upgrade")}
          className="btn-ice gacha-fragment-action min-h-11 px-4 disabled:opacity-50"
        >
          Usar pedra
        </button>
      </div>

      {selectedCard && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-ice/25 bg-panel px-4 py-3 text-body-sm">
          <div className="flex items-center gap-3">
            <div
              className="gacha-fragment-art h-11 w-11 shrink-0"
              data-stone={stone.kind}
            >
              <Image
                src={stone.image}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            </div>
            <div>
              <p className="font-display text-snow">{selectedCard.card.name}</p>
              <p className="mt-0.5 text-caption text-mist">
                Condição:{" "}
                {selectedCard.conditionLabel ??
                  gachaConditionLabel(selectedCard.condition)}{" "}
                → {selectedNext ?? "—"} · Valor:{" "}
                <span className="font-mono tabular-nums text-snow">
                  {selectedCard.value.toLocaleString("pt-BR")}
                </span>{" "}
                →{" "}
                <span className="font-mono tabular-nums text-ice">
                  {afterValue?.toLocaleString("pt-BR") ?? "indisponível"}
                </span>{" "}
                cristais
              </p>
            </div>
          </div>
          <p className="font-mono text-caption text-ice">
            Foil mantido: {selectedCard.foil}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-mist">
        <span className="tabular-nums">
          {eligibleCardsForStone.length} cartas elegíveis · página{" "}
          {eligiblePage}/{eligibleTotalPages}
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            aria-label="Página anterior de cartas elegíveis"
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
            aria-label="Próxima página de cartas elegíveis"
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

      {eligibleResultKey !== currentEligibleKey ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-xs text-mist"
        >
          Carregando cartas elegíveis…
        </p>
      ) : (
        eligibleCardsForStone.length === 0 && (
          <p className="mt-3 text-xs text-mist">
            {cardSearch.trim()
              ? "Nenhuma carta elegível corresponde à busca."
              : "Nenhuma carta elegível para esta pedra."}
          </p>
        )
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-mist">
        <span>
          {!inventory[stone.items]
            ? `Fabrique uma pedra de ${stone.label} acima antes de melhorar uma carta.`
            : "O foil atual da carta é preservado após a melhoria."}
        </span>
        <Link
          href="/gacha/cartas"
          className="inline-flex min-h-11 items-center text-ice underline underline-offset-4"
        >
          Ver coleção completa
        </Link>
      </div>

      {eligibleLoadError && (
        <p role="alert" className="mt-3 text-sm text-signal">
          Não foi possível atualizar as cartas elegíveis.{" "}
          <button
            type="button"
            className="inline-flex min-h-11 items-center px-1 underline"
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

      <p
        role="status"
        aria-live="polite"
        className="mt-3 min-h-5 text-sm text-ice"
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
            void Promise.all([onUpgradeComplete(), refreshEligibleCards()])
              .then(([, synced]) => {
                if (!synced) {
                  setError("A coleção mudou durante a atualização.");
                  return;
                }
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
    </div>
  );
}
