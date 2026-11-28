import type { G } from "@svgdotjs/svg.js";
import {
  createRng,
  poissonDiskSample,
  polarToCartesian,
  type Bounds,
  type Point2D,
} from "../generative/index.ts";
import { samplePath } from "../geometry/index.ts";
import { fourPointStar } from "../ornaments/index.ts";

export type ParticleLayerTarget = G;

export interface SymbolCapableCanvas {
  defineSymbol: (id: string, fn: (symbol: G) => void) => string;
  useSymbol: (layer: G, id: string, attrs?: Record<string, string | number>) => unknown;
}

/**
 * Populates a multi-depth Poisson-disk distributed starfield with optional
 * 4-point hero stars and CSS twinkle class assignments.
 */
export function addStarfield(
  canvas: SymbolCapableCanvas,
  layer: ParticleLayerTarget,
  bounds: Bounds,
  opts: {
    seed: number | string;
    minDist?: number;
    maxCount?: number;
    colors?: readonly string[];
    heroStarCount?: number;
    glowFilterUrl?: string;
    twinkleClasses?: readonly string[];
    excludeRect?: Bounds;
  },
): { count: number } {
  const rng = createRng(opts.seed);
  const colors = opts.colors ?? ["#FFFFFF", "#E2F7F9", "#FFF3C4", "#93C5FD"];
  const minDist = opts.minDist ?? 26;
  const maxCount = opts.maxCount ?? 180;
  const pts = poissonDiskSample(bounds, minDist, rng, { maxPoints: maxCount });

  // Register lightweight reusable symbols to keep exported SVGs compact
  const dotId = `star-dot-${String(opts.seed).replace(/[^a-z0-9]/gi, "")}`;
  const sparkleId = `star-4pt-${String(opts.seed).replace(/[^a-z0-9]/gi, "")}`;

  canvas.defineSymbol(dotId, (sym) => {
    sym.circle(2).center(0, 0).fill("currentColor");
  });
  canvas.defineSymbol(sparkleId, (sym) => {
    sym.path(fourPointStar(0, 0, 10, 2.4, { pinch: 0.45 })).fill("currentColor");
  });

  const insideExclude = (p: Point2D) => {
    const ex = opts.excludeRect;
    if (!ex) return false;
    return p.x >= ex.x && p.x <= ex.x + ex.w && p.y >= ex.y && p.y <= ex.y + ex.h;
  };

  let placed = 0;
  const heroCount = opts.heroStarCount ?? Math.min(18, Math.floor(pts.length * 0.14));

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    if (insideExclude(p)) continue;

    const color = rng.pick(colors);
    const isHero = i < heroCount;
    const twinkle = opts.twinkleClasses?.length && rng.chance(0.42)
      ? rng.pick(opts.twinkleClasses)
      : undefined;

    if (isHero) {
      const scale = rng.range(0.55, 1.55);
      const starPath = fourPointStar(p.x, p.y, 8 * scale, 2.1 * scale, {
        pinch: 0.45,
        rotationDeg: rng.chance(0.25) ? 45 : 0,
      });
      const el = layer.path(starPath).fill(color).opacity(rng.range(0.55, 0.96));
      if (opts.glowFilterUrl && scale > 1.0) el.attr("filter", opts.glowFilterUrl);
      if (twinkle) el.addClass(twinkle);
    } else {
      const r = rng.range(0.65, 2.1);
      const el = layer
        .circle(r * 2)
        .center(p.x, p.y)
        .fill(color)
        .opacity(rng.range(0.22, 0.85));
      if (twinkle) el.addClass(twinkle);
    }
    placed++;
  }
  return { count: placed };
}

/**
 * Adds diagonal glowing shooting stars with tapered tails and 4-point sparkle heads.
 */
export function addShootingStars(
  layer: ParticleLayerTarget,
  bounds: Bounds,
  opts: {
    seed: number | string;
    count: number;
    angleDeg?: number;
    lengthRange?: [number, number];
    color?: string;
    headColor?: string;
    glowFilterUrl?: string;
    animClass?: string;
  },
): void {
  const rng = createRng(opts.seed);
  const angle = ((opts.angleDeg ?? 148) * Math.PI) / 180;
  const lenMin = opts.lengthRange?.[0] ?? 130;
  const lenMax = opts.lengthRange?.[1] ?? 290;
  const color = opts.color ?? "#E2F7F9";
  const headColor = opts.headColor ?? "#FFFFFF";

  for (let i = 0; i < opts.count; i++) {
    const x1 = rng.range(bounds.x + bounds.w * 0.15, bounds.x + bounds.w * 0.96);
    const y1 = rng.range(bounds.y + bounds.h * 0.04, bounds.y + bounds.h * 0.58);
    const len = rng.range(lenMin, lenMax);
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;
    const op = rng.range(0.45, 0.88);
    const g = layer.group();
    if (opts.animClass) g.addClass(opts.animClass);

    g.line(x1, y1, x2, y2).stroke({
      color,
      width: rng.range(0.9, 1.8),
      opacity: op * 0.72,
      linecap: "round",
    });

    const headR = rng.range(5.5, 11);
    const star = g
      .path(fourPointStar(x2, y2, headR, headR * 0.24, { pinch: 0.42 }))
      .fill(headColor)
      .opacity(op);
    if (opts.glowFilterUrl) star.attr("filter", opts.glowFilterUrl);
    g.circle(headR * 0.36).center(x2, y2).fill(headColor).opacity(Math.min(1, op + 0.15));
  }
}

