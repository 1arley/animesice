"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FOCUSABLE } from "@/components/common/Modal";
import {
  boxRewardDisplay,
  boxRewardLabel,
  boxRewardStatus,
  getBoxRewardVisualMeta,
  isKnownBoxRewardCategory,
} from "@/lib/gacha-box-reward";
import { isOptimizableImageUrl } from "@/lib/url";
import type { GachaBoxTier } from "@/types";
import { CommonBoxScene } from "./common-box/CommonBoxScene";
import type { CommonBoxPhase } from "./common-box/common-box-palette";
import { TierBoxScene } from "./tier-boxes/TierBoxScene";

export const BOX_LABEL: Record<GachaBoxTier, string> = {
  COMMON: "Comum",
  RARE: "Rara",
  PREMIUM: "Premium",
};

const ACCENT: Record<GachaBoxTier, string> = {
  COMMON: "#9fdcf5",
  RARE: "#b983ff",
  PREMIUM: "#f2bf52",
};

const TIER_COPY: Record<
  GachaBoxTier,
  {
    topbar: string;
    openingTitle: string;
    openingStatus: string;
    rewardEyebrow: string;
    errorEyebrow: string;
    safetyTimeoutMs: number;
    countMs: number;
  }
> = {
  COMMON: {
    topbar: "AnimeSice // Caixa Comum",
    openingTitle: "Abrindo caixa comum",
    openingStatus: "Rompendo o selo…",
    rewardEyebrow: "Caixa Comum // Protocolo Concluído",
    errorEyebrow: "Caixa Comum // Falha na Verificação",
    safetyTimeoutMs: 4800,
    countMs: 420,
  },
  RARE: {
    topbar: "AnimeSice // Caixa Rara",
    openingTitle: "Abrindo caixa rara",
    openingStatus: "Concentrando energia rara…",
    rewardEyebrow: "Caixa Rara // Energia Liberada",
    errorEyebrow: "Caixa Rara // Falha na Verificação",
    safetyTimeoutMs: 5600,
    countMs: 520,
  },
  PREMIUM: {
    topbar: "AnimeSice // Caixa Premium",
    openingTitle: "Abrindo caixa premium",
    openingStatus: "Despertando o relicário…",
    rewardEyebrow: "Caixa Premium // Relíquia Desvelada",
    errorEyebrow: "Caixa Premium // Falha na Verificação",
    safetyTimeoutMs: 6400,
    countMs: 620,
  },
};

const FALLBACK_REVEAL_MS = 900;

const KIND_LABEL: Record<string, string> = {
  CRYSTAL: "Cristais",
  KEY: "Chave",
  SPIN_RESET: "Reset de giro",
  ITEM: "Item",
  ESSENCE: "Essência",
  RARE_BOX: "Caixa rara",
  KEY_RARE_BOX: "Caixa rara + chave",
  KEY_PREMIUM_BOX: "Caixa premium + chave",
  SKIN: "Skin",
  CARD: "Carta",
  CARD_BACK: "Capa de carta",
};

/** Eases a number up from 0 so stackable prizes feel earned; static when motion is off. */
function useCountUp(target: number, animate: boolean, durationMs: number) {
  const [value, setValue] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate, durationMs]);
  return animate ? value : target;
}

function PrizeAmount({
  amount,
  animate,
  durationMs,
}: {
  amount: number;
  animate: boolean;
  durationMs: number;
}) {
  const value = useCountUp(amount, animate, durationMs);
  return (
    <p
      aria-hidden="true"
      className="box-reveal-amount font-display tabular-nums"
    >
      +{value.toLocaleString("pt-BR")}
    </p>
  );
}

