/**
 * Single source of truth for AnimesIce 2D cosmetic & asset geometry contracts.
 * Mirrors `animesice/src/lib/cosmetic-svg.ts` and `animesice-back/src/gacha/gacha.service.ts`
 * without adding runtime dependencies to either application repo.
 */

export const CARD_ART = { w: 750, h: 1000 } as const;
export const BLEED = 30;
export const MAX_SVG_BYTES = 2 * 1024 * 1024; // 2 MB limit in animesice-back

export type CosmeticType = "BACK" | "FRAME" | "HIGHLIGHT";
export type AssetType = CosmeticType | "SKIN" | "BANNER";

export type ViewBox = { x: number; y: number; w: number; h: number };

export type AssetSpec = {
  type: AssetType;
  viewBox: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bleed: number;
  safeInset: number;
};

export const TYPE_VIEWBOX: Record<CosmeticType, string> = {
  BACK: `0 0 ${CARD_ART.w} ${CARD_ART.h}`,
  FRAME: `${-BLEED} ${-BLEED} ${CARD_ART.w + BLEED * 2} ${CARD_ART.h + BLEED * 2}`,
  HIGHLIGHT: `${-BLEED * 2} ${-BLEED * 2} ${CARD_ART.w + BLEED * 4} ${CARD_ART.h + BLEED * 4}`,
};

export const ASSET_SPECS: Record<AssetType, AssetSpec> = {
  BACK: {
    type: "BACK",
    viewBox: TYPE_VIEWBOX.BACK,
    x: 0,
    y: 0,
    width: CARD_ART.w,
    height: CARD_ART.h,
    bleed: 0,
    safeInset: 24,
  },
  FRAME: {
    type: "FRAME",
    viewBox: TYPE_VIEWBOX.FRAME,
    x: -BLEED,
    y: -BLEED,
    width: CARD_ART.w + BLEED * 2,
    height: CARD_ART.h + BLEED * 2,
    bleed: BLEED,
    safeInset: 24,
  },
  HIGHLIGHT: {
    type: "HIGHLIGHT",
    viewBox: TYPE_VIEWBOX.HIGHLIGHT,
    x: -BLEED * 2,
    y: -BLEED * 2,
    width: CARD_ART.w + BLEED * 4,
    height: CARD_ART.h + BLEED * 4,
    bleed: BLEED * 2,
    safeInset: 18,
  },
  SKIN: {
    type: "SKIN",
    viewBox: `0 0 ${CARD_ART.w} ${CARD_ART.h}`,
    x: 0,
    y: 0,
    width: CARD_ART.w,
    height: CARD_ART.h,
    bleed: 0,
    safeInset: 24,
  },
  BANNER: {
    type: "BANNER",
    viewBox: "0 0 1600 500",
    x: 0,
    y: 0,
    width: 1600,
    height: 500,
    bleed: 0,
    safeInset: 36,
  },
};

/**
 * HUD zones rendered by `GachaCard.tsx` over front artwork in `750x1000` space.
 * Ornate frame/highlight focal emblems should avoid occluding these regions.
 */
export const CARD_SAFE_ZONES = {
  artWindow: { x: 0, y: 0, w: CARD_ART.w, h: CARD_ART.h },
  rarityPill: { x: 0, y: 0, w: 225, h: 68 },
  foilPill: { x: 555, y: 0, w: 195, h: 68 },
  conditionPill: { x: 495, y: 932, w: 255, h: 68 },
  bonusShard: { x: 0, y: 465, w: 60, h: 70 },
  safeFrameBand: {
    outer: { x: 0, y: 0, w: CARD_ART.w, h: CARD_ART.h },
    innerRecommended: { x: 24, y: 24, w: CARD_ART.w - 48, h: CARD_ART.h - 48 },
  },
} as const;

export const DEFAULT_VIEWBOX = TYPE_VIEWBOX.BACK;

