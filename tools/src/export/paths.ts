import fs from "node:fs";
import path from "node:path";
import type { AssetType } from "../core/contracts.ts";

export const DEFAULT_OUTPUT_ROOT = path.resolve(import.meta.dirname, "../../output");
export const DEFAULT_COSMETICS_ROOT = path.resolve(import.meta.dirname, "../../cosmetics");

export const TYPE_DIR_MAP: Record<AssetType, string> = {
  BACK: "backs",
  FRAME: "frames",
  HIGHLIGHT: "highlights",
  SKIN: "skins",
  BANNER: "banners",
};

const DIR_TYPE_MAP: Record<string, AssetType> = {
  backs: "BACK",
  frames: "FRAME",
  highlights: "HIGHLIGHT",
  skins: "SKIN",
  banners: "BANNER",
};

export function typeFromDirName(dirName: string): AssetType | null {
  return DIR_TYPE_MAP[dirName] ?? null;
}

export function slugify(input: string): string {
  const clean = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!clean) {
    throw new Error(`Invalid slug or collection name: "${input}"`);
  }
  return clean;
}

export function defaultKeyPrefix(type: AssetType): string {
  switch (type) {
    case "BACK":
      return "BACK_";
    case "FRAME":
      return "FRAME_";
    case "HIGHLIGHT":
      return "DESTAQUE_";
    case "SKIN":
      return "SKIN_";
    case "BANNER":
      return "BANNER_";
  }
}

export function defaultKeyFor(type: AssetType, slug: string): string {
  return `${defaultKeyPrefix(type)}${slugify(slug).replace(/-/g, "_").toUpperCase()}`;
}

export type CosmeticBundlePaths = {
  outputRoot: string;
  type: AssetType;
  typeDir: string;
  collection: string;
  slug: string;
  dir: string;
  relDir: string;
  svgPath: string;
  metaPath: string;
  assetsDir: string;
  previewsDir: string;
};

export function resolveCosmeticPaths(opts: {
  outputRoot?: string;
  type: AssetType;
  collection?: string;
  slug: string;
}): CosmeticBundlePaths {
  const outputRoot = path.resolve(opts.outputRoot ?? DEFAULT_OUTPUT_ROOT);
  const typeDir = TYPE_DIR_MAP[opts.type];
  const collection = slugify(opts.collection || "default");
  const slug = slugify(opts.slug);
  const dir = path.join(outputRoot, typeDir, collection, slug);

  return {
    outputRoot,
    type: opts.type,
    typeDir,
    collection,
    slug,
    dir,
    relDir: path.posix.join(typeDir, collection, slug),
    svgPath: path.join(dir, "cosmetic.svg"),
    metaPath: path.join(dir, "meta.json"),
    assetsDir: path.join(dir, "assets"),
    previewsDir: path.join(dir, "previews"),
  };
}

export function resolveShaderOutputPath(opts: {
  outputRoot?: string;
  name: string;
  ext?: string;
}): string {
  const outputRoot = path.resolve(opts.outputRoot ?? DEFAULT_OUTPUT_ROOT);
  const ext = (opts.ext ?? "png").replace(/^\./, "");
  return path.join(outputRoot, "shaders", `${slugify(opts.name)}.${ext}`);
}

export function findCosmeticBundle(
  slugOrKey: string,
  outputRoot = DEFAULT_OUTPUT_ROOT,
): CosmeticBundlePaths | null {
  const root = path.resolve(outputRoot);
  if (!fs.existsSync(root)) return null;
  const queryLower = slugOrKey.trim().toLowerCase();

  for (const typeDir of Object.values(TYPE_DIR_MAP)) {
    const type = typeFromDirName(typeDir);
    if (!type) continue;
    const typeRoot = path.join(root, typeDir);
    if (!fs.existsSync(typeRoot)) continue;

    for (const colEntry of fs.readdirSync(typeRoot, { withFileTypes: true })) {
      if (!colEntry.isDirectory()) continue;
      const colRoot = path.join(typeRoot, colEntry.name);
      for (const slugEntry of fs.readdirSync(colRoot, { withFileTypes: true })) {
        if (!slugEntry.isDirectory()) continue;
        const bundleDir = path.join(colRoot, slugEntry.name);
        const svgPath = path.join(bundleDir, "cosmetic.svg");
        const metaPath = path.join(bundleDir, "meta.json");
        if (!fs.existsSync(svgPath)) continue;

        const relMatch = `${colEntry.name}/${slugEntry.name}`.toLowerCase() === queryLower;
        const slugMatch = slugEntry.name.toLowerCase() === queryLower;
        let keyMatch = false;
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { key?: string };
            if (typeof meta.key === "string" && meta.key.toLowerCase() === queryLower) {
              keyMatch = true;
            }
          } catch {
            // ignore malformed meta during lookup
          }
        }
        if (relMatch || slugMatch || keyMatch) {
          return resolveCosmeticPaths({
            outputRoot: root,
            type,
            collection: colEntry.name,
            slug: slugEntry.name,
          });
        }
      }
    }
  }
  return null;
}