function RewardArtwork({
  reward,
  art,
  hiddenCard,
  knownReward,
  imageFailed,
  onImageError,
}: {
  reward: Record<string, unknown>;
  art: string | null;
  hiddenCard: boolean;
  knownReward: boolean;
  imageFailed: boolean;
  onImageError: () => void;
}) {
  if (art && !imageFailed) {
    return (
      <Image
        src={art}
        unoptimized={!isOptimizableImageUrl(art)}
        alt={
          hiddenCard
            ? "Carta misteriosa"
            : String(reward.name ?? "Recompensa da caixa")
        }
        width={280}
        height={350}
        onError={onImageError}
        className="max-h-[min(32dvh,21rem)] w-auto max-w-full object-contain"
      />
    );
  }
  return (
    <svg
      viewBox="0 0 120 140"
      aria-hidden="true"
      className="box-reveal-symbol"
      fill="none"
    >
      {reward.category === "KEY" ? (
        <>
          <circle cx="60" cy="42" r="24" />
          <circle cx="60" cy="42" r="9" />
          <path d="M60 66v56h18v-14H60m0-15h18" />
        </>
      ) : reward.category === "SPIN_RESET" ? (
        <>
          <path d="M91 46a40 40 0 1 0 7 44M91 22v27H64" />
          <path d="m51 52 25 18-25 18Z" />
        </>
      ) : reward.category === "CRYSTAL" ||
        (reward.category === "CARD_BACK" && reward.duplicate === true) ? (
        <>
          <path
            d="m60 10 42 38-11 49-31 33-31-33-11-49Z"
            fill="currentColor"
            fillOpacity=".1"
          />
          <path d="m60 10-18 42 18 78 18-78ZM18 48l24 4h36l24-4M29 97l31 33 31-33" />
        </>
      ) : !knownReward ? (
        <text
          x="60"
          y="104"
          fill="currentColor"
          fontSize="104"
          textAnchor="middle"
        >
          ?
        </text>
      ) : (
        <>
          <rect x="24" y="12" width="72" height="116" rx="5" />
          <path d="m60 41 8 21 20 8-20 8-8 21-8-21-20-8 20-8Z" />
        </>
      )}
    </svg>
  );
}

