import * as THREE from "three";
import {
  type CommonBoxAudioCue,
  type CommonBoxPalette,
  type CommonBoxPhase,
} from "../common-box/common-box-palette";

export type PremiumOrRareTier = "RARE" | "PREMIUM";

export interface TierBoxPalette extends CommonBoxPalette {
  bgHex: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  trim: THREE.Color;
  core: THREE.Color;
}

export const TIER_PALETTE_HEX = {
  RARE: {
    bg: "#05030d",
    primary: "#b983ff",
    secondary: "#6d78ff",
    accent: "#f3e8ff",
    mid: "#7c3aed",
    deep: "#0e0624",
    teal: "#5b63f6",
    warm: "#f0abfc",
    trim: "#818cf8",
    core: "#d8b4fe",
  },
  PREMIUM: {
    bg: "#080603",
    primary: "#f2bf52",
    secondary: "#d9822b",
    accent: "#fff2cc",
    mid: "#b87a22",
    deep: "#0a0603",
    teal: "#5a3610",
    warm: "#ffe8a3",
    trim: "#e5a93c",
    core: "#fcd97b",
  },
} as const;

export interface TierBoxTimeline {
  curtainIn: number;
  matEnd: number;
  authStart: number;
  authHold: number;
  unlock: number;
  revealStart: number;
  revealPeak: number;
  handoffStart: number;
  complete: number;
  ambientBreathCycle: number;
}

/** Kinetic, dynamic opening cadence (3.25s total) for the Rare Vault. */
export const RARE_TIMELINE: TierBoxTimeline = {
  curtainIn: 0.16,
  matEnd: 0.4,
  authStart: 0.4,
  authHold: 0.8,
  unlock: 0.86,
  revealStart: 1.54,
  revealPeak: 2.02,
  handoffStart: 2.9,
  complete: 3.25,
  ambientBreathCycle: 9.5,
} as const;

/** Ceremonial anticipation and sovereign discovery cadence (3.85s total) for the Premium Reliquary. */
export const PREMIUM_TIMELINE: TierBoxTimeline = {
  curtainIn: 0.22,
  matEnd: 0.5,
  authStart: 0.5,
  authHold: 1.05,
  unlock: 1.15,
  revealStart: 1.92,
  revealPeak: 2.55,
  handoffStart: 3.45,
  complete: 3.85,
  ambientBreathCycle: 13.0,
} as const;

export function getTierTimeline(tier: PremiumOrRareTier): TierBoxTimeline {
  return tier === "RARE" ? RARE_TIMELINE : PREMIUM_TIMELINE;
}

export function createTierPalette(tier: PremiumOrRareTier): TierBoxPalette {
  const hex = TIER_PALETTE_HEX[tier];
  return {
    bgHex: hex.bg,
    primaryHex: hex.primary,
    secondaryHex: hex.secondary,
    accentHex: hex.accent,
    ice: new THREE.Color(hex.primary),
    bright: new THREE.Color(hex.accent),
    mid: new THREE.Color(hex.mid),
    deep: new THREE.Color(hex.deep),
    teal: new THREE.Color(hex.teal),
    warm: new THREE.Color(hex.warm),
    trim: new THREE.Color(hex.trim),
    core: new THREE.Color(hex.core),
  };
}

export type TierBoxAudioCue = CommonBoxAudioCue | "lockTick1" | "lockTick2";

export interface TierBoxClockState {
  t: number;
  holdElapsed: number;
  ambientTime: number;
  isAmbient: boolean;
  isError: boolean;
  hasReward: boolean;
  chargeCueFired: boolean;
  lockTick1Fired: boolean;
  lockTick2Fired: boolean;
  unlockCueFired: boolean;
  revealCueFired: boolean;
}

export interface TierBoxClockStepResult {
  phase: CommonBoxPhase;
  cues: TierBoxAudioCue[];
  justCompleted: boolean;
}

