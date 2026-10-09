"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { GachaCard, GACHA_TIERS, GALAXY_TEXT, RARITY_TEXT } from "./GachaCard";
import { CountUp } from "@/components/core/CountUp";
import type { GachaPull } from "@/types";

const PARTICLE_SLOTS = 24;
const PARTICLE_GALAXY = ["#a78bfa", "#f472b6", "#38bdf8"];

function tierOf(p: GachaPull | null): number {
  return p ? GACHA_TIERS.indexOf(p.card.rarity as (typeof GACHA_TIERS)[number]) : -1;
}
function revealSpeed(idx: number): number {
  return idx >= 4 ? 0.85 : idx === 3 ? 1 : 1.8;
}
function ringCount(idx: number): number {
  return idx >= 5 ? 3 : idx === 4 ? 2 : idx >= 3 ? 1 : 0;
}
function particleCount(idx: number): number {
  return idx >= 5 ? 24 : idx === 4 ? 12 : idx >= 3 ? 8 : 0;
}
export function RollStage({ pull, onClose, preview = false }: {
  pull: GachaPull | null;
  onClose: () => void;
  /** Preview de giro: carta revelada, ainda sem dono. */
  preview?: boolean;
}) {
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
    const tl = gsap.timeline();
    timeline.current = tl;
    if (pull) tl.timeScale(revealSpeed(tierIndex));
    const buildFlip = (idx: number) => {
      const el = dialog.current?.querySelector("[data-flip]");
      if (!el) return;
      tl.killTweensOf(el);
      tl.to(el, { rotationY: 180, scale: 0.94, duration: 0.48, ease: "power2.inOut" }, "reveal+=0.12")
        .to(el, { scale: 1, duration: 0.3, ease: "power2.out" }, ">");
    };
    flipBuilder.current = buildFlip;
    tl.addLabel("reveal", 1.8);
    buildFlip(tierIndex);
    tl.from("[data-stage]", { scale: 0.94, opacity: 0, duration: 0.15 })
      .to("[data-crystal]", { rotation: 360, scale: 1.12, duration: 1.2, ease: "power2.inOut" }, 0.2)
      .fromTo("[data-glow]", { opacity: 0.25, scale: 1 }, { opacity: 0.8, scale: 1.25, duration: 1.3, ease: "power2.in", immediateRender: false }, 0.3)
      .call(() => setCanSkip(true), [], 0.6)
      .call(() => {
        waiting.current = true;
        if (!latestPull.current) tl.pause();
        else tl.timeScale(revealSpeed(tierOf(latestPull.current)));
      }, [], 1.8)
      .to("[data-crystal]", { scale: 0, opacity: 0, duration: 0.25, ease: "back.in(2)" }, "reveal")
      .fromTo("[data-ring]", { scale: 0.4, opacity: 0.8 }, { scale: 2, opacity: 0, duration: 0.55, stagger: 0.12, immediateRender: false }, "reveal")
      .fromTo("[data-particle]", { x: 0, y: 0, opacity: 1 }, {
        x: (i) => Math.cos(i * Math.PI * 2 / PARTICLE_SLOTS) * 180,
        y: (i) => Math.sin(i * Math.PI * 2 / PARTICLE_SLOTS) * 230,
        opacity: 0, duration: 0.65, immediateRender: false, ease: "power2.out",
      }, "reveal")
      .fromTo("[data-sweep]", { x: "-150%" }, { x: "150%", duration: 0.6, ease: "power1.inOut", immediateRender: false }, "reveal+=0.75")
      .fromTo("[data-badge]", { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, ease: "back.out(2)", duration: 0.3, immediateRender: false }, "reveal+=0.9")
      .call(() => setRevealed(true), [], "reveal+=0.9");
    return () => { timeline.current = null; };
  }, { scope: dialog, revertOnUpdate: true });

  useEffect(() => {
    if (!pull) return;
    const tl = timeline.current;
    if (skipped.current) {
      tl?.progress(1, true).pause();
      setRevealed(true);
    } else if (waiting.current) {
      flipBuilder.current(tierIndex);
      tl?.play("reveal");
    } else {
      flipBuilder.current(tierIndex);
      tl?.timeScale(revealSpeed(tierIndex));
    }
  }, [pull, tierIndex]);

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
        <div data-stage className={`pointer-events-auto relative w-56 max-w-[65vw] ${tierText || "text-ice"}`} style={{ perspective: 1000 }}>
          <>
            <div data-glow aria-hidden="true" className="absolute inset-0 rounded-full bg-current opacity-20 blur-3xl" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} data-ring aria-hidden="true"
                className={`absolute inset-0 rounded-full border border-current opacity-0 ${i < ringCount(tierIndex) ? "" : "hidden"}`} />
            ))}
            {Array.from({ length: PARTICLE_SLOTS }, (_, i) => {
              const count = particleCount(tierIndex);
              const visible = count > 0 && i % (PARTICLE_SLOTS / count) === 0;
              return <i key={i} data-particle aria-hidden="true"
                style={pull?.card.rarity === "GALACTICA" ? { backgroundColor: PARTICLE_GALAXY[i % 3] } : undefined}
                className={`absolute left-1/2 top-1/2 h-2 w-1 bg-current opacity-0 ${visible ? "" : "hidden"}`} />;
            })}
          </>
          <div data-flip className="relative" style={{ transformStyle: "preserve-3d" }}>
            <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center overflow-hidden border border-ice/40 bg-panel" style={{ backfaceVisibility: "hidden" }}>
              <div data-crystal className="h-28 w-28 rotate-45 border border-ice/70 bg-gradient-to-tr from-transparent via-ice/30 to-ice/5 shadow-glow-ice" />
              <div className="absolute inset-0 animate-rollShine bg-gradient-to-r from-transparent via-snow/15 to-transparent" />
            </div>
            <div inert={!ready} aria-hidden={!ready} className="relative min-h-80" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              {pull && <GachaCard pull={pull} preview={preview} />}
              {pull?.foil !== "NORMAL" && pull && <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div data-sweep className="h-full w-full -translate-x-[150%] bg-gradient-to-r from-transparent via-snow/40 to-transparent mix-blend-screen" />
                <div className={`h-full w-full bg-gradient-to-r from-transparent via-snow/30 to-transparent motion-reduce:animate-none ${revealed ? "animate-rollShine" : "invisible"}`} />
              </div>}
            </div>
          </div>
        </div>
        <div data-badge className="text-center" style={{ opacity: 0 }} aria-hidden={!ready}>
          <p className={`font-mono ${pull?.card.rarity === "GALACTICA" ? GALAXY_TEXT : tierText || "text-ice"}`}>{pull?.card.rarity}</p>
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
