import type { Defs } from "@svgdotjs/svg.js";
import type { DefsCanvasLike, DefsTarget } from "../materials/index.ts";

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

/**
 * Tactile fine paper / cosmic dust grain overlay using `feTurbulence`.
 */
export function definePaperGrainFilter(
  target: DefsTarget,
  id: string,
  opts?: {
    baseFrequency?: number;
    numOctaves?: number;
    opacity?: number;
    seed?: number;
    tint?: string;
  },
): string {
  const defs = resolveDefs(target);
  const f = defs.element("filter", {
    id,
    x: "-10%",
    y: "-10%",
    width: "120%",
    height: "120%",
    "color-interpolation-filters": "sRGB",
  });
  f.element("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: String(opts?.baseFrequency ?? 0.82),
    numOctaves: String(opts?.numOctaves ?? 3),
    seed: String(opts?.seed ?? 7),
    stitchTiles: "stitch",
    result: "noise",
  });
  f.element("feColorMatrix", {
    type: "matrix",
    in: "noise",
    values: `0 0 0 0 0.85  0 0 0 0 0.90  0 0 0 0 1  0 0 0 ${(opts?.opacity ?? 0.14).toFixed(3)} 0`,
    result: "grain",
  });
  f.element("feComposite", {
    in: "grain",
    in2: "SourceAlpha",
    operator: "in",
    result: "clippedGrain",
  });
  f.element("feBlend", {
    mode: "screen",
    in: "SourceGraphic",
    in2: "clippedGrain",
  });
  return `url(#${id})`;
}

/**
 * Hammered / glittering gold-foil metallic micro-texture via `feTurbulence` + `feSpecularLighting`.
 * Preserves underlying gradient fill and clips specular sparkles strictly inside `SourceAlpha`.
 */
export function defineGoldFoilFilter(
  target: DefsTarget,
  id: string,
  opts?: {
    baseFrequency?: number;
    surfaceScale?: number;
    specularConstant?: number;
    specularExponent?: number;
    lightColor?: string;
    seed?: number;
    lightX?: number;
    lightY?: number;
    lightZ?: number;
  },
): string {
  const defs = resolveDefs(target);
  const f = defs.element("filter", {
    id,
    x: "-15%",
    y: "-15%",
    width: "130%",
    height: "130%",
    "color-interpolation-filters": "sRGB",
  });
  f.element("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: String(opts?.baseFrequency ?? 0.55),
    numOctaves: "3",
    seed: String(opts?.seed ?? 19),
    result: "foilNoise",
  });
  const spec = f.element("feSpecularLighting", {
    in: "foilNoise",
    surfaceScale: String(opts?.surfaceScale ?? 2.4),
    specularConstant: String(opts?.specularConstant ?? 0.72),
    specularExponent: String(opts?.specularExponent ?? 22),
    "lighting-color": opts?.lightColor ?? "#FFF3C4",
    result: "specRaw",
  });
  spec.element("fePointLight", {
    x: String(opts?.lightX ?? 375),
    y: String(opts?.lightY ?? 180),
    z: String(opts?.lightZ ?? 240),
  });
  f.element("feComposite", {
    in: "specRaw",
    in2: "SourceAlpha",
    operator: "in",
    result: "specClipped",
  });
  f.element("feBlend", {
    mode: "screen",
    in: "SourceGraphic",
    in2: "specClipped",
  });
  return `url(#${id})`;
}

/**
 * Dual-radius crisp bloom glow filter with explicit padded bounds to avoid clipping thin lines.
 */
export function defineGlowFilter(
  target: DefsTarget,
  id: string,
  opts?: {
    stdDeviation?: number;
    wideDeviation?: number;
    color?: string;
    floodOpacity?: number;
    paddingPct?: number;
  },
): string {
  const defs = resolveDefs(target);
  const pad = opts?.paddingPct ?? 60;
  const f = defs.element("filter", {
    id,
    x: `-${pad}%`,
    y: `-${pad}%`,
    width: `${100 + pad * 2}%`,
    height: `${100 + pad * 2}%`,
    "color-interpolation-filters": "sRGB",
  });
  const tight = opts?.stdDeviation ?? 3;
  const wide = opts?.wideDeviation ?? tight * 3;
  f.element("feGaussianBlur", { in: "SourceGraphic", stdDeviation: String(tight), result: "bTight" });
  f.element("feGaussianBlur", { in: "SourceGraphic", stdDeviation: String(wide), result: "bWide" });

  if (opts?.color) {
    f.element("feFlood", {
      "flood-color": opts.color,
      "flood-opacity": String(opts.floodOpacity ?? 0.65),
      result: "tint",
    });
    f.element("feComposite", { in: "tint", in2: "bWide", operator: "in", result: "tintedWide" });
    const merge = f.element("feMerge");
    merge.element("feMergeNode", { in: "tintedWide" });
    merge.element("feMergeNode", { in: "bTight" });
    merge.element("feMergeNode", { in: "SourceGraphic" });
  } else {
    const merge = f.element("feMerge");
    merge.element("feMergeNode", { in: "bWide" });
    merge.element("feMergeNode", { in: "bTight" });
    merge.element("feMergeNode", { in: "SourceGraphic" });
  }
  return `url(#${id})`;
}

