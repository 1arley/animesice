import fs from "node:fs";
import path from "node:path";
import { auditCosmeticSvg } from "../core/audit.ts";
import { type AssetType } from "../core/contracts.ts";
import {
  DEFAULT_OUTPUT_ROOT,
  TYPE_DIR_MAP,
  defaultKeyFor,
  typeFromDirName,
} from "./paths.ts";

export type CatalogEntry = {
  key: string;
  name: string;
  description: string;
  type: AssetType;
  collection: string;
  slug: string;
  rarity?: string;
  price?: number;
  tags?: string[];
  relDir: string;
  svgRelPath: string;
  metaRelPath?: string;
  previewRelPaths: string[];
  assetRelPaths: string[];
  byteLength: number;
  audit: {
    ok: boolean;
    errors: number;
    warnings: number;
  };
  renderHints?: {
    frames?: number;
    durationSec?: number;
    reducedMotion?: boolean;
  };
  generatedAt?: string;
};

export type ShaderAssetEntry = {
  name: string;
  relPath: string;
  byteLength: number;
};

export type DuplicateKeyCollision = {
  key: string;
  slugs: string[];
};

export type CatalogIndex = {
  version: 1;
  generatedAt: string;
  outputRoot: string;
  total: number;
  byType: Record<AssetType, number>;
  byCollection: Record<string, number>;
  duplicateKeys: DuplicateKeyCollision[];
  entries: CatalogEntry[];
  shaders: ShaderAssetEntry[];
};

function listRelFiles(dir: string, outputRoot: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => path.relative(outputRoot, path.join(dir, d.name)).split(path.sep).join("/"))
    .sort();
}

export function scanCosmeticBundles(outputRoot = DEFAULT_OUTPUT_ROOT): {
  entries: CatalogEntry[];
  shaders: ShaderAssetEntry[];
} {
  const root = path.resolve(outputRoot);
  const entries: CatalogEntry[] = [];
  const shaders: ShaderAssetEntry[] = [];
  if (!fs.existsSync(root)) return { entries, shaders };

  for (const typeDir of Object.values(TYPE_DIR_MAP)) {
    const type = typeFromDirName(typeDir);
    if (!type) continue;
    const typeRoot = path.join(root, typeDir);
    if (!fs.existsSync(typeRoot)) continue;

    for (const colEntry of fs.readdirSync(typeRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!colEntry.isDirectory()) continue;
      const colRoot = path.join(typeRoot, colEntry.name);
      for (const slugEntry of fs.readdirSync(colRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (!slugEntry.isDirectory()) continue;
        const bundleDir = path.join(colRoot, slugEntry.name);
        const svgPath = path.join(bundleDir, "cosmetic.svg");
        if (!fs.existsSync(svgPath)) continue;

        const svg = fs.readFileSync(svgPath, "utf8");
        const metaPath = path.join(bundleDir, "meta.json");
        let meta: Record<string, unknown> = {};
        const hasMeta = fs.existsSync(metaPath);
        if (hasMeta) {
          try {
            meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as Record<string, unknown>;
          } catch {
            meta = {};
          }
        }

        const audit = auditCosmeticSvg(svg, type);
        const relDir = path.posix.join(typeDir, colEntry.name, slugEntry.name);
        entries.push({
          key: typeof meta.key === "string" ? meta.key : defaultKeyFor(type, slugEntry.name),
          name: typeof meta.name === "string" ? meta.name : slugEntry.name,
          description: typeof meta.description === "string" ? meta.description : "",
          type,
          collection: colEntry.name,
          slug: slugEntry.name,
          rarity: typeof meta.rarity === "string" ? meta.rarity : undefined,
          price: typeof meta.price === "number" ? meta.price : undefined,
          tags: Array.isArray(meta.tags) ? meta.tags.map(String) : undefined,
          relDir,
          svgRelPath: `${relDir}/cosmetic.svg`,
          metaRelPath: hasMeta ? `${relDir}/meta.json` : undefined,
          previewRelPaths: listRelFiles(path.join(bundleDir, "previews"), root),
          assetRelPaths: listRelFiles(path.join(bundleDir, "assets"), root),
          byteLength: Buffer.byteLength(svg, "utf8"),
          audit: {
            ok: audit.ok,
            errors: audit.errors.length,
            warnings: audit.warnings.length,
          },
          renderHints:
            meta.renderHints && typeof meta.renderHints === "object"
              ? (meta.renderHints as CatalogEntry["renderHints"])
              : undefined,
          generatedAt: typeof meta.generatedAt === "string" ? meta.generatedAt : undefined,
        });
      }
    }
  }

  const shadersDir = path.join(root, "shaders");
  if (fs.existsSync(shadersDir)) {
    for (const file of fs.readdirSync(shadersDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!file.isFile()) continue;
      if (!/\.(png|webp|jpg|jpeg)$/i.test(file.name)) continue;
      const full = path.join(shadersDir, file.name);
      shaders.push({
        name: file.name,
        relPath: path.posix.join("shaders", file.name),
        byteLength: fs.statSync(full).size,
      });
    }
  }

  return { entries, shaders };
}

export function rebuildCatalogIndex(outputRoot = DEFAULT_OUTPUT_ROOT): CatalogIndex {
  const root = path.resolve(outputRoot);
  fs.mkdirSync(root, { recursive: true });
  const { entries, shaders } = scanCosmeticBundles(root);

  const byType: Record<AssetType, number> = {
    BACK: 0,
    FRAME: 0,
    HIGHLIGHT: 0,
    SKIN: 0,
    BANNER: 0,
  };
  const byCollection: Record<string, number> = {};
  const byKey = new Map<string, string[]>();

  for (const e of entries) {
    byType[e.type]++;
    byCollection[e.collection] = (byCollection[e.collection] ?? 0) + 1;
    const list = byKey.get(e.key) ?? [];
    list.push(e.relDir);
    byKey.set(e.key, list);
  }

  const duplicateKeys: DuplicateKeyCollision[] = [];
  for (const [key, slugs] of byKey.entries()) {
    if (slugs.length > 1) {
      duplicateKeys.push({ key, slugs });
    }
  }

  const index: CatalogIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    outputRoot: root,
    total: entries.length,
    byType,
    byCollection,
    duplicateKeys,
    entries,
    shaders,
  };

  fs.writeFileSync(path.join(root, "catalog.json"), JSON.stringify(index, null, 2) + "\n", "utf8");
  return index;
}
