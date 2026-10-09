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
  return idx >= 4 ? 0.9 : 1;
}
function ringCount(idx: number): number {
  return idx >= 5 ? 3 : idx === 4 ? 2 : 1;
}
function particleCount(idx: number): number {
  return idx >= 5 ? 24 : idx === 4 ? 12 : idx >= 3 ? 8 : 6;
}
export function RollStage({ pull, reduceMotion, onClose, preview = false }: {
  pull: GachaPull | null;
  reduceMotion: boolean;
  onClose: () => void;
  /** Preview de giro: carta revelada, ainda sem dono. */
  preview?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const flipBuilder = useRef<(idx: number) => void>(() => {});
  const latestPull = useRef(pull);
  latestPull.current = pull;
  const [skipped, setSkipped] = useState(false);
  // Capture before the opening commit disables the trigger and moves focus.
  const [previousFocus] = useState(() =>
    typeof document === "undefined" ? null : document.activeElement as HTMLElement | null,
  );
  const waiting = useRef(false);
  const [revealed, setRevealed] = useState(reduceMotion);
  const ready = !!pull && (reduceMotion || revealed);
  const tierIndex = tierOf(pull);
  const tierText = pull
    ? pull.card.rarity === "GALACTICA"
      ? "text-violet-400"
      : RARITY_TEXT[pull.card.rarity] ?? "text-ice"
    : "";

  useEffect(() => {
    const el = dialog.current!;
    const overflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, [previousFocus]);

  useGSAP(() => {
    if (reduceMotion) {
      gsap.fromTo(dialog.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      return;
    }
    const tl = gsap.timeline();
    timeline.current = tl;
    if (pull) tl.timeScale(revealSpeed(tierIndex));
    const select = gsap.utils.selector(dialog);
    let reveal: gsap.core.Timeline | null = null;
    const buildFlip = (idx: number) => {
      reveal?.kill();
      const rare = idx >= 4;
      const frontAt = 1.4;
      const settledAt = frontAt + 0.35;
      const rarityCallout = idx >= 6 ? "GALACTICA!" : idx >= 5 ? "MÍTICA!" : idx >= 4 ? "LENDÁRIA!" : idx === 3 ? "ÉPICA!" : "Sua carta";
      reveal = gsap.timeline();
      reveal.to(select("[data-flip]"), {
        rotationY: 180, scale: rare ? 0.92 : 0.96,
        duration: 1.1, ease: "power2.inOut",
      }, 0.3)
        .to(select("[data-flip]"), { scale: 1, duration: 0.35, ease: "power2.out" }, frontAt)
        .to(select("[data-crystal]"), { scale: 0, opacity: 0, duration: 0.25, ease: "back.in(2)" }, 0)
        .fromTo(select("[data-ring]"), { scale: 0.4, opacity: 0.8 }, {
          scale: 2, opacity: 0, duration: 0.55, stagger: 0.12, immediateRender: false,
        }, frontAt)
        .fromTo(select("[data-particle]"), { x: 0, y: 0, opacity: 1 }, {
          x: (i) => Math.cos(i * Math.PI * 2 / PARTICLE_SLOTS) * 180,
          y: (i) => Math.sin(i * Math.PI * 2 / PARTICLE_SLOTS) * 230,
          opacity: 0, duration: 0.65, immediateRender: false, ease: "power2.out",
        }, frontAt)
        .fromTo(select("[data-sweep]"), { x: "-150%" }, {
          x: "150%", duration: 0.6, ease: "power1.inOut", immediateRender: false,
        }, frontAt + 0.15)
        .fromTo(select("[data-badge]"), { scale: 0.9, opacity: 0 }, {
          scale: 1, opacity: 1, ease: "power2.out", duration: 0.25, immediateRender: false,
        }, settledAt)
        .fromTo(select("[data-rarity-title]"), {
          scale: idx >= 4 ? 0.55 : 0.8, y: 16, opacity: 0,
        }, {
          scale: 1, y: 0, opacity: 1, duration: 0.35,
          ease: "power2.out", immediateRender: false,
        }, settledAt)
        .call(() => {
          const title = select("[data-rarity-title]")[0];
          if (title) title.textContent = idx >= 3 ? rarityCallout : "Sua carta";
        }, [], frontAt)
        .call(() => setRevealed(true), [], settledAt);
      tl.add(reveal, "reveal");
    };
    flipBuilder.current = buildFlip;
    tl.addLabel("reveal", 1.8);
    tl.from("[data-stage]", { scale: 0.94, opacity: 0, duration: 0.15 }, 0)
      .to("[data-crystal]", { scale: 1.08, duration: 1.2, ease: "power2.in" }, 0.2)
      .fromTo("[data-glow]", { opacity: 0.25, scale: 1 }, { opacity: 0.8, scale: 1.25, duration: 1.3, ease: "power2.in", immediateRender: false }, 0.3)
      .call(() => {
        waiting.current = true;
        if (!latestPull.current) tl.pause();
        else tl.timeScale(revealSpeed(tierOf(latestPull.current)));
      }, [], 1.8);
    buildFlip(tierIndex);
    return () => { timeline.current = null; };
  }, { scope: dialog, dependencies: [reduceMotion], revertOnUpdate: true });

  useEffect(() => {
    if (!pull || reduceMotion) return;
    const tl = timeline.current;
    if (skipped) {
      tl?.progress(1, true).pause();
      setRevealed(true);
    } else if (waiting.current) {
      flipBuilder.current(tierIndex);
      tl?.timeScale(revealSpeed(tierIndex)).play("reveal");
    } else {
      flipBuilder.current(tierIndex);
      tl?.timeScale(revealSpeed(tierIndex));
    }
  }, [pull, reduceMotion, tierIndex, skipped]);

  function skipOrClose() {
    if (ready) return onClose();
    setSkipped(true);
    timeline.current?.pause();
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
        <h2 id="roll-title" data-rarity-title className="font-display text-display-lg" aria-live="polite">
          {ready
            ? tierIndex >= 6 ? "GALACTICA!" : tierIndex >= 5 ? "MÍTICA!" : tierIndex >= 4 ? "LENDÁRIA!" : tierIndex >= 3 ? "ÉPICA!" : preview ? "Prévia revelada" : "Sua carta"
            : "Invocando sua carta…"}
        </h2>
        <div data-stage className={`pointer-events-auto relative flex min-h-[min(90vw,26rem)] w-56 max-w-[65vw] items-center ${tierText || "text-ice"}`} style={{ perspective: 1000 }}>
          {!reduceMotion && <>
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
          </>}
          {!reduceMotion && <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div data-crystal className="aspect-square w-[min(90vw,26rem)] shrink-0 bg-cover bg-center mix-blend-screen"
              style={{ backgroundImage: "url(/gacha/crystal.webp)", maskImage: "radial-gradient(closest-side, black 75%, transparent 100%)" }} />
          </div>}
          <div data-flip className="relative w-full" style={{ transformStyle: "preserve-3d", transform: reduceMotion ? "rotateY(180deg)" : undefined }}>
            <div inert={!ready} aria-hidden={!ready} className="relative min-h-80" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              {pull && <GachaCard pull={pull} preview={preview} />}
              <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${pull && pull.foil !== "NORMAL" ? "" : "invisible"}`}>
                <div data-sweep className="h-full w-full -translate-x-[150%] bg-gradient-to-r from-transparent via-snow/40 to-transparent mix-blend-screen" />
                <div className={`h-full w-full bg-gradient-to-r from-transparent via-snow/30 to-transparent motion-reduce:animate-none ${revealed ? "animate-rollShine" : "invisible"}`} />
              </div>
            </div>
          </div>
        </div>
        <div data-badge className="text-center" style={{ opacity: reduceMotion ? 1 : 0 }} aria-hidden={!ready}>
          <p className={`font-mono ${pull?.card.rarity === "GALACTICA" ? GALAXY_TEXT : tierText || "text-ice"}`}>{pull?.card.rarity}</p>
          {pull && <p>{reduceMotion ? pull.value : <CountUp to={pull.value} startWhen={ready} />} pts</p>}
        </div>
        <button autoFocus type="button" onClick={skipOrClose}
          className={`pointer-events-auto min-h-11 px-6 py-3 focus-visible:outline focus-visible:outline-ice ${ready ? "btn-ice" : "text-mist"}`}>
          {ready ? "Continuar" : skipped ? "Aguardando carta…" : "Pular"}
        </button>
      </div>
    </dialog>
  );
}
