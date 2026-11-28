import fs from "node:fs";
import path from "node:path";
import { createSVGWindow } from "svgdom";
import {
  SVG,
  registerWindow,
  type Defs,
  type G,
  type Svg,
} from "@svgdotjs/svg.js";
import {
  ASSET_SPECS,
  BLEED,
  CARD_ART,
  type AssetSpec,
  type AssetType,
} from "../core/contracts.ts";
import { chamferedRectPath, rectPath } from "../geometry/index.ts";
import type { Bounds, Point2D } from "../generative/index.ts";

export type LayerOptions = {
  id?: string;
  opacity?: number;
  blendMode?:
    | "normal"
    | "screen"
    | "multiply"
    | "overlay"
    | "soft-light"
    | "color-dodge"
    | "plus-lighter";
  clipPathUrl?: string;
  maskUrl?: string;
  filterUrl?: string;
  className?: string;
};

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

/**
 * Isolated SVG.js + svgdom layered compositor enforcing AnimesIce viewBox & security contracts.
 */
export class CosmeticCanvas {
  readonly type: AssetType;
  readonly spec: AssetSpec;
  private readonly win: ReturnType<typeof createSVGWindow>;
  private readonly doc: Document;
  private readonly svgRoot: Svg;
  private readonly defsNode: Defs;
  private readonly layers = new Map<string, G>();
  private styleRules: string[] = [];
  private styleNode: ReturnType<Defs["element"]> | null = null;
  private hasReducedMotionRule = false;

  constructor(opts: { type: AssetType; title: string; desc?: string }) {
    this.type = opts.type;
    this.spec = ASSET_SPECS[opts.type];
    this.win = createSVGWindow();
    this.doc = this.win.document;
    this.bindWindow();

    this.svgRoot = SVG(this.doc.documentElement) as Svg;
    this.svgRoot.attr({
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: this.spec.viewBox,
      width: String(this.spec.width),
      height: String(this.spec.height),
      role: "img",
      "aria-labelledby": "asset-title",
    });

    this.svgRoot.element("title", { id: "asset-title" }).words(opts.title);
    if (opts.desc) {
      this.svgRoot.element("desc").words(opts.desc);
    }
    this.defsNode = this.svgRoot.defs();
  }

  /** Re-registers this canvas's isolated svgdom window before SVG.js mutations. */
  bindWindow(): void {
    registerWindow(this.win as unknown as Window & typeof globalThis, this.doc);
  }

  root(): Svg {
    this.bindWindow();
    return this.svgRoot;
  }

  defs(): Defs {
    this.bindWindow();
    return this.defsNode;
  }

  /**
   * Creates or returns an ordered layer `<g data-layer="name">`.
   */
  layer(name: string, opts?: LayerOptions): G {
    this.bindWindow();
    const existing = this.layers.get(name);
    if (existing) {
      if (opts) this.applyLayerOpts(existing, opts);
      return existing;
    }
    const g = this.svgRoot.group().attr("data-layer", name);
    g.id(opts?.id ?? `layer-${name.replace(/[^a-z0-9_-]/gi, "-")}`);
    if (opts) this.applyLayerOpts(g, opts);
    this.layers.set(name, g);
    return g;
  }

  private applyLayerOpts(g: G, opts: LayerOptions): void {
    if (opts.opacity !== undefined) g.opacity(opts.opacity);
    if (opts.blendMode) g.css("mix-blend-mode", opts.blendMode);
    if (opts.clipPathUrl) g.attr("clip-path", opts.clipPathUrl);
    if (opts.maskUrl) g.attr("mask", opts.maskUrl);
    if (opts.filterUrl) g.attr("filter", opts.filterUrl);
    if (opts.className) g.addClass(opts.className);
  }

