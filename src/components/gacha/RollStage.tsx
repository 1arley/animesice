"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { GachaCard, GACHA_TIERS, GALAXY_TEXT, RARITY_TEXT } from "./GachaCard";
import { CountUp } from "@/components/core/CountUp";
import type { GachaPull } from "@/types";

export type RollAnimConfig = {
  enterDuration: number;
  crystalSpinAt: number;
  crystalSpinDuration: number;
  glowAt: number;
  glowDuration: number;
  skipAt: number;
  revealAt: number;
  crystalOutDuration: number;
  ringSlots: number;
  ringDuration: number;
  ringStagger: number;
  particleSlots: number;
  particleDuration: number;
  particleReach: { x: number; y: number };
  particleGalaxy: string[];
  effectsGap: number;
  flipDuration: number;
  sweepDuration: number;
  badgeDuration: number;
};

export const DEFAULT_ROLL_ANIM_CONFIG: RollAnimConfig = {
  enterDuration: 0.15,
  crystalSpinAt: 0.2,
  crystalSpinDuration: 1.2,
  glowAt: 0.3,
  glowDuration: 1.3,
  skipAt: 0.6,
  revealAt: 1.8,
  crystalOutDuration: 0.25,
  ringSlots: 3,
  ringDuration: 0.55,
  ringStagger: 0.12,
  particleSlots: 24,
  particleDuration: 0.65,
  particleReach: { x: 180, y: 230 },
  particleGalaxy: ["#a78bfa", "#f472b6", "#38bdf8"],
  effectsGap: 0.12,
  flipDuration: 0.48,
  sweepDuration: 0.6,
  badgeDuration: 0.3,
};

function tierOf(p: GachaPull | null): number {
  return p ? GACHA_TIERS.indexOf(p.card.rarity as (typeof GACHA_TIERS)[number]) : -1;
}
function revealSpeed(idx: number): number {
  return idx >= 4 ? 0.85 : idx === 3 ? 1 : 1.8;
}
function ringCount(idx: number, maxSlots: number): number {
  if (idx >= 5) return Math.min(3, maxSlots);
  if (idx === 4) return Math.min(2, maxSlots);
  if (idx >= 3) return Math.min(1, maxSlots);
  return 0;
}
function particleCount(idx: number, maxSlots: number): number {
  if (idx >= 5) return Math.min(24, maxSlots);
  if (idx === 4) return Math.min(12, maxSlots);
  if (idx >= 3) return Math.min(8, maxSlots);
  return 0;
}

function animateShine(target: Element | null) {
  if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  return gsap.fromTo(target, { x: "-150%" }, {
    x: "150%",
    duration: 1.2,
    delay: 0.9,
    repeat: -1,
    repeatDelay: 0.9,
    ease: "none",
  });
}

interface RollStageProps {
  pull: GachaPull | null;
  onClose: () => void;
  preview?: boolean;
  /** Configuração de animação (opcional — usa DEFAULT_ROLL_ANIM_CONFIG se omitido) */
  config?: Partial<RollAnimConfig>;
}

