import type { Defs } from "@svgdotjs/svg.js";

export type DefsCanvasLike = { defs: () => Defs; bindWindow?: () => void };
export type DefsTarget = Defs | DefsCanvasLike;

function isCanvasLike(target: DefsTarget): target is DefsCanvasLike {
  return "defs" in target && typeof target.defs === "function";
}

function resolveDefs(target: DefsTarget): Defs {
  if (isCanvasLike(target)) {
    target.bindWindow?.();
    return target.defs();
  }
  return target;
}

export type GradientStop = {
  offset: number;
  color: string;
  opacity?: number;
};

/**
 * Exact AnimesIce brand & rarity colors mirrored from `animesice/tailwind.config.ts`
 * and `animesice/src/lib/gacha-rarity-colors.ts`.
 */
export const ANIMESICE_PALETTE = {
  ink: "#080C12",
  inkDeep: "#05070B",
  panel: "#0E141D",
  panelSubtle: "#121A26",
  slate: "#16202F",
  hairline: "#1F2B3E",
  ice: "#38E8DA",
  iceBright: "#60F6E9",
  snow: "#F1F5F9",
  mist: "#94A3B8",
  signal: "#FF6B4A",
  blood: "#E5484D",
  motion: {
    void: "#05080E",
    frost: "#E2F7F9",
    glacier: "#7CF5EB",
    cyan: "#00E5FF",
    azure: "#008CDA",
    teal: "#007A87",
  },
  rarity: {
    COMUM: "#38E8DA",
    INCOMUM: "#34D399",
    RARA: "#38BDF8",
    EPICA: "#A78BFA",
    LENDARIA: "#FCD34D",
    MITICA: "#FB7185",
    GALACTICA: "#C084FC",
  },
} as const;

export const THEME_PALETTES = {
  CELESTIAL_GOLD: {
    bgDeep: "#040818",
    bgMid: "#0B1B46",
    bgLight: "#163578",
    goldBright: "#FFF4CC",
    goldMid: "#E6BA5A",
    goldDeep: "#9C6B1D",
    starWhite: "#F8FAFC",
    accentBlue: "#3B82F6",
  },
  GLACIAL_ICE: {
    bgDeep: "#05080E",
    bgMid: "#0B192C",
    bgLight: "#143456",
    iceBright: "#E2F7F9",
    iceMid: "#38E8DA",
    iceDeep: "#007A87",
    goldAccent: "#FCD34D",
  },
  OBSIDIAN_CRIMSON: {
    bgDeep: "#060408",
    bgMid: "#1B0912",
    bgLight: "#3D1020",
    crimsonBright: "#FDA4AF",
    crimsonMid: "#E5484D",
    crimsonDeep: "#7F1D1D",
    goldTrim: "#F4D078",
  },
  PRISM_ARCANE: {
    bgDeep: "#070714",
    bgMid: "#16113A",
    bgLight: "#2B1B63",
    violet: "#C084FC",
    pink: "#F472B6",
    cyan: "#38BDF8",
    mint: "#34D399",
  },
} as const;

export type MetallicPreset =
  | "gold-foil"
  | "celestial-gold"
  | "antique-bronze"
  | "ice-crystal"
  | "silver-chrome"
  | "obsidian-steel"
  | "rose-mythic"
  | "prism-holo"
  | "midnight-sky"
  | "royal-ribbon-blue"
  | "stardust-ribbon";

export const METALLIC_PRESETS: Record<MetallicPreset, readonly GradientStop[]> = {
  "gold-foil": [
    { offset: 0, color: "#FFF8DC" },
    { offset: 0.16, color: "#FDE047" },
    { offset: 0.36, color: "#EAB308" },
    { offset: 0.54, color: "#9A6708" },
    { offset: 0.74, color: "#FBBF24" },
    { offset: 0.9, color: "#FEF08A" },
    { offset: 1, color: "#CA8A04" },
  ],
  "celestial-gold": [
    { offset: 0, color: "#FFF6D1" },
    { offset: 0.2, color: "#F5D27B" },
    { offset: 0.45, color: "#D6A346" },
    { offset: 0.65, color: "#96661E" },
    { offset: 0.85, color: "#F0C96E" },
    { offset: 1, color: "#FFF2C2" },
  ],
  "antique-bronze": [
    { offset: 0, color: "#FDE6C4" },
    { offset: 0.25, color: "#C98A4B" },
    { offset: 0.55, color: "#734218" },
    { offset: 0.8, color: "#B8773B" },
    { offset: 1, color: "#573010" },
  ],
  "ice-crystal": [
    { offset: 0, color: "#F2FEFF" },
    { offset: 0.18, color: "#7CF5EB" },
    { offset: 0.42, color: "#38E8DA" },
    { offset: 0.64, color: "#008CDA" },
    { offset: 0.84, color: "#60F6E9" },
    { offset: 1, color: "#005E8C" },
  ],
  "silver-chrome": [
    { offset: 0, color: "#FFFFFF" },
    { offset: 0.22, color: "#CBD5E1" },
    { offset: 0.48, color: "#64748B" },
    { offset: 0.7, color: "#F1F5F9" },
    { offset: 0.88, color: "#94A3B8" },
    { offset: 1, color: "#475569" },
  ],
  "obsidian-steel": [
    { offset: 0, color: "#475569" },
    { offset: 0.25, color: "#1E293B" },
    { offset: 0.5, color: "#0B111A" },
    { offset: 0.78, color: "#334155" },
    { offset: 1, color: "#05070B" },
  ],
  "rose-mythic": [
    { offset: 0, color: "#FFE4E6" },
    { offset: 0.22, color: "#FB7185" },
    { offset: 0.48, color: "#BE123C" },
    { offset: 0.74, color: "#FDA4AF" },
    { offset: 1, color: "#9F1239" },
  ],
  "prism-holo": [
    { offset: 0, color: "#F472B6" },
    { offset: 0.2, color: "#C084FC" },
    { offset: 0.4, color: "#38BDF8" },
    { offset: 0.6, color: "#34D399" },
    { offset: 0.8, color: "#FDE047" },
    { offset: 1, color: "#FB7185" },
  ],
  "midnight-sky": [
    { offset: 0, color: "#030714" },
    { offset: 0.35, color: "#0A183D" },
    { offset: 0.65, color: "#10275C" },
    { offset: 1, color: "#030714" },
  ],
  "royal-ribbon-blue": [
    { offset: 0, color: "#60A5FA" },
    { offset: 0.25, color: "#1D4ED8" },
    { offset: 0.6, color: "#0F2463" },
    { offset: 0.85, color: "#2563EB" },
    { offset: 1, color: "#091438" },
  ],
  "stardust-ribbon": [
    { offset: 0, color: "#FFF2C2", opacity: 0.9 },
    { offset: 0.32, color: "#93C5FD", opacity: 0.65 },
    { offset: 0.7, color: "#2563EB", opacity: 0.32 },
    { offset: 1, color: "#0F172A", opacity: 0 },
  ],
};

