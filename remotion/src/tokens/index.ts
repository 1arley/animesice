import type { VideoFormatPreset } from "../core/contracts.ts";

export const GACHA_RARITIES = [
  "COMUM",
  "INCOMUM",
  "RARA",
  "EPICA",
  "LENDARIA",
  "MITICA",
  "GALACTICA",
] as const;

export type GachaRarity = (typeof GACHA_RARITIES)[number];

/**
 * Exact parity with `animesice/src/lib/gacha-rarity-colors.ts`.
 */
export const GACHA_RARITY_COLORS: Record<GachaRarity, string> = {
  COMUM: "#38E8DA",
  INCOMUM: "#34D399",
  RARA: "#38BDF8",
  EPICA: "#A78BFA",
  LENDARIA: "#FCD34D",
  MITICA: "#FB7185",
  GALACTICA: "#C084FC",
};

/**
 * Exact AnimesIce brand & motion tokens mirrored from `tailwind.config.ts` and `tools/src/materials/index.ts`.
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
} as const;

export type RarityVisualTheme = {
  label: string;
  color: string;
  glow: string;
  glowSoft: string;
  crystalMid: string;
  crystalDark: string;
  stroke: string;
  facetA: string;
  facetB: string;
  facetC: string;
  facetD: string;
  ringA: string;
  ringB: string;
  particle: string;
  sweep: string;
  ringCount: number;
  particleCount: number;
  ringSpeed: number;
  pulseAmp: number;
};

export const RARITY_THEMES: Record<GachaRarity, RarityVisualTheme> = {
  COMUM: {
    label: "Comum",
    color: "#38E8DA",
    glow: "#57c8ff",
    glowSoft: "#2386ff",
    crystalMid: "#54b9ef",
    crystalDark: "#2355a2",
    stroke: "#c6f4ff",
    facetA: "#c4f4ff",
    facetB: "#4aa4e8",
    facetC: "#2465b7",
    facetD: "#63b8ed",
    ringA: "#5ebcff",
    ringB: "#a9eaff",
    particle: "#bbf3ff",
    sweep: "#b9f4ff",
    ringCount: 3,
    particleCount: 24,
    ringSpeed: 1,
    pulseAmp: 0.12,
  },
  INCOMUM: {
    label: "Incomum",
    color: "#34D399",
    glow: "#6ee7b7",
    glowSoft: "#059669",
    crystalMid: "#34d399",
    crystalDark: "#065f46",
    stroke: "#bbf7d0",
    facetA: "#d1fae5",
    facetB: "#34d399",
    facetC: "#047857",
    facetD: "#6ee7b7",
    ringA: "#34d399",
    ringB: "#a7f3d0",
    particle: "#d1fae5",
    sweep: "#a7f3d0",
    ringCount: 3,
    particleCount: 28,
    ringSpeed: 1.05,
    pulseAmp: 0.13,
  },
  RARA: {
    label: "Rara",
    color: "#38BDF8",
    glow: "#7dd3fc",
    glowSoft: "#0284c7",
    crystalMid: "#38bdf8",
    crystalDark: "#0c4a6e",
    stroke: "#bae6fd",
    facetA: "#e0f2fe",
    facetB: "#38bdf8",
    facetC: "#0369a1",
    facetD: "#7dd3fc",
    ringA: "#38bdf8",
    ringB: "#bae6fd",
    particle: "#e0f2fe",
    sweep: "#bae6fd",
    ringCount: 4,
    particleCount: 32,
    ringSpeed: 1.1,
    pulseAmp: 0.14,
  },
  EPICA: {
    label: "Épica",
    color: "#A78BFA",
    glow: "#c4b5fd",
    glowSoft: "#7c3aed",
    crystalMid: "#8b5cf6",
    crystalDark: "#4c1d95",
    stroke: "#ddd6fe",
    facetA: "#ede9fe",
    facetB: "#8b5cf6",
    facetC: "#5b21b6",
    facetD: "#c4b5fd",
    ringA: "#8b5cf6",
    ringB: "#ddd6fe",
    particle: "#ede9fe",
    sweep: "#ddd6fe",
    ringCount: 4,
    particleCount: 40,
    ringSpeed: 1.18,
    pulseAmp: 0.16,
  },
  LENDARIA: {
    label: "Lendária",
    color: "#FCD34D",
    glow: "#fde68a",
    glowSoft: "#d97706",
    crystalMid: "#f59e0b",
    crystalDark: "#78350f",
    stroke: "#fef3c7",
    facetA: "#fffbeb",
    facetB: "#f59e0b",
    facetC: "#92400e",
    facetD: "#fcd34d",
    ringA: "#f59e0b",
    ringB: "#fef3c7",
    particle: "#fef3c7",
    sweep: "#fef3c7",
    ringCount: 5,
    particleCount: 48,
    ringSpeed: 1.25,
    pulseAmp: 0.18,
  },
  MITICA: {
    label: "Mítica",
    color: "#FB7185",
    glow: "#fda4af",
    glowSoft: "#e11d48",
    crystalMid: "#fb7185",
    crystalDark: "#881337",
    stroke: "#ffe4e6",
    facetA: "#fff1f2",
    facetB: "#fb7185",
    facetC: "#9f1239",
    facetD: "#fda4af",
    ringA: "#fb7185",
    ringB: "#ffe4e6",
    particle: "#fff1f2",
    sweep: "#ffe4e6",
    ringCount: 5,
    particleCount: 56,
    ringSpeed: 1.35,
    pulseAmp: 0.2,
  },
  GALACTICA: {
    label: "Galáctica",
    color: "#C084FC",
    glow: "#d8b4fe",
    glowSoft: "#9333ea",
    crystalMid: "#a855f7",
    crystalDark: "#581c87",
    stroke: "#f3e8ff",
    facetA: "#faf5ff",
    facetB: "#c084fc",
    facetC: "#6b21a8",
    facetD: "#e9d5ff",
    ringA: "#c084fc",
    ringB: "#f3e8ff",
    particle: "#f5d0fe",
    sweep: "#f3e8ff",
    ringCount: 6,
    particleCount: 64,
    ringSpeed: 1.45,
    pulseAmp: 0.22,
  },
};

export const TYPOGRAPHY = {
  sans: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif',
  display: '"Space Grotesk", "Plus Jakarta Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
} as const;

export const SAFE_MARGINS: Record<VideoFormatPreset, { x: number; y: number }> = {
  GACHA_SQUARE: { x: 48, y: 48 },
  CARD_PORTRAIT: { x: 48, y: 64 },
  PROMO_16_9: { x: 112, y: 72 },
  PROMO_720P: { x: 72, y: 48 },
  VERTICAL_9_16: { x: 72, y: 140 },
  SOCIAL_1_1: { x: 72, y: 72 },
  BANNER_WIDE: { x: 80, y: 40 },
};