/**
 * Scatters crisp metallic glitter specks inside a clipped/masked region (crowns, ribbons, wings).
 */
export function addGlitterSpecks(
  layer: ParticleLayerTarget,
  bounds: Bounds,
  opts: {
    seed: number | string;
    count: number;
    colors?: readonly string[];
    radiusRange?: [number, number];
    clipPathUrl?: string;
    maskUrl?: string;
  },
): void {
  const rng = createRng(opts.seed);
  const colors = opts.colors ?? ["#FFFBEB", "#FEF08A", "#FDE047", "#FFFFFF"];
  const rMin = opts.radiusRange?.[0] ?? 0.6;
  const rMax = opts.radiusRange?.[1] ?? 1.8;

  const target = layer.group();
  if (opts.clipPathUrl) target.attr("clip-path", opts.clipPathUrl);
  if (opts.maskUrl) target.attr("mask", opts.maskUrl);

  for (let i = 0; i < opts.count; i++) {
    const x = rng.range(bounds.x, bounds.x + bounds.w);
    const y = rng.range(bounds.y, bounds.y + bounds.h);
    const r = rng.range(rMin, rMax);
    const op = rng.range(0.35, 0.95);
    const c = rng.pick(colors);
    if (rng.chance(0.18)) {
      target.path(fourPointStar(x, y, r * 3.2, r * 0.85, { pinch: 0.3 })).fill(c).opacity(op);
    } else {
      target.circle(r * 2).center(x, y).fill(c).opacity(op);
    }
  }
}

/**
 * Generates a luminous stardust particle stream along any curved SVG path `d`.
 */
export function addParticleRibbon(
  layer: ParticleLayerTarget,
  pathData: string,
  opts: {
    seed: number | string;
    count: number;
    spread?: number;
    colors?: readonly string[];
    dotRadiusRange?: [number, number];
    strokeFill?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    glowFilterUrl?: string;
  },
): void {
  const rng = createRng(opts.seed);
  const spread = opts.spread ?? 18;
  const colors = opts.colors ?? ["#FFF3C4", "#93C5FD", "#E2F7F9", "#FDE047"];
  const rMin = opts.dotRadiusRange?.[0] ?? 0.7;
  const rMax = opts.dotRadiusRange?.[1] ?? 2.3;

  if (opts.strokeFill) {
    const ribbonStroke = layer.path(pathData).fill("none").stroke({
      color: opts.strokeFill,
      width: opts.strokeWidth ?? 6,
      opacity: opts.strokeOpacity ?? 0.35,
      linecap: "round",
    });
    if (opts.glowFilterUrl) ribbonStroke.attr("filter", opts.glowFilterUrl);
  }

  const samples = samplePath(pathData, Math.max(8, Math.ceil(opts.count / 2)));
  if (samples.length === 0) return;

  for (let i = 0; i < opts.count; i++) {
    const s = samples[i % samples.length]!;
    const offset = rng.gaussian(0, spread * 0.42);
    const along = rng.gaussian(0, 6);
    const x = s.x + s.nx * offset + s.tx * along;
    const y = s.y + s.ny * offset + s.ty * along;
    const falloff = Math.exp(-(offset * offset) / (2 * spread * spread));
    const op = Math.max(0.18, Math.min(0.95, falloff * rng.range(0.55, 1.05)));
    const r = rng.range(rMin, rMax) * (0.55 + 0.55 * falloff);
    const c = rng.pick(colors);

    if (rng.chance(0.12)) {
      layer.path(fourPointStar(x, y, r * 3.4, r * 0.9)).fill(c).opacity(op);
    } else {
      layer.circle(r * 2).center(x, y).fill(c).opacity(op);
    }
  }
}

/**
 * Elliptical halo of orbiting sparks / crystal dust around a center focal point.
 */
export function addOrbitalSparks(
  layer: ParticleLayerTarget,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  opts: {
    seed: number | string;
    count: number;
    tiltDeg?: number;
    colors?: readonly string[];
    animClass?: string;
  },
): void {
  const rng = createRng(opts.seed);
  const tilt = ((opts.tiltDeg ?? 0) * Math.PI) / 180;
  const colors = opts.colors ?? ["#7CF5EB", "#FCD34D", "#FFFFFF"];
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);

  const g = layer.group();
  if (opts.animClass) g.addClass(opts.animClass);

  for (let i = 0; i < opts.count; i++) {
    const theta = (i / opts.count) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const jitter = rng.range(0.9, 1.1);
    const pLocal = polarToCartesian(0, 0, 1, theta);
    const lx = pLocal.x * rx * jitter;
    const ly = pLocal.y * ry * jitter;
    const x = cx + lx * cosT - ly * sinT;
    const y = cy + lx * sinT + ly * cosT;
    const r = rng.range(1.4, 3.8);
    const c = rng.pick(colors);

    if (i % 4 === 0) {
      g.path(fourPointStar(x, y, r * 2.8, r * 0.7)).fill(c).opacity(rng.range(0.55, 0.95));
    } else {
      g.circle(r * 1.6).center(x, y).fill(c).opacity(rng.range(0.4, 0.85));
    }
  }
}
