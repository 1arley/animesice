"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { Modal } from "@/components/common/Modal";
import {
  GachaCard,
  gachaConditionLabel,
} from "@/components/gacha/GachaCard";
import { api, ApiError } from "@/lib/api";
import {
  applyFoilExtractionToPull,
  clearOperationId,
  getFoilDisplayMeta,
  getOrCreateOperationId,
  readPendingOperationKeys,
} from "@/lib/gacha-inventory";
import type {
  GachaEconomyInventory,
  GachaFoilExtractPreview,
  GachaFoilExtractResult,
  GachaPull,
} from "@/types";

export interface FoilExtractDialogProps {
  open: boolean;
  card: GachaPull | null;
  userId: string;
  inventory?: GachaEconomyInventory | null;
  onClose: () => void;
  onExtracted: (
    result: GachaFoilExtractResult,
    updatedCard: GachaPull,
  ) => void | Promise<void>;
  pendingOperations?: RefObject<Map<string, string>>;
  tryBeginBusy?: (key: string) => boolean;
  endBusy?: () => void;
  busy?: string;
  lockedByOtherAction?: boolean;
  reconcileNeeded?: boolean;
}

export function FoilExtractDialog({
  open,
  card,
  userId,
  inventory,
  onClose,
  onExtracted,
  pendingOperations,
  tryBeginBusy,
  endBusy,
  busy = "",
  lockedByOtherAction = false,
  reconcileNeeded = false,
}: FoilExtractDialogProps) {
  const localOperations = useRef(new Map<string, string>());
  const opMapRef = pendingOperations ?? localOperations;
  const submittingRef = useRef(false);

  const [preview, setPreview] = useState<GachaFoilExtractPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uncertainRetry, setUncertainRetry] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const cardId = card?.id ?? "";
  const opKey = cardId ? `foil-extract:${cardId}` : "";

  const loadPreview = useCallback(async () => {
    if (!cardId) return;
    setLoadingPreview(true);
    setPreviewError("");
    try {
      const nextPreview = await api.gachaEconomyFoilExtractPreview(cardId);
      setPreview(nextPreview);
    } catch (cause) {
      setPreview(null);
      setPreviewError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar a prévia da extração.",
      );
    } finally {
      setLoadingPreview(false);
    }
  }, [cardId]);

  useEffect(() => {
    if (!open || !cardId) {
      setPreview(null);
      setPreviewError("");
      setSubmitError("");
      setUncertainRetry(false);
      return;
    }

    let active = true;
    const hasPending = readPendingOperationKeys(userId).includes(opKey);
    setUncertainRetry(hasPending);
    setSubmitError("");
    setLoadingPreview(true);
    setPreviewError("");

    void api
      .gachaEconomyFoilExtractPreview(cardId)
      .then((nextPreview) => {
        if (!active) return;
        setPreview(nextPreview);
      })
      .catch((cause) => {
        if (!active) return;
        setPreview(null);
        setPreviewError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar a prévia da extração.",
        );
      })
      .finally(() => {
        if (active) setLoadingPreview(false);
      });

    return () => {
      active = false;
    };
  }, [open, cardId, userId, opKey, reloadTick]);

  const busyElsewhere =
    Boolean(busy && busy !== opKey) || (lockedByOtherAction && !uncertainRetry);
  const canConfirm =
    !loadingPreview &&
    !previewError &&
    !submitting &&
    !busyElsewhere &&
    !reconcileNeeded &&
    Boolean(card) &&
    Boolean(preview?.canExtract) &&
    Boolean(preview?.fragments);

  async function handleConfirm() {
    if (
      !card ||
      !opKey ||
      submittingRef.current ||
      loadingPreview ||
      !preview?.canExtract ||
      reconcileNeeded ||
      busyElsewhere
    ) {
      return;
    }
    if (tryBeginBusy && !tryBeginBusy(opKey)) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");

    const { operationId, storageKey } = getOrCreateOperationId(
      opMapRef.current,
      userId,
      opKey,
    );

    try {
      const result = await api.gachaEconomyExtractFoil({
        operationId,
        userCardId: card.id,
      });
      clearOperationId(opMapRef.current, userId, opKey, storageKey);
      setUncertainRetry(false);
      const updatedCard = applyFoilExtractionToPull(card, result);
      await onExtracted(result, updatedCard);
    } catch (cause) {
      if (
        !(cause instanceof ApiError) ||
        cause.statusCode >= 500 ||
        cause.statusCode === 408
      ) {
        setUncertainRetry(true);
        setSubmitError(
          "Resultado incerto. Tente novamente com segurança — o identificador da operação foi preservado para evitar duplicação.",
        );
      } else {
        clearOperationId(opMapRef.current, userId, opKey, storageKey);
        setUncertainRetry(false);
        setSubmitError(
          cause.message || "Não foi possível extrair o foil desta carta.",
        );
      }
      await loadPreview().catch(() => undefined);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      endBusy?.();
    }
  }

  const displayFoil = preview?.currentFoil ?? card?.foil ?? "NORMAL";
  const foilMeta = getFoilDisplayMeta(displayFoil);
  const extractorsAvailable =
    preview?.extractorsAvailable ?? inventory?.foilExtractors ?? 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Extrair foil da carta?"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-ghost min-h-11 px-4 text-caption disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm}
            className="btn-ice min-h-11 px-5 text-caption disabled:opacity-50"
          >
            {submitting
              ? "Extraindo…"
              : loadingPreview
                ? "Carregando prévia…"
                : uncertainRetry
                  ? "Repetir com segurança"
                  : "Confirmar extração"}
          </button>
        </div>
      }
    >
      {card && (
        <div className="space-y-4">
          <div className="border border-hairline bg-ink/80 p-3.5">
            <p className="font-display text-base text-snow">
              {preview?.cardName ?? card.card.name}
            </p>
            <p className="mt-1 font-mono text-xs text-mist">
              {preview?.rarity ?? card.card.rarity} ·{" "}
              {preview?.conditionLabel ??
                card.conditionLabel ??
                gachaConditionLabel(card.condition)}{" "}
              · #{preview?.edition ?? card.edition}
            </p>
          </div>

          {loadingPreview && (
            <p role="status" aria-live="polite" className="text-sm text-mist">
              Carregando prévia autoritativa da extração…
            </p>
          )}

          {previewError && (
            <div
              role="alert"
              className="border border-signal/40 bg-signal/10 p-3.5 text-sm text-signal"
            >
              <p>{previewError}</p>
              <button
                type="button"
                onClick={() => setReloadTick((tick) => tick + 1)}
                disabled={submitting}
                className="btn-ghost mt-3 min-h-11 px-4 text-caption"
              >
                Tentar carregar prévia
              </button>
            </div>
          )}

          {preview && !loadingPreview && (
            <>
              <dl className="grid gap-2.5 sm:grid-cols-2">
                <div className="border border-hairline bg-ink/70 p-3">
                  <dt className="text-xs text-mist">Foil removido</dt>
                  <dd className="mt-1 font-mono text-sm text-snow">
                    {foilMeta.label} → Normal
                  </dd>
                </div>

                <div className="border border-hairline bg-ink/70 p-3">
                  <dt className="text-xs text-mist">Fragmentos obtidos</dt>
                  <dd className="mt-1 flex items-center gap-2 font-mono text-sm text-ice">
                    {foilMeta.image && (
                      <Image
                        src={foilMeta.image}
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 shrink-0 object-contain"
                      />
                    )}
                    <span>
                      {preview.fragments
                        ? `+${preview.fragments.quantity} ${preview.fragments.itemName}`
                        : "Indisponível"}
                    </span>
                  </dd>
                </div>

                <div className="border border-hairline bg-ink/70 p-3">
                  <dt className="text-xs text-mist">Extratores disponíveis</dt>
                  <dd className="mt-1 font-mono text-sm tabular-nums text-snow">
                    {extractorsAvailable}{" "}
                    <span className="text-xs text-mist">
                      (restarão {Math.max(0, extractorsAvailable - 1)})
                    </span>
                  </dd>
                </div>

                <div className="border border-hairline bg-ink/70 p-3">
                  <dt className="text-xs text-mist">Valor da carta</dt>
                  <dd className="mt-1 font-mono text-sm tabular-nums text-snow">
                    {preview.currentValue.toLocaleString("pt-BR")} →{" "}
                    {preview.projectedValue.toLocaleString("pt-BR")}
                  </dd>
                  {preview.projectedRankedValue !==
                    preview.currentRankedValue && (
                    <p className="mt-1 font-mono text-[11px] text-mist">
                      Ranking:{" "}
                      {preview.currentRankedValue.toLocaleString("pt-BR")} →{" "}
                      {preview.projectedRankedValue.toLocaleString("pt-BR")} pts
                    </p>
                  )}
                </div>
              </dl>

              <p className="text-xs text-mist">
                A carta permanece na sua coleção mantendo raridade, condition,
                edição e skin aplicada. Apenas o foil e os atributos ligados a
                ele são removidos.
              </p>

              {preview.blockedReason && (
                <div
                  role="alert"
                  className="border border-signal/40 bg-signal/10 p-3 text-sm text-signal"
                >
                  <p>{preview.blockedReason}</p>
                  {extractorsAvailable < 1 && (
                    <Link
                      href="/gacha/inventario#extrator-foil"
                      className="mt-2 inline-flex min-h-11 items-center text-ice underline underline-offset-4"
                    >
                      Adquirir Extrator de Foil no inventário
                    </Link>
                  )}
                </div>
              )}
            </>
          )}

          {uncertainRetry && !submitError && (
            <p
              role="status"
              aria-live="polite"
              className="border border-ice/40 bg-ice/10 p-3 text-xs text-ice"
            >
              Existe uma tentativa anterior pendente para esta carta. Confirmar
              novamente reutiliza o mesmo identificador com segurança.
            </p>
          )}

          {submitError && (
            <p role="alert" className="text-sm text-signal">
              {submitError}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

export function FoilExtractFeedback({
  feedback,
  onClose,
  showFragmentsLink = false,
}: {
  feedback: {
    result: GachaFoilExtractResult;
    updatedCard: GachaPull;
  } | null;
  onClose: () => void;
  showFragmentsLink?: boolean;
}) {
  const continueRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() => continueRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
    };
  }, [feedback, onClose]);

  if (!feedback) return null;

  const { result, updatedCard } = feedback;
  const foilMeta = getFoilDisplayMeta(result.extractedFoil);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="foil-extract-feedback-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[140] flex items-center justify-center bg-ink/85 p-6"
    >
      <div className="max-w-sm border border-ice/40 bg-panel p-6 text-center shadow-2xl">
        <div
          className="foil-extract-visual mx-auto w-44 sm:w-52"
          aria-hidden="true"
        >
          <GachaCard
            pull={updatedCard}
            linkAnime={false}
            showInfo={false}
          />
        </div>

        <div className="mt-5 flex flex-col items-center">
          {foilMeta.image && (
            <div
              className="gacha-fragment-art mb-3 h-12 w-12"
              data-foil={foilMeta.foil}
              aria-hidden="true"
            >
              <Image
                src={foilMeta.image}
                alt=""
                width={36}
                height={36}
                className="h-8 w-8 object-contain"
              />
            </div>
          )}

          <h2
            id="foil-extract-feedback-title"
            className="font-display text-display-sm text-snow"
          >
            Foil extraído
          </h2>
          <p className="mt-1 text-xs text-mist">
            Foil {foilMeta.label} removido · Carta agora Normal
          </p>
          <p
            aria-live="polite"
            className="mt-2 font-mono text-body-sm text-ice"
          >
            +{result.fragments.quantity} {result.fragments.itemName}
          </p>
          <p className="mt-1 font-mono text-xs text-mist">
            Extratores restantes: {result.extractorsRemaining}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {showFragmentsLink && (
              <Link
                href="/gacha/inventario/fragmentos"
                className="btn-ghost min-h-11 px-4 text-caption"
              >
                Ver fragmentos
              </Link>
            )}
            <button
              ref={continueRef}
              type="button"
              onClick={onClose}
              className="btn-ice min-h-11 px-5 text-caption"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
