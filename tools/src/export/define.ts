import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CosmeticCanvas, createCosmeticCanvas } from "../compositor/index.ts";
import type { AssetType } from "../core/contracts.ts";
import { exportCosmetic, type ExportMetadata, type ExportResult } from "./index.ts";
import {
  DEFAULT_COSMETICS_ROOT,
  DEFAULT_OUTPUT_ROOT,
  TYPE_DIR_MAP,
  defaultKeyFor,
  resolveCosmeticPaths,
  slugify,
  type CosmeticBundlePaths,
} from "./paths.ts";

export type CosmeticRenderHints = {
  frames?: number;
  durationSec?: number;
  reducedMotion?: boolean;
  cardArtPath?: string;
};

export type CosmeticBuildContext = {
  outputRoot: string;
  paths: CosmeticBundlePaths;
  metadata: ExportMetadata & {
    collection: string;
    slug: string;
    renderHints?: CosmeticRenderHints;
  };
  createCanvas: (opts?: { title?: string; desc?: string }) => CosmeticCanvas;
  assetPath: (filename: string) => string;
  previewPath: (filename: string) => string;
  export: (
    canvas: CosmeticCanvas,
    opts?: {
      optimize?: boolean;
      precision?: number;
      strictAudit?: boolean;
      updateCatalog?: boolean;
    },
  ) => ExportResult;
};

export type CosmeticDefinition = {
  type: AssetType;
  collection?: string;
  slug: string;
  key?: string;
  name: string;
  description: string;
  rarity?: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  price?: number;
  tags?: string[];
  optimize?: boolean;
  precision?: number;
  renderHints?: CosmeticRenderHints;
  build: (
    ctx: CosmeticBuildContext,
  ) => CosmeticCanvas | ExportResult | Promise<CosmeticCanvas | ExportResult>;
};

export function defineCosmetic(def: CosmeticDefinition): CosmeticDefinition {
  const cleanSlug = slugify(def.slug);
  return {
    ...def,
    slug: cleanSlug,
    collection: slugify(def.collection || "default"),
    key: def.key ?? defaultKeyFor(def.type, cleanSlug),
  };
}

export async function runCosmeticDefinition(
  rawDef: CosmeticDefinition,
  opts?: { outputRoot?: string; updateCatalog?: boolean },
): Promise<ExportResult> {
  const def = defineCosmetic(rawDef);
  const outputRoot = path.resolve(opts?.outputRoot ?? DEFAULT_OUTPUT_ROOT);
  const paths = resolveCosmeticPaths({
    outputRoot,
    type: def.type,
    collection: def.collection,
    slug: def.slug,
  });

  const metadata: CosmeticBuildContext["metadata"] = {
    key: def.key!,
    name: def.name,
    description: def.description,
    type: def.type,
    collection: paths.collection,
    slug: paths.slug,
    rarity: def.rarity,
    price: def.price,
    tags: def.tags,
    renderHints: def.renderHints,
  };

  let exported: ExportResult | null = null;

  const ctx: CosmeticBuildContext = {
    outputRoot,
    paths,
    metadata,
    createCanvas: (cOpts) =>
      createCosmeticCanvas({
        type: def.type,
        title: cOpts?.title ?? def.name,
        desc: cOpts?.desc ?? def.description,
      }),
    assetPath: (filename) => {
      fs.mkdirSync(paths.assetsDir, { recursive: true });
      return path.join(paths.assetsDir, filename);
    },
    previewPath: (filename) => {
      fs.mkdirSync(paths.previewsDir, { recursive: true });
      return path.join(paths.previewsDir, filename);
    },
    export: (canvas, eOpts) => {
      exported = exportCosmetic({
        canvas,
        outputRoot,
        collection: paths.collection,
        slug: paths.slug,
        optimize: eOpts?.optimize ?? def.optimize ?? true,
        precision: eOpts?.precision ?? def.precision,
        strictAudit: eOpts?.strictAudit ?? true,
        updateCatalog: eOpts?.updateCatalog ?? opts?.updateCatalog ?? true,
        metadata,
      });
      return exported;
    },
  };

  const result = await def.build(ctx);
  if (result instanceof CosmeticCanvas) {
    return ctx.export(result);
  }
  return result;
}

export function discoverCosmeticFiles(rootDir: string): string[] {
  const abs = path.resolve(rootDir);
  if (!fs.existsSync(abs)) return [];
  const found: string[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        walk(full);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".d.ts") &&
        entry.name !== "index.ts"
      ) {
        found.push(full);
      }
    }
  };

  walk(abs);
  return found;
}

export type LoadedCosmeticModule = {
  filePath: string;
  definition?: CosmeticDefinition;
  buildFn?: (outputRoot?: string) => Promise<unknown> | unknown;
};