  /**
   * Appends CSS rules (such as `@keyframes`) into a single `<style>` node inside `<defs>`.
   * Automatically guarantees `@media (prefers-reduced-motion: reduce)` safety.
   */
  addStyle(css: string, opts?: { includeReducedMotion?: boolean }): void {
    this.bindWindow();
    this.styleRules.push(css.trim());
    if ((opts?.includeReducedMotion ?? true) && !this.hasReducedMotionRule && /@keyframes\b/i.test(css)) {
      this.hasReducedMotionRule = true;
      this.styleRules.push(
        "@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }",
      );
    }
    if (!this.styleNode) {
      this.styleNode = this.defsNode.element("style");
    }
    this.styleNode.words(this.styleRules.join("\n"));
  }

  /**
   * Emits the full-canvas background `<rect>` required by `largestPlate()` for `BACK` cards.
   */
  addBackPlate(
    fill: string,
    opts?: { rx?: number; filterUrl?: string; id?: string },
  ): void {
    this.bindWindow();
    const rect = this.svgRoot
      .rect(this.spec.width, this.spec.height)
      .move(this.spec.x, this.spec.y)
      .fill(fill);
    rect.id(opts?.id ?? "back-plate");
    if (opts?.rx) rect.radius(opts.rx);
    if (opts?.filterUrl) rect.attr("filter", opts.filterUrl);
  }

  defineClipPath(id: string, build: (clip: ReturnType<Defs["clip"]>) => void): string {
    this.bindWindow();
    const clip = this.defsNode.clip().id(id);
    build(clip);
    return `url(#${id})`;
  }

  defineMask(id: string, build: (mask: ReturnType<Defs["mask"]>) => void): string {
    this.bindWindow();
    const mask = this.defsNode.mask().id(id);
    build(mask);
    return `url(#${id})`;
  }

  defineSymbol(id: string, build: (symbol: G) => void): string {
    this.bindWindow();
    const sym = this.defsNode.symbol().id(id);
    build(sym as unknown as G);
    return id;
  }

  useSymbol(layer: G, id: string, attrs?: Record<string, string | number>) {
    this.bindWindow();
    const u = layer.use(id);
    if (attrs) u.attr(attrs);
    return u;
  }

  /**
   * Clips content strictly inside the 750x1000 card art window.
   */
  defineArtWindowClip(id = "art-window-clip", opts?: { radius?: number; inset?: number }): string {
    const inset = opts?.inset ?? 0;
    return this.defineClipPath(id, (clip) => {
      const r = clip
        .rect(CARD_ART.w - inset * 2, CARD_ART.h - inset * 2)
        .move(inset, inset);
      if (opts?.radius) r.radius(opts.radius);
    });
  }

  /**
   * Creates an SVG `<mask>` that is opaque across the full frame+bleed area
   * and punched out transparently across the center art aperture.
   */
  defineFrameCutoutMask(
    id = "frame-cutout-mask",
    opts?: { inset?: number; radius?: number; chamfer?: number },
  ): string {
    const inset = opts?.inset ?? 22;
    const x = -BLEED * 2;
    const y = -BLEED * 2;
    const w = CARD_ART.w + BLEED * 4;
    const h = CARD_ART.h + BLEED * 4;
    return this.defineMask(id, (mask) => {
      mask.attr({
        maskUnits: "userSpaceOnUse",
        x: String(x),
        y: String(y),
        width: String(w),
        height: String(h),
      });
      mask.rect(w, h).move(x, y).fill("#FFFFFF");
      const cutoutD = opts?.chamfer
        ? chamferedRectPath(inset, inset, CARD_ART.w - inset * 2, CARD_ART.h - inset * 2, opts.chamfer)
        : rectPath(inset, inset, CARD_ART.w - inset * 2, CARD_ART.h - inset * 2, opts?.radius ?? 0);
      mask.path(cutoutD).fill("#000000");
    });
  }

