import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { auditRenderedVideo, auditVideoDefinition } from "../core/audit.ts";
import {
  resolveCodecProfile,
  resolvePublishStem,
  type ResolvedVideoSpec,
} from "../core/contracts.ts";
import {
  DEFAULT_OUTPUT_ROOT,
  FRONTEND_ROOT,
  PUBLIC_ROOT,
  REMOTION_ROOT,
  resolvePublishPaths,
  resolveVideoBundlePaths,
} from "../core/paths.ts";
import { sampleInspectionFrames } from "../motion/index.ts";
import { rebuildCatalogIndex, type CatalogFileEntry } from "./catalog.ts";

let cachedServeUrl: string | null = null;
let cachedEntryPoint: string | null = null;

export function resolveBrowserExecutable(): string | null {
  const envExec = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (envExec && fs.existsSync(envExec)) return envExec;

  try {
    const req = createRequire(path.join(FRONTEND_ROOT, "package.json"));
    const pw = req("@playwright/test") as { chromium?: { executablePath?: () => string } };
    const pwExec = pw.chromium?.executablePath?.();
    if (pwExec && fs.existsSync(pwExec)) return pwExec;
  } catch {
    // fallback to system browser
  }

  for (const sysPath of ["/usr/bin/chromium", "/usr/bin/google-chrome", "/usr/bin/chromium-browser"]) {
    if (fs.existsSync(sysPath)) return sysPath;
  }

  return null;
}

export async function ensureRemotionBundle(opts?: {
  entryPoint?: string;
  forceRebuild?: boolean;
}): Promise<string> {
  const entryPoint = path.resolve(opts?.entryPoint ?? path.join(REMOTION_ROOT, "index.tsx"));
  if (!opts?.forceRebuild && cachedServeUrl && cachedEntryPoint === entryPoint) {
    return cachedServeUrl;
  }

  const serveUrl = await bundle({
    entryPoint,
    publicDir: null,
    webpackOverride: (currentConfig) => ({
      ...currentConfig,
      resolve: {
        ...currentConfig.resolve,
        extensionAlias: {
          ...currentConfig.resolve?.extensionAlias,
          ".js": [".ts", ".tsx", ".js"],
          ".jsx": [".tsx", ".jsx"],
        },
      },
    }),
  });

  cachedServeUrl = serveUrl;
  cachedEntryPoint = entryPoint;
  return serveUrl;
}

export function extractPosterWebp(
  videoPath: string,
  posterPath: string,
  atSec: number,
): void {
  fs.mkdirSync(path.dirname(posterPath), { recursive: true });
  const res = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-ss",
      String(Math.max(0, atSec)),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-lossless",
      "0",
      "-quality",
      "82",
      posterPath,
    ],
    { encoding: "utf8" },
  );
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`ffmpeg poster extraction failed: ${res.stderr || `exit ${res.status}`}`);
  }
}

export function buildContactSheet(
  stillPaths: readonly string[],
  outPath: string,
  opts?: { cols?: number; tileWidth?: number },
): void {
  if (stillPaths.length === 0) return;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const cols = Math.min(opts?.cols ?? 5, stillPaths.length);
  const rows = Math.ceil(stillPaths.length / cols);
  const tileWidth = opts?.tileWidth ?? 360;

  const args: string[] = ["-y", "-loglevel", "error"];
  for (const p of stillPaths) {
    args.push("-i", p);
  }
  const scales = stillPaths.map((_, i) => `[${i}:v]scale=${tileWidth}:-1[v${i}]`).join(";");
  const concatInputs = stillPaths.map((_, i) => `[v${i}]`).join("");
  const filter = `${scales};${concatInputs}concat=n=${stillPaths.length}:v=1:a=0,tile=${cols}x${rows}:padding=12:margin=12:color=0x080C12[out]`;

  args.push("-filter_complex", filter, "-map", "[out]", outPath);

  const res = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`ffmpeg contact-sheet failed: ${res.stderr || `exit ${res.status}`}`);
  }
}

type RenderTarget = {
  variantKey?: string;
  compositionId: string;
  stem: string;
  props: Record<string, unknown>;
};