/** Reference card front plate used by AnimesIce admin preview (`cosmetic-svg.ts`). */
export const ART_PLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_ART.w} ${CARD_ART.h}"><defs><linearGradient id="sky" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#1b3a63"/><stop offset=".55" stop-color="#0b1220"/><stop offset="1" stop-color="#17304d"/></linearGradient></defs><rect width="${CARD_ART.w}" height="${CARD_ART.h}" fill="url(#sky)"/><circle cx="225" cy="250" r="170" fill="#38e8da" opacity=".18"/><circle cx="560" cy="600" r="240" fill="#8b5cf6" opacity=".16"/><path d="M0 780 250 520 430 760 560 640 750 830V1000H0Z" fill="#05080e" opacity=".85"/><path d="M0 250H750M0 500H750M0 750H750M250 0V1000M500 0V1000" stroke="#8de7ff" stroke-opacity=".22" stroke-width="2" fill="none"/></svg>`;

export function parseViewBox(svg: string, fallback: string = DEFAULT_VIEWBOX): ViewBox {
  const raw = /viewBox\s*=\s*["']\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)/.exec(svg);
  const n = raw ? [Number(raw[1]), Number(raw[2]), Number(raw[3]), Number(raw[4])] : null;
  if (n && n.every(Number.isFinite) && n[2]! > 0 && n[3]! > 0) {
    return { x: n[0]!, y: n[1]!, w: n[2]!, h: n[3]! };
  }
  const f = fallback.split(/\s+/).map(Number);
  return { x: f[0]!, y: f[1]!, w: f[2]!, h: f[3]! };
}

export function artWindow(vb: ViewBox) {
  const x0 = Math.max(0, vb.x);
  const y0 = Math.max(0, vb.y);
  const x1 = Math.min(vb.x + vb.w, CARD_ART.w);
  const y1 = Math.min(vb.y + vb.h, CARD_ART.h);
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  return {
    left: pct(x0 - vb.x, vb.w),
    top: pct(y0 - vb.y, vb.h),
    width: pct(Math.max(0, x1 - x0), vb.w),
    height: pct(Math.max(0, y1 - y0), vb.h),
  };
}

export function overlayScale(vb: ViewBox) {
  return {
    width: `${(vb.w / CARD_ART.w) * 100}%`,
    height: `${(vb.h / CARD_ART.h) * 100}%`,
  };
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/<script[\s\S]*?<\/script>/gi, ""))}`;
}

const NON_PAINTED_SVG_NODES = new Set([
  "defs",
  "clippath",
  "pattern",
  "mask",
  "symbol",
]);

function numAttr(tag: string, name: string, referenceSize: number): number {
  const m = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*["']\\s*([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?)\\s*(%|px)?\\s*["']`,
    "i",
  ).exec(tag);
  if (!m) return 0;
  const value = Number(m[1]);
  return m[2] === "%" ? (value * referenceSize) / 100 : value;
}

/**
 * Finds the largest painted `<rect>` outside non-painted container definitions.
 * Matches `largestPlate()` in `animesice/src/lib/cosmetic-svg.ts` exactly.
 */
export function largestPlate(svg: string): ViewBox | null {
  const vb = parseViewBox(svg);
  let nonPaintedDepth = 0;
  let best: ViewBox | null = null;
  for (const m of svg.matchAll(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<![^>]*>|<[^>]+>/g)) {
    const tag = m[0];
    if (tag.startsWith("<!--") || tag.startsWith("<!") || tag.startsWith("<?")) {
      continue;
    }
    const parts = /^<\s*(\/?)\s*([a-zA-Z][\w:.-]*)/i.exec(tag);
    if (!parts) continue;
    const closing = parts[1] === "/";
    const name = parts[2]!.split(":").pop()!.toLowerCase();
    if (closing) {
      if (NON_PAINTED_SVG_NODES.has(name)) {
        nonPaintedDepth = Math.max(0, nonPaintedDepth - 1);
      }
      continue;
    }
    if (name === "rect" && nonPaintedDepth === 0) {
      const w = numAttr(tag, "width", vb.w);
      const h = numAttr(tag, "height", vb.h);
      if (w > 0 && h > 0 && (!best || w * h > best.w * best.h)) {
        best = {
          x: numAttr(tag, "x", vb.w),
          y: numAttr(tag, "y", vb.h),
          w,
          h,
        };
      }
    }
    if (NON_PAINTED_SVG_NODES.has(name) && !/\/\s*>$/.test(tag)) {
      nonPaintedDepth++;
    }
  }
  return best;
}

export function cosmeticTypeOf(key: string): CosmeticType | null {
  if (key.startsWith("BACK_")) return "BACK";
  if (key.startsWith("FRAME_")) return "FRAME";
  if (key.startsWith("DESTAQUE_")) return "HIGHLIGHT";
  return null;
}
