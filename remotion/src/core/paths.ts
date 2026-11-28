import fs from "node:fs";
import path from "node:path";
import type { VideoCategory, VideoPublishSpec } from "./contracts.ts";

export const REMOTION_ROOT = path.resolve(import.meta.dirname, "../..");
export const FRONTEND_ROOT = path.resolve(REMOTION_ROOT, "..");
export const PUBLIC_ROOT = path.resolve(FRONTEND_ROOT, "public");
export const DEFAULT_VIDEOS_ROOT = path.resolve(REMOTION_ROOT, "videos");
export const DEFAULT_EXAMPLES_ROOT = path.resolve(REMOTION_ROOT, "examples");
export const DEFAULT_OUTPUT_ROOT = path.resolve(REMOTION_ROOT, "output");
export const REGISTRY_FILE_PATH = path.resolve(REMOTION_ROOT, "src/registry.generated.ts");

export const CATEGORY_DIR_MAP: Record<VideoCategory, string> = {
  GACHA: "gacha",
  UI: "ui",
  PROMO: "promos",
  SHOWCASE: "showcases",
};

const DIR_CATEGORY_MAP: Record<string, VideoCategory> = {
  gacha: "GACHA",
  ui: "UI",
  promos: "PROMO",
  showcases: "SHOWCASE",
};

export function categoryFromDirName(dirName: string): VideoCategory | null {
  return DIR_CATEGORY_MAP[dirName] ?? null;
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

export function pascalIdFromSlug(slug: string): string {
  return slugify(slug)
    .split("-")
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : ""))
    .join("");
}

export function defaultVariantCompositionId(baseId: string, variantKey: string): string {
  const token = variantKey
    .trim()
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${baseId}-${token}`;
}

export type VideoBundlePaths = {
  outputRoot: string;
  category: VideoCategory;
  categoryDir: string;
  collection: string;
  slug: string;
  dir: string;
  relDir: string;
  metaPath: string;
  previewsDir: string;
  videoPath: (stem: string, ext?: string) => string;
  posterPath: (stem: string) => string;
};

export function resolveVideoBundlePaths(opts: {
  outputRoot?: string;
  category: VideoCategory;
  collection?: string;
  slug: string;
}): VideoBundlePaths {
  const outputRoot = path.resolve(opts.outputRoot ?? DEFAULT_OUTPUT_ROOT);
  const categoryDir = CATEGORY_DIR_MAP[opts.category];
  const collection = slugify(opts.collection || "default");
  const slug = slugify(opts.slug);
  const dir = path.join(outputRoot, categoryDir, collection, slug);

  return {
    outputRoot,
    category: opts.category,
    categoryDir,
    collection,
    slug,
    dir,
    relDir: path.posix.join(categoryDir, collection, slug),
    metaPath: path.join(dir, "meta.json"),
    previewsDir: path.join(dir, "previews"),
    videoPath: (stem: string, ext = "mp4") => path.join(dir, `${stem}.${ext.replace(/^\./, "")}`),
    posterPath: (stem: string) => path.join(dir, `${stem}.webp`),
  };
}

export function isSafePublicSubdir(dir: string, publicRoot = PUBLIC_ROOT): boolean {
  if (!dir || path.isAbsolute(dir)) return false;
  const absRoot = path.resolve(publicRoot);
  const resolved = path.resolve(absRoot, dir);
  return resolved === absRoot || resolved.startsWith(absRoot + path.sep);
}

export function resolvePublishPaths(opts: {
  publicRoot?: string;
  publish: VideoPublishSpec;
  stem: string;
  ext: string;
}): { dir: string; videoPath: string; posterPath: string } {
  const absRoot = path.resolve(opts.publicRoot ?? PUBLIC_ROOT);
  if (!isSafePublicSubdir(opts.publish.dir, absRoot)) {
    throw new Error(`Unsafe publish directory outside public/: "${opts.publish.dir}"`);
  }
  const cleanExt = opts.ext.replace(/^\./, "");
  const dir = path.resolve(absRoot, opts.publish.dir);
  const safeStem = path.basename(opts.stem);
  return {
    dir,
    videoPath: path.join(dir, `${safeStem}.${cleanExt}`),
    posterPath: path.join(dir, `${safeStem}.webp`),
  };
}

export function findVideoBundle(
  slugOrId: string,
  outputRoot = DEFAULT_OUTPUT_ROOT,
): VideoBundlePaths | null {
  const root = path.resolve(outputRoot);
  if (!fs.existsSync(root)) return null;
  const queryLower = slugOrId.trim().toLowerCase();

  for (const categoryDir of Object.values(CATEGORY_DIR_MAP)) {
    const category = categoryFromDirName(categoryDir);
    if (!category) continue;
    const catRoot = path.join(root, categoryDir);
    if (!fs.existsSync(catRoot)) continue;

    for (const colEntry of fs.readdirSync(catRoot, { withFileTypes: true })) {
      if (!colEntry.isDirectory()) continue;
      const colRoot = path.join(catRoot, colEntry.name);
      for (const slugEntry of fs.readdirSync(colRoot, { withFileTypes: true })) {
        if (!slugEntry.isDirectory()) continue;
        const bundleDir = path.join(colRoot, slugEntry.name);
        const metaPath = path.join(bundleDir, "meta.json");
        if (!fs.existsSync(metaPath)) continue;

        const relMatch = `${colEntry.name}/${slugEntry.name}`.toLowerCase() === queryLower;
        const slugMatch = slugEntry.name.toLowerCase() === queryLower;
        let idMatch = false;
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as {
            id?: string;
            variants?: Array<{ compositionId?: string }>;
          };
          if (typeof meta.id === "string" && meta.id.toLowerCase() === queryLower) {
            idMatch = true;
          } else if (
            Array.isArray(meta.variants) &&
            meta.variants.some((v) => typeof v.compositionId === "string" && v.compositionId.toLowerCase() === queryLower)
          ) {
            idMatch = true;
          }
        } catch {
          // ignore malformed meta during lookup
        }

        if (relMatch || slugMatch || idMatch) {
          return resolveVideoBundlePaths({
            outputRoot: root,
            category,
            collection: colEntry.name,
            slug: slugEntry.name,
          });
        }
      }
    }
  }
  return null;
}