export function selectRenderTargets(
  def: ResolvedVideoSpec,
  opts?: { variants?: readonly string[]; includeBase?: boolean },
): RenderTarget[] {
  const filterTokens = opts?.variants?.map((v) => v.trim().toLowerCase()).filter(Boolean) ?? [];

  if (def.variants.length > 0) {
    const matched =
      filterTokens.length > 0
        ? def.variants.filter(
            (v) =>
              filterTokens.includes(v.key.toLowerCase()) ||
              filterTokens.includes(v.compositionId.toLowerCase()),
          )
        : [...def.variants];

    if (filterTokens.length > 0 && matched.length === 0) {
      const avail = def.variants.map((v) => v.key).join(", ");
      throw new Error(`Unknown variant(s) for ${def.slug}: ${filterTokens.join(", ")}. Available: ${avail}`);
    }

    const targets: RenderTarget[] = matched.map((v) => ({
      variantKey: v.key,
      compositionId: v.compositionId,
      stem: v.publishName,
      props: v.props,
    }));

    if (opts?.includeBase && def.registerBaseComposition) {
      targets.push({
        compositionId: def.id,
        stem: resolvePublishStem(def),
        props: def.defaultProps,
      });
    }
    return targets;
  }

  return [
    {
      compositionId: def.id,
      stem: resolvePublishStem(def),
      props: def.defaultProps,
    },
  ];
}

export async function renderVideoStills(
  def: ResolvedVideoSpec,
  opts?: {
    outputRoot?: string;
    outDir?: string;
    variant?: string;
    frames?: readonly number[];
    contactSheet?: boolean;
    cols?: number;
    serveUrl?: string;
  },
): Promise<{ stillPaths: string[]; contactSheetPath?: string }> {
  const outputRoot = path.resolve(opts?.outputRoot ?? DEFAULT_OUTPUT_ROOT);
  const bundlePaths = resolveVideoBundlePaths({
    outputRoot,
    category: def.category,
    collection: def.collection,
    slug: def.slug,
  });
  const outDir = path.resolve(opts?.outDir ?? bundlePaths.previewsDir);
  fs.mkdirSync(outDir, { recursive: true });

  const targets = selectRenderTargets(def, {
    variants: opts?.variant ? [opts.variant] : undefined,
  });
  const target = targets[0]!;
  const frames =
    opts?.frames && opts.frames.length > 0
      ? opts.frames
      : sampleInspectionFrames(def.durationInFrames, def.inspectionPoints);

  const serveUrl = opts?.serveUrl ?? (await ensureRemotionBundle());
  const browserExecutable = resolveBrowserExecutable();

  const composition = await selectComposition({
    serveUrl,
    id: target.compositionId,
    inputProps: target.props,
    browserExecutable,
  });

  const stillPaths: string[] = [];
  for (const frame of frames) {
    const clamped = Math.max(0, Math.min(composition.durationInFrames - 1, Math.round(frame)));
    const filePrefix = target.variantKey ? `${target.variantKey}-` : "";
    const outPath = path.join(outDir, `${filePrefix}frame-${String(clamped).padStart(4, "0")}.png`);
    await renderStill({
      composition,
      serveUrl,
      frame: clamped,
      output: outPath,
      inputProps: target.props,
      browserExecutable,
      overwrite: true,
    });
    stillPaths.push(outPath);
  }

  let contactSheetPath: string | undefined;
  if (opts?.contactSheet ?? stillPaths.length > 1) {
    const sheetName = target.variantKey ? `contact-sheet-${target.variantKey}.png` : "contact-sheet.png";
    contactSheetPath = path.join(outDir, sheetName);
    buildContactSheet(stillPaths, contactSheetPath, { cols: opts?.cols ?? 5 });
    // Also create canonical previews/contact-sheet.png for studio UI convenience
    const canonical = path.join(outDir, "contact-sheet.png");
    if (contactSheetPath !== canonical) {
      fs.copyFileSync(contactSheetPath, canonical);
    }
  }

  return { stillPaths, contactSheetPath };
}

