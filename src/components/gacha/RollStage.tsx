"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { GachaCard, GACHA_TIERS, GALAXY_TEXT, RARITY_TEXT } from "./GachaCard";
import { CountUp } from "@/components/core/CountUp";
import { gsap } from "@/lib/gsap";
import { GACHA_RARITY_COLORS } from "@/lib/gacha-rarity-colors";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { GachaPull } from "@/types";
import { DEFAULT_ROLL_ANIM_CONFIG, type RollAnimConfig } from "@/lib/roll-anim-config";
import { climbTeaseSequence, fakeDropTeaseSequence, orderedTeaseSequence, randomTeaseSequence } from "@/lib/roll-tease";

export { DEFAULT_ROLL_ANIM_CONFIG, parseRollAnimJson } from "@/lib/roll-anim-config";
export type { ParsedRollJson, RollAnimConfig } from "@/lib/roll-anim-config";

import { useRollAudio, type RollSfx } from "@/lib/use-roll-audio";

type RollTimeline = ReturnType<typeof gsap.timeline>;
type Killable = { kill: () => void };
type RollRarity = (typeof GACHA_TIERS)[number];
const RARITY_COLORS: Record<RollRarity, string> = GACHA_RARITY_COLORS;
type RollPhase = "press" | "invocation" | "tease" | "title" | "impact" | "reveal" | "showcase" | "waiting";
type CopyState = "new" | "duplicate" | null;