export function defineSoftShadowFilter(
  target: DefsTarget,
  id: string,
  opts?: { dx?: number; dy?: number; blur?: number; color?: string; opacity?: number },
): string {
  const defs = resolveDefs(target);
  const f = defs.element("filter", {
    id,
    x: "-30%",
    y: "-30%",
    width: "160%",
    height: "160%",
  });
  f.element("feDropShadow", {
    dx: String(opts?.dx ?? 0),
    dy: String(opts?.dy ?? 6),
    stdDeviation: String(opts?.blur ?? 8),
    "flood-color": opts?.color ?? "#020617",
    "flood-opacity": String(opts?.opacity ?? 0.72),
  });
  return `url(#${id})`;
}

export type PatternPreset =
  | "stardust"
  | "hex-grid"
  | "art-deco-fan"
  | "crystalline-facets"
  | "diagonal-foil-hatch"
  | "halftone-dots";

/**
 * Registers reusable procedural `<pattern>` tiles inside `<defs>`.
 */
export function definePattern(
  target: DefsTarget,
  id: string,
  preset: PatternPreset,
  opts?: {
    size?: number;
    color?: string;
    secondaryColor?: string;
    opacity?: number;
    strokeWidth?: number;
  },
): string {
  const defs = resolveDefs(target);
  const size = opts?.size ?? 48;
  const color = opts?.color ?? "#38E8DA";
  const secondary = opts?.secondaryColor ?? "#FCD34D";
  const opacity = opts?.opacity ?? 0.25;
  const sw = opts?.strokeWidth ?? 1;

  const pat = defs.pattern(size, size, (add) => {
    if (preset === "stardust") {
      add.circle(2.2).move(size * 0.2, size * 0.25).fill(color).opacity(opacity * 0.9);
      add.circle(1.5).move(size * 0.72, size * 0.18).fill(secondary).opacity(opacity);
      add.circle(1.8).move(size * 0.52, size * 0.68).fill(color).opacity(opacity * 0.75);
      add.circle(1.2).move(size * 0.85, size * 0.82).fill("#FFFFFF").opacity(opacity * 0.8);
      const sx = size * 0.35;
      const sy = size * 0.45;
      add
        .path(`M${sx} ${sy - 4} L${sx + 1} ${sy - 1} L${sx + 4} ${sy} L${sx + 1} ${sy + 1} L${sx} ${sy + 4} L${sx - 1} ${sy + 1} L${sx - 4} ${sy} L${sx - 1} ${sy - 1} Z`)
        .fill(secondary)
        .opacity(opacity);
      return;
    }

    if (preset === "hex-grid") {
      const w = size;
      const h = size;
      add
        .path(`M${w * 0.25} 0 L${w * 0.75} 0 L${w} ${h * 0.5} L${w * 0.75} ${h} L${w * 0.25} ${h} L0 ${h * 0.5} Z`)
        .fill("none")
        .stroke({ color, width: sw, opacity });
      return;
    }

    if (preset === "art-deco-fan") {
      const r1 = size;
      const r2 = size * 0.66;
      const r3 = size * 0.34;
      add.path(`M0 ${size} A${r1} ${r1} 0 0 1 ${size} ${size}`).fill("none").stroke({ color, width: sw, opacity });
      add.path(`M${size * 0.17} ${size} A${r2} ${r2} 0 0 1 ${size * 0.83} ${size}`).fill("none").stroke({ color: secondary, width: sw * 0.85, opacity: opacity * 0.85 });
      add.path(`M${size * 0.33} ${size} A${r3} ${r3} 0 0 1 ${size * 0.67} ${size}`).fill("none").stroke({ color, width: sw * 0.7, opacity: opacity * 0.7 });
      return;
    }

    if (preset === "crystalline-facets") {
      add.polygon(`0,0 ${size * 0.62},0 ${size * 0.35},${size * 0.52}`).fill(color).opacity(opacity * 0.22);
      add.polygon(`${size * 0.62},0 ${size},${size * 0.4} ${size * 0.35},${size * 0.52}`).fill(secondary).opacity(opacity * 0.14);
      add
        .path(`M0 0 L${size} ${size} M${size * 0.62} 0 L${size * 0.35} ${size * 0.52} L0 ${size} M${size * 0.35} ${size * 0.52} L${size} ${size * 0.4}`)
        .fill("none")
        .stroke({ color, width: sw, opacity: opacity * 0.8 });
      return;
    }

    if (preset === "diagonal-foil-hatch") {
      add
        .path(`M-4 ${size} L${size} -4 M${size * 0.5 - 4} ${size + 4} L${size + 4} ${size * 0.5 - 4} M-4 ${size * 0.5} L${size * 0.5} -4`)
        .fill("none")
        .stroke({ color, width: sw, opacity });
      return;
    }

    // halftone-dots
    add.circle(size * 0.22).center(size * 0.25, size * 0.25).fill(color).opacity(opacity);
    add.circle(size * 0.22).center(size * 0.75, size * 0.75).fill(color).opacity(opacity);
  });
  pat.id(id);
  pat.attr({ patternUnits: "userSpaceOnUse" });
  return `url(#${id})`;
}