export async function renderVideoBundle(
  def: ResolvedVideoSpec,
  opts?: {
    outputRoot?: string;
    publicRoot?: string;
    variants?: readonly string[];
    includeBase?: boolean;
    crf?: number;
    contactSheet?: boolean;
    publish?: boolean;
    updateCatalog?: boolean;
    serveUrl?: string;
  },
): Promise<{
  bundleDir: string;
  metaPath: string;
  files: CatalogFileEntry[];
  publishedPaths: string[];
  contactSheetPath?: string;
}> {
  const defAudit = auditVideoDefinition(def);
  if (!defAudit.ok) {
    const msgs = defAudit.errors.map((e) => `- ${e.rule}: ${e.why}`).join("\n");
    throw new Error(`Definition audit failed for ${def.id}:\n${msgs}`);
  }

  const outputRoot = path.resolve(opts?.outputRoot ?? DEFAULT_OUTPUT_ROOT);
  const bundlePaths = resolveVideoBundlePaths({
    outputRoot,
    category: def.category,
    collection: def.collection,
    slug: def.slug,
  });
  fs.mkdirSync(bundlePaths.dir, { recursive: true });

  const codecSpec = resolveCodecProfile(def.codecProfile, opts?.crf ?? def.crf);
  const targets = selectRenderTargets(def, {
    variants: opts?.variants,
    includeBase: opts?.includeBase,
  });

  const serveUrl = opts?.serveUrl ?? (await ensureRemotionBundle());
  const browserExecutable = resolveBrowserExecutable();

  // Merge with existing files in meta.json if rendering a subset of variants
  let existingFiles: CatalogFileEntry[] = [];
  if (fs.existsSync(bundlePaths.metaPath)) {
    try {
      const oldMeta = JSON.parse(fs.readFileSync(bundlePaths.metaPath, "utf8")) as {
        files?: CatalogFileEntry[];
      };
      if (Array.isArray(oldMeta.files)) existingFiles = oldMeta.files;
    } catch {
      existingFiles = [];
    }
  }

  const renderedMap = new Map<string, CatalogFileEntry>();
  for (const ef of existingFiles) {
    const abs = path.join(outputRoot, ef.videoRelPath);
    if (fs.existsSync(abs)) renderedMap.set(ef.compositionId, ef);
  }

  const publishedPaths: string[] = [];

  for (const target of targets) {
    const videoPath = bundlePaths.videoPath(target.stem, codecSpec.ext);
    const posterPath = bundlePaths.posterPath(target.stem);

    const composition = await selectComposition({
      serveUrl,
      id: target.compositionId,
      inputProps: target.props,
      browserExecutable,
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: codecSpec.codec,
      pixelFormat: codecSpec.pixelFormat,
      crf: codecSpec.crf,
      imageFormat: codecSpec.imageFormat,
      outputLocation: videoPath,
      inputProps: target.props,
      overwrite: true,
      muted: def.silent,
      browserExecutable,
    });

    const posterTime = Math.max(0, Math.min(def.posterAtSec, Math.max(0, def.durationSec - 0.04)));
    extractPosterWebp(videoPath, posterPath, posterTime);

    const { report, metrics } = auditRenderedVideo(videoPath, def, { posterPath });
    if (!report.ok) {
      const msgs = report.errors.map((e) => `- ${e.rule}: ${e.why}`).join("\n");
      throw new Error(`Rendered video audit failed for ${target.compositionId}:\n${msgs}`);
    }

    const fileEntry: CatalogFileEntry = {
      stem: target.stem,
      variantKey: target.variantKey,
      compositionId: target.compositionId,
      videoRelPath: path.relative(outputRoot, videoPath).split(path.sep).join("/"),
      posterRelPath: path.relative(outputRoot, posterPath).split(path.sep).join("/"),
      byteLength: metrics?.byteLength ?? fs.statSync(videoPath).size,
      codec: metrics?.codec,
      pixFmt: metrics?.pixFmt,
      width: metrics?.width,
      height: metrics?.height,
      fps: metrics?.fps,
      durationSec: metrics?.durationSec,
      auditOk: report.ok,
      errors: report.errors.length,
      warnings: report.warnings.length,
    };
    renderedMap.set(target.compositionId, fileEntry);

    if (opts?.publish && def.publish) {
      const pub = resolvePublishPaths({
        publicRoot: opts.publicRoot ?? PUBLIC_ROOT,
        publish: def.publish,
        stem: target.stem,
        ext: codecSpec.ext,
      });
      fs.mkdirSync(pub.dir, { recursive: true });
      fs.copyFileSync(videoPath, pub.videoPath);
      publishedPaths.push(pub.videoPath);
      if (def.publish.includePoster !== false) {
        fs.copyFileSync(posterPath, pub.posterPath);
        publishedPaths.push(pub.posterPath);
      }
    }
  }

  let contactSheetPath: string | undefined;
  if (opts?.contactSheet && targets.length > 0) {
    const stillRes = await renderVideoStills(def, {
      outputRoot,
      outDir: bundlePaths.previewsDir,
      variant: targets[0]!.variantKey,
      contactSheet: true,
      serveUrl,
    });
    contactSheetPath = stillRes.contactSheetPath;
  }

  const allFiles = [...renderedMap.values()];
  const metaPayload = {
    id: def.id,
    category: def.category,
    collection: def.collection,
    slug: def.slug,
    title: def.title,
    description: def.description,
    format: def.format,
    width: def.width,
    height: def.height,
    fps: def.fps,
    durationInFrames: def.durationInFrames,
    durationSec: def.durationSec,
    codecProfile: def.codecProfile,
    crf: codecSpec.crf,
    loop: def.loop,
    silent: def.silent,
    tags: def.tags,
    publishDir: def.publish?.dir,
    auditOk: allFiles.every((f) => f.auditOk),
    files: allFiles,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(bundlePaths.metaPath, JSON.stringify(metaPayload, null, 2) + "\n", "utf8");

  if (opts?.updateCatalog ?? true) {
    rebuildCatalogIndex(outputRoot);
  }

  return {
    bundleDir: bundlePaths.dir,
    metaPath: bundlePaths.metaPath,
    files: allFiles,
    publishedPaths,
    contactSheetPath,
  };
}

export function publishVideoBundle(
  def: ResolvedVideoSpec,
  opts?: {
    outputRoot?: string;
    publicRoot?: string;
    variants?: readonly string[];
  },
): string[] {
  if (!def.publish) {
    throw new Error(`Video "${def.slug}" has no publish configuration in meta.ts`);
  }
  const outputRoot = path.resolve(opts?.outputRoot ?? DEFAULT_OUTPUT_ROOT);
  const publicRoot = path.resolve(opts?.publicRoot ?? PUBLIC_ROOT);
  const bundlePaths = resolveVideoBundlePaths({
    outputRoot,
    category: def.category,
    collection: def.collection,
    slug: def.slug,
  });
  const codecSpec = resolveCodecProfile(def.codecProfile, def.crf);
  const targets = selectRenderTargets(def, { variants: opts?.variants });
  const published: string[] = [];

  for (const target of targets) {
    const videoPath = bundlePaths.videoPath(target.stem, codecSpec.ext);
    const posterPath = bundlePaths.posterPath(target.stem);
    const { report } = auditRenderedVideo(videoPath, def, {
      posterPath: def.publish.includePoster !== false ? posterPath : undefined,
    });
    if (!report.ok) {
      const msgs = report.errors.map((e) => `- ${e.rule}: ${e.why}`).join("\n");
      throw new Error(`Cannot publish unverified asset ${target.compositionId}:\n${msgs}`);
    }
    const pub = resolvePublishPaths({
      publicRoot,
      publish: def.publish,
      stem: target.stem,
      ext: codecSpec.ext,
    });
    fs.mkdirSync(pub.dir, { recursive: true });
    fs.copyFileSync(videoPath, pub.videoPath);
    published.push(pub.videoPath);
    if (def.publish.includePoster !== false && fs.existsSync(posterPath)) {
      fs.copyFileSync(posterPath, pub.posterPath);
      published.push(pub.posterPath);
    }
  }

  return published;
}
