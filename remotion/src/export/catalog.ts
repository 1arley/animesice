import fs from "node:fs";
import path from "node:path";
import type { VideoCategory, VideoFormatPreset } from "../core/contracts.ts";
import {
  CATEGORY_DIR_MAP,
  DEFAULT_OUTPUT_ROOT,
  categoryFromDirName,
} from "../core/paths.ts";

export type CatalogFileEntry = {
  stem: string;
  variantKey?: string;
  compositionId: string;
  videoRelPath: string;
  posterRelPath?: string;
  byteLength: number;
  codec?: string;
  pixFmt?: string;
  width?: number;
  height?: number;
  fps?: number;
  durationSec?: number;
  auditOk: boolean;
  errors: number;
  warnings: number;
};

export type CatalogEntry = {
  id: string;
  category: VideoCategory;
  collection: string;
  slug: string;
  title: string;
  description: string;
  format: VideoFormatPreset;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  durationSec: number;
  codecProfile: string;
  tags: string[];
  relDir: string;
  metaRelPath: string;
  files: CatalogFileEntry[];
  previewRelPaths: string[];
  totalBytes: number;
  audit: {
    ok: boolean;
    errors: number;
    warnings: number;
  };
  publishDir?: string;
  generatedAt?: string;
};

export type DuplicateIdCollision = {
  id: string;
  locations: string[];
};

export type CatalogIndex = {
  version: 1;
  generatedAt: string;
  outputRoot: string;
  total: number;
  totalFiles: number;
  byCategory: Record<VideoCategory, number>;
  byCollection: Record<string, number>;
  duplicateIds: DuplicateIdCollision[];
  entries: CatalogEntry[];
};

function listRelFiles(dir: string, outputRoot: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => path.relative(outputRoot, path.join(dir, d.name)).split(path.sep).join("/"))
    .sort();
}

