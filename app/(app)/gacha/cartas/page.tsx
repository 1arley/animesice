"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  GachaCard,
  GACHA_TIERS,
  gachaConditionLabel,
} from "@/components/gacha/GachaCard";
import { CardPreview } from "@/components/gacha/CardPreview";
import {
  GachaCardGridSkeleton,
  GachaPageSkeleton,
} from "@/components/gacha/GachaPageSkeleton";
import { CardsFilterBar } from "@/components/gacha/CardsFilterBar";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/ToastProvider";
import type {
  GachaCollectionProgress,
  GachaFeatured,
  GachaEconomyInventory,
  GachaPull,
} from "@/types";

export default function GachaCollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<GachaPull[]>([]);
  const [featured, setFeatured] = useState<GachaFeatured | null>(null);
  const [progress, setProgress] = useState<GachaCollectionProgress[]>([]);
  const [pilotEnabled, setPilotEnabled] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [preview, setPreview] = useState<GachaPull | null>(null);
  const [sort, setSort] = useState("value");
  const [rarity, setRarity] = useState("");
  const [foil, setFoil] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const collectionLoadGenerationRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [featuredError, setFeaturedError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [rerolling, setRerolling] = useState(false);
  const [rerollReconciling, setRerollReconciling] = useState(false);
  const rerollBusy = useRef(false);
  const [rerollUncertainCardId, setRerollUncertainCardId] = useState<
    string | null
  >(null);
  const [rerollUncertainLegacyCardId, setRerollUncertainLegacyCardId] =
    useState<string | null>(null);
  const [rerollUncertainReconciledId, setRerollUncertainReconciledId] =
    useState<string | null>(null);
  const previewIdRef = useRef<string | null>(null);
  const previewGenerationRef = useRef(0);
  const previewUserIdRef = useRef<string | null>(null);
  const [economy, setEconomy] = useState<GachaEconomyInventory | null>(null);
  const [listing, setListing] = useState(false);
  const [burning, setBurning] = useState(false);
  const [applyingRanking, setApplyingRanking] = useState(false);
  const [burnTarget, setBurnTarget] = useState<GachaPull | null>(null);
  const [rerollConfirm, setRerollConfirm] = useState(false);
  const { toast } = useToast();
  const [burnResult, setBurnResult] = useState<{
    pull: GachaPull;
    payout: number;
  } | null>(null);
  const previewUserId = user?.id;
  const previewCardId = preview?.id;

  // Ref para o topo da grade — usado para rolar quando a página muda.
  const gridTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!burnResult) return;
    const timer = window.setTimeout(() => setBurnResult(null), 1200);
    return () => window.clearTimeout(timer);
  }, [burnResult]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const generation = ++collectionLoadGenerationRef.current;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const collection = await api.gachaCollection(
          user.id,
          page,
          24,
          sort,
          rarity,
          foil,
        );
        if (cancelled || generation !== collectionLoadGenerationRef.current)
          return;
        setItems(collection.data);
        setTotal(collection.meta.total);
        setPages(collection.meta.totalPages);
      } catch {
        if (!cancelled && generation === collectionLoadGenerationRef.current)
          setError("Não foi possível carregar sua coleção.");
      } finally {
        if (!cancelled && generation === collectionLoadGenerationRef.current)
          setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (generation === collectionLoadGenerationRef.current)
        collectionLoadGenerationRef.current += 1;
    };
  }, [user, page, sort, rarity, foil]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const current = await api.gachaFeatured().catch(() => null);
      if (!cancelled) {
        setFeatured(current);
        if (current?.featured?.claimed) {
          toast(
            `Destaque atualizado: +${current.featured.claimed} crystals.`,
            "success",
          );
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    void api
      .gachaEconomyInventory()
      .then(setEconomy)
      .catch(() => setEconomy(null));
  }, [user]);

  useEffect(() => {
    setRerollConfirm(false);
    previewGenerationRef.current += 1;
    previewIdRef.current = previewCardId ?? null;
    previewUserIdRef.current = previewUserId ?? null;
    setRerollUncertainReconciledId(null);
    if (!previewUserId || !previewCardId) {
      setRerollUncertainCardId(null);
      setRerollUncertainLegacyCardId(null);
      return;
    }
    try {
      const raw = localStorage.getItem(
        `animesice:gacha-reroll-uncertain:${previewUserId}:${previewCardId}`,
      );
      const pending = raw !== null;
      let legacy = pending;
      if (raw) {
        try {
          const operation = JSON.parse(raw) as Record<string, unknown>;
          legacy =
            typeof operation.operationId !== "string" ||
            typeof operation.useProtection !== "boolean";
        } catch {
          legacy = true;
        }
      }
      setRerollUncertainCardId(pending ? previewCardId : null);
      setRerollUncertainLegacyCardId(legacy ? previewCardId : null);
    } catch {
      setRerollUncertainCardId(null);
      setRerollUncertainLegacyCardId(null);
      setRerollUncertainReconciledId(null);
    }
  }, [previewUserId, previewCardId]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void api
      .gachaEngagementPilot()
      .then(async (pilot) => {
        if (cancelled) return;
        setPilotEnabled(pilot.enabled);
        if (!pilot.enabled) return;
        const collections = await api.gachaCollectionProgress();
        if (!cancelled) setProgress(collections);
      })
      .catch(() => {
        if (!cancelled)
          setProgressError("Não foi possível carregar o progresso.");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  /** Muda de página e rola suavemente até o topo da grade. */
  function handlePageChange(next: number) {
    setPage(next);
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveProgress(
    favoriteCollectionId: string | null,
    pinnedCollectionIds = progress
      .filter((collection) => collection.pinned)
      .map((collection) => collection.id),
  ) {
    if (savingProgress) return;
    setSavingProgress(true);
    try {
      setProgress(
        await api.updateGachaCollectionPreferences({
          favoriteCollectionId,
          pinnedCollectionIds,
        }),
      );
      toast("Preferências da coleção atualizadas.", "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível atualizar.",
      );
    } finally {
      setSavingProgress(false);
    }
  }

  async function reconcileRerollState(cardId: string) {
    if (!user) throw new Error("Entre novamente para atualizar a carta.");
    const userId = user.id;
    const generation = previewGenerationRef.current;
    const queryGeneration = collectionLoadGenerationRef.current;
    const requestPage = page;
    const requestSort = sort;
    const requestRarity = rarity;
    const requestFoil = foil;
    const [currentEconomy, currentCardResponse] = await Promise.all([
      api.gachaEconomyInventory(),
      api.gachaOwnedCard(cardId),
    ]);
    if (
      generation !== previewGenerationRef.current ||
      previewIdRef.current !== cardId ||
      previewUserIdRef.current !== userId ||
      queryGeneration !== collectionLoadGenerationRef.current
    )
      return null;
    setLoading(true);
    let visiblePage: Awaited<ReturnType<typeof api.gachaCollection>>;
    try {
      visiblePage = await api.gachaCollection(
        userId,
        requestPage,
        24,
        requestSort,
        requestRarity,
        requestFoil,
      );
    } finally {
      if (queryGeneration === collectionLoadGenerationRef.current)
        setLoading(false);
    }
    const currentCard = currentCardResponse.card;
    if (
      generation !== previewGenerationRef.current ||
      previewIdRef.current !== cardId ||
      previewUserIdRef.current !== userId ||
      queryGeneration !== collectionLoadGenerationRef.current
    )
      return null;
    collectionLoadGenerationRef.current += 1;
    return { currentEconomy, currentCard, visiblePage };
  }

  async function handleReroll(
    useProtection = false,
    operationId = crypto.randomUUID(),
    retryUncertain = false,
  ) {
    if (
      !preview ||
      rerollBusy.current ||
      (rerollUncertainCardId === preview.id && !retryUncertain)
    )
      return;
    const card = preview;
    const storageKey = `animesice:gacha-reroll-uncertain:${user?.id}:${card.id}`;
    try {
      if (!retryUncertain && localStorage.getItem(storageKey) != null) {
        setRerollUncertainCardId(card.id);
        setError(
          "Este reroll ainda precisa ser conferido. Atualize carta e saldo antes de tentar novamente.",
        );
        return;
      }
      localStorage.setItem(
        storageKey,
        JSON.stringify({ operationId, useProtection }),
      );
    } catch {
      setError(
        "Não foi possível salvar a tentativa com segurança. Ative o armazenamento do navegador e tente novamente.",
      );
      return;
    }
    rerollBusy.current = true;
    const before = `${card.conditionLabel ?? gachaConditionLabel(card.condition)}·${card.foil}`;
    const generation = previewGenerationRef.current;
    const requestUserId = user?.id;
    setRerolling(true);
    try {
      await api.gachaReroll({
        userCardId: card.id,
        useProtection,
        operationId,
      });
      if (
        generation !== previewGenerationRef.current ||
        previewUserIdRef.current !== requestUserId
      )
        return;
      let current: Awaited<ReturnType<typeof reconcileRerollState>>;
      try {
        current = await reconcileRerollState(card.id);
      } catch {
        if (
          generation !== previewGenerationRef.current ||
          previewUserIdRef.current !== requestUserId
        )
          return;
        setRerollUncertainCardId(card.id);
        setRerollUncertainReconciledId(null);
        setError(
          "Reroll confirmado, mas não foi possível sincronizar. Repita a mesma operação para conferir sem nova cobrança.",
        );
        return;
      }
      if (!current) {
        if (
          generation === previewGenerationRef.current &&
          previewIdRef.current === card.id &&
          previewUserIdRef.current === requestUserId
        ) {
          setRerollUncertainCardId(card.id);
          setRerollUncertainReconciledId(null);
          setError(
            "Reroll confirmado, mas a coleção mudou durante a atualização. Repita a mesma operação para conferir sem nova cobrança.",
          );
        }
        return;
      }
      if (!current.currentCard) {
        try {
          if (user) localStorage.removeItem(storageKey);
        } catch {
          /* Keep the lock if storage is unavailable. */
        }
        setRerollUncertainCardId(null);
        setRerollUncertainLegacyCardId(null);
        setRerollUncertainReconciledId(null);
        setItems(
          current.visiblePage.data.filter((item) => item.id !== card.id),
        );
        setTotal(current.visiblePage.meta.total);
        setPages(current.visiblePage.meta.totalPages);
        setPreview(null);
        setError("Reroll confirmado; esta carta não está mais na sua coleção.");
        return;
      }
      const { currentCard } = current;
      try {
        if (user) localStorage.removeItem(storageKey);
      } catch {
        /* Storage is optional. */
      }
      setRerollUncertainCardId(null);
      setRerollUncertainReconciledId(null);
      setEconomy(current.currentEconomy);
      setPreview(currentCard);
      setItems(
        current.visiblePage.data.map((item) =>
          item.id === card.id ? currentCard : item,
        ),
      );
      setRerollConfirm(false);
      const after = `${currentCard.conditionLabel ?? gachaConditionLabel(currentCard.condition)}·${currentCard.foil}`;
      toast(`Reroll: ${before} → ${after}.`, "success");
    } catch (err) {
      if (!(err instanceof ApiError) || ![400, 404].includes(err.statusCode)) {
        try {
          if (user)
            localStorage.setItem(
              storageKey,
              JSON.stringify({ operationId, useProtection }),
            );
        } catch {
          /* Keep the lock for this session. */
        }
        if (
          generation === previewGenerationRef.current &&
          previewUserIdRef.current === requestUserId
        ) {
          setRerollUncertainCardId(card.id);
          setRerollUncertainReconciledId(null);
          setRerollConfirm(false);
          setError(
            "Resultado incerto. Atualize saldo e carta antes de liberar outra tentativa.",
          );
        }
      } else {
        try {
          if (user) localStorage.removeItem(storageKey);
        } catch {
          /* Storage is optional. */
        }
        if (
          generation !== previewGenerationRef.current ||
          previewUserIdRef.current !== requestUserId
        )
          return;
        setRerollUncertainCardId(null);
        setRerollUncertainLegacyCardId(null);
        setRerollUncertainReconciledId(null);
        setRerollConfirm(false);
        setError(err.message || "Erro ao rerrollar a carta.");
      }
    } finally {
      setRerolling(false);
      rerollBusy.current = false;
    }
  }

  function retryRerollOperation(cardId: string) {
    if (!user || preview?.id !== cardId || preview.user.id !== user.id) return;
    try {
      const raw = localStorage.getItem(
        `animesice:gacha-reroll-uncertain:${user.id}:${cardId}`,
      );
      if (!raw) return;
      const pending = JSON.parse(raw) as {
        operationId?: unknown;
        useProtection?: unknown;
      };
      if (
        typeof pending.operationId !== "string" ||
        typeof pending.useProtection !== "boolean"
      ) {
        setError(
          "Esta tentativa antiga não tem chave para repetição segura. Confira o estado da carta e do saldo.",
        );
        return;
      }
      void handleReroll(pending.useProtection, pending.operationId, true);
    } catch {
      setError("Não foi possível recuperar a tentativa anterior do navegador.");
    }
  }

  function releaseLegacyReroll(cardId: string) {
    if (
      rerollUncertainLegacyCardId !== cardId ||
      rerollUncertainReconciledId !== cardId ||
      !user ||
      preview?.id !== cardId ||
      preview.user.id !== user.id
    )
      return;
    try {
      localStorage.removeItem(
        `animesice:gacha-reroll-uncertain:${user.id}:${cardId}`,
      );
    } catch {
      setError("Não foi possível remover o bloqueio antigo do navegador.");
      return;
    }
    setRerollUncertainCardId(null);
    setRerollUncertainLegacyCardId(null);
    setRerollUncertainReconciledId(null);
  }

  async function retryRerollReconciliation(cardId: string) {
    if (rerollBusy.current) return;
    rerollBusy.current = true;
    setRerollReconciling(true);
    const generation = previewGenerationRef.current;
    const userId = user?.id;
    try {
      const current = await reconcileRerollState(cardId);
      if (!current) return;
      const { currentEconomy, currentCard, visiblePage } = current;
      if (!currentCard) {
        setItems(visiblePage.data.filter((item) => item.id !== cardId));
        setTotal(visiblePage.meta.total);
        setPages(visiblePage.meta.totalPages);
        setPreview(null);
        setRerollUncertainCardId(null);
        setRerollUncertainLegacyCardId(null);
        setRerollUncertainReconciledId(null);
        try {
          if (user)
            localStorage.removeItem(
              `animesice:gacha-reroll-uncertain:${user.id}:${cardId}`,
            );
        } catch {
          /* Keep the lock if storage is unavailable. */
        }
        setError("Esta carta não está mais na sua coleção.");
        return;
      }
      setEconomy(currentEconomy);
      setItems(
        visiblePage.data.map((item) =>
          item.id === cardId ? currentCard : item,
        ),
      );
      setPreview(currentCard);
      setRerollUncertainReconciledId(cardId);
      setError(
        "Saldo e carta atualizados. Confira os valores antes de continuar.",
      );
    } catch {
      if (
        generation !== previewGenerationRef.current ||
        previewIdRef.current !== cardId ||
        previewUserIdRef.current !== userId
      )
        return;
      setError("Não foi possível atualizar carta e saldo. Tente novamente.");
    } finally {
      rerollBusy.current = false;
      setRerollReconciling(false);
    }
  }

  async function handleApplyRanking() {
    if (!preview || applyingRanking) return;
    const diff = preview.value - (preview.rankedValue ?? preview.value);
    setApplyingRanking(true);
    try {
      const updated = await api.gachaApplyRanking({
        userCardId: preview.id,
      });
      setPreview(updated);
      setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast(`Ranking atualizado: +${diff} pts.`, "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao aplicar ao ranking.",
      );
    } finally {
      setApplyingRanking(false);
    }
  }

  async function handleList(price: number) {
    if (!preview || listing) return;
    setListing(true);
    try {
      await api.gachaListCreate({ userCardId: preview.id, price });
      setPreview(null);
      toast("Carta anunciada no mercado.", "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao anunciar a carta.",
      );
    } finally {
      setListing(false);
    }
  }

  async function handleBurn() {
    if (!burnTarget || burning) return;
    setBurning(true);
    try {
      const target = burnTarget;
      const result = await api.gachaBurn({ userCardId: target.id });
      setItems((prev) => prev.filter((pull) => pull.id !== target.id));
      setTotal((value) => Math.max(0, value - 1));
      setPreview(null);
      setBurnTarget(null);
      setBurnResult({ pull: target, payout: result.payout });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao queimar a carta.");
    } finally {
      setBurning(false);
    }
  }

  // `useAuth` resolve /user/me no idle; sem esta guarda a página mostraria o
  // convite para entrar antes de a sessão ser lida.
  if (authLoading) return <GachaPageSkeleton kind="cards" />;

  if (!user)
    return (
      <div className="mx-auto max-w-shelf px-4 py-16">
        <Link href="/entrar" className="text-ice">
          Entre para ver sua coleção.
        </Link>
      </div>
    );

  return (
    <main className="mx-auto max-w-shelf px-4 pb-16 pt-8">
      {preview && (
        <CardPreview
          pull={preview}
          onClose={() => setPreview(null)}
          canReroll={
            preview.user.id === user.id && rerollUncertainCardId !== preview.id
          }
          rerolling={rerolling}
          rerollReconciling={rerollReconciling}
          onReroll={() => setRerollConfirm(true)}
          rerollConfirm={rerollConfirm}
          onRerollConfirm={(useProtection) => void handleReroll(useProtection)}
          onRerollCancel={() => setRerollConfirm(false)}
          rerollCost={
            economy?.itemConfig?.card_floors[preview.card.rarity] == null ||
            !economy?.itemConfig
              ? null
              : Math.max(
                  1,
                  Math.round(
                    economy.itemConfig.card_floors[preview.card.rarity]! *
                      economy.itemConfig.reroll_cost_pct,
                  ),
                )
          }
          protectionCount={economy?.protecao ?? 0}
          protectionDisabledReason={
            economy?.itemConfig?.reroll_protection_mint_block &&
            preview.condition <= 0.07
              ? "Proteção de reroll não pode ser usada em cartas MINT."
              : economy?.protecao
                ? ""
                : "Você não tem proteção de reroll."
          }
          rerollUncertain={rerollUncertainCardId === preview.id}
          rerollUncertainReconciled={rerollUncertainReconciledId === preview.id}
          rerollUncertainLegacy={rerollUncertainLegacyCardId === preview.id}
          onRetryRerollUncertain={() => retryRerollOperation(preview.id)}
          onReleaseLegacyReroll={() => releaseLegacyReroll(preview.id)}
          onReconcileRerollUncertain={() =>
            void retryRerollReconciliation(preview.id)
          }
          onChange={(updated) => {
            setPreview(updated);
            setItems((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            );
          }}
          listing={listing}
          burning={burning}
          onBurn={
            preview.user.id === user.id
              ? () => {
                  setBurnTarget(preview);
                  setPreview(null);
                }
              : undefined
          }
          onList={
            preview.user.id === user.id
              ? (price) => void handleList(price)
              : undefined
          }
          applyingRanking={applyingRanking}
          onApplyRanking={
            preview.user.id === user.id
              ? () => void handleApplyRanking()
              : undefined
          }
        />
      )}
      <ConfirmDialog
        open={burnTarget !== null}
        title="Queimar carta?"
        confirmLabel="Queimar carta"
        busyLabel="Queimando…"
        busy={burning}
        onCancel={() => setBurnTarget(null)}
        onConfirm={() => void handleBurn()}
      >
        <p className="text-body-sm text-mist">
          Você receberá{" "}
          {burnTarget ? Math.max(1, Math.floor(burnTarget.value * 0.4)) : 0}{" "}
          crystals. Ação irreversível.
        </p>
      </ConfirmDialog>
      {burnResult && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-0 z-[140] flex items-center justify-center bg-ink/85 p-6"
        >
          <div className="text-center">
            <div
              className="card-burn-visual mx-auto w-44 sm:w-52"
              aria-hidden="true"
            >
              <GachaCard
                pull={burnResult.pull}
                linkAnime={false}
                showInfo={false}
              />
            </div>
            <p className="mt-5 font-display text-display-sm text-snow">
              Carta queimada
            </p>
            <p className="mt-1 font-mono text-body-sm text-amber-300">
              +{burnResult.payout} crystals
            </p>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-snow">
            Minha coleção
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/gacha/trade-up" className="btn-ice px-4 py-2">
            Trade-up
          </Link>
          <Link href="/gacha/enciclopedia" className="btn-ghost px-4 py-2">
            Explorar enciclopédia
          </Link>
          <Link href="/gacha/colecao" className="btn-ghost px-4 py-2">
            Meus cosméticos
          </Link>
        </div>
      </div>

      {/* Progresso das coleções (piloto de engajamento) */}
      {pilotEnabled && (featured || progress.length > 0) && (
        <section
          aria-labelledby="collection-progress-title"
          className="mt-8 border border-hairline bg-panel/70 p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                id="collection-progress-title"
                className="font-display text-display-sm text-snow"
              >
                Progresso das coleções
              </h2>
              <p className="mt-1 text-body-sm text-mist">
                Tudo atualizado. Descobertas permanecem mesmo após uma troca.
              </p>
            </div>
            {featured?.featured?.enabled && (
              <div className="border border-ice/30 px-4 py-3 text-right">
                <p className="font-mono text-caption uppercase text-ice">
                  Destaque ativo
                </p>
                <p className="mt-1 text-body-sm text-snow">
                  {featured.featured.ratePercentPerTwoHours}% a cada 2h · teto{" "}
                  {featured.featured.dailyCapPercent}% ao dia
                </p>
                <p className="text-caption text-mist">
                  Acumula por até {featured.featured.accumulationDays} dias
                </p>
              </div>
            )}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {progress.map((collection) => {
              const pinnedIds = progress
                .filter((item) => item.pinned)
                .map((item) => item.id);
              return (
                <article
                  key={`${collection.id}:${collection.version}`}
                  className="border border-hairline bg-ink/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-title-sm text-snow">
                      {collection.name}
                    </h3>
                    <span className="font-mono text-caption text-mist">
                      {collection.discovered}/{collection.total}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Progresso de ${collection.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={collection.percent}
                    className="mt-3 h-2 overflow-hidden bg-white/10"
                  >
                    <div
                      className="h-full bg-ice transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${collection.percent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {collection.rewards.reward50At && (
                      <span className="flex min-h-11 items-center border border-white/15 px-3 font-mono text-caption text-snow">
                        Título: Colecionador de {collection.name}
                      </span>
                    )}
                    {collection.percent >= 25 && collection.percent < 100 && (
                      <button
                        type="button"
                        disabled={savingProgress}
                        onClick={() =>
                          void saveProgress(
                            collection.favorite ? null : collection.id,
                          )
                        }
                        className="min-h-11 border border-ice/40 px-3 font-mono text-caption text-ice disabled:opacity-50"
                      >
                        {collection.favorite
                          ? "Favorita · peso 1× → 1,15×"
                          : "Usar peso 1× → 1,15×"}
                      </button>
                    )}
                    {collection.rewards.reward100At && (
                      <button
                        type="button"
                        disabled={
                          savingProgress ||
                          (!collection.pinned && pinnedIds.length >= 3)
                        }
                        onClick={() =>
                          void saveProgress(
                            progress.find((item) => item.favorite)?.id ?? null,
                            collection.pinned
                              ? pinnedIds.filter((id) => id !== collection.id)
                              : [...pinnedIds, collection.id],
                          )
                        }
                        className="min-h-11 border border-amber-300/40 px-3 font-mono text-caption text-amber-300 disabled:opacity-50"
                      >
                        {collection.pinned ? "Medalha fixada" : "Fixar medalha"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Filtros */}
      <CardsFilterBar
        sort={sort}
        rarity={rarity}
        foil={foil}
        total={total}
        loading={loading}
        onSortChange={(v) => {
          setSort(v);
          setPage(1);
        }}
        onRarityChange={(v) => {
          setRarity(v);
          setPage(1);
        }}
        onFoilChange={(v) => {
          setFoil(v);
          setPage(1);
        }}
      />

      {/* Marcador invisível para scroll-to-top na troca de página */}
      <div ref={gridTopRef} aria-hidden="true" className="-mt-4 pt-4" />

      {/* Alertas */}
      {featuredError && (
        <p role="alert" className="mt-4 text-signal">
          {featuredError}
        </p>
      )}
      {progressError && (
        <p role="status" className="mt-4 text-body-sm text-mist">
          {progressError}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-signal">
          {error}
        </p>
      )}

      {/* Grade de cartas */}
      {!error &&
        (loading ? (
          <GachaCardGridSkeleton className="mt-6" />
        ) : items.length === 0 ? (
          <div className="mt-6">
            <EmptyState text="Nenhuma carta encontrada." variant="compact" />
            <Link href="/gacha" className="btn-ice mt-4 inline-block px-4 py-3">
              Voltar ao Gacha
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((pull) => (
              <div key={pull.id}>
                <button
                  type="button"
                  onClick={() => setPreview(pull)}
                  className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
                >
                  <GachaCard pull={pull} linkAnime={false} />
                </button>
                <button
                  type="button"
                  disabled={featured?.id === pull.id}
                  onClick={() => {
                    setFeaturedError("");
                    void api
                      .setGachaFeatured(pull.id)
                      .then((next) => {
                        setFeatured(next);
                        toast("Carta em destaque no perfil.", "success");
                      })
                      .catch(() => {
                        setFeaturedError("Não foi possível destacar a carta.");
                      });
                  }}
                  className="mt-2 min-h-11 w-full border border-hairline px-2 font-mono text-caption text-ice disabled:text-mist"
                >
                  {featured?.id === pull.id
                    ? "Em destaque"
                    : "Destacar no perfil"}
                </button>
              </div>
            ))}
          </div>
        ))}

      {/* Paginação numérica */}
      <PaginationControls
        page={page}
        totalPages={pages}
        onPageChange={handlePageChange}
        label="Paginação da coleção"
        busy={loading}
      />
    </main>
  );
}