const RARITY_LABEL: Record<RollRarity, string> = {
  COMUM: "COMUM",
  INCOMUM: "INCOMUM",
  RARA: "RARA",
  EPICA: "ÉPICA",
  LENDARIA: "LENDÁRIA",
  MITICA: "MÍTICA",
  GALACTICA: "GALÁCTICA",
};
const NEUTRAL_COLOR = RARITY_COLORS.COMUM;
const TEASE_DURATION: Record<RollRarity, number> = {
  COMUM: 0.6,
  INCOMUM: 0.72,
  RARA: 0.9,
  EPICA: 1.15,
  LENDARIA: 1.5,
  MITICA: 1.8,
  GALACTICA: 1.8,
};
const TIER_PARTICLES: Record<RollRarity, number> = {
  COMUM: 20,
  INCOMUM: 34,
  RARA: 52,
  EPICA: 80,
  LENDARIA: 120,
  MITICA: 150,
  GALACTICA: 180,
};
const TIER_FLASH: Record<RollRarity, number> = {
  COMUM: 0.45,
  INCOMUM: 0.5,
  RARA: 0.6,
  EPICA: 0.8,
  LENDARIA: 1,
  MITICA: 1,
  GALACTICA: 1,
};
// Amplitude máxima do tremor durante a tensão (px). Começa em 1 e cresce até este valor.
const TIER_TREMBLE: Record<RollRarity, number> = {
  COMUM: 0,
  INCOMUM: 0,
  RARA: 1,
  EPICA: 2,
  LENDARIA: 3,
  MITICA: 3,
  GALACTICA: 3,
};
const TIER_SHAKE: Record<RollRarity, number> = {
  COMUM: 0,
  INCOMUM: 0,
  RARA: 3,
  EPICA: 5,
  LENDARIA: 8,
  MITICA: 8,
  GALACTICA: 8,
};
const TIER_HOLO: Record<RollRarity, number> = {
  COMUM: 0,
  INCOMUM: 0,
  RARA: 0.22,
  EPICA: 0.42,
  LENDARIA: 0.55,
  MITICA: 0.55,
  GALACTICA: 0.6,
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
const IDX_EPIC = GACHA_TIERS.indexOf("EPICA");
const IDX_LEGENDARY = GACHA_TIERS.indexOf("LENDARIA");
const IDX_MYTHIC = GACHA_TIERS.indexOf("MITICA");
const IDX_RARE = GACHA_TIERS.indexOf("RARA");
const RAINBOW_GRADIENT =
  "linear-gradient(115deg, #ff4d8d 0%, #ffb347 16%, #fff275 30%, #5cffb0 46%, #4dd8ff 62%, #9a7bff 78%, #ff4d8d 100%)";

const ROLL_CSS = `
.roll-stage-dialog[data-animating="true"] [data-stage],
.roll-stage-dialog[data-animating="true"] [data-flip],
.roll-stage-dialog[data-animating="true"] [data-glow],
.roll-stage-dialog[data-animating="true"] [data-godrays] { will-change: transform, opacity; }
.roll-stage-dialog .roll-card-tilt {
  transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
  transition: transform 140ms ease-out;
}
.roll-stage-dialog [data-holo] {
  background-size: 260% 260%;
  background-position: var(--holo-x, 50%) var(--holo-y, 50%);
  mix-blend-mode: color-dodge;
}
`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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

// O tipo GachaPull visto aqui não expõe "primeira cópia" / "repetida".
// Se o payload usar outros nomes, basta ajustar estas listas de chaves booleanas.
const NEW_KEYS = ["isNew", "firstCopy", "primeiraCopia", "first", "novo"] as const;
const DUP_KEYS = ["isDuplicate", "duplicate", "repeated", "repetida", "repeat"] as const;

function readCopyState(pull: GachaPull | null): CopyState {
  if (!pull) return null;
  const raw = pull as unknown as Record<string, unknown>;
  if (DUP_KEYS.some((key) => raw[key] === true)) return "duplicate";
  if (NEW_KEYS.some((key) => raw[key] === true)) return "new";
  return null;
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

function particleCountFor(rarity: RollRarity, slots: number, mobile: boolean) {
  const base = DEFAULT_ROLL_ANIM_CONFIG.particleSlots;
  const scale = base > 0 ? slots / base : 1;
  return Math.max(12, Math.min(mobile ? 120 : 180, Math.round(TIER_PARTICLES[rarity] * scale)));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

// Troca de cores da tensão: começa em ~2,8 trocas/s e desacelera (nunca passa de 3/s).
function teaseStops(total: number): number[] {
  const stops: number[] = [];
  let at = 0;
  let step = 0.36;
  while (at < total - 0.2) {
    stops.push(at);
    at += step;
    step *= 1.28;
  }
  return stops;
}

/* Geometria do círculo de invocação (viewBox 400x520, centro 200,260) */
const CX = 200;
const CY = 260;
function pt(radius: number, deg: number) {
  const angle = (deg * Math.PI) / 180;
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)] as const;
}
function ticksPath(r1: number, r2: number, count: number) {
  let d = "";
  for (let i = 0; i < count; i += 1) {
    const [x1, y1] = pt(r1, (i * 360) / count);
    const [x2, y2] = pt(r2, (i * 360) / count);
    d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}
function polyPath(radius: number, start: number, sides: number) {
  let d = "";
  for (let i = 0; i < sides; i += 1) {
    const [x, y] = pt(radius, start + (i * 360) / sides);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}
function runesPath(radius: number, count: number, size: number) {
  let d = "";
  for (let i = 0; i < count; i += 1) {
    const [x, y] = pt(radius, (i * 360) / count + 22.5);
    d += `M${x.toFixed(1)} ${(y - size).toFixed(1)}L${(x + size).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y + size).toFixed(1)}L${(x - size).toFixed(1)} ${y.toFixed(1)}Z`;
    d += `M${(x - size * 0.45).toFixed(1)} ${y.toFixed(1)}h${(size * 0.9).toFixed(1)}M${x.toFixed(1)} ${(y - size * 0.45).toFixed(1)}v${(size * 0.9).toFixed(1)}`;
  }
  return d;
}
const SIGIL = {
  ticks: ticksPath(203, 213, 60),
  hexA: polyPath(174, -90, 3),
  hexB: polyPath(174, 90, 3),
  runes: runesPath(196, 8, 9),
  spokes: ticksPath(40, 150, 12),
};
const HEX_VERTICES = [-90, 30, 150].map((deg) => pt(174, deg));



/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

interface RollStageProps {
  pull: GachaPull | null;
  onClose: () => void;
  preview?: boolean;
  /** Configuração de animação (opcional — usa DEFAULT_ROLL_ANIM_CONFIG se omitido) */
  config?: Partial<RollAnimConfig>;
}

export function RollStage({ pull, onClose, preview = false, config }: RollStageProps) {
  const cfgRef = useRef({ ...DEFAULT_ROLL_ANIM_CONFIG, ...config });
  const cfg = cfgRef.current;
  const dialog = useRef<HTMLDialogElement>(null);
  const timeline = useRef<RollTimeline | null>(null);
  const activeLoops = useRef<Killable[]>([]);
  const appendReveal = useRef<(result: GachaPull) => void>(() => {});
  const latestPull = useRef<GachaPull | null>(pull);
  const skipped = useRef(false);
  const waiting = useRef(false);
  const revealAdded = useRef(false);
  const particleMode = useRef<"gather" | "burst" | "none">("gather");
  const burstStart = useRef(0);
  const teaseColor = useRef(NEUTRAL_COLOR);
  const userTilt = useRef(false);
  const particles = useRef<ReturnType<typeof createParticles>>([]);
  const continuation = useRef<HTMLButtonElement>(null);
  const filterId = useId().replace(/:/g, "");
  const reduceMotion = usePrefersReducedMotion();
  const audio = useRollAudio();
  const sfxRef = useRef(audio.sfx);
  sfxRef.current = audio.sfx;
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);
  const [debugRarity] = useState<RollRarity | null>(() =>
    typeof window === "undefined" ? null : readDebugRarity(),
  );
  const [revealed, setRevealed] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [effectsDone, setEffectsDone] = useState(false);
  const [phase, setPhase] = useState<RollPhase>("press");

  // The debug tier is presentation-only: the API result and stored pull stay untouched.
  const displayPull = useMemo(
    () => pull && debugRarity ? { ...pull, card: { ...pull.card, rarity: debugRarity } } : pull,
    [pull, debugRarity],
  );
  latestPull.current = displayPull;
  const flat = reduceMotion;
  const flatRef = useRef(flat);
  flatRef.current = flat;
  const rarity = rarityOf(displayPull);
  const rarityIndex = GACHA_TIERS.indexOf(rarity);
  const accent = RARITY_COLORS[rarity];
  const rarityText = rarity === "GALACTICA" ? GALAXY_TEXT : RARITY_TEXT[rarity] ?? "text-ice";
  const ready = !!displayPull && canContinue;
  const copyState = useMemo(() => readCopyState(displayPull), [displayPull]);
  const hasFoil = !!displayPull && displayPull.foil !== "NORMAL";
  const holoStrength = !displayPull
    ? 0
    : hasFoil
      ? Math.min(0.75, Math.max(0.24, TIER_HOLO[rarity]) * 1.3)
      : rarityIndex >= IDX_LEGENDARY
        ? TIER_HOLO[rarity] * 1.0   // sem foil Lendária+: força total (era 0.55×)
        : TIER_HOLO[rarity] * 0.55;
  const holoImage =
    rarityIndex >= IDX_LEGENDARY
      ? RAINBOW_GRADIENT
      : `linear-gradient(115deg, transparent 18%, ${accent} 42%, rgba(255,255,255,0.85) 50%, ${accent} 58%, transparent 82%)`;
  const sweepImage =
    rarityIndex >= IDX_LEGENDARY
      ? "linear-gradient(105deg, transparent 28%, rgba(255,120,200,0.55) 40%, rgba(255,255,255,0.9) 50%, rgba(110,220,255,0.55) 60%, transparent 72%)"
      : "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 47%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 53%, transparent 70%)";
  const showSweep = !!displayPull && !flat && (hasFoil || rarityIndex >= IDX_RARE);
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

  const applyTilt = useCallback((x: number, y: number) => {
    const root = dialog.current;
    if (!root) return;
    const tilt = root.querySelector<HTMLElement>("[data-card-tilt]");
    const back = root.querySelector<HTMLElement>("[data-card-back]");
    tilt?.style.setProperty("--tilt-x", `${(-y * 18).toFixed(2)}deg`);
    tilt?.style.setProperty("--tilt-y", `${(x * 18).toFixed(2)}deg`);
    back?.style.setProperty("--holo-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    back?.style.setProperty("--holo-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  }, []);

  const showFinal = useCallback(() => {
    const root = dialog.current;
    const finalRarity = rarityOf(latestPull.current);
    const finalAccent = RARITY_COLORS[finalRarity];
    const finalIndex = GACHA_TIERS.indexOf(finalRarity);
    timeline.current?.kill();
    timeline.current = null;
    activeLoops.current.forEach((loop) => loop.kill());
    activeLoops.current = [];
    sfxRef.current.silence();
    particleMode.current = "none";
    skipped.current = true;
    if (root) {
      root.removeAttribute("data-animating");
      const all = (selector: string) => Array.from(root.querySelectorAll<HTMLElement | SVGElement>(selector));
      const one = (selector: string) => root.querySelector<HTMLElement | SVGElement>(selector);
      const hide = ["[data-tier-aura]", "[data-ring]", "[data-radial-rays]", "[data-godrays]", "[data-godrays-reverse]", "[data-rarity-title]", "[data-flash]", "[data-orbit-svg]", "[data-crystal-frag]"];
      const show = ["[data-card-art]", "[data-badge]", "[data-name-letter]", "[data-rarity-label]", "[data-copy-tag]"];
      const tintFinal = finalIndex >= IDX_EPIC ? 0.35 : 0.16;
      const flip = one("[data-flip]");
      gsap.set(one("[data-stage]"), { scale: 1, opacity: 1, x: 0, y: 0, color: finalAccent });
      gsap.set(one("[data-shake-frame]"), { x: 0, y: 0, scale: 1 });
      if (flip) gsap.set(flip, { rotationY: flatRef.current ? 0 : 180, scale: 1, x: 0, y: 0 });
      const glow = one("[data-glow]");
      if (glow) gsap.set(glow, { opacity: 0.3, scale: 1 });
      const tint = one("[data-tint]");
      if (tint) gsap.set(tint, { opacity: tintFinal, color: finalAccent });
      const sweep = one("[data-sweep]");
      if (sweep) gsap.set(sweep, { opacity: 0, xPercent: 150 });
      hide.forEach((selector) => {
        const list = all(selector);
        if (list.length) gsap.set(list, { opacity: 0 });
      });
      show.forEach((selector) => {
        const list = all(selector);
        if (list.length) gsap.set(list, { opacity: 1, scale: 1, y: 0 });
      });
    }
    setEffectsDone(true);
    setRevealed(true);
    setCanContinue(true);
    markPhase("showcase");
  }, []);

  function skipOrClose() {
    if (!displayPull || ready) {
      onClose();
      return;
    }
    skipped.current = true;
    timeline.current?.pause();
    showFinal();
  }

  useEffect(() => {
    if (!displayPull) return;
    const mobile = window.matchMedia("(max-width: 480px)").matches;
    particles.current = createParticles(
      particleCountFor(rarityOf(displayPull), cfgRef.current.particleSlots, mobile),
      displayPull.id,
    );
    if (skipped.current) {
      showFinal();
      return;
    }
    if (reduceMotion && motionPreferenceReady) {
      setEffectsDone(true);
      setRevealed(true);
      setCanContinue(true);
      markPhase("showcase");
      sfxRef.current.chime(GACHA_TIERS.indexOf(rarityOf(displayPull)) / Math.max(1, GACHA_TIERS.length - 1));
      // Glow e tint visíveis mesmo sem animação.
      const root = dialog.current;
      if (root) {
        const glow = root.querySelector<HTMLElement>("[data-glow]");
        const tint = root.querySelector<HTMLElement>("[data-tint]");
        const rIdx = GACHA_TIERS.indexOf(rarityOf(displayPull));
        if (glow) gsap.set(glow, { opacity: rIdx >= IDX_LEGENDARY ? 0.45 : rIdx >= IDX_EPIC ? 0.28 : 0.18 });
        if (tint) gsap.set(tint, { opacity: rIdx >= IDX_EPIC ? 0.22 : 0, color: RARITY_COLORS[rarityOf(displayPull)] });
      }
      return;
    }
    appendReveal.current(displayPull);
  }, [displayPull, reduceMotion, motionPreferenceReady, showFinal]);

  /* Vitrine: flutuação + deriva suave quando ninguém está inclinando a carta */
  useEffect(() => {
    if (!revealed || flat) return;
    const flip = dialog.current?.querySelector<HTMLElement>("[data-flip]");
    if (!flip) return;
    const drift = { p: 0.5 };
    const bob = gsap.to(flip, { y: -7, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
    const sway = gsap.to(drift, {
      p: 1,
      duration: 3.6,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      onUpdate: () => {
        if (!userTilt.current) applyTilt((drift.p - 0.5) * 0.5, Math.sin(drift.p * Math.PI) * 0.2 - 0.1);
      },
    });
    return () => {
      bob.kill();
      sway.kill();
    };
  }, [revealed, flat, applyTilt]);

  /* Vitrine: sweep periódico para Lendária+ a cada ~4s */
  useEffect(() => {
    if (!revealed || flat || rarityIndex < IDX_LEGENDARY) return;
    const root = dialog.current;
    if (!root) return;
    const sweep = root.querySelector<HTMLElement>("[data-sweep]");
    if (!sweep) return;
    const sweepDur = 0.65;
    let handle: ReturnType<typeof setTimeout>;
    const fire = () => {
      gsap.set(sweep, { opacity: 1, xPercent: -150 });
      gsap.to(sweep, {
        xPercent: 150,
        duration: sweepDur,
        ease: "power1.inOut",
        onComplete: () => { gsap.set(sweep, { opacity: 0 }); },
      });
      handle = setTimeout(fire, 3800 + Math.random() * 900);
    };
    handle = setTimeout(fire, 1200);
    return () => {
      clearTimeout(handle);
      gsap.set(sweep, { opacity: 0 });
    };
  }, [revealed, flat, rarityIndex]);

  /* Vitrine: giroscópio no mobile (iOS pede permissão no primeiro toque na carta) */
  useEffect(() => {
    if (!revealed || flat) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const DOE = (window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
    }).DeviceOrientationEvent;
    if (!DOE) return;
    let base: { beta: number; gamma: number } | null = null;
    let frame = 0;
    let pending: { x: number; y: number } | null = null;
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta == null || event.gamma == null) return;
      if (!base) base = { beta: event.beta, gamma: event.gamma };
      const x = Math.max(-1, Math.min(1, (event.gamma - base.gamma) / 30)) * 0.5;
      const y = Math.max(-1, Math.min(1, (event.beta - base.beta) / 30)) * 0.5;
      pending = { x, y };
      userTilt.current = true;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (pending) applyTilt(pending.x, pending.y);
        });
      }
    };
    const attach = () => window.addEventListener("deviceorientation", onOrientation);
    const stageEl = dialog.current?.querySelector<HTMLElement>("[data-stage]") ?? null;
    let onTap: (() => void) | null = null;
    if (typeof DOE.requestPermission === "function") {
      const request = DOE.requestPermission.bind(DOE);
      onTap = () => {
        request().then((state) => { if (state === "granted") attach(); }).catch(() => {});
      };
      stageEl?.addEventListener("pointerdown", onTap, { once: true });
    } else {
      attach();
    }
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      if (onTap) stageEl?.removeEventListener("pointerdown", onTap);
      if (frame) cancelAnimationFrame(frame);
      userTilt.current = false;
    };
  }, [revealed, flat, applyTilt]);

  /* Timeline principal */
  useEffect(() => {
    if (!motionPreferenceReady || reduceMotion) return;
    const root = dialog.current;
    if (!root) return;
    if (skipped.current && latestPull.current) {
      showFinal();
      return;
    }
    const cfg = cfgRef.current;
    revealAdded.current = false;
    waiting.current = false;
    root.setAttribute("data-animating", "true");

    const one = <T extends Element>(selector: string) => root.querySelector<T>(selector);
    const all = <T extends Element>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
    const stage = one<HTMLElement>("[data-stage]");
    const frame = one<HTMLElement>("[data-shake-frame]");
    const canvas = one<HTMLCanvasElement>("canvas");
    const context = canvas?.getContext("2d") ?? null;
    const glow = one<HTMLElement>("[data-glow]");
    const tint = one<HTMLElement>("[data-tint]");
    const crystal = one<HTMLElement>("[data-crystal]");
    const orbitSvg = one<SVGElement>("[data-orbit-svg]");
    const orbitOuter = one<SVGElement>("[data-orbit-outer]");
    const orbitInner = one<SVGElement>("[data-orbit-inner]");
    const runeOrbit = one<SVGElement>("[data-rune-orbit]");
    const loops: Killable[] = [];
    const stopAtImpact: Killable[] = [];
    const isMobile = window.matchMedia("(max-width: 480px)").matches;
    // ponytail: o brilho de raridade só entra depois que o giro central acaba de fato.
    // O max espelha a duração real do tween do cristal (Math.max(0.75, ...)), senão
    // crystalSpinDuration curto deixa a troca de cor atropelar o giro de novo.
    const spinEnd = cfg.crystalSpinAt + Math.max(0.75, cfg.crystalSpinDuration);
    const invocationEnd = Math.max(1.1, cfg.revealAt, spinEnd);
    const setPhaseAt = (value: RollPhase) => markPhase(value);
    const t0 = performance.now();
    const clock = () => (performance.now() - t0) / 1000;
    let burstPalette: string[] = [NEUTRAL_COLOR];
    let cleared = false;
    let rootRect = root.getBoundingClientRect();
    let stageRect = stage?.getBoundingClientRect() ?? rootRect;
    const measureBounds = () => {
      rootRect = root.getBoundingClientRect();
      if (stage) stageRect = stage.getBoundingClientRect();
    };
    measureBounds();
    window.addEventListener("resize", measureBounds);

    particleMode.current = "gather";
    teaseColor.current = NEUTRAL_COLOR;
    if (particles.current.length === 0) {
      particles.current = createParticles(
        particleCountFor("COMUM", cfg.particleSlots, isMobile),
        latestPull.current?.id ?? "summoning",
      );
    }

    const draw = () => {
      if (!canvas || !context || !stage || !canvas.isConnected) return;
      const mode = particleMode.current;
      if (mode === "none") {
        if (!cleared) {
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.clearRect(0, 0, canvas.width, canvas.height);
          cleared = true;
        }
        return;
      }
      cleared = false;
      const rect = rootRect;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const box = stageRect;
      const cx = box.left - rect.left + box.width / 2;
      const cy = box.top - rect.top + box.height / 2;
      const list = particles.current;
      const now = clock();
      if (mode === "gather") {
        const visible = Math.min(list.length, isMobile ? 60 : 90);
        const color = teaseColor.current;
        for (let i = 0; i < visible; i += 1) {
          const particle = list[i]!;
          const progress = clamp01(now / invocationEnd - particle.delay);
          const eased = progress * progress;
          const orbitMin = 16 + (i % 6) * 6;
          const radius = progress < 1
            ? particle.distance * (1 - eased) + orbitMin
            : orbitMin + Math.sin(now * 3 + i) * 3;
          const angle = particle.angle + now * (0.6 + (i % 5) * 0.2) + progress * 1.4;
          context.globalAlpha = 0.25 + 0.55 * eased;
          context.fillStyle = i % 3 === 1 ? "#F1F5F9" : color;
          context.fillRect(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, particle.size, particle.size);
        }
      } else {
        const duration = Math.max(0.45, cfg.particleDuration);
        const reach = 1 + GACHA_TIERS.indexOf(rarityRef.current) * 0.05;
        context.globalCompositeOperation = "lighter";
        for (let i = 0; i < list.length; i += 1) {
          const particle = list[i]!;
          const progress = clamp01((now - burstStart.current - particle.delay * 0.3) / duration);
          if (progress <= 0) continue;
          const eased = 1 - (1 - progress) ** 3;
          const tail = 1 - (1 - Math.max(0, progress - 0.06)) ** 3;
          const rx = particle.distance * (cfg.particleReach.x / 180) * reach;
          const ry = particle.distance * (cfg.particleReach.y / 230) * reach;
          const cos = Math.cos(particle.angle);
          const sin = Math.sin(particle.angle);
          context.globalAlpha = (1 - progress) * 0.95;
          context.strokeStyle = burstPalette[i % burstPalette.length]!;
          context.lineWidth = particle.size;
          context.beginPath();
          context.moveTo(cx + cos * rx * tail, cy + sin * ry * tail);
          context.lineTo(cx + cos * rx * eased, cy + sin * ry * eased);
          context.stroke();
        }
        context.globalCompositeOperation = "source-over";
      }
      context.globalAlpha = 1;
    };
    gsap.ticker.add(draw);

    const tl = gsap.timeline({ paused: true });
    timeline.current = tl;

    /* Loops do círculo de invocação: giram em velocidades diferentes e aceleram com a tensão */
    const spins: Killable[] = [];
    if (orbitOuter) spins.push(gsap.to(orbitOuter, { rotation: 360, duration: 9, repeat: -1, ease: "none", transformOrigin: "50% 50%" }));
    if (orbitInner) spins.push(gsap.to(orbitInner, { rotation: -360, duration: 6.5, repeat: -1, ease: "none", transformOrigin: "50% 50%" }));
    if (runeOrbit) spins.push(gsap.to(runeOrbit, { rotation: 360, duration: 3.8, repeat: -1, ease: "none", transformOrigin: "50% 50%" }));
    loops.push(...spins);
    stopAtImpact.push(...spins);

    /* Pulsação em ritmo de batida (duplo pulso), com pico moderado para evitar flicker */
    let beat: RollTimeline | null = null;
    if (glow) {
      beat = gsap.timeline({ paused: true, repeat: -1 });
      beat
        .to(glow, { opacity: 0.6, scale: 1.14, duration: 0.12, ease: "power2.out" })
        .to(glow, { opacity: 0.32, scale: 1.04, duration: 0.14, ease: "power1.in" })
        .to(glow, { opacity: 0.66, scale: 1.18, duration: 0.14, ease: "power2.out" })
        .to(glow, { opacity: 0.22, scale: 1, duration: 0.5, ease: "sine.inOut" });
      loops.push(beat);
      stopAtImpact.push(beat);
    }
    activeLoops.current = loops;

    const placeFx = () => {
      if (!stage) return;
      const rect = root.getBoundingClientRect();
      const box = stage.getBoundingClientRect();
      const cx = box.left - rect.left + box.width / 2;
      const cy = box.top - rect.top + box.height / 2;
      const raysPos = one<SVGGElement>("[data-rays-pos]");
      if (raysPos) {
        const k = Math.max(rect.width, rect.height) / 100;
        const ux = (cx - (rect.width - 100 * k) / 2) / k;
        const uy = (cy - (rect.height - 100 * k) / 2) / k;
        raysPos.setAttribute("transform", `translate(${ux.toFixed(2)} ${uy.toFixed(2)})`);
      }
      const godrays = one<HTMLElement>("[data-godrays]");
      if (godrays) gsap.set(godrays, { left: cx, top: cy });
    };

    const addResultTimeline = (result: GachaPull) => {
      if (revealAdded.current || skipped.current) return;
      revealAdded.current = true;
      measureBounds();
      const resultRarity = rarityOf(result);
      const resultIndex = GACHA_TIERS.indexOf(resultRarity);
      const resultAccent = RARITY_COLORS[resultRarity];
      const compact = readCopyState(result) === "duplicate";
      const topTier = resultIndex >= IDX_LEGENDARY && !compact;
      const epicUp = resultIndex >= IDX_EPIC && !compact;
      const teaseDur = compact ? 0.3 : TEASE_DURATION[resultRarity];
      const titleHold = topTier ? 0.65 : 0;
      const impactAt = teaseDur + titleHold;
      const impactDur = compact ? 0.18 : Math.min(0.32, Math.max(0.2, cfg.crystalOutDuration));
      const revealAt = impactAt + impactDur;
      const flipDur = Math.min(1, Math.max(compact ? 0.35 : 0.4, cfg.flipDuration));
      const cardRevealedAt = revealAt + flipDur;
      const cardArtReadyAt = cardRevealedAt + 0.16;
      const cardDetailsAt = cardArtReadyAt + 0.24;
      const gap = Math.max(0.18, cfg.effectsGap);
      const lock = Math.max(0.3, teaseDur - 0.35);
      const ringDur = Math.max(0.4, cfg.ringDuration);
      const waves = Math.max(1, compact ? 1 : resultIndex >= IDX_LEGENDARY ? 3 : resultIndex >= IDX_RARE ? 2 : 1);

      const auras = all<SVGGElement>("[data-tier-aura]");
      const rings = all<SVGCircleElement>("[data-ring]");
      const flip = one<HTMLElement>("[data-flip]");
      const flash = one<HTMLElement>("[data-flash]");
      const title = one<HTMLElement>("[data-rarity-title]");
      const rays = one<SVGGElement>("[data-radial-rays]");
      const godrays = one<HTMLElement>("[data-godrays]");
      if (godrays) gsap.set(godrays, { xPercent: -50, yPercent: -50, opacity: 0 });
      const letters = all<HTMLElement>("[data-name-letter]");
      const badge = one<HTMLElement>("[data-badge]");
      const rarityLabel = one<HTMLElement>("[data-rarity-label]");
      const copyTag = one<HTMLElement>("[data-copy-tag]");
      const cardArt = one<HTMLElement>("[data-card-art]");
      const sweep = one<HTMLElement>("[data-sweep]");
      const colorTargets = [stage, tint].filter((el): el is HTMLElement => !!el);
      const resultTl = gsap.timeline();

      /* Tensão: aura troca de cor (cross-fade) e trava na cor real no fim da janela */
      if (auras.length) resultTl.set(auras, { opacity: 0, transformOrigin: "50% 50%" }, 0);
      let current: SVGGElement | null = null;
      const showTier = (tier: RollRarity, at: number, fade: number, peak: number) => {
        const next = auras.find((node) => node.dataset.tierAura === tier) ?? null;
        if (current && current !== next) resultTl.to(current, { opacity: 0, duration: fade }, at);
        if (next) resultTl.to(next, { opacity: peak, duration: fade, ease: "sine.inOut" }, at);
        if (colorTargets.length) resultTl.to(colorTargets, { color: RARITY_COLORS[tier], duration: fade, ease: "sine.inOut" }, at);
        resultTl.call(() => { teaseColor.current = RARITY_COLORS[tier]; }, [], at);
        current = next;
      };
      if (compact) {
        showTier(resultRarity, 0, 0.15, 0.9);
      } else if (cfg.teaseMode === "climb") {
        // A escada tem um degrau por raridade, então as paradas saem dela — não do
        // teaseStops(), que é calibrado para o giro de Tier fixo.
        const climb = climbTeaseSequence(lock, GACHA_TIERS, resultRarity);
        const lastStep = climb.length - 1;
        climb.forEach((stop, index) => {
          // A intensidade acompanha o degrau: o topo entra no pico e fica travado
          // até o impacto (lock = teaseDur - 0.35).
          const peak = 0.7 + 0.3 * (index / Math.max(1, lastStep));
          showTier(stop.tier, stop.at, index === lastStep ? 0.24 : 0.16, peak);
          resultTl.call(() => sfxRef.current.tick(index), [], stop.at);
        });
      } else if (cfg.teaseMode === "fake-drop") {
        const fakeSeq = fakeDropTeaseSequence(lock, GACHA_TIERS, resultRarity, cfg.fakeDropFreeze);
        const lastStep = fakeSeq.length - 1;
        fakeSeq.forEach((stop, index) => {
          const isFreezeStep = stop.freeze === true;
          const peak = isFreezeStep ? 1.0 : 0.7 + 0.3 * (index / Math.max(1, lastStep));
          showTier(stop.tier, stop.at, isFreezeStep ? 0.12 : 0.16, peak);
          resultTl.call(() => sfxRef.current.tick(index), [], stop.at);
          // No congelamento do tier-isca: tremor extra no stage para enfatizar o falso clímax.
          if (isFreezeStep && stage) {
            const shakeAmp = Math.max(TIER_SHAKE[resultRarity], 6);
            [1, -0.8, 0.6, -0.4, 0.2, 0].forEach((mult, si) => {
              resultTl.to(frame ?? stage, {
                x: mult * shakeAmp,
                y: -mult * shakeAmp * 0.6,
                duration: 0.04,
                ease: "none",
              }, stop.at + si * 0.04);
            });
          }
        });
      } else {
        const stops = teaseStops(lock);
        const sequence = cfg.teaseMode === "ordered"
          ? orderedTeaseSequence(stops.length, GACHA_TIERS, resultRarity)
          : randomTeaseSequence(stops.length, GACHA_TIERS, cfg.maxDrop);
        stops.forEach((at, index) => {
          showTier(sequence[index]!, at, 0.16, 0.8);
          resultTl.call(() => sfxRef.current.tick(index), [], at);
        });
        // O sorteio não garante a cor real: a trava no fim da janela é o que entrega.
        showTier(resultRarity, lock, 0.2, 1);
      }

      if (tint && epicUp) resultTl.to(tint, { opacity: 0.55, duration: lock, ease: "power1.in" }, 0);
      if (stage && epicUp) resultTl.to(stage, { scale: 1.05, duration: impactAt, ease: "power1.inOut" }, 0);

      /* Tremor crescente (±1 a ±3 px) */
      const maxAmp = TIER_TREMBLE[resultRarity];
      if (stage && !compact && maxAmp > 0) {
        const tremor = { p: 0 };
        resultTl.to(tremor, {
          p: 1,
          duration: impactAt,
          ease: "power2.in",
          onUpdate: () => {
            const amp = 1 + (maxAmp - 1) * tremor.p;
            gsap.set(stage, { x: (Math.random() * 2 - 1) * amp, y: (Math.random() * 2 - 1) * amp });
          },
        }, 0);
        resultTl.set(stage, { x: 0, y: 0 }, impactAt);
      }

      /* Título da raridade + god rays (lendária ou acima) */
      if (topTier && title) {
        resultTl.call(() => setPhaseAt("title"), [], teaseDur);
        resultTl.fromTo(title, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 0.34, ease: "back.out(1.7)" }, teaseDur);
        resultTl.to(title, { opacity: 0, scale: 1.12, duration: 0.16, ease: "power1.in" }, impactAt - 0.16);
      }
      if (topTier && godrays) {
        const godSpin = gsap.to(godrays, { rotation: 360, duration: 26, repeat: -1, ease: "none", paused: true });
        loops.push(godSpin);
        resultTl.call(() => { placeFx(); godSpin.play(); }, [], teaseDur);
        resultTl.fromTo(godrays, { opacity: 0 }, { opacity: 0.9, duration: 0.6, ease: "power2.out" }, teaseDur);
        resultTl.to(godrays, { opacity: 0, duration: 0.4, ease: "power1.inOut" }, revealAt);
      }

      /* God rays reverso exclusivo para Mítica */
      const mythicGodrays = resultIndex === IDX_MYTHIC ? one<HTMLElement>("[data-godrays-reverse]") : null;
      if (mythicGodrays) {
        const reverseColor = RARITY_COLORS.MITICA;
        gsap.set(mythicGodrays, { xPercent: -50, yPercent: -50, opacity: 0 });
        const godReverseSpin = gsap.to(mythicGodrays, { rotation: -360, duration: 18, repeat: -1, ease: "none", paused: true });
        loops.push(godReverseSpin);
        resultTl.call(() => { placeFx(); godReverseSpin.play(); }, [], teaseDur + 0.18);
        resultTl.fromTo(mythicGodrays, { opacity: 0 }, { opacity: 0.55, duration: 0.5, ease: "power2.out" }, teaseDur + 0.18);
        resultTl.to(mythicGodrays, { opacity: 0, duration: 0.35, ease: "power1.inOut" }, revealAt);
        // Reposicionar junto com o principal.
        resultTl.call(() => { gsap.set(mythicGodrays, { left: `${(parseFloat(godrays?.style.left ?? "50%"))}px`, top: `${(parseFloat(godrays?.style.top ?? "50%"))}px` }); }, [], teaseDur + 0.18);
        void reverseColor; // referência usada no JSX abaixo
      }

      /* Impacto */
      resultTl.call(() => {
        waiting.current = false;
        setPhaseAt("impact");
        stopAtImpact.forEach((loop) => loop.kill());
        placeFx();
        burstPalette = resultRarity === "GALACTICA"
          ? [...cfg.particleGalaxy, resultAccent]
          : [resultAccent, "#F1F5F9", resultAccent];
        particleMode.current = "burst";
        burstStart.current = clock();
        sfxRef.current.impact(resultIndex / Math.max(1, GACHA_TIERS.length - 1));
        if (!compact && resultIndex >= IDX_EPIC && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(resultIndex >= IDX_LEGENDARY ? [45, 25, 70] : 35);
        }
      }, [], impactAt);
      if (orbitSvg) resultTl.to(orbitSvg, { opacity: 0, duration: 0.25, ease: "power1.out" }, impactAt);
      if (glow) resultTl.to(glow, { opacity: 0.3, scale: 1.05, duration: 0.4, ease: "power2.out" }, impactAt);
      if (stage && epicUp) resultTl.to(stage, { scale: 1, duration: impactDur + 0.1, ease: "power3.out" }, impactAt);
      if (auras.length) resultTl.to(auras, { opacity: 0, scale: 1.5, duration: 0.4, ease: "power2.out" }, impactAt + 0.05);
      if (crystal) resultTl.to(crystal, { scale: 1.9, opacity: 0, duration: impactDur, ease: "power2.out" }, impactAt);
      // Mítica: fragmentos do cristal explodem em direções opostas.
      if (resultIndex === IDX_MYTHIC && !compact) {
        const frags = all<HTMLElement>("[data-crystal-frag]");
        if (frags.length) {
          // Torna os fragmentos visíveis junto com o cristal principal saindo.
          resultTl.set(frags, { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 }, impactAt);
          const angles = [0, 72, 144, 216, 288];
          frags.forEach((frag, fi) => {
            const ang = ((angles[fi % angles.length] ?? 0) * Math.PI) / 180;
            const dist = 55 + (fi % 3) * 22;
            resultTl.fromTo(
              frag,
              { x: 0, y: 0, opacity: 1, scale: 1, rotation: 0 },
              {
                x: Math.cos(ang) * dist,
                y: Math.sin(ang) * dist,
                opacity: 0,
                scale: 0.3,
                rotation: (fi % 2 === 0 ? 1 : -1) * (120 + fi * 30),
                duration: 0.55 + fi * 0.04,
                ease: "power2.out",
              },
              impactAt,
            );
          });
        }
      }
      if (flash) {
        const peak = compact ? 0.25 : TIER_FLASH[resultRarity];
        resultTl
          .fromTo(flash, { opacity: 0 }, { opacity: peak, duration: 0.05, ease: "none" }, impactAt)
          .to(flash, { opacity: 0, duration: 0.07, ease: "power1.out" }, impactAt + 0.05);
      }
      if (tint && epicUp) {
        resultTl
          .to(tint, { opacity: 1, duration: 0.1, ease: "power1.out" }, impactAt)
          .to(tint, { opacity: 0.35, duration: 0.4, ease: "power1.out" }, impactAt + 0.1);
      }
      rings.forEach((ring, index) => {
        if (index >= waves) return;
        resultTl.fromTo(ring, { scale: 0.15, opacity: 0.85 }, {
          scale: 3.1,
          opacity: 0,
          duration: ringDur,
          ease: "power2.out",
          transformOrigin: "50% 50%",
        }, impactAt + index * cfg.ringStagger);
      });
      if (rays && epicUp) {
        resultTl
          .fromTo(rays, { opacity: 0, rotation: -10, scale: 0.55, transformOrigin: "50% 50%" }, {
            opacity: topTier ? 0.95 : 0.65,
            rotation: 0,
            scale: 1,
            duration: 0.25,
            ease: "power2.out",
          }, impactAt)
          .to(rays, { opacity: 0, rotation: 14, scale: 1.3, duration: 0.55, ease: "power1.in" }, impactAt + 0.25);
      }
      const shake = compact ? 0 : TIER_SHAKE[resultRarity];
      if (frame && shake) {
        [1, -1, 0.7, -0.6, 0.3, 0].forEach((mult, index) => {
          resultTl.to(frame, { x: mult * shake, y: -mult * shake * 0.7, duration: 0.045, ease: "none" }, impactAt + index * 0.045);
        });
      }

      /* Revelação */
      resultTl.call(() => setPhaseAt("reveal"), [], revealAt);
      if (flip) {
        resultTl.to(flip, { rotationY: 180, duration: flipDur, ease: "power2.inOut" }, revealAt);
        resultTl
          .to(flip, { scale: 1.1, duration: flipDur * 0.4, ease: "power2.out" }, revealAt)
          .to(flip, { scale: 1, duration: flipDur * 0.6, ease: "power2.inOut" }, revealAt + flipDur * 0.4);
      }
      if (cardArt) resultTl.set(cardArt, { opacity: 1 }, cardRevealedAt);
      if (sweep) {
        const sweepDur = Math.max(0.5, cfg.sweepDuration);
        const sweepAt = cardArtReadyAt;
        resultTl.set(sweep, { opacity: 1, xPercent: -150 }, sweepAt);
        resultTl.to(sweep, { xPercent: 150, duration: sweepDur, ease: "power1.inOut" }, sweepAt);
        resultTl.set(sweep, { opacity: 0 }, sweepAt + sweepDur);
      }
      if (badge) resultTl.fromTo(badge, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.out" }, cardDetailsAt);
      if (rarityLabel) {
        resultTl.fromTo(rarityLabel, { scale: 2, opacity: 0 }, {
          scale: 1,
          opacity: 1,
          duration: Math.max(0.3, cfg.badgeDuration),
          ease: "back.out(2.4)",
        }, cardDetailsAt);
      }
      if (letters.length) {
        resultTl.fromTo(letters, { opacity: 0, y: 14 }, {
          opacity: 1,
          y: 0,
          duration: 0.28,
          stagger: Math.min(0.03, 0.55 / letters.length),
          ease: "power2.out",
        }, cardDetailsAt + 0.08);
      }
      if (copyTag) {
        if (compact) {
          // Duplicata: o texto "risca" de cima para baixo com um blur — diferente do pop normal.
          resultTl.fromTo(copyTag, { y: -22, opacity: 0, filter: "blur(6px)" }, {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.38,
            ease: "power3.out",
          }, cardDetailsAt + 0.26);
          // Pequeno tremor lateral depois que aparece, comunicando "não é nova".
          resultTl.to(copyTag, { x: -3, duration: 0.05, ease: "none" }, cardDetailsAt + 0.26 + 0.38);
          resultTl.to(copyTag, { x: 3, duration: 0.05, ease: "none" }, cardDetailsAt + 0.26 + 0.43);
          resultTl.to(copyTag, { x: -2, duration: 0.04, ease: "none" }, cardDetailsAt + 0.26 + 0.48);
          resultTl.to(copyTag, { x: 0, duration: 0.04, ease: "none" }, cardDetailsAt + 0.26 + 0.52);
        } else {
          resultTl.fromTo(copyTag, { scale: 0.4, opacity: 0, y: -6 }, {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.45,
            ease: "back.out(2.6)",
          }, cardDetailsAt + 0.26);
        }
      }
      resultTl.call(() => {
        if (compact) {
          sfxRef.current.dupe();
        } else if (resultRarity === "GALACTICA") {
          sfxRef.current.galacticChime();
        } else {
          sfxRef.current.chime(resultIndex / Math.max(1, GACHA_TIERS.length - 1));
        }
      }, [], cardRevealedAt);
      resultTl.call(() => setRevealed(true), [], cardArtReadyAt);

      const letterStagger = letters.length
        ? Math.min(0.03, 0.55 / letters.length) * (letters.length - 1)
        : 0;
      const detailsEndAt = Math.max(
        cardDetailsAt + Math.max(0.3, cfg.badgeDuration),
        cardDetailsAt + 0.08 + 0.28 + letterStagger,
        copyTag ? cardDetailsAt + 0.26 + 0.45 : cardRevealedAt,
      );
      const continueAt = Math.max(cardRevealedAt + gap, detailsEndAt);
      const effectsEnd = Math.max(
        continueAt,
        impactAt + Math.max(0.45, cfg.particleDuration) + 0.1,
        impactAt + (waves - 1) * cfg.ringStagger + ringDur + 0.05,
        revealAt + 0.4,
      );
      resultTl.call(() => {
        setCanContinue(true);
        setPhaseAt("showcase");
        if (continuation.current) {
          gsap.fromTo(continuation.current, { opacity: 0.35, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" });
        }
      }, [], continueAt);
      resultTl.call(() => {
        particleMode.current = "none";
        loops.forEach((loop) => loop.kill());
        activeLoops.current = [];
        root.removeAttribute("data-animating");
        setEffectsDone(true);
      }, [], effectsEnd);

      tl.add(resultTl, invocationEnd);
      if (waiting.current) {
        waiting.current = false;
        tl.play();
      }
    };
    appendReveal.current = addResultTimeline;

    /* Fases 0 e 1: clique, pressão no frame e invocação */
    const label = one<HTMLElement>("[data-invocation-label]");
    const vignette = one<HTMLElement>("[data-vignette]");
    if (vignette) tl.fromTo(vignette, { opacity: 0 }, { opacity: 0.72, duration: cfg.enterDuration, ease: "power1.out" }, 0);
    if (frame) tl.fromTo(frame, { scale: 0.985 }, { scale: 1, duration: 0.3, ease: "power3.out" }, 0);
    tl.call(() => setPhaseAt("press"), [], 0);
    if (stage) {
      tl.fromTo(stage, { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: Math.max(0.2, cfg.enterDuration + 0.08), ease: "power3.out" }, 0);
    }
    tl.call(() => setPhaseAt("invocation"), [], 0.15);
    tl.call(() => sfxRef.current.charge(Math.max(1.2, invocationEnd - 0.15)), [], 0.15);
    if (crystal) {
      tl.to(crystal, { rotation: 720, scale: 0.88, duration: Math.max(0.75, cfg.crystalSpinDuration), ease: "power2.inOut" }, cfg.crystalSpinAt);
    }
    if (label) {
      tl.fromTo(label, { letterSpacing: "0.02em" }, { letterSpacing: "0.16em", duration: 0.6, repeat: 2, yoyo: true, ease: "sine.inOut" }, 0.2);
    }
    if (spins.length) tl.to(spins, { timeScale: 2.6, duration: Math.max(0.5, invocationEnd - 0.15), ease: "power2.in" }, 0.15);
    if (beat) {
      const pulse = beat;
      tl.call(() => { pulse.play(); }, [], 0.15);
      tl.to(pulse, { timeScale: 1.25, duration: invocationEnd, ease: "none" }, 0.15);
    }
    tl.call(() => {
      setPhaseAt("tease");
      if (!revealAdded.current) {
        waiting.current = true;
        setPhaseAt("waiting");
        tl.pause();
      }
    }, [], invocationEnd);

    if (latestPull.current) addResultTimeline(latestPull.current);
    tl.play();

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", measureBounds);
      tl.kill();
      loops.forEach((loop) => loop.kill());
      activeLoops.current = [];
      timeline.current = null;
      appendReveal.current = () => {};
      root.removeAttribute("data-animating");
    };
  }, [motionPreferenceReady, reduceMotion, showFinal]);

  const nameLetters = displayPull?.card.name.split("") ?? [];
  const showTitle = rarityIndex >= IDX_LEGENDARY && !!displayPull && !flat;
  const showEpicRays = rarityIndex >= IDX_EPIC && motionPreferenceReady && !reduceMotion && !effectsDone;
  const fxLive = motionPreferenceReady && !reduceMotion && !effectsDone;
  const showMythicReverseRays = rarityIndex === IDX_MYTHIC && fxLive;
  const showGalacticStars = rarityIndex >= GACHA_TIERS.indexOf("GALACTICA") && fxLive;
  const showCrystalFragments = rarityIndex === IDX_MYTHIC && fxLive;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="roll-title"
      data-phase={phase}
      data-revealed={revealed ? "true" : "false"}
      data-reduced={reduceMotion ? "true" : "false"}
      data-flat={flat ? "true" : "false"}
      className="roll-stage-dialog fixed inset-0 m-0 h-[100dvh] min-h-[100dvh] max-h-none w-screen max-w-none overflow-x-hidden overflow-y-auto border-0 bg-ink-deep/95 p-4 text-snow backdrop:bg-ink-deep/95"
      style={{ "--roll-accent": accent } as CSSProperties}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
          event.preventDefault();
          skipOrClose();
        }
      }}
    >
      <style>{ROLL_CSS}</style>
      <div data-vignette aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-black opacity-0" />
      <div
        data-tint
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-0"
        style={{
          color: flat && revealed ? accent : NEUTRAL_COLOR,
          backgroundColor: "currentColor",
          maskImage: "radial-gradient(circle at 50% 45%, #000 0%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 45%, #000 0%, transparent 65%)",
        }}
      />
      {fxLive && <canvas aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] h-full w-full opacity-90" />}
      {fxLive && rarityIndex >= IDX_LEGENDARY && displayPull && (
        <div
          data-godrays
          aria-hidden="true"
          className="pointer-events-none fixed z-[1]"
          style={{
            left: "50%",
            top: "50%",
            width: "160vmax",
            height: "160vmax",
            opacity: 0,
            mixBlendMode: "screen",
            backgroundImage: `repeating-conic-gradient(from 0deg, ${accent}59 0deg 3deg, transparent 3deg 12deg)`,
            maskImage: "radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.7) 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.7) 40%, transparent 100%)",
          }}
        />
      )}
      {showMythicReverseRays && (
        <div
          data-godrays-reverse
          aria-hidden="true"
          className="pointer-events-none fixed z-[1]"
          style={{
            left: "50%",
            top: "50%",
            width: "140vmax",
            height: "140vmax",
            opacity: 0,
            mixBlendMode: "screen",
            // Raios mais espaçados que o principal, ângulo diferente para contrastar.
            backgroundImage: `repeating-conic-gradient(from 0deg, ${RARITY_COLORS.MITICA}40 0deg 2deg, transparent 2deg 18deg)`,
            maskImage: "radial-gradient(closest-side, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 35%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(closest-side, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 35%, transparent 100%)",
          }}
        />
      )}
      {showGalacticStars && (
        <canvas
          data-starfield
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[1] h-full w-full"
          style={{ opacity: 0.65 }}
          ref={(el) => {
            if (!el) return;
            // Pintura única de estrelas: pontos aleatórios distribuídos pelo canvas.
            // Usa seed determinística do pull.id para não piscarem entre renders.
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            el.width = Math.round(window.innerWidth * dpr);
            el.height = Math.round(window.innerHeight * dpr);
            const ctx = el.getContext("2d");
            if (!ctx) return;
            ctx.scale(dpr, dpr);
            const seed = displayPull?.id ?? "galaxy";
            let h = 2166136261;
            for (let ci = 0; ci < seed.length; ci++) h = Math.imul(h ^ seed.charCodeAt(ci), 16777619);
            const count = 180;
            const w = window.innerWidth;
            const ht = window.innerHeight;
            for (let i = 0; i < count; i++) {
              h = Math.imul(h ^ (h >>> 13), 1274126177);
              const u = (h >>> 0) / 4294967295;
              h = Math.imul(h ^ (h >>> 13), 1274126177);
              const v = (h >>> 0) / 4294967295;
              h = Math.imul(h ^ (h >>> 13), 1274126177);
              const s = 0.5 + (h >>> 0) / 4294967295 * 2;
              const palette = ["#C084FC", "#F472B6", "#38BDF8", "#FFFFFF"];
              const color = palette[i % palette.length]!;
              ctx.globalAlpha = 0.3 + ((h >>> 0) / 4294967295) * 0.65;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(u * w, v * ht, s, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          }}
        />
      )}
      {showEpicRays && (
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="pointer-events-none fixed inset-0 z-[2] h-full w-full">
          <g data-rays-pos transform="translate(50 50)">
            <g data-radial-rays fill="none" stroke={accent} strokeWidth="0.28" style={{ opacity: 0 }}>
              {Array.from({ length: 32 }, (_, index) => (
                <path key={index} d={index % 2 ? "M0-4V-70" : "M0-8V-95"} transform={`rotate(${index * 11.25})`} />
              ))}
              <circle r="30" strokeDasharray="0.5 2" />
            </g>
          </g>
        </svg>
      )}
      {!reduceMotion && !flat && (
        <div data-flash aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 bg-white opacity-0" />
      )}

      <div data-shake-frame className="relative z-10 flex min-h-full flex-col items-center justify-center gap-4 py-4 sm:gap-5">
        <p className="max-w-[calc(100%-7rem)] text-center font-mono text-caption uppercase tracking-[0.24em] text-ice/90 sm:max-w-none">
          ANIMESICE <span aria-hidden="true">/</span> SINAL DE INVOCAÇÃO
        </p>
        <h2 id="roll-title" className="sr-only">Invocação</h2>
        <h2 data-invocation-label aria-hidden="true" className="min-h-8 text-center font-display text-display-lg">
          {revealed ? (preview ? "Prévia revelada" : "Sua carta") : "Invocando sua carta…"}
        </h2>
        <p id="roll-status" className="sr-only" aria-live="polite">
          {phase === "waiting"
            ? "Aguardando o resultado do giro."
            : revealed
              ? `Carta revelada: ${displayPull?.card.name ?? ""}, raridade ${RARITY_LABEL[rarity]}${copyState === "new" ? ", nova carta" : copyState === "duplicate" ? ", repetida" : ""}.`
              : "Invocação em andamento. Você pode pular a animação."}
        </p>

        {showTitle && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <p
              data-rarity-title
              className={`font-display text-5xl font-bold tracking-[0.2em] sm:text-7xl ${rarityText}`}
              style={{ opacity: 0, filter: `drop-shadow(0 0 18px ${accent})` }}
            >
              {RARITY_LABEL[rarity]}
            </p>
          </div>
        )}

        <div
          data-stage
          className="relative z-10 aspect-[3/4] w-[min(70vw,420px)] max-w-full"
          style={{ perspective: 1000, color: flat && revealed ? accent : NEUTRAL_COLOR }}
          onPointerMove={(event) => {
            if (flat || !revealed) return;
            const rect = event.currentTarget.getBoundingClientRect();
            userTilt.current = true;
            applyTilt((event.clientX - rect.left) / rect.width - 0.5, (event.clientY - rect.top) / rect.height - 0.5);
          }}
          onPointerLeave={() => {
            userTilt.current = false;
            applyTilt(0, 0);
          }}
        >
          <div data-glow aria-hidden="true" className="absolute inset-[-10%] rounded-full bg-current opacity-20 blur-3xl" />
          {fxLive && (
            <svg data-orbit-svg aria-hidden="true" viewBox="0 0 400 520" className="pointer-events-none absolute inset-[-10%] h-[120%] w-[120%] overflow-visible">
              <defs>
                <filter id={`${filterId}-glow`} x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1.8 0" result="colored" />
                  <feMerge><feMergeNode in="colored" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g data-orbit-outer fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.6" filter={`url(#${filterId}-glow)`}>
                <circle cx={CX} cy={CY} r="220" strokeDasharray="2 9" />
                <circle cx={CX} cy={CY} r="208" strokeWidth="0.7" opacity="0.7" />
                <path d={SIGIL.ticks} strokeWidth="0.9" />
              </g>
              <g data-orbit-inner fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.75">
                <circle cx={CX} cy={CY} r="176" strokeDasharray="56 18 4 18" />
                <path d={SIGIL.hexA} strokeWidth="1" />
                <path d={SIGIL.hexB} strokeWidth="1" />
                {HEX_VERTICES.map(([x, y], index) => (
                  <circle key={index} cx={x} cy={y} r="4.5" fill="currentColor" />
                ))}
              </g>
              <g data-rune-orbit fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.9">
                <path d={SIGIL.runes} />
              </g>
              <path d={SIGIL.spokes} fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />
            </svg>
          )}

          {fxLive && (
            <svg data-fx-svg aria-hidden="true" viewBox="0 0 400 520" className="pointer-events-none absolute inset-[-10%] z-0 h-[120%] w-[120%] overflow-visible">
              <defs>
                <filter id={`${filterId}-glow-fx`} x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1.8 0" result="colored" />
                  <feMerge><feMergeNode in="colored" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {GACHA_TIERS.map((tier) => (
                  <radialGradient key={tier} id={`${filterId}-aura-${tier}`}>
                    <stop offset="0%" stopColor={RARITY_COLORS[tier]} stopOpacity="0.6" />
                    <stop offset="55%" stopColor={RARITY_COLORS[tier]} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={RARITY_COLORS[tier]} stopOpacity="0" />
                  </radialGradient>
                ))}
              </defs>
              {GACHA_TIERS.map((tier) => (
                <g key={tier} data-tier-aura={tier} style={{ opacity: 0 }}>
                  <circle cx={CX} cy={CY} r="190" fill={`url(#${filterId}-aura-${tier})`} />
                  <circle cx={CX} cy={CY} r="100" fill="none" stroke={RARITY_COLORS[tier]} strokeWidth="6" filter={`url(#${filterId}-glow-fx)`} />
                  <circle cx={CX} cy={CY} r="132" fill="none" stroke={RARITY_COLORS[tier]} strokeWidth="1.4" strokeDasharray="3 7" />
                </g>
              ))}
              {Array.from({ length: Math.max(1, Math.min(3, cfg.ringSlots)) }, (_, index) => (
                <circle
                  key={index}
                  data-ring
                  cx={CX}
                  cy={CY}
                  r="96"
                  fill="none"
                  stroke={accent}
                  strokeWidth={index === 0 ? 2.4 : 1.4}
                  style={{ opacity: 0 }}
                />
              ))}
            </svg>
          )}

          <div
            data-flip
            className="relative z-10 aspect-[3/4]"
            style={{ transformStyle: flat ? "flat" : "preserve-3d", transform: flat ? "none" : undefined }}
          >
            <div
              data-card-front
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center overflow-hidden border border-ice/50 bg-panel shadow-[0_0_40px_rgba(56,232,218,0.18)]"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div data-crystal className="relative h-28 w-28 rotate-45 border border-ice/80 bg-gradient-to-tr from-transparent via-ice/30 to-ice/5 shadow-glow-ice">
                <span className="absolute inset-3 border border-ice/40" />
                <span className="absolute inset-7 border border-ice/25" />
              </div>
              {showCrystalFragments && (
                // 5 fragmentos do cristal — escondidos até o impacto de Mítica,
                // quando explodem em direções radiais pela timeline.
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  {[0, 72, 144, 216, 288].map((deg, fi) => (
                    <div
                      key={fi}
                      data-crystal-frag
                      className="absolute h-4 w-4 rotate-45 border border-rose-400/80 bg-gradient-to-tr from-transparent via-rose-400/40 to-rose-300/10"
                      style={{ opacity: 0 }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              )}
              <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full text-ice opacity-25">
                <path d="M50 0v100M0 50h100M15 15l70 70M85 15 15 85" stroke="currentColor" strokeWidth=".45" />
                <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth=".7" strokeDasharray="2 4" />
              </svg>
              <div data-back-shine className="absolute inset-0 bg-gradient-to-r from-transparent via-snow/15 to-transparent" />
            </div>
            <div
              data-card-back
              inert={!revealed}
              aria-hidden={!revealed}
              className="absolute inset-0"
              style={{
                backfaceVisibility: flat ? "visible" : "hidden",
                transform: flat ? "none" : "rotateY(180deg)",
              }}
            >
              {displayPull && (
                <div data-card-tilt className="roll-card-tilt relative h-full w-full">
                  <div
                    data-card-art
                    data-art-ready={revealed ? "true" : undefined}
                    className="absolute inset-0"
                    style={{ opacity: flat ? (revealed ? 1 : 0) : 0, transition: "none" }}
                  >
                    <GachaCard pull={displayPull} preview={preview} showInfo={false} />
                    {holoStrength > 0 && (
                      <div
                        data-holo
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                        style={{
                          backgroundImage: holoImage,
                          opacity: revealed ? holoStrength : 0,
                          transition: "opacity 700ms ease-out",
                        }}
                      />
                    )}
                    {showSweep && (
                      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div data-sweep className="h-full w-full" style={{ opacity: 0, backgroundImage: sweepImage, mixBlendMode: "color-dodge" }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          data-badge
          className={`relative z-10 min-h-[7rem] max-w-[min(90vw,420px)] text-center ${flat ? "" : "opacity-0"}`}
          aria-hidden={!revealed}
        >
          {copyState && (
            <p className="mb-2">
              <span
                data-copy-tag
                className={
                  copyState === "new"
                    ? "inline-block border border-ice/70 bg-ice px-3 py-0.5 font-mono text-label font-semibold uppercase tracking-[0.2em] text-ink shadow-[0_0_18px_rgba(56,232,218,0.45)]"
                    : "inline-block border border-mist/50 px-3 py-0.5 font-mono text-label uppercase tracking-[0.2em] text-mist"
                }
              >
                {copyState === "new" ? "Nova!" : "Repetida +1"}
              </span>
            </p>
          )}
          <p data-rarity-label className={`inline-block font-mono text-label tracking-[0.18em] ${rarityText}`}>{RARITY_LABEL[rarity]}</p>
          {displayPull && <p data-name className="mt-1 truncate font-display text-display-lg font-semibold text-snow">
            {nameLetters.map((letter, index) => (
              <span key={`${letter}-${index}`} data-name-letter className={`inline-block ${flat ? "" : "opacity-0"}`}>{letter === " " ? "\u00a0" : letter}</span>
            ))}
          </p>}
          {displayPull && <p className="mt-1 font-mono text-body-sm text-mist">
            <span><CountUp to={displayPull.value} startWhen={revealed} /></span> pts
          </p>}
        </div>

        <button
          ref={continuation}
          autoFocus
          type="button"
          onClick={skipOrClose}
          className="relative z-20 min-h-11 min-w-32 border border-ice/70 bg-ink px-7 py-3 font-display font-semibold text-snow shadow-[0_0_20px_rgba(56,232,218,0.18)] transition-[colors,transform] hover:bg-ice hover:text-ink active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
        >
          {ready ? "Continuar" : displayPull ? "Pular" : "Fechar"}
        </button>
      </div>

      <button
        type="button"
        onClick={audio.toggle}
        aria-pressed={audio.enabled}
        aria-label={audio.enabled ? "Desativar som" : "Ativar som"}
        className="fixed right-3 top-3 z-40 flex min-h-11 min-w-11 items-center justify-center border border-ice/50 bg-ink/80 text-snow transition-colors hover:bg-ice hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          {audio.enabled ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /> : <path d="M16 9l5 6M21 9l-5 6" />}
        </svg>
      </button>
    </dialog>
  );
}
