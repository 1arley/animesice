import fs from "node:fs";
import path from "node:path";
import { optimize } from "svgo";
import type { CosmeticCanvas } from "../compositor/index.ts";
import { auditCosmeticSvg, type AuditReport } from "../core/audit.ts";
import type { AssetType } from "../core/contracts.ts";
import { rebuildCatalogIndex } from "./catalog.ts";
import {
  DEFAULT_OUTPUT_ROOT,
  defaultKeyFor,
  resolveCosmeticPaths,
  slugify,
} from "./paths.ts";

export * from "./paths.ts";
export * from "./catalog.ts";
export * from "./define.ts";

export type ExportMetadata = {
  key: string;
  name: string;
  description: string;
  type: AssetType;
  collection?: string;
  slug?: string;
  rarity?: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  price?: number;
  tags?: string[];
  renderHints?: {
    frames?: number;
    durationSec?: number;
    reducedMotion?: boolean;
    cardArtPath?: string;
  };
};

export type ExportResult = {
  svgPath: string;
  metaPath?: string;
  dir: string;
  assetsDir: string;
  previewsDir: string;
  collection: string;
  slug: string;
  svg: string;
  rawBytes: number;
  optimizedBytes: number;
  audit: AuditReport;
};

/**
 * Compresses an SVG via SVGO while preserving every AnimesIce contract invariant:
 * - Preserves `<rect>` elements (`convertShapeToPath: false`) required by `largestPlate()`.
 * - Preserves `viewBox`, `<title>`, `<defs>`, `<filter>`, `<mask>`, `<style>`, `@keyframes`, and IDs.
 */
export function optimizeCosmeticSvg(
  svg: string,
  opts?: { precision?: number },
): string {
  const precision = opts?.precision ?? 2;
  const result = optimize(svg, {
    multipass: true,
    floatPrecision: precision,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            convertShapeToPath: false,
            cleanupIds: false,
            inlineStyles: false,
            minifyStyles: false,
            collapseGroups: false,
            mergePaths: false,
            removeDesc: false,
            removeHiddenElems: false,
            removeUselessDefs: false,
            removeUnknownsAndDefaults: false,
            convertPathData: {
              floatPrecision: precision,
            },
            cleanupNumericValues: {
              floatPrecision: precision,
            },
          },
        },
      },
    ],
  });
  return result.data;
}

/**
 * Serializes, optionally optimizes via SVGO, audits against AnimesIce contracts,
 * and writes either:
 * - Structured bundle: `<outputRoot>/<typeDir>/<collection>/<slug>/cosmetic.svg` + `meta.json` (+ `catalog.json`)
 * - Explicit file path (`outPath`): writes `<outPath>` + `<name>.meta.json`
 */
export function exportCosmetic(opts: {
  canvas: CosmeticCanvas;
  outPath?: string;
  outputRoot?: string;
  collection?: string;
  slug?: string;
  optimize?: boolean;
  precision?: number;
  metadata?: ExportMetadata;
  strictAudit?: boolean;
  updateCatalog?: boolean;
}): ExportResult {
  const rawSvg = opts.canvas.toSvg();
  const rawBytes = Buffer.byteLength(rawSvg, "utf8");
  const svg = (opts.optimize ?? true)
    ? optimizeCosmeticSvg(rawSvg, { precision: opts.precision })
    : rawSvg;
  const optimizedBytes = Buffer.byteLength(svg, "utf8");
  const audit = auditCosmeticSvg(svg, opts.canvas.type);

  if ((opts.strictAudit ?? true) && !audit.ok) {
    const msgs = audit.errors.map((e) => `- ${e.rule}: ${e.why}`).join("\n");
    throw new Error(`Audit failed for ${opts.outPath ?? opts.slug ?? opts.canvas.type}:\n${msgs}`);
  }

  const inferredSlug = opts.slug
    ? slugify(opts.slug)
    : opts.metadata?.slug
      ? slugify(opts.metadata.slug)
      : opts.outPath
        ? slugify(path.basename(opts.outPath, path.extname(opts.outPath)))
        : slugify(opts.metadata?.name ?? opts.canvas.type);
  const collection = slugify(opts.collection ?? opts.metadata?.collection ?? "default");

  const structured = !opts.outPath;
  const bundlePaths = resolveCosmeticPaths({
    outputRoot: opts.outputRoot ?? DEFAULT_OUTPUT_ROOT,
    type: opts.canvas.type,
    collection,
    slug: inferredSlug,
  });

  const absOut = opts.outPath ? path.resolve(opts.outPath) : bundlePaths.svgPath;
  const dir = path.dirname(absOut);
  const assetsDir = opts.outPath ? path.join(dir, "assets") : bundlePaths.assetsDir;
  const previewsDir = opts.outPath ? path.join(dir, "previews") : bundlePaths.previewsDir;

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(absOut, svg, "utf8");

  let metaPath: string | undefined;
  if (opts.metadata) {
    metaPath = opts.outPath
      ? absOut.replace(/\.svg$/i, "") + ".meta.json"
      : bundlePaths.metaPath;
    const metaPayload = {
      ...opts.metadata,
      key: opts.metadata.key ?? defaultKeyFor(opts.canvas.type, inferredSlug),
      collection,
      slug: inferredSlug,
      svgFile: path.basename(absOut),
      byteLength: optimizedBytes,
      rawBytes,
      audit: {
        ok: audit.ok,
        errors: audit.errors.length,
        warnings: audit.warnings.length,
        items: audit.items,
      },
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(metaPath, JSON.stringify(metaPayload, null, 2) + "\n", "utf8");
  }

  if (opts.updateCatalog ?? structured) {
    rebuildCatalogIndex(opts.outputRoot ?? DEFAULT_OUTPUT_ROOT);
  }

  return {
    svgPath: absOut,
    metaPath,
    dir,
    assetsDir,
    previewsDir,
    collection,
    slug: inferredSlug,
    svg,
    rawBytes,
    optimizedBytes,
    audit,
  };
}