export interface TierVaultUpdateParams {
  t: number;
  holdElapsed: number;
  ambientTime: number;
  isAmbient: boolean;
  isError: boolean;
  crystalY: number;
  accentColor: THREE.Color;
}

export interface TierVaultUpdateResult {
  hover: number;
  open: number;
  charge: number;
  flash: number;
  warp: number;
  warpRing: number;
  streak: number;
  vaultFade: number;
  underLightIntensity: number;
}

export interface TierVaultController {
  root: THREE.Group;
  update: (params: TierVaultUpdateParams) => TierVaultUpdateResult;
  setLockedHeroPose: () => void;
  setPointScale: (scale: number) => void;
  dispose: () => void;
}

export function createInitialTierClockState(
  tier: PremiumOrRareTier,
  initialAmbient: boolean,
  hasReward: boolean,
): TierBoxClockState {
  const timeline = getTierTimeline(tier);
  const ambient = Boolean(initialAmbient && hasReward);
  return {
    t: ambient ? timeline.complete : 0,
    holdElapsed: 0,
    ambientTime: 0,
    isAmbient: ambient,
    isError: false,
    hasReward,
    chargeCueFired: ambient,
    lockTick1Fired: ambient,
    lockTick2Fired: ambient,
    unlockCueFired: ambient,
    revealCueFired: ambient,
  };
}

/**
 * Advances a tier opening timeline deterministically while enforcing the
 * hard business gate: until the backend confirms the granted reward, `t`
 * never crosses `authHold` regardless of frame delta spikes.
 */
export function advanceTierBoxClock(
  tier: PremiumOrRareTier,
  state: TierBoxClockState,
  dt: number,
): TierBoxClockStepResult {
  const tl = getTierTimeline(tier);
  const cues: TierBoxAudioCue[] = [];

  if (state.isError) {
    state.holdElapsed += dt;
    return { phase: "error", cues, justCompleted: false };
  }
  if (state.isAmbient) {
    state.ambientTime += dt;
    return { phase: "ambient", cues, justCompleted: false };
  }

  const chargeAt = tl.authStart;
  const tick1At = tl.authStart + (tier === "RARE" ? 0.24 : 0.18);
  const tick2At = tl.authStart + 0.42;

  const collectChargeCues = () => {
    if (state.t >= chargeAt && !state.chargeCueFired) {
      state.chargeCueFired = true;
      cues.push("charge");
    }
    if (state.t >= tick1At && !state.lockTick1Fired) {
      state.lockTick1Fired = true;
      cues.push("lockTick1");
    }
    if (tier === "PREMIUM" && state.t >= tick2At && !state.lockTick2Fired) {
      state.lockTick2Fired = true;
      cues.push("lockTick2");
    }
  };

  if (!state.hasReward) {
    const nextT = state.t + dt;
    if (nextT >= tl.authHold) {
      state.holdElapsed += nextT - tl.authHold;
      state.t = tl.authHold;
    } else {
      state.t = nextT;
    }
    collectChargeCues();
    return {
      phase: state.t < tl.authStart ? "materializing" : "authenticating",
      cues,
      justCompleted: false,
    };
  }

  state.t = Math.min(tl.complete, state.t + dt);
  collectChargeCues();
  if (state.t >= tl.unlock && !state.unlockCueFired) {
    state.unlockCueFired = true;
    cues.push("unlock");
  }
  if (state.t >= tl.revealStart && !state.revealCueFired) {
    state.revealCueFired = true;
    cues.push("reveal");
  }

  if (state.t >= tl.complete) {
    state.isAmbient = true;
    return { phase: "ambient", cues, justCompleted: true };
  }
  if (state.t < tl.authStart) {
    return { phase: "materializing", cues, justCompleted: false };
  }
  if (state.t < tl.unlock) {
    return { phase: "authenticating", cues, justCompleted: false };
  }
  if (state.t < tl.revealStart) {
    return { phase: "opening", cues, justCompleted: false };
  }
  return { phase: "revealing", cues, justCompleted: false };
}
