"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FOCUSABLE } from "@/components/common/Modal";
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

export function boxRewardLabel(reward: Record<string, unknown>): string {
  const amount = Number(reward.amount ?? 1).toLocaleString("pt-BR");
  switch (reward.category) {
    case "CRYSTAL":
      return `${amount} cristais`;
    case "KEY":
      return `${amount} chave${Number(reward.amount ?? 1) === 1 ? "" : "s"}`;
    case "SPIN_RESET":
      return `${amount} reset de giro (5 previews)`;
    case "SKIN":
      return `Skin: ${String(reward.name ?? "Nova skin")}`;
    case "CARD":
      return `Carta ${String(reward.name ?? "Nova carta")}${reward.foil ? ` · ${String(reward.foil)}` : ""}`;
    case "CARD_BACK":
      return `Capa: ${String(reward.name ?? "Nova capa")}`;
    default:
      return String(reward.name ?? "Recompensa recebida");
  }
}

/** The API owns the reward; the clip only controls when we present it. */
export function BoxReveal({
  tier,
  reward,
  error,
  onClose,
}: {
  tier: GachaBoxTier;
  reward: Record<string, unknown> | null;
  error: string;
  onClose: () => void;
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
  const art =
    reward && safeImageSrc(String(reward.imageUrl ?? reward.image ?? ""));

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
            aria-label="Voltar ao mercado"
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
            <div className="box-reveal-prize">
              <div className="box-reveal-art">
                {art && !imageFailed ? (
                  <Image
                    src={art}
                    alt={String(reward.name ?? "Recompensa da caixa")}
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
                    ) : reward.category === "CRYSTAL" ? (
                      <>
                        <path
                          d="m60 10 42 38-11 49-31 33-31-33-11-49Z"
                          fill="currentColor"
                          fillOpacity=".1"
                        />
                        <path d="m60 10-18 42 18 78 18-78ZM18 48l24 4h36l24-4M29 97l31 33 31-33" />
                      </>
                    ) : (
                      <>
                        <rect x="24" y="12" width="72" height="116" rx="5" />
                        <path d="m60 41 8 21 20 8-20 8-8 21-8-21-20-8 20-8Z" />
                      </>
                    )}
                  </svg>
                )}
              </div>
              <p className="font-mono text-caption uppercase tracking-[0.26em]">
                Você ganhou
              </p>
              <p className="box-reveal-name font-display">
                {boxRewardLabel(reward)}
              </p>
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
                ? reward.category === "CRYSTAL"
                  ? "Cristais já entram no seu saldo disponível."
                  : reward.category === "SPIN_RESET"
                    ? "Reset guardado. Use após gastar os 5 previews da hora."
                    : "Recompensa adicionada ao seu inventário."
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
              ? "Voltar ao mercado"
              : ready
                ? "Continuar"
                : finished || motion === false
                  ? "Aguardando recompensa…"
                  : "Pular animação"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