/** The API owns the reward; visual stages only control when we present it. */
export function BoxReveal({
  tier,
  reward,
  error,
  onClose,
  onOpenAgain,
}: {
  tier: GachaBoxTier;
  reward: Record<string, unknown> | null;
  error: string;
  onClose: () => void;
  /** Present only when another box and key are available. */
  onOpenAgain?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [previousFocus] = useState(() =>
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement | null),
  );
  // Unknown until the effect runs: never autoplay before checking the preference.
  const [motion, setMotion] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(reward !== null);
  const [initialAmbient] = useState(reward !== null);
  const [imageFailed, setImageFailed] = useState(false);
  const [webglFallback, setWebglFallback] = useState(false);
  const [skipRequested, setSkipRequested] = useState(false);
  const [scenePhase, setScenePhase] = useState<CommonBoxPhase>(
    reward !== null ? "ambient" : "materializing",
  );

  const metaCopy = TIER_COPY[tier];
  const ready = !!reward && (finished || motion === false);
  const asset = `/gacha/box-${tier.toLowerCase()}`;
  const visualMeta = reward ? getBoxRewardVisualMeta(reward) : null;
  const hiddenCard = visualMeta?.hiddenCard ?? false;
  const knownReward = !!reward && isKnownBoxRewardCategory(reward.category);
  const art = visualMeta?.imageUrl ?? null;
  const amount = visualMeta?.stackableAmount ?? Number.NaN;
  const stackable = visualMeta !== null && visualMeta.stackableAmount !== null;
  const rarityLabel = visualMeta?.rarityLabel;
  const rarityColor =
    tier === "COMMON"
      ? visualMeta?.accentHex
      : visualMeta && (visualMeta.rarityKey || visualMeta.boxRewardTier)
        ? visualMeta.accentHex
        : ACCENT[tier];
  const prize = reward ? boxRewardDisplay(reward) : null;
  const stackableTitle =
    reward?.category === "CRYSTAL"
      ? amount === 1
        ? "Cristal"
        : "Cristais"
      : reward?.category === "KEY"
        ? amount === 1
          ? "Chave"
          : "Chaves"
        : amount === 1
          ? "Reset de giro"
          : "Resets de giro";
  const prizeTitle = stackable ? stackableTitle : prize?.title;
  const prizeDetails = prize?.details?.filter(
    (detail) => !(rarityLabel && detail.startsWith("Raridade: ")),
  );

  useEffect(() => {
    const el = dialog.current!;
    const overflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!query.matches);
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
      el.close();
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => {
        if (el.open) return;
        const target =
          previousFocus?.isConnected && !previousFocus.matches(":disabled")
            ? previousFocus
            : document.querySelector<HTMLElement>("[data-box-result]");
        target?.focus({ preventScroll: true });
      });
    };
  }, [previousFocus]);

  // Native <dialog> traps the page but still lets Tab fall out to <body> past
  // the last control, or when only 1 enabled button remains.
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const el = dialog.current;
      if (!el) return;
      const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      if (focusable.length === 1) {
        event.preventDefault();
        focusable[0].focus();
        return;
      }
      const active = document.activeElement;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!active || !el.contains(active) || active === el) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  const wasResolvedRef = useRef(false);

  useEffect(() => {
    return () => {
      wasResolvedRef.current = false;
    };
  }, []);

  // Reclaim focus if the focused skip button becomes disabled or unmounts,
  // and hand focus to the primary CTA when the reward/error panel resolves.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const resolved = ready || Boolean(error);
    const justResolved = resolved && !wasResolvedRef.current;
    wasResolvedRef.current = resolved;

    const active = document.activeElement;
    const focusInsideDialog = Boolean(
      active && el.contains(active) && active !== el,
    );
    if (!justResolved && focusInsideDialog) return;

    const target = resolved
      ? (el.querySelector<HTMLElement>(".common-box-action") ??
        el.querySelector<HTMLElement>(FOCUSABLE))
      : el.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
  }, [ready, error, finished]);

  // Fallback timing when WebGL is unavailable (only after reward confirms)
  useEffect(() => {
    if (!webglFallback || motion !== true || finished || error || !reward) {
      return;
    }
    const timer = window.setTimeout(
      () => setFinished(true),
      FALLBACK_REVEAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [webglFallback, motion, finished, error, reward]);

  // Belt-and-suspenders: once reward is confirmed, never allow a WebGL stall to hide it
  useEffect(() => {
    if (webglFallback || motion !== true || finished || error || !reward) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSkipRequested(true);
      setFinished(true);
    }, metaCopy.safetyTimeoutMs);
    return () => window.clearTimeout(timer);
  }, [webglFallback, motion, finished, error, reward, metaCopy.safetyTimeoutMs]);

  const handleSceneComplete = useCallback(() => {
    setFinished(true);
  }, []);

  const handleWebGLUnavailable = useCallback(() => {
    setWebglFallback(true);
  }, []);

  const handleSkip = () => {
    setSkipRequested(true);
    setFinished(true);
  };

  const stagePhase = error
    ? "error"
    : ready
      ? "reward"
      : scenePhase === "revealing"
        ? "revealing"
        : "opening";
  const rendererKind =
    motion === false ? "reduced" : webglFallback ? "fallback" : "webgl";
  const statusMessage = error
    ? "Nenhuma nova tentativa foi enviada."
    : ready && reward
      ? boxRewardStatus(reward)
      : finished ||
          motion === false ||
          (!reward && scenePhase === "authenticating")
        ? "Confirmando a abertura…"
        : scenePhase === "revealing"
          ? "Revelando recompensa…"
          : metaCopy.openingStatus;
  const liveStatusMessage =
    ready && reward
      ? `${boxRewardLabel(reward)}. ${statusMessage}`
      : statusMessage;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="box-title"
      aria-describedby="box-status"
      data-tier={tier}
      data-cinematic="true"
      data-phase={stagePhase}
      data-renderer={rendererKind}
      style={
        {
          "--box-accent": ACCENT[tier],
          "--prize-accent": rarityColor ?? ACCENT[tier],
        } as React.CSSProperties
      }
      className="box-reveal-dialog box-reveal-dialog--cinematic"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="common-box-cinema">
        <p id="box-status" role="status" aria-live="polite" className="sr-only">
          {liveStatusMessage}
        </p>

        {motion === true &&
          !webglFallback &&
          !error &&
          (tier === "COMMON" ? (
            <CommonBoxScene
              reward={reward}
              error={error}
              skipRequested={skipRequested}
              initialAmbient={initialAmbient}
              onPhaseChange={setScenePhase}
              onComplete={handleSceneComplete}
              onWebGLUnavailable={handleWebGLUnavailable}
            />
          ) : (
            <TierBoxScene
              key={tier}
              tier={tier}
              reward={reward}
              error={error}
              skipRequested={skipRequested}
              initialAmbient={initialAmbient}
              onPhaseChange={setScenePhase}
              onComplete={handleSceneComplete}
              onWebGLUnavailable={handleWebGLUnavailable}
            />
          ))}

        {((motion === true && webglFallback) || motion === false) &&
          !ready &&
          !error && (
            <div
              className="common-box-fallback"
              data-confirmed={reward ? "true" : "false"}
              aria-hidden="true"
            >
              <div className="common-box-fallback-ring" />
              <div className="common-box-fallback-frame">
                <Image
                  src={`${asset}.webp`}
                  alt=""
                  width={360}
                  height={360}
                  priority
                />
              </div>
            </div>
          )}

        <header className="common-box-topbar">
          <div className="common-box-brand">
            <span className="common-box-reticle" aria-hidden="true" />
            <span className="font-mono text-caption uppercase tracking-[0.22em]">
              {metaCopy.topbar}
            </span>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Voltar à loja"
            className="common-box-close"
          >
            ✕
          </button>
        </header>

        {!ready && !error && (
          <h2 id="box-title" className="sr-only">
            {metaCopy.openingTitle}
          </h2>
        )}

        <div className="common-box-center">
          {ready && reward && (
            <section
              className="common-reward-panel"
              data-kind={stackable ? "stack" : "item"}
            >
              <span className="common-reward-corners" aria-hidden="true" />
              <p className="common-reward-eyebrow font-mono uppercase tracking-[0.26em]">
                {metaCopy.rewardEyebrow}
              </p>
              <h2 id="box-title" className="common-reward-heading font-display">
                {BOX_LABEL[tier]} aberta
              </h2>

              <div
                className="box-reveal-chips"
                style={{ "--i": 0 } as React.CSSProperties}
              >
                <span className="box-reveal-chip font-mono text-caption uppercase tracking-[0.18em]">
                  {reward.category === "CARD_BACK" && reward.duplicate === true
                    ? "Compensação"
                    : (KIND_LABEL[String(reward.category)] ?? "Recompensa")}
                </span>
                {rarityLabel && (
                  <span className="box-reveal-chip box-reveal-chip-rarity font-mono text-caption uppercase tracking-[0.18em]">
                    {rarityLabel}
                  </span>
                )}
              </div>

              <div
                className="box-reveal-art common-reward-art"
                data-kind={
                  stackable
                    ? "stack"
                    : reward.category === "CARD"
                      ? "card"
                      : "item"
                }
                style={{ "--i": 1 } as React.CSSProperties}
              >
                <RewardArtwork
                  reward={reward}
                  art={art}
                  hiddenCard={hiddenCard}
                  knownReward={knownReward}
                  imageFailed={imageFailed}
                  onImageError={() => setImageFailed(true)}
                />
              </div>

              {stackable && (
                <div
                  style={{ "--i": 2 } as React.CSSProperties}
                  className="box-reveal-step"
                >
                  <PrizeAmount
                    amount={amount}
                    animate={motion === true}
                    durationMs={metaCopy.countMs}
                  />
                </div>
              )}

              <p
                className="box-reveal-step common-reward-caption font-mono text-caption uppercase tracking-[0.26em]"
                style={{ "--i": 3 } as React.CSSProperties}
              >
                {reward.category === "CARD_BACK" && reward.duplicate === true
                  ? "Compensação por duplicata"
                  : knownReward
                    ? "Você ganhou"
                    : "Resultado da abertura"}
              </p>

              <p
                className="box-reveal-name common-reward-name box-reveal-step font-display"
                style={{ "--i": 4 } as React.CSSProperties}
              >
                {prizeTitle}
              </p>

              {prizeDetails && prizeDetails.length > 0 && (
                <div className="box-reveal-details common-reward-details">
                  {prizeDetails.map((detail, index) => (
                    <p key={index}>{detail}</p>
                  ))}
                </div>
              )}

              <p
                className="common-reward-status text-body-sm"
                aria-hidden="true"
              >
                <span className="sr-only">{boxRewardLabel(reward)}. </span>
                {statusMessage}
              </p>

              <div className="common-reward-actions">
                <button
                  type="button"
                  className="common-box-action"
                  onClick={onClose}
                >
                  Continuar
                </button>
                {onOpenAgain && (
                  <button
                    type="button"
                    className="common-box-again"
                    onClick={onOpenAgain}
                  >
                    Abrir outra {BOX_LABEL[tier].toLowerCase()}
                  </button>
                )}
              </div>
            </section>
          )}

          {error && (
            <section className="common-reward-panel common-reward-panel--error">
              <span className="common-reward-corners" aria-hidden="true" />
              <p className="common-reward-eyebrow font-mono uppercase tracking-[0.26em]">
                {metaCopy.errorEyebrow}
              </p>
              <h2 id="box-title" className="common-reward-heading font-display">
                Abertura não confirmada
              </h2>
              <div className="box-reveal-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{error}</p>
                <p className="text-body-sm text-mist">
                  Confira seu inventário antes de tentar novamente.
                </p>
              </div>
              <p
                className="common-reward-status text-body-sm"
                aria-hidden="true"
              >
                {statusMessage}
              </p>
              <div className="common-reward-actions">
                <button
                  type="button"
                  className="common-box-action"
                  onClick={onClose}
                >
                  Voltar à loja
                </button>
              </div>
            </section>
          )}
        </div>

        {!ready && !error && (
          <footer className="common-box-footer">
            <p
              className="common-box-live text-body-sm"
              aria-hidden="true"
            >
              {statusMessage}
            </p>
            <button
              type="button"
              className="common-box-skip"
              onClick={handleSkip}
              disabled={finished || motion === false}
            >
              {finished || motion === false
                ? "Aguardando recompensa…"
                : "Pular animação"}
            </button>
          </footer>
        )}
      </div>
    </dialog>
  );
}
