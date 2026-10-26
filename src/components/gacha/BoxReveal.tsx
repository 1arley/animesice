"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FOCUSABLE } from "@/components/common/Modal";
import {
  boxRewardDisplay,
  boxRewardLabel,
  boxRewardStatus,
  isKnownBoxRewardCategory,
} from "@/lib/gacha-box-reward";
import { safeImageSrc } from "@/lib/url";
import type { GachaBoxTier } from "@/types";

export const BOX_LABEL: Record<GachaBoxTier, string> = {
  COMMON: "Comum",
  RARE: "Rara",
  PREMIUM: "Premium",
};
const ACCENT = { COMMON: "#94c9dd", RARE: "#38e8da", PREMIUM: "#f5cb7d" };
// The clip is decorative: no media event may ever keep a granted prize hidden.
// Two constants, both measured from real media instead of guessed up front.
const NO_METADATA_GRACE_MS = 4000;
const ENDED_GRACE_MS = 1200;

const KIND_LABEL: Record<string, string> = {
  CRYSTAL: "Cristais",
  KEY: "Chave",
  SPIN_RESET: "Reset de giro",
  ITEM: "Item",
  RARE_BOX: "Caixa rara",
  KEY_RARE_BOX: "Caixa rara + chave",
  KEY_PREMIUM_BOX: "Caixa premium + chave",
  SKIN: "Skin",
  CARD: "Carta",
  CARD_BACK: "Capa de carta",
};
const RARITY_LABEL: Record<string, string> = {
  COMMON: "Comum",
  COMUM: "Comum",
  UNCOMMON: "Incomum",
  INCOMUM: "Incomum",
  RARE: "Rara",
  RARA: "Rara",
  EPIC: "Épica",
  EPICA: "Épica",
  MYTHIC: "Mítica",
  MITICA: "Mítica",
  LEGENDARY: "Lendária",
  LENDARIA: "Lendária",
  GALACTIC: "Galáctica",
  GALACTICA: "Galáctica",
};
const RARITY_COLOR: Record<string, string> = {
  EPIC: "#c4a1ff",
  EPICA: "#c4a1ff",
  MYTHIC: "#e879f9",
  MITICA: "#e879f9",
  LEGENDARY: "#f5cb7d",
  LENDARIA: "#f5cb7d",
  GALACTIC: "#67e8f9",
  GALACTICA: "#67e8f9",
};
const COUNT_MS = 1100;

/** Eases a number up from 0 so stackable prizes feel earned; static when motion is off. */
function useCountUp(target: number, animate: boolean) {
  const [value, setValue] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_MS);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);
  return animate ? value : target;
}

function PrizeAmount({
  amount,
  animate,
}: {
  amount: number;
  animate: boolean;
}) {
  const value = useCountUp(amount, animate);
  return (
    <p
      aria-hidden="true"
      className="box-reveal-amount font-display tabular-nums"
    >
      +{value.toLocaleString("pt-BR")}
    </p>
  );
}

