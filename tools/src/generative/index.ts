/**
 * Deterministic generative math module (zero external dependencies).
 * Replaces p5.js noise/random/flow/scatter features with reproducible seeded primitives.
 */

export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, maxInclusive: number) => number;
  gaussian: (mean?: number, stdDev?: number) => number;
  chance: (probability: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
};

export type Bounds = { x: number; y: number; w: number; h: number };
export type Point2D = { x: number; y: number };

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function polarToCartesian(cx: number, cy: number, r: number, angleRad: number): Point2D {
  return {
    x: cx + Math.cos(angleRad) * r,
    y: cy + Math.sin(angleRad) * r,
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#/, "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mixHex(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const k = clamp(t, 0, 1);
  return rgbToHex(lerp(a.r, b.r, k), lerp(a.g, b.g, k), lerp(a.b, b.b, k));
}

/** FNV-1a 32-bit string hash -> deterministic seed integer. */
export function hashSeed(seed: number | string): number {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return (seed | 0) || 1;
  }
  const str = String(seed);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

/** Deterministic Mulberry32 PRNG. */
export function createRng(seed: number | string): Rng {
  let state = hashSeed(seed);
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let r = Math.imul(state ^ (state >>> 15), 1 | state);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min: number, max: number) => min + (max - min) * next();
  const int = (min: number, maxInclusive: number) =>
    Math.floor(range(min, maxInclusive + 1));
  const gaussian = (mean = 0, stdDev = 1) => {
    const u1 = Math.max(1e-7, next());
    const u2 = next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  };
  const chance = (probability: number) => next() < probability;
  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error("createRng.pick(): empty array");
    return items[Math.floor(next() * items.length)]!;
  };
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const tmp = out[i]!;
      out[i] = out[j]!;
      out[j] = tmp;
    }
    return out;
  };
  return { next, range, int, gaussian, chance, pick, shuffle };
}

export type Noise2D = {
  noise2D: (x: number, y: number) => number;
  fbm2D: (
    x: number,
    y: number,
    opts?: { octaves?: number; lacunarity?: number; gain?: number },
  ) => number;
  curl2D: (x: number, y: number, eps?: number) => Point2D;
};

/**
 * Deterministic 2D Simplex-like gradient noise + fractional Brownian motion + curl field.
 */
export function createNoise2D(seed: number | string): Noise2D {
  const rng = createRng(seed);
  const perm = new Uint8Array(512);
  const base = Array.from({ length: 256 }, (_, i) => i);
  const shuffled = rng.shuffle(base);
  for (let i = 0; i < 512; i++) {
    perm[i] = shuffled[i & 255]!;
  }

  const grad2 = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ] as const;

  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;

  const noise2D = (xin: number, yin: number): number => {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const corner = (cx: number, cy: number, gi: number): number => {
      let t0 = 0.5 - cx * cx - cy * cy;
      if (t0 < 0) return 0;
      t0 *= t0;
      const g = grad2[gi & 7]!;
      return t0 * t0 * (g[0] * cx + g[1] * cy);
    };

    const n0 = corner(x0, y0, perm[ii + perm[jj]!]!);
    const n1 = corner(x1, y1, perm[ii + i1 + perm[jj + j1]!]!);
    const n2 = corner(x2, y2, perm[ii + 1 + perm[jj + 1]!]!);
    return clamp(70 * (n0 + n1 + n2), -1, 1);
  };

  const fbm2D = (
    x: number,
    y: number,
    opts?: { octaves?: number; lacunarity?: number; gain?: number },
  ): number => {
    const octaves = opts?.octaves ?? 4;
    const lacunarity = opts?.lacunarity ?? 2;
    const gain = opts?.gain ?? 0.5;
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise2D(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return norm > 0 ? sum / norm : 0;
  };

  const curl2D = (x: number, y: number, eps = 0.01): Point2D => {
    const n1 = fbm2D(x, y + eps);
    const n2 = fbm2D(x, y - eps);
    const a = (n1 - n2) / (2 * eps);
    const n3 = fbm2D(x + eps, y);
    const n4 = fbm2D(x - eps, y);
    const b = (n3 - n4) / (2 * eps);
    const len = Math.hypot(a, -b) || 1;
    return { x: a / len, y: -b / len };
  };

  return { noise2D, fbm2D, curl2D };
}

/**
 * Bridson's Poisson-disk sampling for natural, non-clumping stars, sparks, and bokeh.
 */