export function scanVideoBundles(outputRoot = DEFAULT_OUTPUT_ROOT): CatalogEntry[] {
  const root = path.resolve(outputRoot);
  const entries: CatalogEntry[] = [];
  if (!fs.existsSync(root)) return entries;

  for (const categoryDir of Object.values(CATEGORY_DIR_MAP)) {
    const category = categoryFromDirName(categoryDir);
    if (!category) continue;
    const catRoot = path.join(root, categoryDir);
    if (!fs.existsSync(catRoot)) continue;

    for (const colEntry of fs.readdirSync(catRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!colEntry.isDirectory()) continue;
      const colRoot = path.join(catRoot, colEntry.name);
      for (const slugEntry of fs.readdirSync(colRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (!slugEntry.isDirectory()) continue;
        const bundleDir = path.join(colRoot, slugEntry.name);
        const metaPath = path.join(bundleDir, "meta.json");
        if (!fs.existsSync(metaPath)) continue;

        let meta: Record<string, unknown> = {};
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as Record<string, unknown>;
        } catch {
          meta = {};
        }

        const relDir = path.posix.join(categoryDir, colEntry.name, slugEntry.name);
        const filesRaw = Array.isArray(meta.files) ? (meta.files as Array<Record<string, unknown>>) : [];
        const files: CatalogFileEntry[] = filesRaw.map((f) => {
          const videoRelPath = typeof f.videoRelPath === "string" ? f.videoRelPath : "";
          const absVideo = videoRelPath ? path.join(root, videoRelPath) : "";
          const byteLength =
            typeof f.byteLength === "number"
              ? f.byteLength
              : absVideo && fs.existsSync(absVideo)
                ? fs.statSync(absVideo).size
                : 0;
          return {
            stem: typeof f.stem === "string" ? f.stem : slugEntry.name,
            variantKey: typeof f.variantKey === "string" ? f.variantKey : undefined,
            compositionId: typeof f.compositionId === "string" ? f.compositionId : String(meta.id ?? slugEntry.name),
            videoRelPath,
            posterRelPath: typeof f.posterRelPath === "string" ? f.posterRelPath : undefined,
            byteLength,
            codec: typeof f.codec === "string" ? f.codec : undefined,
            pixFmt: typeof f.pixFmt === "string" ? f.pixFmt : undefined,
            width: typeof f.width === "number" ? f.width : undefined,
            height: typeof f.height === "number" ? f.height : undefined,
            fps: typeof f.fps === "number" ? f.fps : undefined,
            durationSec: typeof f.durationSec === "number" ? f.durationSec : undefined,
            auditOk: Boolean(f.auditOk ?? true),
            errors: typeof f.errors === "number" ? f.errors : 0,
            warnings: typeof f.warnings === "number" ? f.warnings : 0,
          };
        });

        const totalBytes = files.reduce((acc, f) => acc + f.byteLength, 0);
        const errors = files.reduce((acc, f) => acc + f.errors, 0);
        const warnings = files.reduce((acc, f) => acc + f.warnings, 0);

        entries.push({
          id: typeof meta.id === "string" ? meta.id : slugEntry.name,
          category,
          collection: colEntry.name,
          slug: slugEntry.name,
          title: typeof meta.title === "string" ? meta.title : slugEntry.name,
          description: typeof meta.description === "string" ? meta.description : "",
          format: (typeof meta.format === "string" ? meta.format : "GACHA_SQUARE") as VideoFormatPreset,
          width: typeof meta.width === "number" ? meta.width : 720,
          height: typeof meta.height === "number" ? meta.height : 720,
          fps: typeof meta.fps === "number" ? meta.fps : 30,
          durationInFrames: typeof meta.durationInFrames === "number" ? meta.durationInFrames : 120,
          durationSec: typeof meta.durationSec === "number" ? meta.durationSec : 4,
          codecProfile: typeof meta.codecProfile === "string" ? meta.codecProfile : "web-h264",
          tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
          relDir,
          metaRelPath: `${relDir}/meta.json`,
          files,
          previewRelPaths: listRelFiles(path.join(bundleDir, "previews"), root),
          totalBytes,
          audit: {
            ok: errors === 0 && (typeof meta.auditOk === "boolean" ? meta.auditOk : true),
            errors,
            warnings,
          },
          publishDir: typeof meta.publishDir === "string" ? meta.publishDir : undefined,
          generatedAt: typeof meta.generatedAt === "string" ? meta.generatedAt : undefined,
        });
      }
    }
  }

  return entries;
}

export function rebuildCatalogIndex(outputRoot = DEFAULT_OUTPUT_ROOT): CatalogIndex {
  const root = path.resolve(outputRoot);
  fs.mkdirSync(root, { recursive: true });
  const entries = scanVideoBundles(root);

  const byCategory: Record<VideoCategory, number> = {
    GACHA: 0,
    UI: 0,
    PROMO: 0,
    SHOWCASE: 0,
  };
  const byCollection: Record<string, number> = {};
  const byCompId = new Map<string, string[]>();
  let totalFiles = 0;

  for (const e of entries) {
    byCategory[e.category]++;
    byCollection[e.collection] = (byCollection[e.collection] ?? 0) + 1;
    totalFiles += e.files.length;

    const seenInBundle = new Set<string>();
    for (const f of e.files) {
      if (seenInBundle.has(f.compositionId)) continue;
      seenInBundle.add(f.compositionId);
      const list = byCompId.get(f.compositionId) ?? [];
      list.push(e.relDir);
      byCompId.set(f.compositionId, list);
    }
    if (e.files.length === 0) {
      const list = byCompId.get(e.id) ?? [];
      list.push(e.relDir);
      byCompId.set(e.id, list);
    }
  }

  const duplicateIds: DuplicateIdCollision[] = [];
  for (const [id, locations] of byCompId.entries()) {
    if (locations.length > 1) duplicateIds.push({ id, locations });
  }

  const index: CatalogIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    outputRoot: root,
    total: entries.length,
    totalFiles,
    byCategory,
    byCollection,
    duplicateIds,
    entries,
  };

  fs.writeFileSync(path.join(root, "catalog.json"), JSON.stringify(index, null, 2) + "\n", "utf8");
  return index;
}
