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
import Link from "next/link";
import { gachaConditionLabel } from "@/components/gacha/GachaCard";
import {
  FoilExtractDialog,
  FoilExtractFeedback,
} from "@/components/gacha/FoilExtractDialog";
import { SearchField } from "@/components/ui/SearchField";
import { api } from "@/lib/api";
import { getFoilDisplayMeta } from "@/lib/gacha-inventory";
import type {
  GachaEconomyInventory,
  GachaFoilExtractPreview,
  GachaFoilExtractResult,
  GachaPull,
} from "@/types";

export interface PendingFoilExtractRetry {
  userCardId: string;
}

export function GachaFoilExtractor({
  userId,
  inventory,
  busy,
  tryBeginBusy,
  endBusy,
  pendingOperations,
  pendingExtractRetry,
  setPendingExtractRetry,
  lockedByOtherAction,
  reconcileNeeded,
  setReconcileNeeded,
  collectionVersion,
  onExtractComplete,
}: {
  userId: string;
  inventory: GachaEconomyInventory;
  busy: string;
  tryBeginBusy: (key: string) => boolean;
  endBusy: () => void;
  pendingOperations: RefObject<Map<string, string>>;
  pendingExtractRetry: PendingFoilExtractRetry | null;
  setPendingExtractRetry: Dispatch<
    SetStateAction<PendingFoilExtractRetry | null>
  >;
  lockedByOtherAction: boolean;
  reconcileNeeded: boolean;
  setReconcileNeeded: (value: boolean) => void;
  collectionVersion: number;
  onExtractComplete: () => Promise<void>;
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

  const [selectedPreview, setSelectedPreview] =
    useState<GachaFoilExtractPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    result: GachaFoilExtractResult;
    updatedCard: GachaPull;
  } | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const currentEligibleKey = `${userId}:${eligiblePage}:${cardSearch}`;
  const currentEligibleRequestKey = `${userId}:${eligiblePage}:${debouncedCardSearch}`;
  const currentEligibleRequestKeyRef = useRef(currentEligibleRequestKey);
  useLayoutEffect(() => {
    currentEligibleRequestKeyRef.current = currentEligibleRequestKey;
  }, [currentEligibleRequestKey]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCardSearch(cardSearch), 250);
    return () => clearTimeout(timer);
  }, [cardSearch]);

  useEffect(() => {
    if (!pendingExtractRetry) return;
    if (selectedCard?.id === pendingExtractRetry.userCardId) return;
    let active = true;
    void api
      .gachaOwnedCard(pendingExtractRetry.userCardId)
      .then(({ card }) => {
        if (active) setSelectedCard(card);
      })
      .catch(() => {
        if (active) {
          setError(
            "Não foi possível carregar a carta da extração pendente.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [pendingExtractRetry, selectedCard?.id]);

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
        "EXTRATOR_FOIL",
      )
      .then((result) => {
        if (!active || currentEligibleRequestKeyRef.current !== requestKey) {
          return;
        }
        setEligibleCards(result.data);
        setEligibleResultKey(
          `${userId}:${eligiblePage}:${debouncedCardSearch}`,
        );
        setEligibleTotalPages(Math.max(1, result.meta.totalPages));
        setEligiblePage((page) =>
          Math.min(page, Math.max(1, result.meta.totalPages)),
        );
        setEligibleLoadError(false);
      })
      .catch(() => {
        if (active) setEligibleLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [
    userId,
    eligiblePage,
    debouncedCardSearch,
    collectionRetry,
    collectionVersion,
    currentEligibleRequestKey,
  ]);

  const selectedCardId = selectedCard?.id ?? "";
  useEffect(() => {
    if (!selectedCardId) {
      setSelectedPreview(null);
      setPreviewError("");
      setPreviewLoading(false);
      return;
    }
    let active = true;
    setPreviewLoading(true);
    setPreviewError("");
    void api
      .gachaEconomyFoilExtractPreview(selectedCardId)
      .then((nextPreview) => {
        if (active) setSelectedPreview(nextPreview);
      })
      .catch((cause) => {
        if (!active) return;
        setSelectedPreview(null);
        setPreviewError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível consultar a prévia da extração.",
        );
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCardId, inventory.foilExtractors]);

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
        "EXTRATOR_FOIL",
      );
      if (currentEligibleRequestKeyRef.current !== requestKey) return false;
      setEligibleCards(result.data);
      setEligibleResultKey(`${userId}:${eligiblePage}:${debouncedCardSearch}`);
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
  }, [userId, eligiblePage, debouncedCardSearch, currentEligibleRequestKey]);

  const foilCards =
    eligibleResultKey === currentEligibleKey
      ? eligibleCards.filter((card) => card.foil !== "NORMAL")
      : [];
  const extractorsAvailable = inventory.foilExtractors ?? 0;

  return (
    <section
      id="extrair-foil"
      aria-labelledby="foil-extractor-heading"
      className="mb-10 scroll-mt-6 border border-hairline bg-panel p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-mono text-caption uppercase tracking-[0.16em] text-ice">
            Extrator de Foil
          </p>
          <h2
            id="foil-extractor-heading"
            className="mt-1 font-display text-2xl text-snow"
          >
            Extrair foil para fragmentos
          </h2>
          <p className="mt-2 text-body-sm text-mist">
            Consome 1 Extrator de Foil para remover o foil de uma carta da sua
            coleção, preservando raridade, condition, edição e skin, e converte
            o foil em fragmentos da gema correspondente.
          </p>
        </div>

        <div className="border border-hairline bg-ink/80 px-4 py-3 text-right">
          <p className="text-xs text-mist">Extratores disponíveis</p>
          <p className="mt-1 font-mono text-xl tabular-nums text-snow">
            {extractorsAvailable}
          </p>
          {extractorsAvailable < 1 && (
            <Link
              href="/gacha/inventario#extrator-foil"
              className="mt-1 inline-flex min-h-11 items-center text-xs text-ice underline underline-offset-4"
            >
              Comprar no inventário
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[18rem]">
          <SearchField
            id="extract-card-search"
            name="extractCardSearch"
            autoComplete="off"
            spellCheck={false}
            value={cardSearch}
            onChange={(event) => {
              setCardSearch(event.target.value);
              setEligiblePage(1);
            }}
            placeholder="Buscar carta com foil"
            aria-label="Buscar cartas com foil"
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

        <span className="inline-flex items-center gap-2 text-xs text-mist">
          <span>
            Página {eligiblePage} de {eligibleTotalPages}
          </span>
          <button
            type="button"
            aria-label="Página anterior de cartas com foil"
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
            aria-label="Próxima página de cartas com foil"
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
          className="mt-4 text-xs text-mist"
        >
          Carregando cartas com foil…
        </p>
      ) : foilCards.length === 0 ? (
        <p className="mt-4 text-xs text-mist">
          {cardSearch.trim()
            ? "Nenhuma carta com foil corresponde à busca."
            : "Nenhuma carta com foil encontrada na coleção."}
        </p>
      ) : (
        <div
          role="group"
          aria-label="Cartas com foil para extração"
          className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {foilCards.map((card) => {
            const active = selectedCard?.id === card.id;
            const foilMeta = getFoilDisplayMeta(card.foil);
            return (
              <button
                key={card.id}
                type="button"
                aria-pressed={active}
                disabled={
                  !!busy ||
                  !!pendingExtractRetry ||
                  lockedByOtherAction ||
                  reconcileNeeded
                }
                onClick={() => {
                  setError("");
                  setStatus("");
                  setSelectedCard(card);
                }}
                className={`min-h-11 border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-50 ${
                  active
                    ? "border-ice bg-ice/10 text-snow"
                    : "border-hairline bg-ink/70 text-mist hover:border-ice/40 hover:text-snow"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-base text-snow">
                    {card.card.name}
                  </span>
                  <span className="shrink-0 border border-ice/40 bg-ice/10 px-2 py-0.5 font-mono text-[11px] text-ice">
                    {foilMeta.label}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-mist">
                  {card.card.rarity} ·{" "}
                  {card.conditionLabel ?? gachaConditionLabel(card.condition)} ·
                  #{card.edition} · {card.value.toLocaleString("pt-BR")}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {selectedCard && (
        <div className="mt-4 border border-hairline bg-ink/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-display text-lg text-snow">
                {selectedPreview?.cardName ?? selectedCard.card.name}
              </p>
              {previewLoading ? (
                <p className="text-xs text-mist">
                  Consultando prévia autoritativa…
                </p>
              ) : selectedPreview ? (
                <>
                  <p className="text-sm text-mist">
                    Foil removido:{" "}
                    <strong className="text-snow">
                      {getFoilDisplayMeta(selectedPreview.currentFoil).label}
                    </strong>{" "}
                    · Fragmentos:{" "}
                    <strong className="font-mono text-ice">
                      {selectedPreview.fragments
                        ? `+${selectedPreview.fragments.quantity} ${selectedPreview.fragments.itemName}`
                        : "Indisponível"}
                    </strong>
                  </p>
                  <p className="font-mono text-xs text-mist">
                    Valor:{" "}
                    {selectedPreview.currentValue.toLocaleString("pt-BR")} →{" "}
                    {selectedPreview.projectedValue.toLocaleString("pt-BR")} ·
                    Extratores: {selectedPreview.extractorsAvailable}
                  </p>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={
                !!busy ||
                reconcileNeeded ||
                lockedByOtherAction ||
                previewLoading ||
                !!previewError ||
                (selectedPreview ? !selectedPreview.canExtract : true)
              }
              className="btn-ice min-h-11 px-5 text-caption disabled:opacity-50"
            >
              {pendingExtractRetry
                ? "Repetir extração com segurança"
                : "Extrair foil"}
            </button>
          </div>

          {selectedPreview?.blockedReason && (
            <p role="alert" className="mt-3 text-sm text-signal">
              {selectedPreview.blockedReason}
            </p>
          )}

          {previewError && (
            <p role="alert" className="mt-3 text-sm text-signal">
              {previewError}
            </p>
          )}
        </div>
      )}

      {eligibleLoadError && (
        <p role="alert" className="mt-3 text-sm text-signal">
          Não foi possível atualizar as cartas com foil.{" "}
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

      {status && (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-sm text-ice"
        >
          {status}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-signal">
          {error}
        </p>
      )}

      {reconcileNeeded && (
        <button
          type="button"
          onClick={() =>
            void Promise.all([onExtractComplete(), refreshEligibleCards()])
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

      <FoilExtractDialog
        open={dialogOpen}
        card={selectedCard}
        userId={userId}
        inventory={inventory}
        busy={busy}
        tryBeginBusy={tryBeginBusy}
        endBusy={endBusy}
        pendingOperations={pendingOperations}
        lockedByOtherAction={lockedByOtherAction && !pendingExtractRetry}
        reconcileNeeded={reconcileNeeded}
        onClose={() => setDialogOpen(false)}
        onExtracted={async (result, updatedCard) => {
          setPendingExtractRetry(null);
          setDialogOpen(false);
          setSelectedCard(null);
          setSelectedPreview(null);
          setFeedback({ result, updatedCard });
          setStatus("Foil extraído; fragmentos e coleção atualizados.");
          try {
            const [, synced] = await Promise.all([
              onExtractComplete(),
              refreshEligibleCards(),
            ]);
            if (!synced) {
              throw new Error("A coleção mudou durante a atualização.");
            }
            setReconcileNeeded(false);
          } catch {
            setReconcileNeeded(true);
            setError(
              "Foil extraído; saldos e coleção não atualizados. Atualize antes de outra ação.",
            );
          }
        }}
      />

      <FoilExtractFeedback
        feedback={feedback}
        onClose={() => setFeedback(null)}
        showFragmentsLink={false}
      />
    </section>
  );
}