export function poissonDiskSample(
  bounds: Bounds,
  minDist: number,
  seedOrRng: number | string | Rng,
  opts?: { maxPoints?: number; attempts?: number },
): Point2D[] {
  const rng = typeof seedOrRng === "object" ? seedOrRng : createRng(seedOrRng);
  const k = opts?.attempts ?? 24;
  const maxPoints = opts?.maxPoints ?? Number.POSITIVE_INFINITY;
  const cellSize = minDist / Math.SQRT2;
  const cols = Math.max(1, Math.ceil(bounds.w / cellSize));
  const rows = Math.max(1, Math.ceil(bounds.h / cellSize));
  const grid = new Int32Array(cols * rows).fill(-1);
  const points: Point2D[] = [];
  const active: number[] = [];

  const gridIndex = (x: number, y: number) => {
    const gx = Math.floor((x - bounds.x) / cellSize);
    const gy = Math.floor((y - bounds.y) / cellSize);
    return { gx, gy };
  };

  const fits = (x: number, y: number) => {
    if (x < bounds.x || x >= bounds.x + bounds.w || y < bounds.y || y >= bounds.y + bounds.h) {
      return false;
    }
    const { gx, gy } = gridIndex(x, y);
    const minDistSq = minDist * minDist;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const idx = grid[ny * cols + nx]!;
        if (idx === -1) continue;
        const p = points[idx]!;
        const ddx = p.x - x;
        const ddy = p.y - y;
        if (ddx * ddx + ddy * ddy < minDistSq) return false;
      }
    }
    return true;
  };

  const addPoint = (x: number, y: number) => {
    const idx = points.length;
    points.push({ x, y });
    active.push(idx);
    const { gx, gy } = gridIndex(x, y);
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
      grid[gy * cols + gx] = idx;
    }
  };

  addPoint(rng.range(bounds.x, bounds.x + bounds.w), rng.range(bounds.y, bounds.y + bounds.h));

  while (active.length > 0 && points.length < maxPoints) {
    const activeIdx = rng.int(0, active.length - 1);
    const center = points[active[activeIdx]!]!;
    let found = false;
    for (let attempt = 0; attempt < k; attempt++) {
      const angle = rng.range(0, Math.PI * 2);
      const radius = rng.range(minDist, minDist * 2);
      const nx = center.x + Math.cos(angle) * radius;
      const ny = center.y + Math.sin(angle) * radius;
      if (fits(nx, ny)) {
        addPoint(nx, ny);
        found = true;
        break;
      }
    }
    if (!found) {
      active.splice(activeIdx, 1);
    }
  }
  return points;
}

/**
 * Generates smooth divergence-free curl/noise streamlines for cosmic ribbons and wisps.
 */
export function generateFlowFieldPaths(
  bounds: Bounds,
  opts: {
    seed: number | string;
    count: number;
    steps?: number;
    stepLength?: number;
    frequency?: number;
    mode?: "curl" | "angle";
  },
): Point2D[][] {
  const rng = createRng(opts.seed);
  const noise = createNoise2D(`${opts.seed}-field`);
  const steps = opts.steps ?? 26;
  const stepLength = opts.stepLength ?? 16;
  const freq = opts.frequency ?? 0.0025;
  const mode = opts.mode ?? "curl";
  const lines: Point2D[][] = [];

  for (let i = 0; i < opts.count; i++) {
    let x = rng.range(bounds.x, bounds.x + bounds.w);
    let y = rng.range(bounds.y, bounds.y + bounds.h);
    const pts: Point2D[] = [{ x, y }];
    for (let s = 0; s < steps; s++) {
      if (mode === "curl") {
        const dir = noise.curl2D(x * freq, y * freq);
        x += dir.x * stepLength;
        y += dir.y * stepLength;
      } else {
        const angle = noise.fbm2D(x * freq, y * freq) * Math.PI * 2;
        x += Math.cos(angle) * stepLength;
        y += Math.sin(angle) * stepLength;
      }
      pts.push({ x, y });
    }
    lines.push(pts);
  }
  return lines;
}

/** Golden-angle phyllotaxis spiral distribution for sacred geometry & floral medallions. */
export function phyllotaxisPoints(
  cx: number,
  cy: number,
  count: number,
  spread: number,
  angleDeg = 137.50776405,
): Point2D[] {
  const radStep = (angleDeg * Math.PI) / 180;
  const pts: Point2D[] = [];
  for (let i = 0; i < count; i++) {
    const r = spread * Math.sqrt(i + 0.5);
    const theta = i * radStep;
    pts.push({
      x: cx + Math.cos(theta) * r,
      y: cy + Math.sin(theta) * r,
    });
  }
  return pts;
}
