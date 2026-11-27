import * as THREE from "three";

export const TAU = Math.PI * 2;

export const PALETTE_HEX = {
  bg: "#02070b",
  ice: "#9fdcf5",
  bright: "#e6faff",
  mid: "#4a9ec2",
  deep: "#06172a",
  teal: "#0c5a78",
  warm: "#ffe0b0",
} as const;

/** Exact vault dimensions from the box-common reference scene. */
export const VAULT_DIM = {
  hb: 1.1,
  hh: 1.2,
  hl: 1.2,
  lt: 0.22,
  fo: 0.003,
} as const;

/** Deterministic act boundaries (seconds) for the Common Box opening & reveal. */
export const BOX_TIMELINE = {
  curtainIn: 0.18,
  matEnd: 0.42,
  authStart: 0.42,
  authHold: 0.72,
  unlock: 0.78,
  revealStart: 1.48,
  revealPeak: 1.92,
  handoffStart: 2.65,
  complete: 2.95,
  ambientBreathCycle: 11.0,
} as const;

export type CommonBoxPhase =
  | "materializing"
  | "authenticating"
  | "opening"
  | "revealing"
  | "ambient"
  | "error";

export type CommonBoxAudioCue = "charge" | "unlock" | "reveal";

export interface CommonBoxPalette {
  ice: THREE.Color;
  bright: THREE.Color;
  mid: THREE.Color;
  deep: THREE.Color;
  teal: THREE.Color;
  warm: THREE.Color;
}

export function createLinearPalette(): CommonBoxPalette {
  return {
    ice: new THREE.Color(PALETTE_HEX.ice),
    bright: new THREE.Color(PALETTE_HEX.bright),
    mid: new THREE.Color(PALETTE_HEX.mid),
    deep: new THREE.Color(PALETTE_HEX.deep),
    teal: new THREE.Color(PALETTE_HEX.teal),
    warm: new THREE.Color(PALETTE_HEX.warm),
  };
}

export interface CommonBoxClockState {
  t: number;
  holdElapsed: number;
  ambientTime: number;
  isAmbient: boolean;
  isError: boolean;
  hasReward: boolean;
  chargeCueFired: boolean;
  unlockCueFired: boolean;
  revealCueFired: boolean;
}

export interface CommonBoxClockStepResult {
  phase: CommonBoxPhase;
  cues: CommonBoxAudioCue[];
  justCompleted: boolean;
}

/**
 * Advances the deterministic box opening timeline while enforcing the hard
 * business gate: without a confirmed reward, `t` can never cross `authHold`
 * regardless of frame delta spikes.
 */
export function advanceCommonBoxClock(
  state: CommonBoxClockState,
  dt: number,
): CommonBoxClockStepResult {
  const cues: CommonBoxAudioCue[] = [];
  if (state.isError) {
    state.holdElapsed += dt;
    return { phase: "error", cues, justCompleted: false };
  }
  if (state.isAmbient) {
    state.ambientTime += dt;
    return { phase: "ambient", cues, justCompleted: false };
  }
  if (!state.hasReward) {
    const nextT = state.t + dt;
    if (nextT >= BOX_TIMELINE.authHold) {
      state.holdElapsed += nextT - BOX_TIMELINE.authHold;
      state.t = BOX_TIMELINE.authHold;
    } else {
      state.t = nextT;
    }
    if (state.t >= BOX_TIMELINE.authStart && !state.chargeCueFired) {
      state.chargeCueFired = true;
      cues.push("charge");
    }
    return {
      phase:
        state.t < BOX_TIMELINE.authStart
          ? "materializing"
          : "authenticating",
      cues,
      justCompleted: false,
    };
  }

  state.t = Math.min(BOX_TIMELINE.complete, state.t + dt);
  if (state.t >= BOX_TIMELINE.authStart && !state.chargeCueFired) {
    state.chargeCueFired = true;
    cues.push("charge");
  }
  if (state.t >= BOX_TIMELINE.unlock && !state.unlockCueFired) {
    state.unlockCueFired = true;
    cues.push("unlock");
  }
  if (state.t >= BOX_TIMELINE.revealStart && !state.revealCueFired) {
    state.revealCueFired = true;
    cues.push("reveal");
  }

  if (state.t >= BOX_TIMELINE.complete) {
    state.isAmbient = true;
    return { phase: "ambient", cues, justCompleted: true };
  }
  if (state.t < BOX_TIMELINE.authStart) {
    return { phase: "materializing", cues, justCompleted: false };
  }
  if (state.t < BOX_TIMELINE.unlock) {
    return { phase: "authenticating", cues, justCompleted: false };
  }
  if (state.t < BOX_TIMELINE.revealStart) {
    return { phase: "opening", cues, justCompleted: false };
  }
  return { phase: "revealing", cues, justCompleted: false };
}

export const clamp = (x: number, a = 0, b = 1): number =>
  Math.min(b, Math.max(a, x));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const sstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const eOut = (x: number): number => 1 - Math.pow(1 - clamp(x), 3);

export const eIn = (x: number): number => {
  const c = clamp(x);
  return c * c * c;
};

export const eInOut = (x: number): number => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

export const eBack = (x: number, c = 1.70158): number => {
  const t = clamp(x);
  const c3 = c + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