  /**
   * Embeds a local raster image or `data:` URI cleanly (compatible with `<img>`-hosted SVGs).
   */
  embedImage(
    layer: G,
    dataUriOrFilePath: string,
    bounds: Bounds = { x: this.spec.x, y: this.spec.y, w: this.spec.width, h: this.spec.height },
    opts?: { opacity?: number; preserveAspectRatio?: string; clipPathUrl?: string },
  ) {
    this.bindWindow();
    let href = dataUriOrFilePath;
    if (!href.startsWith("data:")) {
      const abs = path.resolve(dataUriOrFilePath);
      const ext = path.extname(abs).toLowerCase();
      const mime = MIME_BY_EXT[ext] ?? "image/png";
      const b64 = fs.readFileSync(abs).toString("base64");
      href = `data:${mime};base64,${b64}`;
    }
    const img = layer
      .image(href)
      .size(bounds.w, bounds.h)
      .move(bounds.x, bounds.y)
      .attr("preserveAspectRatio", opts?.preserveAspectRatio ?? "xMidYMid slice");
    if (opts?.opacity !== undefined) img.opacity(opts.opacity);
    if (opts?.clipPathUrl) img.attr("clip-path", opts.clipPathUrl);
    return img;
  }

  addPath(
    layer: G,
    d: string,
    attrs?: {
      fill?: string;
      fillOpacity?: number;
      fillRule?: "evenodd" | "nonzero";
      stroke?: string;
      strokeWidth?: number;
      strokeOpacity?: number;
      strokeLinecap?: "butt" | "round" | "square";
      strokeLinejoin?: "miter" | "round" | "bevel";
      strokeDasharray?: string;
      opacity?: number;
      filterUrl?: string;
      clipPathUrl?: string;
      className?: string;
    },
  ) {
    this.bindWindow();
    const p = layer.path(d).fill(attrs?.fill ?? "none");
    if (attrs?.fillOpacity !== undefined) p.attr("fill-opacity", String(attrs.fillOpacity));
    if (attrs?.fillRule) p.attr("fill-rule", attrs.fillRule);
    if (attrs?.stroke) {
      p.stroke({
        color: attrs.stroke,
        width: attrs.strokeWidth ?? 1.5,
        opacity: attrs.strokeOpacity,
        linecap: attrs.strokeLinecap,
        linejoin: attrs.strokeLinejoin,
        dasharray: attrs.strokeDasharray,
      });
    }
    if (attrs?.opacity !== undefined) p.opacity(attrs.opacity);
    if (attrs?.filterUrl) p.attr("filter", attrs.filterUrl);
    if (attrs?.clipPathUrl) p.attr("clip-path", attrs.clipPathUrl);
    if (attrs?.className) p.addClass(attrs.className);
    return p;
  }

  addPolygon(layer: G, points: readonly Point2D[], attrs?: { fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }) {
    this.bindWindow();
    const ptsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
    const poly = layer.polygon(ptsStr).fill(attrs?.fill ?? "none");
    if (attrs?.stroke) poly.stroke({ color: attrs.stroke, width: attrs.strokeWidth ?? 1 });
    if (attrs?.opacity !== undefined) poly.opacity(attrs.opacity);
    return poly;
  }

  addText(
    layer: G,
    text: string,
    x: number,
    y: number,
    attrs?: {
      fill?: string;
      fontSize?: number;
      fontFamily?: string;
      fontWeight?: string | number;
      letterSpacing?: string;
      anchor?: "start" | "middle" | "end";
      opacity?: number;
    },
  ) {
    this.bindWindow();
    const t = layer.text(text).attr({
      x: String(x),
      y: String(y),
      fill: attrs?.fill ?? "#F1F5F9",
      "font-size": String(attrs?.fontSize ?? 24),
      "font-family": attrs?.fontFamily ?? "system-ui, sans-serif",
      "font-weight": String(attrs?.fontWeight ?? 600),
      "text-anchor": attrs?.anchor ?? "middle",
    });
    if (attrs?.letterSpacing) t.attr("letter-spacing", attrs.letterSpacing);
    if (attrs?.opacity !== undefined) t.opacity(attrs.opacity);
    return t;
  }

  toSvg(): string {
    this.bindWindow();
    const raw = this.svgRoot.svg();
    // Ensure clean standalone SVG without redundant svgjs metadata
    return raw.replace(/\s+xmlns:svgjs="[^"]*"/g, "");
  }
}

export function createCosmeticCanvas(opts: {
  type: AssetType;
  title: string;
  desc?: string;
}): CosmeticCanvas {
  return new CosmeticCanvas(opts);
}