function angleVector(angleDeg: number): { x1: number; y1: number; x2: number; y2: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad) * 0.5;
  const dy = Math.sin(rad) * 0.5;
  return {
    x1: Number((0.5 - dx).toFixed(4)),
    y1: Number((0.5 - dy).toFixed(4)),
    x2: Number((0.5 + dx).toFixed(4)),
    y2: Number((0.5 + dy).toFixed(4)),
  };
}

export function defineLinearGradient(
  target: DefsTarget,
  id: string,
  stops: readonly GradientStop[],
  angleDeg = 135,
  opts?: { userSpace?: { x1: number; y1: number; x2: number; y2: number } },
): string {
  const defs = resolveDefs(target);
  const grad = defs.gradient("linear", (add) => {
    for (const s of stops) {
      add.stop(s.offset, s.color, s.opacity);
    }
  });
  grad.id(id);
  if (opts?.userSpace) {
    grad.attr({
      gradientUnits: "userSpaceOnUse",
      x1: opts.userSpace.x1,
      y1: opts.userSpace.y1,
      x2: opts.userSpace.x2,
      y2: opts.userSpace.y2,
    });
  } else {
    const v = angleVector(angleDeg);
    grad.from(v.x1, v.y1).to(v.x2, v.y2);
  }
  return `url(#${id})`;
}

export function defineMetallicGradient(
  target: DefsTarget,
  id: string,
  preset: MetallicPreset,
  angleDeg = 135,
  opts?: { userSpace?: { x1: number; y1: number; x2: number; y2: number } },
): string {
  return defineLinearGradient(target, id, METALLIC_PRESETS[preset], angleDeg, opts);
}

export function defineRadialGlow(
  target: DefsTarget,
  id: string,
  color: string,
  opts?: {
    cx?: number;
    cy?: number;
    r?: number;
    innerColor?: string;
    innerOpacity?: number;
    midOpacity?: number;
    midStop?: number;
    outerOpacity?: number;
    userSpace?: boolean;
  },
): string {
  const defs = resolveDefs(target);
  const cx = opts?.cx ?? 0.5;
  const cy = opts?.cy ?? 0.5;
  const r = opts?.r ?? 0.5;
  const grad = defs.gradient("radial", (add) => {
    add.stop(0, opts?.innerColor ?? color, opts?.innerOpacity ?? 0.9);
    add.stop(opts?.midStop ?? 0.45, color, opts?.midOpacity ?? 0.35);
    add.stop(1, color, opts?.outerOpacity ?? 0);
  });
  grad.id(id);
  if (opts?.userSpace) {
    grad.attr({ gradientUnits: "userSpaceOnUse", cx, cy, r });
  } else {
    grad.from(cx, cy).to(cx, cy).radius(r);
  }
  return `url(#${id})`;
}

export function defineSheenGradient(
  target: DefsTarget,
  id: string,
  color = "#FFFFFF",
  opts?: { peakOpacity?: number; angleDeg?: number },
): string {
  const peak = opts?.peakOpacity ?? 0.55;
  return defineLinearGradient(
    target,
    id,
    [
      { offset: 0, color, opacity: 0 },
      { offset: 0.35, color, opacity: 0 },
      { offset: 0.5, color, opacity: peak },
      { offset: 0.65, color, opacity: 0 },
      { offset: 1, color, opacity: 0 },
    ],
    opts?.angleDeg ?? 22,
  );
}
