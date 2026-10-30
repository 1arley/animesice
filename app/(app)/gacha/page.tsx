"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { RollStage, type RollAnimConfig } from "@/components/gacha/RollStage";
import { SpinPreviewCard } from "@/components/gacha/SpinPreviewCard";
import { readRollAnimConfig } from "@/lib/roll-anim-config";
import { isValidRemoteUrl } from "@/lib/url";
import {
  GachaCard,
  FOIL_TEXT,
  GACHA_FOILS,
  GACHA_TIERS,
  GALAXY_TEXT,
  RARITY_TEXT,
  gachaConditionLabel,
} from "@/components/gacha/GachaCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/ToastProvider";
import { SectionLabel } from "@/components/common/SectionLabel";
import { Avatar } from "@/components/common/Avatar";
import { UserProfilePreview } from "@/components/social/UserProfilePreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardPreview } from "@/components/gacha/CardPreview";
import type {
  GachaEconomyOdds,
  GachaEconomyInventory,
  GachaPull,
  GachaRankingEntry,
  GachaSpinPreview,
  GachaStatus,
} from "@/types";

function formatCountdown(target: string | null, now: number): string | null {
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

const BYPASS_POLL_MS = 3000;
const BYPASS_POLL_MAX_MS = 31 * 60_000;
const BYPASS_POLL_MAX_FAILURES = 5;
const STALE_RE =
  /expir|claimed|já guardada|indisponível|already|completed|conflict/i;

/** Adapta um preview de giro para o RollStage (sem edição, sem dono). */
function spinToStagePull(spin: GachaSpinPreview): GachaPull {
  return {
    id: spin.id,
    condition: spin.condition,
    conditionLabel: spin.conditionLabel,
    foil: spin.foil,
    edition: 0,
    value: spin.value,
    obtainedAt: spin.createdAt,
    user: { id: "", name: null, userName: null, avatar: null },
    card: spin.card,
  };
}

/** Peso do config vira porcentagem legível em pt-BR: 3/100 -> "3%". */
function pct(weight: number, total: number): string {
  const value = (weight / total) * 100;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** Só o rótulo: a chave vem do config do admin, a acento fica aqui. */
const TIER_LABEL: Record<string, string> = {
  COMUM: "Comum",
  INCOMUM: "Incomum",
  RARA: "Rara",
  EPICA: "Épica",
  LENDARIA: "Lendária",
  MITICA: "Mítica",
  GALACTICA: "Galáctica",
};

/** Cristal do gacha — motivo de identidade do hero da sala. */
function CrystalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.5 3.5 8l1.6 12h13.8l1.6-12L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="m12 2.5-3.6 5.5L12 21.5 15.6 8 12 2.5Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M3.5 8h17M8.4 8l3.6 13.5M15.6 8 12 21.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
}

function GachaPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [stageOpen, setStageOpen] = useState(false);
  const [status, setStatus] = useState<GachaStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [recent, setRecent] = useState<GachaPull[]>([]);
  const [ranking, setRanking] = useState<GachaRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<GachaPull | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<GachaPull | null>(null);
  const [spins, setSpins] = useState<GachaSpinPreview[]>([]);
  const [spinResets, setSpinResets] = useState(0);
  const [selectedSpinId, setSelectedSpinId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<GachaSpinPreview | null>(null);
  const [claimResult, setClaimResult] = useState<GachaPull | null>(null);
  const [stagePreview, setStagePreview] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bypassPending, setBypassPending] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [rerollError, setRerollError] = useState("");
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
  const cardLoadGenerationRef = useRef(0);
  const previewUserIdRef = useRef<string | null>(null);
  const [economy, setEconomy] = useState<GachaEconomyInventory | null>(null);
  const [listing, setListing] = useState(false);
  const [rerollConfirm, setRerollConfirm] = useState(false);
  const [applyingRanking, setApplyingRanking] = useState(false);
  const { toast } = useToast();
  const [bypassReference, setBypassReference] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Odds vêm do economy snapshot, não de literal aqui: em 2026-10-07 o backend
  // somou INK e esta página continuou anunciando 85/12/3. Sem o dado
  // a linha lista os foils sem porcentagem, em vez de chutar um número. Mesmo
  // motivo vale para raridade e pity: saem de GachaConfig, o que o admin edita.
  const [odds, setOdds] = useState<GachaEconomyOdds | null>(null);
  const [rollAnimation, setRollAnimation] = useState<Partial<RollAnimConfig>>();
  const refreshSerial = useRef(0);
  const previewUserId = user?.id;
  const previewCardId = preview?.id;

  // Endpoint público: a linha de odds aparece para visitante anônimo também.
  useEffect(() => {
    let cancelled = false;
    api
      .gachaEconomyOdds()
      .then((data) => {
        if (!cancelled) setOdds(data);
      })
      .catch(() => {
        if (!cancelled) setOdds(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .gachaRollAnimation()
      .then((config) => {
        if (!cancelled) setRollAnimation(readRollAnimConfig(config));
      })
      .catch(() => {
        if (!cancelled) setRollAnimation(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = searchParams.get("card");
    const generation = ++cardLoadGenerationRef.current;
    const requestUserId = user?.id ?? null;
    if (!id) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    api
      .gachaPublicCard(id)
      .then((pull) => {
        if (
          !cancelled &&
          generation === cardLoadGenerationRef.current &&
          previewUserIdRef.current === requestUserId
        )
          setPreview(pull);
      })
      .catch(() => {
        if (
          !cancelled &&
          generation === cardLoadGenerationRef.current &&
          previewUserIdRef.current === requestUserId
        )
          setError("Carta indisponível ou privada.");
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, user?.id]);

  function closePreview() {
    setRerollConfirm(false);
    setRerollError("");
    previewGenerationRef.current += 1;
    cardLoadGenerationRef.current += 1;
    previewIdRef.current = null;
    setPreview(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("card");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  useEffect(() => {
    let cancelled = false;
    const serial = ++refreshSerial.current;
    (async () => {
      try {
        const [s, r, k, sp, economy] = await Promise.all([
          user ? api.gachaStatus().catch(() => null) : null,
          api.gachaRecent(12).catch(() => []),
          api.gachaRanking(10).catch(() => []),
          user ? api.gachaSpins().catch(() => []) : [],
          user ? api.gachaEconomyInventory().catch(() => null) : null,
        ]);
        if (cancelled || serial !== refreshSerial.current) return;
        setStatus(s);
        setStatusError(!!user && s === null);
        setRecent(r);
        setRanking(k);
        setSpins(sp);
        setSpinResets(economy?.spinResets ?? 0);
        setEconomy(economy);
        if (sp.length > 0) setSelectedSpinId(sp[sp.length - 1]?.id ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      refreshSerial.current += 1;
    };
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

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

  // Auto-refresh na virada da hora / fim do lock.
  useEffect(() => {
    if (!user || !status) return;
    const targets = [status.nextSpinAt, status.nextClaimAt].filter(
      (t): t is string => t != null,
    );
    const currentTime = Date.now();
    const nextHour = (Math.floor(currentTime / 3_600_000) + 1) * 3_600_000;
    const ms = Math.min(
      nextHour - currentTime,
      ...targets.map((t) => new Date(t).getTime() - currentTime),
    );
    if (!Number.isFinite(ms)) return;
    const timer = setTimeout(() => void refresh(), Math.max(0, ms) + 2000);
    return () => clearTimeout(timer);
  }, [user, status]);

  async function refresh() {
    const serial = ++refreshSerial.current;
    const [s, r, sp, economy] = await Promise.all([
      api.gachaStatus().catch(() => null),
      api.gachaRecent(12).catch(() => null),
      api.gachaSpins().catch(() => null),
      api.gachaEconomyInventory().catch(() => null),
    ]);
    if (serial !== refreshSerial.current) return;
    if (s) setStatus(s);
    if (r) setRecent(r);
    if (sp) setSpins(sp);
    if (economy) {
      setSpinResets(economy.spinResets);
      setEconomy(economy);
    }
  }

  async function handleSpin() {
    setError("");
    if (spinning) return;
    setSpinning(true);
    setSpinResult(null);
    setClaimResult(null);
    try {
      const previewSpin = await api.gachaSpin(AbortSignal.timeout(15_000));
      setSpins((prev) => [...prev, previewSpin]);
      setSelectedSpinId(previewSpin.id);
      setSpinResult(previewSpin);
      setStagePreview(true);
      setStageOpen(true);
      setStatus((prev) =>
        prev && prev.spinsLeft != null
          ? {
              ...prev,
              spinsLeft: Math.max(0, prev.spinsLeft - 1),
              canSpin: prev.spinsLeft > 1,
            }
          : prev,
      );
      void refresh();
    } catch (err) {
      setStageOpen(false);
      setSpinResult(null);
      setError(
        err instanceof Error && err.name === "TimeoutError"
          ? "A resposta demorou mais de 15 segundos. Recarregue a página para conferir se o preview foi criado antes de tentar novamente."
          : err instanceof ApiError
            ? err.message
            : "Erro ao girar.",
      );
    } finally {
      setSpinning(false);
    }
  }

  async function handleSpinReset() {
    if (spinResets < 1 || (status?.spinsLeft ?? 5) > 0) return;
    setError("");
    try {
      await api.gachaEconomyUseReset();
      toast("Reset usado. Mais 5 previews liberados.", "success");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao usar reset.");
    }
  }

  async function handleClaim() {
    if (
      !selectedSpin ||
      claiming ||
      new Date(selectedSpin.expiresAt).getTime() <= Date.now()
    )
      return;
    setConfirmOpen(false);
    setError("");
    setClaiming(true);
    try {
      const pull = await api.gachaClaim({ spinId: selectedSpin.id });
      setClaimResult(pull);
      setResult(pull);
      setStagePreview(false);
      setStageOpen(true);
      setSpins((prev) =>
        prev.map((spin) =>
          spin.id === selectedSpin.id
            ? { ...spin, claimedAt: new Date().toISOString() }
            : spin,
        ),
      );
      setStatus((prev) => (prev ? { ...prev, canClaim: false } : prev));
      void refresh();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao guardar.";
      setError(message);
      if (STALE_RE.test(message)) await refresh().catch(() => undefined);
    } finally {
      setClaiming(false);
    }
  }

  async function reconcileRerollState(cardId: string) {
    if (!user) throw new Error("Entre novamente para atualizar a carta.");
    const userId = user.id;
    const generation = previewGenerationRef.current;
    const [currentEconomy, currentCardResponse] = await Promise.all([
      api.gachaEconomyInventory(),
      api.gachaOwnedCard(cardId),
    ]);
    const currentCard = currentCardResponse.card;
    if (
      generation !== previewGenerationRef.current ||
      previewIdRef.current !== cardId ||
      previewUserIdRef.current !== userId
    )
      return null;
    return { currentEconomy, currentCard };
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
    setRerollError("");
    const storageKey = `animesice:gacha-reroll-uncertain:${user?.id}:${card.id}`;
    try {
      if (!retryUncertain && localStorage.getItem(storageKey) != null) {
        setRerollUncertainCardId(card.id);
        setRerollError(
          "Este reroll ainda precisa ser conferido. Atualize carta e saldo antes de tentar novamente.",
        );
        return;
      }
      localStorage.setItem(
        storageKey,
        JSON.stringify({ operationId, useProtection }),
      );
    } catch {
      setRerollError(
        "Não foi possível salvar a tentativa com segurança. Ative o armazenamento do navegador e tente novamente.",
      );
      return;
    }
    rerollBusy.current = true;
    const before = `${card.conditionLabel ?? gachaConditionLabel(card.condition)}·${card.foil}`;
    const generation = previewGenerationRef.current;
    const requestUserId = user?.id;
    setRerolling(true);
    setRerollError("");
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
        setRerollError(
          "Reroll confirmado, mas não foi possível sincronizar. Repita a mesma operação para conferir sem nova cobrança.",
        );
        return;
      }
      if (!current) return;
      if (!current.currentCard) {
        try {
          if (user) localStorage.removeItem(storageKey);
        } catch {
          /* Keep the lock if storage is unavailable. */
        }
        setRerollUncertainCardId(null);
        setRerollUncertainLegacyCardId(null);
        setRerollUncertainReconciledId(null);
        closePreview();
        setError("Reroll confirmado; esta carta não está mais na sua coleção.");
        return;
      }
      try {
        if (user) localStorage.removeItem(storageKey);
      } catch {
        /* Storage is optional. */
      }
      setRerollUncertainCardId(null);
      setRerollUncertainReconciledId(null);
      setEconomy(current.currentEconomy);
      setSpinResets(current.currentEconomy.spinResets);
      cardLoadGenerationRef.current += 1;
      setPreview(current.currentCard);
      setRerollConfirm(false);
      const after = `${current.currentCard.conditionLabel ?? gachaConditionLabel(current.currentCard.condition)}·${current.currentCard.foil}`;
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
          setRerollError(
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
        const message = err.message || "Erro ao rerrollar a carta.";
        setRerollError(message);
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
      const { currentEconomy, currentCard } = current;
      if (!currentCard) {
        closePreview();
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
      setSpinResets(currentEconomy.spinResets);
      cardLoadGenerationRef.current += 1;
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
    setError("");
    try {
      const updated = await api.gachaApplyRanking({
        userCardId: preview.id,
      });
      setPreview(updated);
      toast(`Ranking atualizado: +${diff} pts.`, "success");
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Erro ao aplicar ao ranking.",
      );
    } finally {
      setApplyingRanking(false);
    }
  }

  async function handleList(price: number) {
    if (!preview || listing) return;
    setListing(true);
    setError("");
    try {
      await api.gachaListCreate({ userCardId: preview.id, price });
      closePreview();
      toast("Carta anunciada no mercado.", "success");
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Erro ao anunciar a carta.",
      );
    } finally {
      setListing(false);
    }
  }

  async function handleBypass() {
    if (bypassPending) return;
    setError("");
    setBypassPending(true);
    setCheckoutUrl(null);
    setBypassReference(null);
    try {
      const res = await api.gachaBypass();
      if ("alreadyUnlocked" in res || "unlocked" in res) {
        await refresh();
        return;
      }
      if (!isValidRemoteUrl(res.checkoutUrl))
        throw new Error("Checkout Pix inválido.");
      setCheckoutUrl(res.checkoutUrl);
      setBypassReference(res.reference);
      const started = Date.now();
      let failures = 0;
      while (failures < BYPASS_POLL_MAX_FAILURES) {
        await new Promise((r) => setTimeout(r, BYPASS_POLL_MS));
        if (Date.now() - started > BYPASS_POLL_MAX_MS) break;
        try {
          if (await pollBypassOnce(res.reference)) return;
          failures = 0;
        } catch {
          failures += 1;
        }
      }
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Erro ao gerar Pix.";
      setError(message);
      if (STALE_RE.test(message)) await refresh().catch(() => undefined);
    } finally {
      setBypassPending(false);
    }
  }

  async function pollBypassOnce(reference: string): Promise<boolean> {
    const poll = await api.gachaBypassStatus(reference);
    if (poll.status === "PAID") {
      setCheckoutUrl(null);
      setBypassReference(null);
      await refresh();
      return true;
    }
    if (poll.status === "EXPIRED") {
      setCheckoutUrl(null);
      setBypassReference(null);
      setError("O Pix expirou. Gere uma nova intenção.");
      return true;
    }
    return false;
  }

  const selectedSpin = spins.find((s) => s.id === selectedSpinId) ?? null;
  const selectedSpinExpired =
    selectedSpin != null && new Date(selectedSpin.expiresAt).getTime() <= now;
  const spinCountdown = formatCountdown(status?.nextSpinAt ?? null, now);
  const claimCountdown = formatCountdown(status?.nextClaimAt ?? null, now);
  const canSpinNow = (status?.canSpin ?? status == null) && !spinning;
  const locked = status != null && status.canClaim === false;
  const stagePull = useMemo(
    () =>
      stagePreview
        ? spinResult
          ? spinToStagePull(spinResult)
          : null
        : (claimResult ?? result),
    [stagePreview, spinResult, claimResult, result],
  );

  // Soma de foil_weights no snapshot; o config não garante fechamento em 100.
  const foilTotal = useMemo(
    () =>
      Object.values(odds?.foilWeights ?? {}).reduce((acc, w) => acc + w, 0) ||
      1,
    [odds?.foilWeights],
  );

  // Raridade e pity: soma real do config. Sem dado, a lista sai sem
  // porcentagem e o texto vira genérico — melhor que número inventado.
  const tierWeights = odds?.tierWeights;
  const pityWeights = odds?.pityWeights;
  const tierTotal = useMemo(
    () => Object.values(tierWeights ?? {}).reduce((a, w) => a + w, 0),
    [tierWeights],
  );
  const pityTotal = useMemo(
    () => Object.values(pityWeights ?? {}).reduce((a, w) => a + w, 0),
    [pityWeights],
  );
  const galacticPity = pityWeights?.GALACTICA;
  const pityDays = odds?.pityDays;

  return (
    <div className="mx-auto max-w-shelf px-4 pb-16 pt-5 sm:pt-8">
      {stageOpen && (
        <RollStage
          pull={stagePull}
          preview={stagePreview}
          config={rollAnimation}
          onClose={() => {
            setStageOpen(false);
            setSpinResult(null);
          }}
        />
      )}
      {preview && (
        <CardPreview
          pull={preview}
          onClose={() => {
            setRerollError("");
            closePreview();
          }}
          canReroll={
            !!user &&
            preview.user.id === user.id &&
            rerollUncertainCardId !== preview.id
          }
          rerolling={rerolling}
          rerollError={rerollError}
          rerollReconciling={rerollReconciling}
          onReroll={() => {
            setRerollError("");
            setRerollConfirm(true);
          }}
          rerollConfirm={rerollConfirm}
          onRerollConfirm={(useProtection) => void handleReroll(useProtection)}
          onRerollCancel={() => {
            setRerollError("");
            setRerollConfirm(false);
          }}
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
          onChange={setPreview}
          listing={listing}
          onList={
            user && preview.user.id === user.id
              ? (price) => void handleList(price)
              : undefined
          }
          applyingRanking={applyingRanking}
          onApplyRanking={
            user && preview.user.id === user.id
              ? () => void handleApplyRanking()
              : undefined
          }
        />
      )}
      {selectedSpin && (
        <ConfirmDialog
          open={confirmOpen}
          title="Guardar carta?"
          confirmLabel="Pegar carta"
          busy={claiming}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void handleClaim()}
        >
          <div className="mx-auto w-44 max-w-full">
            <SpinPreviewCard spin={selectedSpin} />
          </div>
          <p className="mt-4 text-body-sm text-mist">
            Guardar {selectedSpin.card.name} ({selectedSpin.card.rarity} ·{" "}
            {selectedSpin.foil}) consome o preview e inicia o cooldown de
            guarda.
          </p>
        </ConfirmDialog>
      )}

      <section className="relative mt-3 overflow-hidden border border-hairline bg-panel shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:mt-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_90%_at_50%_0%,rgba(56,189,248,0.13),transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ice/50 to-transparent"
        />

        <div className="relative px-5 pb-7 pt-8 text-center sm:px-8 sm:pb-9 sm:pt-12">
          <p className="font-mono text-caption uppercase tracking-[0.25em] text-ice">
            Sinal no ar · Sala do Gacha
          </p>
          <h1 className="mt-3 flex items-center justify-center gap-3 font-display text-display-lg text-snow sm:text-[3.25rem]">
            <CrystalIcon className="h-7 w-7 text-ice/80 sm:h-9 sm:w-9" />
            <span>Gacha</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-body-sm leading-relaxed text-mist">
            5 giros por hora para revelar cartas. Guarde cartas com cooldown que
            varia por raridade — girar continua liberado durante o bloqueio.
            Mesma carta, cópias únicas: condition, foil e edição definem o
            valor.
          </p>

          {!user && (
            <div className="mx-auto mt-6 max-w-xl text-left">
              {error && (
                <div
                  role="alert"
                  className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
                >
                  {error}
                </div>
              )}
              <div className="border border-hairline bg-ink/60 p-5 text-center text-body-sm text-mist">
                <Link href="/entrar" className="text-ice hover:text-snow">
                  Entre
                </Link>{" "}
                com uma conta verificada para girar e completar sets.
              </div>
            </div>
          )}
        </div>

        {user &&
          (loading ? (
            <div className="relative px-6 pb-10 text-center">
              <div
                role="status"
                aria-label="Carregando status do gacha"
                aria-busy="true"
                className="mx-auto grid max-w-3xl grid-cols-2 divide-x divide-hairline border border-hairline bg-ink/60 text-left sm:grid-cols-4"
              >
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="space-y-2 px-3 py-4 sm:px-4">
                    <div aria-hidden="true" className="skeleton h-3 w-12" />
                    <div aria-hidden="true" className="skeleton h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : statusError ? (
            <div className="relative px-6 pb-10 text-center">
              <p className="text-body-sm text-mist">
                Não foi possível carregar o status do gacha. Tente novamente.
              </p>
            </div>
          ) : (
            <>
              <div className="relative px-5 pb-6 text-center sm:pb-8">
                {error && (
                  <div
                    role="alert"
                    className="mx-auto mb-4 max-w-2xl border border-signal/40 bg-signal/10 p-3 text-left text-body-sm text-signal"
                  >
                    {error}
                  </div>
                )}
                <div className="mx-auto grid max-w-3xl grid-cols-2 divide-x divide-hairline border border-hairline bg-ink/60 text-left sm:grid-cols-4">
                  <span className="px-3 py-3 sm:px-4">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-mist-soft">
                      Giros
                    </span>
                    <span className="mt-1 block font-display text-sm text-snow">
                      {status?.spinsLeft != null
                        ? `${status.spinsLeft}/5 giros nesta hora${spinCountdown && status.spinsLeft === 0 ? ` · volta em ${spinCountdown}` : ""}`
                        : status?.canRoll
                          ? "Roll de hoje disponível"
                          : `Volte ${status?.nextRollAt ? new Date(status.nextRollAt).toLocaleString("pt-BR") : "amanhã"}`}
                    </span>
                  </span>
                  <span className="px-3 py-3 sm:px-4">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-mist-soft">
                      Pity
                    </span>
                    <span className="mt-1 block font-display text-sm text-snow">
                      {status?.pityDue
                        ? "ÉPICA+ garantida neste giro"
                        : `Pity ÉPICA+ em ${status?.pityDaysLeft ?? 30}d`}
                    </span>
                  </span>
                  {locked && (
                    <span className="col-span-2 px-3 py-3 sm:col-span-1 sm:px-4">
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-mist-soft">
                        Cooldown
                      </span>
                      <span className="mt-1 block font-display text-sm text-snow">
                        Próxima carta guardável em {claimCountdown ?? "…"}
                      </span>
                    </span>
                  )}
                  <span className="px-3 py-3 sm:px-4">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-mist-soft">
                      Cristais
                    </span>
                    <span className="mt-1 block font-display text-sm text-snow">
                      <Link
                        href="/gacha/cristais"
                        className="text-ice decoration-hairline underline-offset-4 hover:text-snow hover:underline"
                      >
                        {(
                          (status?.crystalBalance ?? 0) -
                          (status?.crystalReserved ?? 0)
                        ).toLocaleString("pt-BR")}
                      </Link>
                    </span>
                    {!!status?.crystalReserved && (
                      <span className="block text-caption text-mist">
                        {status.crystalReserved.toLocaleString("pt-BR")}{" "}
                        reservados em trocas
                      </span>
                    )}
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSpin()}
                    disabled={!canSpinNow}
                    className="btn-ice min-w-44 px-8 py-4 text-body transition-transform duration-150 active:scale-95 motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {spinning
                      ? "Girando…"
                      : `Girar (${status?.spinsLeft ?? 5})`}
                  </button>
                  {spinResets > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleSpinReset()}
                      disabled={(status?.spinsLeft ?? 5) > 0}
                      title="Libera mais 5 previews depois que os 5 giros atuais acabam"
                      className="btn-ghost w-fit px-5 py-4 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Usar reset ({spinResets})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={
                      claiming || !selectedSpin || selectedSpinExpired || locked
                    }
                    title={
                      locked
                        ? "Você já guardou uma carta. Aguarde o fim do bloqueio ou desbloqueie via Pix."
                        : "Guardar a carta selecionada na sua coleção"
                    }
                    className="btn-ghost w-fit px-6 py-4 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {claiming ? "Guardando…" : "Pegar carta"}
                  </button>
                </div>

                {status?.claimWarning && (
                  <div className="mx-auto mt-4 max-w-2xl border border-hairline bg-ink/60 p-3 text-left">
                    <p className="text-body-sm text-mist">
                      {status.claimWarning}
                    </p>
                    {status.bypassPriceCents != null && (
                      <button
                        type="button"
                        onClick={() => void handleBypass()}
                        disabled={bypassPending}
                        className="mt-3 min-h-11 border border-amber-400/60 px-4 font-display text-body-sm text-amber-200 disabled:opacity-40"
                      >
                        {bypassPending
                          ? "Aguardando Pix…"
                          : `Desbloquear agora · R$ ${(status.bypassPriceCents / 100).toFixed(2).replace(".", ",")}`}
                      </button>
                    )}
                    {checkoutUrl && (
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (bypassReference) {
                            void pollBypassOnce(bypassReference).catch(
                              () => undefined,
                            );
                          }
                        }}
                        className="btn-ice mt-3 inline-block px-4 py-3"
                      >
                        Abrir checkout Pix
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="relative border-t border-hairline px-5 py-6">
                {spins.length > 0 && (
                  <div>
                    <p className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                      Previews desta hora ({spins.length}/5)
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {spins.map((spin) => {
                        const active = spin.id === selectedSpinId;
                        const expired =
                          new Date(spin.expiresAt).getTime() <= now;
                        const claimed = spin.claimedAt != null;
                        return (
                          <button
                            key={spin.id}
                            type="button"
                            onClick={() => setSelectedSpinId(spin.id)}
                            aria-pressed={active}
                            disabled={expired || claimed}
                            title={
                              claimed
                                ? "Carta já guardada"
                                : expired
                                  ? "Preview expirado"
                                  : undefined
                            }
                            className={`border p-1 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              active
                                ? "border-ice"
                                : "border-hairline hover:border-ice/50"
                            }`}
                          >
                            <SpinPreviewCard spin={spin} />
                          </button>
                        );
                      })}
                    </div>
                    {selectedSpin && (
                      <p className="mt-2 font-mono text-caption text-mist">
                        Selecionada: {selectedSpin.card.name} ·{" "}
                        {selectedSpin.card.rarity} · {selectedSpin.foil}
                        {selectedSpin.claimedAt ? " · já guardada" : ""}
                      </p>
                    )}
                  </div>
                )}

                {result && !stageOpen && !stagePreview && (
                  <div className="mt-6">
                    <SectionLabel level={2}>Sua carta</SectionLabel>
                    <div className="w-44 max-w-full">
                      <GachaCard pull={result} />
                    </div>
                  </div>
                )}
              </div>
            </>
          ))}
      </section>

      <section className="mt-12">
        <SectionLabel level={2}>Últimos pulls</SectionLabel>
        {recent.length === 0 ? (
          <EmptyState
            text="Nenhum pull ainda. Seja o primeiro."
            variant="compact"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recent.map((pull) => (
              <div key={pull.id}>
                <Link href={`/gacha?card=${pull.id}`}>
                  <GachaCard pull={pull} linkAnime={false} />
                </Link>
                <UserProfilePreview
                  user={pull.user}
                  className="mt-1 block truncate font-mono text-caption text-mist-soft hover:text-ice"
                >
                  @{pull.user.userName ?? "usuário"}
                </UserProfilePreview>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <SectionLabel level={2}>Como funciona</SectionLabel>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="border border-hairline bg-panel p-4 text-body-sm text-mist">
              <p className="font-medium text-snow">Raridade</p>
              <ul className="mt-2 space-y-1 font-mono text-caption">
                {GACHA_TIERS.map((tier) => {
                  const weight = tierWeights?.[tier];
                  const label = TIER_LABEL[tier] ?? tier;
                  return (
                    <li
                      key={tier}
                      className={
                        tier === "GALACTICA"
                          ? GALAXY_TEXT
                          : (RARITY_TEXT[tier] ?? "text-snow")
                      }
                    >
                      {label}
                      {weight == null ? "" : ` — ${pct(weight, tierTotal)}`}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3">
                {pityDays == null ? (
                  "O pity garante ÉPICA ou melhor depois de alguns dias sem ÉPICA+."
                ) : (
                  <>
                    {pityDays} dias sem ÉPICA+ ativa o pity: próximo roll
                    garante ÉPICA ou melhor
                    {galacticPity == null
                      ? "."
                      : ` — com ${pct(galacticPity, pityTotal)} de chance de GALÁCTICA.`}
                  </>
                )}
              </p>
            </div>
            <div className="border border-hairline bg-panel p-4 text-body-sm text-mist">
              <p className="font-medium text-snow">Sua cópia é única</p>
              <ul className="mt-2 space-y-1 font-mono text-caption">
                <li>
                  Foil:{" "}
                  {GACHA_FOILS.map((foil, i) => {
                    const weight = odds?.foilWeights?.[foil];
                    return (
                      <span key={foil}>
                        {i > 0 && " · "}
                        <span className={FOIL_TEXT[foil] ?? "text-snow"}>
                          {foil}
                        </span>
                        {weight == null ? "" : ` ${pct(weight, foilTotal)}`}
                      </span>
                    );
                  })}
                </li>
                <li>
                  Condition: <span className="text-ice">◆◆◆ MINT</span> &gt;{" "}
                  <span className="text-snow">◆◆ NM</span> &gt;{" "}
                  <span className="text-amber-300">◆ EX</span> &gt;{" "}
                  <span className="text-orange-500">▽ PLAYED</span> &gt;{" "}
                  <span className="text-red-500">✕ POOR</span>
                </li>
                <li>
                  Edição: #1 a #10 valem bônus alto — quanto menor, mais rara
                </li>
              </ul>
              <p className="mt-3">
                Value = base da raridade × condition × foil + bônus de edição
                baixa. Sua coleção vale a soma.
              </p>
            </div>
          </div>
        </div>

        <div>
          <SectionLabel level={2}>Ranking</SectionLabel>
          {ranking.length === 0 ? (
            <EmptyState text="Ranking vazio por enquanto." variant="compact" />
          ) : (
            <ol className="divide-y divide-hairline border border-hairline bg-panel">
              {ranking.map((entry, i) => (
                <li key={entry.user.id} className="flex items-center gap-3 p-3">
                  <span className="w-6 shrink-0 font-mono text-caption text-mist">
                    {i + 1}
                  </span>
                  <UserProfilePreview
                    user={entry.user}
                    className="min-w-0 flex-1 truncate text-body-sm text-snow hover:text-ice"
                  >
                    <Avatar
                      name={entry.user.name || entry.user.userName}
                      src={entry.user.avatar}
                      size={28}
                    />
                    {entry.user.name || entry.user.userName || "Usuário"}
                  </UserProfilePreview>
                  <span className="shrink-0 font-mono text-caption text-mist-soft">
                    {entry.totalValue} pts
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

export default function GachaPage() {
  return (
    <Suspense>
      <GachaPageContent />
    </Suspense>
  );
}