export async function loadCosmeticDefinitions(
  dirs: readonly string[],
): Promise<LoadedCosmeticModule[]> {
  const results: LoadedCosmeticModule[] = [];
  for (const dir of dirs) {
    for (const filePath of discoverCosmeticFiles(dir)) {
      const mod = (await import(pathToFileURL(filePath).href)) as {
        default?: CosmeticDefinition;
        cosmetic?: CosmeticDefinition;
        build?: (outputRoot?: string) => Promise<unknown> | unknown;
      };
      const def = mod.default ?? mod.cosmetic;
      if (def && typeof def.build === "function" && def.slug && def.type) {
        results.push({ filePath, definition: defineCosmetic(def) });
      } else if (typeof mod.build === "function") {
        results.push({ filePath, buildFn: mod.build });
      }
    }
  }
  return results;
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export function scaffoldCosmeticFile(opts: {
  cosmeticsRoot?: string;
  type: AssetType;
  collection?: string;
  slug: string;
  key?: string;
  name?: string;
  description?: string;
  rarity?: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  price?: number;
}): { filePath: string; key: string; collection: string; slug: string } {
  const root = path.resolve(opts.cosmeticsRoot ?? DEFAULT_COSMETICS_ROOT);
  const typeDir = TYPE_DIR_MAP[opts.type];
  const collection = slugify(opts.collection || "default");
  const slug = slugify(opts.slug);
  const key = opts.key ?? defaultKeyFor(opts.type, slug);
  const name = opts.name ?? titleFromSlug(slug);
  const description = opts.description ?? `${name} — cosmético ${opts.type.toLowerCase()} AnimesIce.`;
  const rarity = opts.rarity ?? "RARE";
  const price = opts.price ?? (opts.type === "HIGHLIGHT" ? 3000 : opts.type === "FRAME" ? 2000 : 1500);

  const filePath = path.join(root, typeDir, collection, `${slug}.ts`);
  if (fs.existsSync(filePath)) {
    throw new Error(`Cosmetic file already exists: ${filePath}`);
  }

  const srcDepthImport = "../../../src/index.ts";
  const bodySnippet =
    opts.type === "FRAME"
      ? `  const mask = canvas.defineFrameCutoutMask("aperture", { inset: 20, chamfer: 24 });
  const rimGrad = defineMetallicGradient(canvas, "rim-grad", "ice-crystal", 135);
  const bezel = canvas.layer("bezel", { maskUrl: mask });
  bezel.rect(810, 1060).move(-30, -30).fill("#0B1424");
  canvas.addPath(canvas.layer("rim"), chamferedRectPath(20, 20, 710, 960, 24), {
    stroke: rimGrad,
    strokeWidth: 4,
  });`
      : opts.type === "HIGHLIGHT"
        ? `  const auraGrad = defineMetallicGradient(canvas, "aura-grad", "prism-holo", 135);
  const auraGlow = defineGlowFilter(canvas, "aura-glow", {
    stdDeviation: 6,
    wideDeviation: 18,
    color: "#38E8DA",
    floodOpacity: 0.6,
    paddingPct: 40,
  });
  canvas.addPath(canvas.layer("outer-aura"), chamferedRectPath(-48, -48, 846, 1096, 38), {
    stroke: auraGrad,
    strokeWidth: 10,
    filterUrl: auraGlow,
  });
  canvas.addPath(canvas.layer("aura-core"), chamferedRectPath(-28, -28, 806, 1056, 26), {
    stroke: "#FCD34D",
    strokeWidth: 2,
  });`
        : `  const bgGrad = defineMetallicGradient(canvas, "bg-grad", "midnight-sky", 150);
  const accentGrad = defineMetallicGradient(canvas, "accent-grad", "celestial-gold", 135);
  canvas.addBackPlate(bgGrad);
  canvas.addPath(canvas.layer("border"), chamferedRectPath(24, 24, 702, 952, 22), {
    stroke: accentGrad,
    strokeWidth: 2.5,
  });
  canvas.addPath(canvas.layer("emblem"), fourPointStar(375, 480, 96, 26), {
    fill: accentGrad,
  });`;

  const starImport = opts.type === "BACK" ? "\n  fourPointStar," : "";
  const glowImport = opts.type === "HIGHLIGHT" ? "\n  defineGlowFilter," : "";
  const content = `import { pathToFileURL } from "node:url";
import {
  chamferedRectPath,
  defineCosmetic,
  defineMetallicGradient,${starImport}${glowImport}
  runCosmeticDefinition,
} from "${srcDepthImport}";

export const cosmetic = defineCosmetic({
  type: ${JSON.stringify(opts.type)},
  collection: ${JSON.stringify(collection)},
  slug: ${JSON.stringify(slug)},
  key: ${JSON.stringify(key)},
  name: ${JSON.stringify(name)},
  description: ${JSON.stringify(description)},
  rarity: ${JSON.stringify(rarity)},
  price: ${price},
  tags: [${JSON.stringify(collection)}, ${JSON.stringify(opts.type.toLowerCase())}],
  build(ctx) {
    const canvas = ctx.createCanvas();
${bodySnippet}
    return canvas;
  },
});

export default cosmetic;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const res = await runCosmeticDefinition(cosmetic);
  console.log(\`Built \${res.svgPath} (\${(res.optimizedBytes / 1024).toFixed(1)} KB)\`);
}
`;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return { filePath, key, collection, slug };
}