/** The API owns the reward; the clip only controls when we present it. */
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
  const video = useRef<HTMLVideoElement>(null);
  const [previousFocus] = useState(() =>
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement | null),
  );
  // Unknown until the effect runs: never autoplay before checking the preference.
  const [motion, setMotion] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(reward !== null);
  const [duration, setDuration] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const ready = !!reward && (finished || motion === false);
  const asset = `/gacha/box-${tier.toLowerCase()}`;
  const hiddenCard =
    reward?.category === "CARD" &&
    (reward.imageHidden === true || reward.name === "???");
  const knownReward = !!reward && isKnownBoxRewardCategory(reward.category);
  const art = reward &&
    knownReward &&
    !hiddenCard &&
    safeImageSrc(String(reward.imageUrl ?? reward.image ?? ""));
  const rawAmount = reward?.amount;
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : typeof rawAmount === "string" && rawAmount.trim()
        ? Number(rawAmount)
        : Number.NaN;
  const stackable =
    !!reward &&
    Number.isSafeInteger(amount) &&
    amount > 0 &&
    (reward.category === "CRYSTAL" ||
      reward.category === "KEY" ||
      reward.category === "SPIN_RESET");
  const rarity = String(reward?.rarity ?? "").toUpperCase();
  const rarityLabel = RARITY_LABEL[rarity];
  const rarityColor = RARITY_COLOR[rarity];
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
  // the last control, which strands keyboard users on a blurred backdrop.
  // Same wrap-around Modal already uses.
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      );
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  useEffect(() => {
    if (motion !== true || finished || error) return;
    const element = video.current;
    if (!element) return;
    void element.play().catch(() => setFinished(true));
    // Corrupt media, stalled downloads and missing ended events cannot hide a
    // prize. Once the real duration is known the budget follows the clip, so a
    // slow start plays in full instead of being cut at a fixed wall clock; a
    // file that never delivers metadata gets the short grace instead.
    const budget =
      duration > 0 ? duration * 1000 + ENDED_GRACE_MS : NO_METADATA_GRACE_MS;
    const timeout = window.setTimeout(() => setFinished(true), budget);
    return () => window.clearTimeout(timeout);
  }, [motion, finished, error, duration]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="box-title"
      aria-describedby="box-status"
      style={{ "--box-accent": ACCENT[tier] } as React.CSSProperties}
      className="box-reveal-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="box-reveal-shell">
        <header className="box-reveal-header">
          <span className="font-mono text-caption uppercase tracking-[0.22em]">
            AnimeSice / Caixas
          </span>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Voltar à loja"
            className="box-reveal-close"
          >
            ✕
          </button>
        </header>
        <div className="box-reveal-heading">
          <p className="font-mono text-caption uppercase tracking-[0.3em]">
            Caixa {BOX_LABEL[tier]}
          </p>
          <h2 id="box-title" className="font-display text-3xl sm:text-4xl">
            {error
              ? "Abertura não confirmada"
              : ready
                ? `${BOX_LABEL[tier]} aberta`
                : "O que o gelo guarda?"}
          </h2>
        </div>
        <div
          className="box-reveal-stage"
          data-phase={error ? "error" : ready ? "reward" : "opening"}
        >
          <div className="box-reveal-orbit" aria-hidden="true" />
          {!ready && !error && (
            <div className="box-reveal-film" aria-hidden="true">
              {motion === true && !finished ? (
                <video
                  ref={video}
                  src={`${asset}.mp4`}
                  poster={`${asset}.webp`}
                  muted
                  playsInline
                  preload="auto"
                  width={720}
                  height={720}
                  tabIndex={-1}
                  onLoadedMetadata={(event) =>
                    setDuration(event.currentTarget.duration)
                  }
                  onEnded={() => setFinished(true)}
                  onError={() => setFinished(true)}
                />
              ) : finished ? (
                <div className="box-reveal-waiting">
                  <svg viewBox="0 0 100 100" fill="none">
                    <path d="m50 12 25 38-25 38-25-38Z" />
                    <path d="M25 50h50M50 12v76" />
                  </svg>
                </div>
              ) : (
                <Image
                  src={`${asset}.webp`}
                  alt=""
                  width={720}
                  height={720}
                  priority
                />
              )}
            </div>
          )}
          {ready && reward && (
            <div
              className="box-reveal-prize"
              data-kind={stackable ? "stack" : "item"}
              style={
                rarityColor
                  ? ({ "--prize-accent": rarityColor } as React.CSSProperties)
                  : undefined
              }
            >
              <span className="box-reveal-flash" aria-hidden="true" />
              <span className="box-reveal-rays" aria-hidden="true" />
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
                className="box-reveal-art"
                data-kind={stackable ? "stack" : "item"}
                style={{ "--i": 1 } as React.CSSProperties}
              >
                {art && !imageFailed ? (
                  <Image
                    src={art}
                    alt={
                      hiddenCard
                        ? "Carta misteriosa"
                        : String(reward.name ?? "Recompensa da caixa")
                    }
                    width={280}
                    height={350}
                    onError={() => setImageFailed(true)}
                    className="max-h-[min(32dvh,21rem)] w-auto max-w-full object-contain"
                  />
                ) : (
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
                      (reward.category === "CARD_BACK" &&
                        reward.duplicate === true) ? (
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
                )}
              </div>
              {stackable && (
                <div
                  style={{ "--i": 2 } as React.CSSProperties}
                  className="box-reveal-step"
                >
                  <PrizeAmount amount={amount} animate={motion === true} />
                </div>
              )}
              <p
                className="box-reveal-step font-mono text-caption uppercase tracking-[0.26em]"
                style={{ "--i": 3 } as React.CSSProperties}
              >
                {reward.category === "CARD_BACK" && reward.duplicate === true
                  ? "Compensação por duplicata"
                  : knownReward
                    ? "Você ganhou"
                    : "Resultado da abertura"}
              </p>
              <p
                className="box-reveal-name box-reveal-step font-display"
                style={{ "--i": 4 } as React.CSSProperties}
              >
                {prizeTitle}
              </p>
              {prizeDetails && prizeDetails.length > 0 && (
                <div className="box-reveal-details">
                  {prizeDetails.map((detail, index) => (
                    <p key={index}>{detail}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="box-reveal-error" role="alert">
              <span aria-hidden="true">!</span>
              <p>{error}</p>
              <p className="text-body-sm text-mist">
                Confira seu inventário antes de tentar novamente.
              </p>
            </div>
          )}
        </div>
        <footer className="box-reveal-footer">
          <p
            id="box-status"
            role="status"
            aria-live="polite"
            className="text-body-sm text-mist"
          >
            {ready && reward && (
              <span className="sr-only">{boxRewardLabel(reward)}. </span>
            )}
            {error
              ? "Nenhuma nova tentativa foi enviada."
              : ready && reward
                ? boxRewardStatus(reward)
                : finished || motion === false
                  ? "Confirmando a abertura…"
                  : "Rompendo o selo…"}
          </p>
          <button
            type="button"
            className="box-reveal-action"
            onClick={ready || error ? onClose : () => setFinished(true)}
            disabled={!ready && !error && (finished || motion === false)}
          >
            {error
              ? "Voltar à loja"
              : ready
                ? "Continuar"
                : finished || motion === false
                  ? "Aguardando recompensa…"
                  : "Pular animação"}
          </button>
          {ready && reward && onOpenAgain && (
            <button
              type="button"
              className="box-reveal-again"
              onClick={onOpenAgain}
            >
              Abrir outra {BOX_LABEL[tier].toLowerCase()}
            </button>
          )}
        </footer>
      </div>
    </dialog>
  );
}
