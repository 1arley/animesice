import { DEFAULT_INSPECTION_POINTS } from "../core/contracts.ts";

export function hashSeed(seed: string | number): number {
  const s = String(seed);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, maxInclusive: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  chance: (p: number) => boolean;
};

/** Deterministic Mulberry32 PRNG — never use Math.random() in Remotion frames. */
export function createRng(seed: string | number): Rng {
  let a = hashSeed(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, maxInclusive) => Math.floor(min + next() * (maxInclusive - min + 1)),
    pick: (arr) => {
      if (arr.length === 0) throw new Error("Cannot pick from empty array");
      return arr[Math.floor(next() * arr.length)]!;
    },
    chance: (p) => next() < p,
  };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mixHex(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const k = clamp(t, 0, 1);
  return rgbToHex(lerp(a.r, b.r, k), lerp(a.g, b.g, k), lerp(a.b, b.b, k));
}

export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + Math.cos(rad) * radius,
    y: cy + Math.sin(rad) * radius,
  };
}

export type EasingFn = (t: number) => number;

function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): EasingFn {
  return (x: number) => {
    const t = clamp(x, 0, 1);
    if (t === 0 || t === 1) return t;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const inv = 1 - u;
      const bx = 3 * inv * inv * u * p1x + 3 * inv * u * u * p2x + u * u * u;
      const dx = 3 * inv * inv * p1x + 6 * inv * u * (p2x - p1x) + 3 * u * u * (1 - p2x);
      if (Math.abs(dx) < 1e-6) break;
      u = clamp(u - (bx - t) / dx, 0, 1);
    }
    const inv = 1 - u;
    return 3 * inv * inv * u * p1y + 3 * inv * u * u * p2y + u * u * u;
  };
}

export const EASING = {
  linear: (t: number): number => clamp(t, 0, 1),
  easeInCubic: (t: number): number => {
    const k = clamp(t, 0, 1);
    return k * k * k;
  },
  easeOutCubic: (t: number): number => {
    const k = 1 - clamp(t, 0, 1);
    return 1 - k * k * k;
  },
  easeInOutCubic: (t: number): number => {
    const k = clamp(t, 0, 1);
    return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  },
  easeOutExpo: (t: number): number => {
    const k = clamp(t, 0, 1);
    return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
  },
  easeInOutQuart: (t: number): number => {
    const k = clamp(t, 0, 1);
    return k < 0.5 ? 8 * k * k * k * k : 1 - Math.pow(-2 * k + 2, 4) / 2;
  },
  animesiceSnap: cubicBezier(0.16, 1, 0.3, 1),
  glacialOut: cubicBezier(0.22, 1, 0.36, 1),
  backOut: (t: number): number => {
    const k = clamp(t, 0, 1);
    if (k === 0 || k === 1) return k;
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  },
} as const satisfies Record<string, EasingFn>;

export function segmentProgress(
  frame: number,
  startFrame: number,
  endFrame: number,
  easing: EasingFn = EASING.linear,
): number {
  if (endFrame <= startFrame) return frame >= endFrame ? 1 : 0;
  const raw = clamp((frame - startFrame) / (endFrame - startFrame), 0, 1);
  return easing(raw);
}

export function phaseEnvelope(
  frame: number,
  opts: {
    enterStart: number;
    enterEnd: number;
    exitStart: number;
    exitEnd: number;
    enterEase?: EasingFn;
    exitEase?: EasingFn;
  },
): number {
  const enter = segmentProgress(frame, opts.enterStart, opts.enterEnd, opts.enterEase ?? EASING.easeOutCubic);
  const exit = 1 - segmentProgress(frame, opts.exitStart, opts.exitEnd, opts.exitEase ?? EASING.easeInCubic);
  return clamp(Math.min(enter, exit), 0, 1);
}

export function loopProgress(frame: number, durationInFrames: number): number {
  if (durationInFrames <= 0) return 0;
  const wrapped = ((frame % durationInFrames) + durationInFrames) % durationInFrames;
  return wrapped / durationInFrames;
}

export function staggerDelay(index: number, stepFrames: number, baseFrame = 0): number {
  return baseFrame + index * stepFrames;
}

export function pulseWave(progress: number, cycles: number, base = 0.65, amplitude = 0.12): number {
  return base + Math.sin(progress * Math.PI * 2 * cycles) * amplitude;
}

export function sampleInspectionFrames(
  durationInFrames: number,
  points: readonly number[] = DEFAULT_INSPECTION_POINTS,
): number[] {
  if (durationInFrames <= 1) return [0];
  const last = durationInFrames - 1;
  const set = new Set<number>();
  for (const p of points) {
    set.add(clamp(Math.round(clamp(p, 0, 1) * last), 0, last));
  }
  return [...set].sort((a, b) => a - b);
}
