"use client";

import Script from "next/script";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { GachaCard, GACHA_TIERS, GALAXY_TEXT, RARITY_TEXT } from "./GachaCard";
import { CountUp } from "@/components/core/CountUp";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { GachaPull } from "@/types";
import { DEFAULT_ROLL_ANIM_CONFIG, type RollAnimConfig } from "@/lib/roll-anim-config";

export { DEFAULT_ROLL_ANIM_CONFIG, parseRollAnimJson } from "@/lib/roll-anim-config";
export type { ParsedRollJson, RollAnimConfig } from "@/lib/roll-anim-config";

declare global {
  interface Window {
    gsap?: typeof import("gsap").default;
  }
}

type RollTimeline = ReturnType<NonNullable<Window["gsap"]>["timeline"]>;
type RollRarity = (typeof GACHA_TIERS)[number];
type RollPhase = "press" | "invocation" | "tease" | "title" | "impact" | "reveal" | "showcase" | "waiting";

const GSAP_SRC = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
const GSAP_INTEGRITY = "sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt";
const RARITY_COLORS: Record<RollRarity, string> = {
  COMUM: "#38E8DA",
  INCOMUM: "#34D399",
  RARA: "#38BDF8",
  EPICA: "#A78BFA",
  LENDARIA: "#FCD34D",
  MITICA: "#FB7185",
  GALACTICA: "#C084FC",
};
const TEASE_DURATION: Record<RollRarity, number> = {
  COMUM: 0.8,
  INCOMUM: 0.95,
  RARA: 1.2,
  EPICA: 1.8,
  LENDARIA: 2.5,
  MITICA: 2.5,
  GALACTICA: 2.5,
};
const RARITY_ALIASES: Record<string, RollRarity> = {
  COMMON: "COMUM",
  UNCOMMON: "INCOMUM",
  RARE: "RARA",
  EPIC: "EPICA",
  LEGENDARY: "LENDARIA",
  MYTHIC: "MITICA",
  GALACTIC: "GALACTICA",
};

function rarityOf(pull: GachaPull | null): RollRarity {
  const rarity = pull?.card.rarity;
  return GACHA_TIERS.includes(rarity as RollRarity) ? (rarity as RollRarity) : "COMUM";
}

function readDebugRarity(): RollRarity | null {
  if (typeof process === "undefined" || process.env.NODE_ENV === "production") return null;
  const value = new URLSearchParams(window.location.search).get("debugRarity");
  if (!value) return null;
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (GACHA_TIERS.includes(normalized as RollRarity)) return normalized as RollRarity;
  return RARITY_ALIASES[normalized] ?? null;
}

