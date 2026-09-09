"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { GachaCard, GACHA_TIERS, GALAXY_TEXT, RARITY_TEXT } from "./GachaCard";
import { CountUp } from "@/components/core/CountUp";
import type { GachaPull } from "@/types";

export function RollStage({ pull, reduceMotion, onClose }: {
  pull: GachaPull | null;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const latestPull = useRef(pull);
  latestPull.current = pull;
  const skipped = useRef(false);
  const waiting = useRef(false);
  const [revealed, setRevealed] = useState(reduceMotion);
  const [canSkip, setCanSkip] = useState(false);
  const ready = !!pull && (reduceMotion || revealed);
  const tierIndex = pull ? GACHA_TIERS.indexOf(pull.card.rarity as (typeof GACHA_TIERS)[number]) : -1;
  const burst = tierIndex >= 3;
  const big = tierIndex >= 4;
  const tierText = pull
    ? pull.card.rarity === "GALACTICA"
      ? "text-violet-400"
      : RARITY_TEXT[pull.card.rarity] ?? "text-ice"
    : "";

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
    if (reduceMotion) {
      gsap.fromTo(dialog.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      return;
    }
    const tl = gsap.timeline();
    timeline.current = tl;
    tl.from("[data-stage]", { scale: 0.94, opacity: 0, duration: 0.15 })
      .to("[data-crystal]", { rotation: 135, scale: 1.25, opacity: 0.45, duration: 0.4 })
      .call(() => setCanSkip(true), [], 0.6)
      .to("[data-crystal]", { rotation: 225, scale: 0.85, opacity: 1, duration: 0.3 })
      .to("[data-crystal]", { rotation: 315, scale: 1.35, opacity: 0.6, duration: 0.2 })
      .to("[data-crystal]", { rotation: 405, scale: 1, opacity: 1, duration: 0.1 })
      .to("[data-glow]", { opacity: 0.7, scale: 1.2, duration: 0.3, ease: "steps(3)" })
      .call(() => {
        waiting.current = true;
        if (!latestPull.current) tl.pause();
        else {
          const idx = latestPull.current
            ? GACHA_TIERS.indexOf(latestPull.current.card.rarity as (typeof GACHA_TIERS)[number])
            : -1;
          tl.timeScale(idx >= 4 ? 0.85 : idx === 3 ? 1 : 1.8);
        }
      }, [], 1.8)
      .addLabel("reveal", 1.8)
      .fromTo("[data-ring]", { scale: 0.4, opacity: 0.8 }, { scale: 2, opacity: 0, duration: 0.55, immediateRender: false }, "reveal")
      .fromTo("[data-particle]", { x: 0, y: 0, opacity: 1 }, {
        x: (i) => Math.cos(i * Math.PI * 2 / 14) * 180,
        y: (i) => Math.sin(i * Math.PI * 2 / 14) * 230,
        opacity: 0, duration: 0.65, immediateRender: false, ease: "power2.out",
      }, "reveal")
      .fromTo("[data-flash]", { opacity: 0.3 }, { opacity: 0, duration: 0.4, immediateRender: false }, "reveal")
      .to("[data-stage]", { x: () => latestPull.current?.card.rarity === "LENDARIA" ? 3 : 0, yoyo: true, repeat: 3, duration: 0.06 }, "reveal")
      .to("[data-flip]", { rotationY: 180, duration: 0.65, ease: "power2.inOut" }, "reveal+=0.3")
      .fromTo("[data-badge]", { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, ease: "back.out(2)", duration: 0.3, immediateRender: false })
      .call(() => setRevealed(true));
    return () => { timeline.current = null; };
  }, { scope: dialog, dependencies: [reduceMotion], revertOnUpdate: true });

  useEffect(() => {
    if (!pull || reduceMotion) return;
    const tl = timeline.current;
    if (skipped.current) {
      tl?.progress(1, true).pause();
      setRevealed(true);
    } else if (waiting.current) {
      tl?.play("reveal");
    }
    if (tl && waiting.current) tl.timeScale(tierIndex >= 4 ? 0.85 : burst ? 1 : 1.3);
  }, [pull, reduceMotion, burst, tierIndex]);

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
          {ready ? "Sua carta" : "Invocando sua carta…"}
        </h2>
        <div data-stage className={`pointer-events-auto relative w-56 max-w-[65vw] ${tierText || "text-ice"}`} style={{ perspective: 1000 }}>
          {!reduceMotion && <>
            <div data-flash aria-hidden="true" className="pointer-events-none absolute -inset-8 bg-current opacity-0 blur-2xl" />
            <div data-glow aria-hidden="true" className="absolute inset-0 animate-pulseGlow rounded-full bg-current opacity-20 blur-3xl" />
            <div data-ring aria-hidden="true" className={`absolute inset-0 rounded-full border border-current opacity-0 ${burst ? "" : "hidden"}`} />
            {Array.from({ length: 14 }, (_, i) => <i key={i} data-particle aria-hidden="true"
              className={`absolute left-1/2 top-1/2 h-2 w-1 bg-current opacity-0 ${!burst ? "hidden" : i % 2 ? "hidden md:block" : ""}`} />)}
          </>}
          <div data-flip className="relative" style={{ transformStyle: "preserve-3d", transform: reduceMotion ? "rotateY(180deg)" : undefined }}>
            <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center overflow-hidden border border-ice/40 bg-panel" style={{ backfaceVisibility: "hidden" }}>
              <div data-crystal className="h-28 w-28 rotate-45 border border-ice/70 bg-gradient-to-tr from-transparent via-ice/30 to-ice/5 shadow-glow-ice" />
              <div className="absolute inset-0 animate-rollShine bg-gradient-to-r from-transparent via-snow/15 to-transparent" />
            </div>
            <div inert={!ready} aria-hidden={!ready} className="relative min-h-80" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              {pull && <GachaCard pull={pull} />}
              {pull?.foil !== "NORMAL" && pull && <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden"><div className="h-full w-full animate-rollShine bg-gradient-to-r from-transparent via-snow/30 to-transparent motion-reduce:animate-none" /></div>}
            </div>
          </div>
        </div>
        <div data-badge className="text-center" style={{ opacity: reduceMotion ? 1 : 0 }} aria-hidden={!ready}>
          <p className={`font-mono ${pull?.card.rarity === "GALACTICA" ? GALAXY_TEXT : tierText || "text-ice"}`}>{pull?.card.rarity}</p>
          {pull && <p>{reduceMotion ? pull.value : <CountUp to={pull.value} startWhen={ready} />} pts</p>}
        </div>
        <button autoFocus type="button" onClick={() => { if (ready || canSkip || reduceMotion) skipOrClose(); }}
          className={`pointer-events-auto min-h-11 px-6 py-3 focus-visible:outline focus-visible:outline-ice ${ready ? "btn-ice" : "text-mist"}`}
          aria-disabled={!ready && !canSkip && !reduceMotion}
          style={{ opacity: ready || canSkip || reduceMotion ? 1 : 0 }}>
          {ready ? "Continuar" : skipped.current || reduceMotion ? "Aguardando carta…" : "Pular"}
        </button>
      </div>
    </dialog>
  );
}