export function RollStage({ pull, onClose, preview = false, config }: RollStageProps) {
  const cfg = { ...DEFAULT_ROLL_ANIM_CONFIG, ...config };
  const dialog = useRef<HTMLDialogElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const flipBuilder = useRef<(idx: number) => void>(() => {});
  const latestPull = useRef(pull);
  latestPull.current = pull;
  const skipped = useRef(false);
  const waiting = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const ready = !!pull && revealed;
  const tierIndex = tierOf(pull);
  const tierText = pull
    ? pull.card.rarity === "GALACTICA"
      ? "text-violet-400"
      : RARITY_TEXT[pull.card.rarity] ?? "text-ice"
    : "";

  const particleSlots = cfg.particleSlots;
  const particleGalaxy = cfg.particleGalaxy;
  const ringSlots = cfg.ringSlots;

  // Derivados: o flip sobrepõe os circuitos (não espera o fim deles), como antes.
  const flipAt = cfg.revealAt + cfg.effectsGap;
  const flipEnd = flipAt + cfg.flipDuration;
  const readyAt = flipEnd + cfg.badgeDuration;

  useEffect(() => {
    if (!revealed || !pull || pull.foil === "NORMAL") return;
    const tween = animateShine(dialog.current?.querySelector("[data-foil-shine]") ?? null);
    return () => { tween?.kill(); };
  }, [pull, revealed]);

  useEffect(() => {
    const el = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useGSAP(() => {
    animateShine(dialog.current?.querySelector("[data-back-shine]") ?? null);
    const tl = gsap.timeline();
    timeline.current = tl;
    if (pull) tl.timeScale(revealSpeed(tierIndex));

    const buildFlip = (idx: number) => {
      const el = dialog.current?.querySelector("[data-flip]");
      if (!el) return;
      tl.killTweensOf(el);
      tl.to(el, { rotationY: 180, scale: 0.94, duration: cfg.flipDuration, ease: "power2.inOut" }, flipAt)
        .to(el, { scale: 1, duration: 0.3, ease: "power2.out" }, ">");
    };
    flipBuilder.current = buildFlip;

    tl.from("[data-stage]", { scale: 0.94, opacity: 0, duration: cfg.enterDuration }, 0)
      .to("[data-crystal]", { rotation: 360, scale: 1.12, duration: cfg.crystalSpinDuration, ease: "power2.inOut" }, cfg.crystalSpinAt)
      .fromTo("[data-glow]", { opacity: 0.25, scale: 1 }, { opacity: 0.8, scale: 1.25, duration: cfg.glowDuration, ease: "power2.in", immediateRender: false }, cfg.glowAt)
      .call(() => setCanSkip(true), [], cfg.skipAt)
      .call(() => {
        waiting.current = true;
        if (!latestPull.current) tl.pause();
        else tl.timeScale(revealSpeed(tierOf(latestPull.current)));
      }, [], cfg.revealAt)
      .to("[data-crystal]", { scale: 0, opacity: 0, duration: cfg.crystalOutDuration, ease: "back.in(2)" }, cfg.revealAt)
      .fromTo("[data-ring]", { scale: 0.4, opacity: 0.8 }, { scale: 2, opacity: 0, duration: cfg.ringDuration, stagger: cfg.ringStagger, immediateRender: false }, cfg.revealAt)
      .fromTo("[data-particle]", { x: 0, y: 0, opacity: 1 }, {
        x: (i) => Math.cos(i * Math.PI * 2 / particleSlots) * cfg.particleReach.x,
        y: (i) => Math.sin(i * Math.PI * 2 / particleSlots) * cfg.particleReach.y,
        opacity: 0, duration: cfg.particleDuration, immediateRender: false, ease: "power2.out",
      }, cfg.revealAt)
      .fromTo("[data-sweep]", { x: "-150%" }, { x: "150%", duration: cfg.sweepDuration, ease: "power1.inOut", immediateRender: false }, flipEnd)
      .fromTo("[data-badge]", { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, ease: "back.out(2)", duration: cfg.badgeDuration, immediateRender: false }, flipEnd)
      .call(() => setRevealed(true), [], readyAt);

    // O flip precisa existir desde o frame zero: waiting.current só vira true
    // dentro do .call() de revealAt, ou seja, tarde demais para agendar o tween.
    buildFlip(tierIndex);

    return () => { timeline.current = null; };
  }, {
    scope: dialog,
    revertOnUpdate: true,
    dependencies: [
      cfg.enterDuration,
      cfg.crystalSpinAt,
      cfg.crystalSpinDuration,
      cfg.glowAt,
      cfg.glowDuration,
      cfg.skipAt,
      cfg.revealAt,
      cfg.crystalOutDuration,
      cfg.ringSlots,
      cfg.ringDuration,
      cfg.ringStagger,
      cfg.particleSlots,
      cfg.particleDuration,
      cfg.particleReach.x,
      cfg.particleReach.y,
      cfg.effectsGap,
      cfg.flipDuration,
      cfg.sweepDuration,
      cfg.badgeDuration,
    ],
  });

  useEffect(() => {
    if (!pull) return;
    const tl = timeline.current;
    if (!tl) return;
    if (skipped.current) {
      tl.progress(1, true).pause();
      setRevealed(true);
      return;
    }
    tl.timeScale(revealSpeed(tierIndex));
    if (waiting.current) {
      flipBuilder.current(tierIndex);
      tl.play(cfg.revealAt);
    }
  }, [pull, tierIndex, cfg.revealAt]);

  function skipOrClose() {
    if (ready) return onClose();
    skipped.current = true;
    if (pull) {
      timeline.current?.progress(1, true).pause();
      setRevealed(true);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="roll-title"
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto border-0 bg-ink-deep/95 p-4 text-snow backdrop:bg-ink-deep/95"
      onCancel={(event) => { event.preventDefault(); skipOrClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget && ready) onClose(); }}>
      <div className="pointer-events-none flex min-h-full flex-col items-center justify-center gap-5">
        <h2 id="roll-title" className="font-display text-display-lg" aria-live="polite">
          {ready ? (preview ? "Prévia revelada" : "Sua carta") : "Invocando sua carta…"}
        </h2>
        <div data-stage className={`pointer-events-auto relative aspect-[3/4] w-56 max-w-[65vw] ${tierText || "text-ice"}`} style={{ perspective: 1000 }}>
          <>
            <div data-glow aria-hidden="true" className="absolute inset-0 rounded-full bg-current opacity-20 blur-3xl" />
            {Array.from({ length: ringSlots }, (_, i) => (
              <div key={i} data-ring aria-hidden="true"
                className={`absolute inset-0 rounded-full border border-current opacity-0 ${i < ringCount(tierIndex, ringSlots) ? "" : "hidden"}`} />
            ))}
            {Array.from({ length: particleSlots }, (_, i) => {
              const count = particleCount(tierIndex, particleSlots);
              const visible = count > 0 && i % (particleSlots / count) === 0;
              return <i key={i} data-particle aria-hidden="true"
                style={pull?.card.rarity === "GALACTICA" ? { backgroundColor: particleGalaxy[i % 3] } : undefined}
                className={`absolute left-1/2 top-1/2 h-2 w-1 bg-current opacity-0 ${visible ? "" : "hidden"}`} />;
            })}
          </>
          <div data-flip className="relative aspect-[3/4]" style={{ transformStyle: "preserve-3d" }}>
            <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center overflow-hidden border border-ice/40 bg-panel" style={{ backfaceVisibility: "hidden" }}>
              <div data-crystal className="h-28 w-28 rotate-45 border border-ice/70 bg-gradient-to-tr from-transparent via-ice/30 to-ice/5 shadow-glow-ice" />
              <div data-back-shine className="absolute inset-0 bg-gradient-to-r from-transparent via-snow/15 to-transparent" />
            </div>
            <div inert={!ready} aria-hidden={!ready} className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              {pull && <GachaCard pull={pull} preview={preview} showInfo={false} />}
              {pull?.foil !== "NORMAL" && pull && <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div data-sweep className="h-full w-full -translate-x-[150%] bg-gradient-to-r from-transparent via-snow/40 to-transparent mix-blend-screen" />
              <div data-foil-shine className={`h-full w-full bg-gradient-to-r from-transparent via-snow/30 to-transparent ${revealed ? "" : "invisible"}`} />
              </div>}
            </div>
          </div>
        </div>
        <div data-badge className="text-center" style={{ opacity: 0 }} aria-hidden={!ready}>
          <p className={`font-mono ${pull?.card.rarity === "GALACTICA" ? GALAXY_TEXT : tierText || "text-ice"}`}>{pull?.card.rarity}</p>
          {pull && <p className="max-w-56 truncate font-medium text-snow">{pull.card.name}</p>}
          {pull && <p><CountUp to={pull.value} startWhen={ready} /> pts</p>}
        </div>
        <button autoFocus type="button" onClick={() => { if (ready || canSkip) skipOrClose(); }}
          className={`pointer-events-auto min-h-11 px-6 py-3 focus-visible:outline focus-visible:outline-ice ${ready ? "btn-ice" : "text-mist"}`}
          aria-disabled={!ready && !canSkip}
          style={{ opacity: ready || canSkip ? 1 : 0 }}>
          {ready ? "Continuar" : skipped.current ? "Aguardando carta…" : "Pular"}
        </button>
      </div>
    </dialog>
  );
}