function createParticles(count: number, seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return Array.from({ length: count }, (_, index) => {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    const unit = (hash >>> 0) / 4294967295;
    return {
      angle: (index / Math.max(1, count)) * Math.PI * 2 + unit * 0.24,
      distance: 90 + unit * 300,
      size: 1 + unit * 2.4,
      delay: unit * 0.32,
    };
  });
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
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
  const timeline = useRef<RollTimeline | null>(null);
  const activeLoops = useRef<Array<{ kill: () => void }>>([]);
  const appendReveal = useRef<(result: GachaPull) => void>(() => {});
  const latestPull = useRef<GachaPull | null>(pull);
  const skipped = useRef(false);
  const waiting = useRef(false);
  const revealAdded = useRef(false);
  const particleMode = useRef<"gather" | "burst" | "none">("gather");
  const burstStart = useRef(0);
  const particles = useRef<ReturnType<typeof createParticles>>([]);
  const continuation = useRef<HTMLButtonElement>(null);
  const filterId = useId().replace(/:/g, "");
  const reduceMotion = usePrefersReducedMotion();
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);
  const [gsapReady, setGsapReady] = useState(false);
  const [gsapFailed, setGsapFailed] = useState(false);
  const [debugRarity] = useState<RollRarity | null>(() =>
    typeof window === "undefined" ? null : readDebugRarity(),
  );
  const [revealed, setRevealed] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [waitingForPull, setWaitingForPull] = useState(false);
  const [effectsDone, setEffectsDone] = useState(false);
  const [phase, setPhase] = useState<RollPhase>("press");

  // The debug tier is presentation-only: the API result and stored pull stay untouched.
  const displayPull = useMemo(
    () => pull && debugRarity ? { ...pull, card: { ...pull.card, rarity: debugRarity } } : pull,
    [pull, debugRarity],
  );
  latestPull.current = displayPull;
  const rarity = rarityOf(displayPull);
  const rarityIndex = GACHA_TIERS.indexOf(rarity);
  const accent = RARITY_COLORS[rarity];
  const rarityText = rarity === "GALACTICA" ? GALAXY_TEXT : RARITY_TEXT[rarity] ?? "text-ice";
  const ready = !!displayPull && canContinue;
  const rarityRef = useRef(rarity);
  const accentRef = useRef(accent);
  rarityRef.current = rarity;
  accentRef.current = accent;

  useEffect(() => {
    setMotionPreferenceReady(true);
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (el.open) el.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (ready) continuation.current?.focus();
  }, [ready]);

  function markPhase(next: RollPhase) {
    setPhase(next);
  }

  const showFinal = useCallback(() => {
    const root = dialog.current;
    const gsap = window.gsap;
    const finalRarity = rarityOf(latestPull.current);
    timeline.current?.kill();
    timeline.current = null;
    activeLoops.current.forEach((loop) => loop.kill());
    activeLoops.current = [];
    const aura = root?.querySelectorAll<SVGCircleElement>("[data-tier-aura]");
    aura?.forEach((layer) => { layer.style.opacity = "0"; });
    const finalAura = root?.querySelector<SVGCircleElement>(`[data-tier-aura="${finalRarity}"]`);
    if (finalAura) finalAura.style.opacity = "1";
    if (root && gsap) {
      gsap.set(root.querySelector("[data-stage]"), { scale: 1, opacity: 1 });
      gsap.set(root.querySelector("[data-flip]"), {
        rotationY: reduceMotion ? 0 : 180,
        scale: 1,
        x: 0,
        y: 0,
      });
      gsap.set(root.querySelector("[data-badge]"), { opacity: 1, scale: 1 });
      gsap.set(root.querySelectorAll("[data-name-letter]"), { opacity: 1, y: 0 });
      gsap.set(root.querySelector("[data-sweep]"), { x: "150%", opacity: 0 });
      gsap.set(root.querySelector("[data-flash]"), { opacity: 0 });
      gsap.set(root.querySelector("[data-rarity-title]"), { opacity: 0 });
      gsap.set(root.querySelectorAll("[data-ring], [data-radial-rays]"), { opacity: 0 });
    }
    particleMode.current = "none";
    skipped.current = true;
    setWaitingForPull(false);
    setEffectsDone(true);
    setRevealed(true);
    setCanContinue(true);
    markPhase("showcase");
  }, [reduceMotion]);

  function skipOrClose() {
    if (ready) {
      onClose();
      return;
    }
    skipped.current = true;
    waiting.current = true;
    timeline.current?.pause();
    if (displayPull) showFinal();
    else {
      particleMode.current = "none";
      setEffectsDone(true);
      setWaitingForPull(true);
      markPhase("waiting");
    }
  }

  useEffect(() => {
    if (!displayPull) return;
    const mobileLimit = window.matchMedia("(max-width: 480px)").matches ? 120 : 180;
    particles.current = createParticles(Math.min(cfg.particleSlots, mobileLimit), displayPull.id);
    if (skipped.current) {
      showFinal();
      return;
    }
    if (reduceMotion && motionPreferenceReady) {
      setEffectsDone(true);
      setRevealed(true);
      setCanContinue(true);
      markPhase("showcase");
      return;
    }
    if (gsapFailed) showFinal();
    else if (waiting.current) appendReveal.current(displayPull);
  }, [displayPull, cfg.particleSlots, reduceMotion, motionPreferenceReady, gsapFailed, showFinal]);

  useEffect(() => {
    if (!motionPreferenceReady || reduceMotion || !gsapReady) return;
    const gsap = window.gsap;
    const root = dialog.current;
    if (!gsap || !root) {
      setGsapFailed(true);
      return;
    }
    if (skipped.current && latestPull.current) {
      showFinal();
      return;
    }
    revealAdded.current = false;
    waiting.current = false;

    const stage = root.querySelector<HTMLElement>("[data-stage]");
    const frame = root.querySelector<HTMLElement>("[data-shake-frame]");
    const canvas = root.querySelector<HTMLCanvasElement>("canvas");
    const context = canvas?.getContext("2d") ?? null;
    const loops: Array<{ kill: () => void }> = [];
    const invocationEnd = Math.max(1.7, cfg.revealAt);
    const setPhaseAt = (value: RollPhase) => markPhase(value);

    const drawParticles = (time: number) => {
      if (!canvas || !context || !stage || particleMode.current === "none") return;
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const card = stage.getBoundingClientRect();
      const cx = card.left - rect.left + card.width / 2;
      const cy = card.top - rect.top + card.height / 2;
      const burst = particleMode.current === "burst";
      const currentRarity = rarityRef.current;
      const currentAccent = accentRef.current;
      const palette = currentRarity === "GALACTICA"
        ? [...cfg.particleGalaxy, currentAccent]
        : [currentAccent, "#F1F5F9", currentAccent];
      for (let i = 0; i < particles.current.length; i += 1) {
        const particle = particles.current[i]!;
        if (!burst) {
          const progress = clamp01(time / invocationEnd - particle.delay);
          const radius = particle.distance * (1 - progress);
          context.globalAlpha = 0.65 * (0.35 + progress * 0.65);
          context.fillStyle = palette[i % palette.length]!;
          context.fillRect(
            cx + Math.cos(particle.angle) * radius,
            cy + Math.sin(particle.angle) * radius,
            particle.size,
            particle.size,
          );
        } else {
          const progress = clamp01((time - burstStart.current - particle.delay * 0.3) / Math.max(0.6, cfg.particleDuration));
          const radiusX = particle.distance * (cfg.particleReach.x / 180) * progress;
          const radiusY = particle.distance * (cfg.particleReach.y / 230) * progress;
          context.globalAlpha = (1 - progress) * 0.9;
          context.fillStyle = palette[i % palette.length]!;
          context.beginPath();
          context.arc(
            cx + Math.cos(particle.angle) * radiusX,
            cy + Math.sin(particle.angle) * radiusY,
            particle.size,
            0,
            Math.PI * 2,
          );
          context.fill();
        }
      }
      context.globalAlpha = 1;
    };

    let tl: RollTimeline;
    tl = gsap.timeline({
      paused: true,
      onUpdate: () => drawParticles(tl.time()),
    });
    tl.timeScale(1.5);
    timeline.current = tl;
    particleMode.current = "gather";
    if (particles.current.length === 0) {
      const mobileLimit = window.matchMedia("(max-width: 480px)").matches ? 120 : 180;
      particles.current = createParticles(Math.min(cfg.particleSlots, mobileLimit), latestPull.current?.id ?? "summoning");
    }

    const orbitOuter = root.querySelector<SVGElement>("[data-orbit-outer]");
    const orbitInner = root.querySelector<SVGElement>("[data-orbit-inner]");
    const runeOrbit = root.querySelector<SVGElement>("[data-rune-orbit]");
    if (orbitOuter) loops.push(gsap.to(orbitOuter, { rotation: 360, duration: 28, repeat: -1, ease: "none", transformOrigin: "50% 50%" }));
    if (orbitInner) loops.push(gsap.to(orbitInner, { rotation: -360, duration: 19, repeat: -1, ease: "none", transformOrigin: "50% 50%" }));
    if (runeOrbit) loops.push(gsap.to(runeOrbit, { rotation: 360, duration: 12, repeat: -1, ease: "none", transformOrigin: "50% 50%" }));
    activeLoops.current = loops;

    const addResultTimeline = (result: GachaPull) => {
      if (revealAdded.current || skipped.current) return;
      revealAdded.current = true;
      const resultRarity = rarityOf(result);
      const resultIndex = GACHA_TIERS.indexOf(resultRarity);
      const duration = TEASE_DURATION[resultRarity];
      const isTopTier = resultIndex >= GACHA_TIERS.indexOf("LENDARIA");
      const colorLayers = Array.from(root.querySelectorAll<SVGCircleElement>("[data-tier-aura]"));
      const selectedLayer = colorLayers.find((node) => node.dataset.tierAura === resultRarity);
      const allRings = Array.from(root.querySelectorAll<SVGCircleElement>("[data-ring]"));
      const impactStart = invocationEnd + duration + (isTopTier ? 1.2 : 0);
      const impactDuration = Math.max(0.2, cfg.crystalOutDuration);
      const revealStart = impactStart + impactDuration;
      const flipDuration = Math.max(0.55, cfg.flipDuration);
      const flip = root.querySelector<HTMLElement>("[data-flip]");
      const title = root.querySelector<HTMLElement>("[data-rarity-title]");
      const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-name-letter]"));
      const badge = root.querySelector<HTMLElement>("[data-badge]");
      const sweep = root.querySelector<HTMLElement>("[data-sweep]");
      const flash = root.querySelector<HTMLElement>("[data-flash]");
      const rays = root.querySelector<SVGElement>("[data-radial-rays]");
      const resultTl = gsap.timeline();
      const teaseSteps = Math.max(2, Math.floor(duration / 0.4));
      const rarityCycle: RollRarity[] = [...GACHA_TIERS];
      resultTl.set(colorLayers, { opacity: 0 }, 0);
      for (let i = 0; i < teaseSteps; i += 1) {
        const at = Math.min(duration - 0.2, i * (duration / teaseSteps));
        const tier = i === teaseSteps - 1 ? resultRarity : rarityCycle[i % rarityCycle.length]!;
        const layer = colorLayers.find((node) => node.dataset.tierAura === tier);
        resultTl.to(colorLayers, { opacity: 0, duration: 0.1 }, at);
        if (layer) resultTl.to(layer, { opacity: 0.7, duration: 0.18, ease: "sine.inOut" }, at + 0.1);
      }
      if (selectedLayer) resultTl.to(selectedLayer, { opacity: 1, duration: 0.18, ease: "sine.out" }, duration - 0.18);
      if (stage && resultIndex >= GACHA_TIERS.indexOf("EPICA")) {
        resultTl.to(stage, { scale: 1.05, duration, ease: "power1.inOut" }, 0);
      }
      if (title && isTopTier) {
        resultTl.call(() => setPhaseAt("title"), [], duration);
        resultTl.set(title, { opacity: 1, scale: 1 }, duration);
        resultTl.to(title, { opacity: 0, scale: 1.08, duration: 0.12 }, duration + 1.08);
      }

      resultTl.call(() => {
        waiting.current = false;
        setPhaseAt("impact");
        loops.forEach((loop) => loop.kill());
        activeLoops.current = [];
        particleMode.current = "burst";
        burstStart.current = tl.time();
        if (resultIndex >= GACHA_TIERS.indexOf("EPICA") && typeof navigator.vibrate === "function") {
          navigator.vibrate(resultIndex >= GACHA_TIERS.indexOf("LENDARIA") ? [45, 25, 70] : 35);
        }
      }, [], duration + (isTopTier ? 1.2 : 0));

      if (flash) {
        resultTl.fromTo(flash, { opacity: 0 }, { opacity: resultIndex >= GACHA_TIERS.indexOf("LENDARIA") ? 0.75 : 0.45, duration: 0.06, ease: "none" }, impactStart)
          .to(flash, { opacity: 0, duration: 0.1, ease: "power1.out" }, impactStart + 0.06);
      }
      const activeWaves = Math.max(1, Math.min(allRings.length, resultIndex >= 4 ? 3 : resultIndex >= 2 ? 2 : 1));
      allRings.forEach((ring, index) => {
        if (index >= activeWaves) return;
        resultTl.fromTo(ring, { scale: 0.15, opacity: 0.8 }, {
          scale: 3.1,
          opacity: 0,
          duration: cfg.ringDuration,
          ease: "power2.out",
          transformOrigin: "50% 50%",
        }, impactStart + index * cfg.ringStagger);
      });
      if (rays && resultIndex >= GACHA_TIERS.indexOf("EPICA")) {
        resultTl.fromTo(rays, { opacity: 0, rotation: -12 }, {
          opacity: resultIndex >= GACHA_TIERS.indexOf("LENDARIA") ? 0.9 : 0.6,
          rotation: 0,
          duration: 0.25,
          ease: "power2.out",
        }, impactStart);
        resultTl.to(rays, { rotation: 16, opacity: 0, duration: 0.55, ease: "power1.out" }, impactStart + 0.25);
      }
      if (frame) {
        const amplitude = resultIndex >= GACHA_TIERS.indexOf("LENDARIA") ? 3 : resultIndex >= 3 ? 2 : resultIndex >= 2 ? 1 : 0;
        if (amplitude) {
          resultTl.to(frame, { x: amplitude, y: -amplitude, duration: 0.045, ease: "none" }, impactStart)
            .to(frame, { x: -amplitude, y: amplitude, duration: 0.045, ease: "none" }, impactStart + 0.045)
            .to(frame, { x: amplitude * 0.5, y: 0, duration: 0.045, ease: "none" }, impactStart + 0.09)
            .to(frame, { x: 0, y: 0, duration: 0.06, ease: "power1.out" }, impactStart + 0.135);
        }
      }
      resultTl.call(() => setPhaseAt("reveal"), [], revealStart);
      if (stage) resultTl.to(stage, { scale: 1, duration: 0.24, ease: "power2.out" }, impactStart + impactDuration);
      if (flip) resultTl.to(flip, {
        rotationY: 180,
        scale: 1.015,
        duration: flipDuration,
        ease: "back.out(1.35)",
      }, revealStart)
        .to(flip, { scale: 1, duration: 0.22, ease: "power2.out" }, ">-=0.12");
      if (sweep && result.foil !== "NORMAL") {
        resultTl.fromTo(sweep, { x: "-150%", opacity: 0.9 }, {
          x: "150%",
          opacity: 0,
          duration: Math.max(0.5, cfg.sweepDuration),
          ease: "power1.inOut",
        }, revealStart + 0.08);
      }
      if (letters.length) {
        resultTl.fromTo(letters, { opacity: 0, y: 14 }, {
          opacity: 1,
          y: 0,
          duration: 0.28,
          stagger: 0.025,
          ease: "power2.out",
        }, revealStart + flipDuration * 0.55);
      }
      if (badge) {
        resultTl.fromTo(badge, { scale: 0.55, opacity: 0 }, {
          scale: 1,
          opacity: 1,
          duration: Math.max(0.3, cfg.badgeDuration),
          ease: "back.out(1.8)",
        }, revealStart + flipDuration * 0.55);
      }
      resultTl.call(() => {
        setRevealed(true);
        particleMode.current = "none";
      }, [], revealStart + flipDuration * 0.8);
      resultTl.call(() => {
        setEffectsDone(true);
        setCanContinue(true);
        setPhaseAt("showcase");
        if (continuation.current) gsap.fromTo(continuation.current, { opacity: 0.35 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
      }, [], revealStart + flipDuration + Math.max(0.35, cfg.effectsGap));

      tl.add(resultTl, invocationEnd);
      if (waiting.current) tl.play();
    };
    appendReveal.current = addResultTimeline;

    tl.call(() => setPhaseAt("press"), [], 0)
      .fromTo("[data-vignette]", { opacity: 0 }, { opacity: 0.72, duration: cfg.enterDuration, ease: "power1.out" }, 0)
      .fromTo("[data-stage]", { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: Math.max(0.2, cfg.enterDuration + 0.08), ease: "power3.out" }, 0)
      .call(() => setPhaseAt("invocation"), [], 0.15)
      .to("[data-crystal]", { rotation: 720, scale: 0.88, duration: Math.max(1.2, cfg.crystalSpinDuration), ease: "power2.inOut" }, cfg.crystalSpinAt)
      .to("[data-invocation-label]", { letterSpacing: "0.12em", duration: 0.7, repeat: 1, yoyo: true, ease: "sine.inOut" }, 0.2)
      .to("[data-glow]", { opacity: 0.82, scale: 1.14, duration: Math.max(0.2, cfg.glowDuration / 4), repeat: 3, yoyo: true, ease: "sine.inOut" }, cfg.glowAt)
      .call(() => {
        waiting.current = true;
        setPhaseAt("tease");
        if (latestPull.current) addResultTimeline(latestPull.current);
        else tl.pause();
      }, [], invocationEnd);

    tl.play();
    return () => {
      tl.kill();
      loops.forEach((loop) => loop.kill());
      activeLoops.current = [];
      timeline.current = null;
      appendReveal.current = () => {};
    };
  }, [motionPreferenceReady, reduceMotion, gsapReady, showFinal, cfg.enterDuration, cfg.crystalSpinAt, cfg.crystalSpinDuration, cfg.glowAt, cfg.glowDuration, cfg.revealAt, cfg.crystalOutDuration, cfg.ringDuration, cfg.ringStagger, cfg.particleSlots, cfg.particleDuration, cfg.particleReach, cfg.particleGalaxy, cfg.effectsGap, cfg.flipDuration, cfg.sweepDuration, cfg.badgeDuration]);

  const activeWaves = rarityIndex >= 4 ? 3 : rarityIndex >= 2 ? 2 : 1;
  const hasFoil = !!displayPull && displayPull.foil !== "NORMAL";
  const nameLetters = displayPull?.card.name.split("") ?? [];

  return (
    <dialog
      ref={dialog}
      aria-labelledby="roll-title"
      aria-describedby="roll-status"
      data-phase={phase}
      data-revealed={revealed ? "true" : "false"}
      data-reduced={reduceMotion ? "true" : "false"}
      className="roll-stage-dialog fixed inset-0 m-0 h-[100dvh] min-h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto border-0 bg-ink-deep/95 p-4 text-snow backdrop:bg-ink-deep/95"
      style={{ "--roll-accent": accent } as CSSProperties}
      onCancel={(event) => { event.preventDefault(); skipOrClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget && ready) onClose(); }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
          event.preventDefault();
          skipOrClose();
        }
      }}
    >
      {motionPreferenceReady && !reduceMotion && !effectsDone && (
        <Script
          id="gacha-roll-gsap-3-12-5"
          src={GSAP_SRC}
          integrity={GSAP_INTEGRITY}
          crossOrigin="anonymous"
          strategy="afterInteractive"
          onReady={() => setGsapReady(true)}
          onError={() => setGsapFailed(true)}
        />
      )}
      <div data-vignette aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-black opacity-0" />
      {motionPreferenceReady && !reduceMotion && !effectsDone && (
        <canvas aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] h-full w-full opacity-90" />
      )}
      {rarityIndex >= GACHA_TIERS.indexOf("EPICA") && motionPreferenceReady && !reduceMotion && !effectsDone && (
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none fixed inset-0 z-[2] h-full w-full">
          <g data-radial-rays fill="none" stroke={accent} strokeWidth="0.16" opacity="0" transform="translate(50 50)">
            {Array.from({ length: 32 }, (_, index) => (
              <path key={index} d={index % 2 ? "M0-3V-50" : "M0-5V-64"} transform={`rotate(${index * 11.25})`} />
            ))}
            <circle r="30" strokeDasharray="0.5 2" />
          </g>
        </svg>
      )}
      <div data-shake-frame className="relative z-10 flex min-h-full flex-col items-center justify-center gap-4 py-4 sm:gap-5">
        <p className="font-mono text-caption uppercase tracking-[0.24em] text-ice/90">
          ANIMESICE <span aria-hidden="true">/</span> SINAL DE INVOCAÇÃO
        </p>
        <h2 id="roll-title" data-invocation-label className="min-h-8 text-center font-display text-display-lg" aria-live="polite">
          {revealed ? (preview ? "Prévia revelada" : "Sua carta") : "Invocando sua carta…"}
        </h2>
        <p id="roll-status" className="sr-only" aria-live="polite">
          {phase === "waiting" ? "Aguardando o resultado do giro." : revealed ? `Carta revelada: ${displayPull?.card.name ?? ""}, raridade ${rarity}.` : "Invocação em andamento. Você pode pular a animação."}
        </p>

        {rarityIndex >= GACHA_TIERS.indexOf("LENDARIA") && displayPull && (
          <p data-rarity-title aria-hidden="true" className={`pointer-events-none absolute top-[16%] z-20 font-display text-4xl font-bold tracking-[0.22em] sm:text-6xl ${rarityText}`} style={{ opacity: 0 }}>
            {rarity}
          </p>
        )}

        <div
          data-stage
          className="relative z-10 aspect-[3/4] w-[min(70vw,420px)] max-w-full text-current"
          style={{ perspective: 1000, color: accent }}
          onPointerMove={(event) => {
            if (reduceMotion || !revealed) return;
            const card = event.currentTarget.querySelector<HTMLElement>("[data-card-tilt]");
            if (!card) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            card.style.setProperty("--tilt-x", `${-y * 8}deg`);
            card.style.setProperty("--tilt-y", `${x * 8}deg`);
          }}
          onPointerLeave={(event) => {
            const card = event.currentTarget.querySelector<HTMLElement>("[data-card-tilt]");
            card?.style.setProperty("--tilt-x", "0deg");
            card?.style.setProperty("--tilt-y", "0deg");
          }}
        >
          <div data-glow aria-hidden="true" className="absolute inset-[-10%] rounded-full bg-current opacity-20 blur-3xl" />
          <svg aria-hidden="true" viewBox="0 0 400 520" className="pointer-events-none absolute inset-[-10%] h-[120%] w-[120%] overflow-visible">
            <defs>
              <filter id={`${filterId}-glow`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" result="colored" />
                <feMerge><feMergeNode in="colored" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g data-orbit-outer fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" filter={`url(#${filterId}-glow)`}>
              <ellipse cx="200" cy="260" rx="180" ry="226" strokeDasharray="3 10" />
              <path d="M200 20 214 36 200 52 186 36Z M200 468 214 484 200 500 186 484Z" />
            </g>
            <g data-orbit-inner fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.68">
              <ellipse cx="200" cy="260" rx="151" ry="195" strokeDasharray="54 24 3 24" />
              <circle cx="200" cy="65" r="5" fill="currentColor" />
              <circle cx="200" cy="455" r="5" fill="currentColor" />
            </g>
            <g data-rune-orbit fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.9">
              <path d="M200 83 218 101 200 119 182 101Z M92 260 110 242 128 260 110 278Z M272 260 290 242 308 260 290 278Z M200 401 218 419 200 437 182 419Z" />
              <path d="M193 100h14m-7-7v14 M103 253v14m-7-7h14 M283 253v14m-7-7h14 M193 419h14m-7-7v14" />
            </g>
            <g aria-hidden="true" opacity="0.14" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M200 36v58m0 332v58M23 260h63m228 0h63M75 120l45 45m160 160 45 45M325 120l-45 45M120 355l-45 45" />
            </g>
            {GACHA_TIERS.map((tier) => (
              <circle key={tier} data-tier-aura={tier} cx="200" cy="260" r="95" fill="none" stroke={RARITY_COLORS[tier]} strokeWidth="20" opacity="0" filter={`url(#${filterId}-glow)`} />
            ))}
            {Array.from({ length: Math.max(1, Math.min(3, cfg.ringSlots)) }, (_, index) => (
              <circle
                key={index}
                data-ring
                cx="200"
                cy="260"
                r="96"
                fill="none"
                stroke={accent}
                strokeWidth={index === 0 ? 2.2 : 1.2}
                opacity="0"
                style={{ display: index < activeWaves ? undefined : "none" }}
              />
            ))}
          </svg>

          <div data-flip className="relative aspect-[3/4]" style={{ transformStyle: "preserve-3d" }}>
            <div data-card-front aria-hidden="true" className="absolute inset-0 flex items-center justify-center overflow-hidden border border-ice/50 bg-panel shadow-[0_0_40px_rgba(56,232,218,0.18)]" style={{ backfaceVisibility: "hidden" }}>
              <div data-crystal className="relative h-28 w-28 rotate-45 border border-ice/80 bg-gradient-to-tr from-transparent via-ice/30 to-ice/5 shadow-glow-ice">
                <span className="absolute inset-3 border border-ice/40" />
                <span className="absolute inset-7 border border-ice/25" />
              </div>
              <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full opacity-25">
                <path d="M50 0v100M0 50h100M15 15l70 70M85 15 15 85" stroke="currentColor" strokeWidth=".45" />
                <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth=".7" strokeDasharray="2 4" />
              </svg>
              <div data-back-shine className="absolute inset-0 bg-gradient-to-r from-transparent via-snow/15 to-transparent" />
            </div>
            <div data-card-back inert={!revealed} aria-hidden={!revealed} className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              {displayPull && (
                <div data-card-tilt className="roll-card-tilt h-full w-full">
                  <GachaCard pull={displayPull} preview={preview} showInfo={false} />
                </div>
              )}
              {hasFoil && <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div data-sweep className="h-full w-full -translate-x-[150%] bg-gradient-to-r from-transparent via-snow/45 to-transparent mix-blend-screen" />
              </div>}
            </div>
          </div>
          <div data-flash aria-hidden="true" className="pointer-events-none fixed inset-0 z-20 bg-white opacity-0" />
        </div>

        <div data-badge className="relative z-10 min-h-[5.5rem] max-w-[min(90vw,420px)] text-center opacity-0" aria-hidden={!revealed}>
          <p className={`font-mono text-label tracking-[0.18em] ${rarityText}`}>{rarity}</p>
          {displayPull && <p data-name aria-label={displayPull.card.name} className="mt-1 truncate font-display text-display-lg font-semibold text-snow">
            <span aria-hidden="true">{nameLetters.map((letter, index) => (
              <span key={`${letter}-${index}`} data-name-letter className="inline-block opacity-0">{letter === " " ? "\u00a0" : letter}</span>
            ))}</span>
          </p>}
          {displayPull && <p className="mt-1 font-mono text-body-sm text-mist">
            <span aria-label={`${displayPull.value} pontos`}><CountUp to={displayPull.value} startWhen={revealed} /></span> pts
          </p>}
        </div>

        <button
          ref={continuation}
          autoFocus
          type="button"
          onClick={skipOrClose}
          className="relative z-20 min-h-11 min-w-32 border border-ice/70 bg-ink px-7 py-3 font-display font-semibold text-snow shadow-[0_0_20px_rgba(56,232,218,0.18)] transition-colors hover:bg-ice hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
        >
          {ready ? "Continuar" : waitingForPull ? "Aguardando carta…" : "Pular"}
        </button>
      </div>
    </dialog>
  );
}
