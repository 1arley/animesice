import { spawnSync } from "node:child_process";
import path from "node:path";
import { auditRenderedVideo, auditVideoDefinition } from "./core/audit.ts";
import type { VideoCategory, VideoFormatPreset } from "./core/contracts.ts";
import {
  DEFAULT_EXAMPLES_ROOT,
  DEFAULT_OUTPUT_ROOT,
  DEFAULT_VIDEOS_ROOT,
  REMOTION_ROOT,
  findVideoBundle,
} from "./core/paths.ts";
import { rebuildCatalogIndex, scanVideoBundles } from "./export/catalog.ts";
import {
  findDuplicateCompositionIds,
  loadVideoDefinitions,
  scaffoldVideoBundle,
  syncRegistryFile,
  type LoadedVideoDefinition,
} from "./export/define.ts";
import {
  ensureRemotionBundle,
  publishVideoBundle,
  renderVideoBundle,
  renderVideoStills,
} from "./export/pipeline.ts";
import { startPreviewServer } from "./preview/server.ts";

function parseArgs(argv: string[]) {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positionals.push(a);
    }
  }
  return { positionals, flags };
}

function parseCategory(raw?: string): VideoCategory | undefined {
  if (!raw) return undefined;
  const up = raw.toUpperCase();
  if (up === "GACHA" || up === "UI" || up === "PROMO" || up === "SHOWCASE") {
    return up;
  }
  throw new Error(`Invalid --category "${raw}". Expected GACHA, UI, PROMO, or SHOWCASE.`);
}

function parseFormat(raw?: string): VideoFormatPreset | undefined {
  if (!raw) return undefined;
  const up = raw.toUpperCase();
  if (
    up === "GACHA_SQUARE" ||
    up === "CARD_PORTRAIT" ||
    up === "PROMO_16_9" ||
    up === "PROMO_720P" ||
    up === "VERTICAL_9_16" ||
    up === "SOCIAL_1_1" ||
    up === "BANNER_WIDE"
  ) {
    return up;
  }
  throw new Error(`Invalid --format "${raw}".`);
}

function printHelp() {
  console.log(`AnimesIce Video Studio CLI (remotion/)

Commands:
  new --slug <name> [--category GACHA|UI|PROMO|SHOWCASE] [--collection <name>] [--format ...] [--duration-sec N | --frames N] [--fps 30] [--id CustomId]
                                                Scaffold meta.ts + composition.tsx in remotion/videos/<category>/<collection>/<slug>/
  sync                                          Rebuild src/registry.generated.ts from videos/ and examples/
  list [--category ...] [--collection ...] [--include-examples]
                                                List registered compositions, variants, formats, and publish targets
  render [--slug <slug|id>] [--category ...] [--collection ...] [--variant <v1,v2>] [--include-examples] [--contact-sheet] [--publish] [--crf N] [--root <dir>]
                                                Render video + poster (.webp) into output/ (+ optional contact-sheet & publish)
  still --slug <slug|id> [--variant <v>] [--frames 0,30,60 | --at 0.3] [--out <dir>]
                                                Render still PNG frame(s) into bundle previews/
  contact-sheet --slug <slug|id> [--variant <v>] [--cols 5]
                                                Render inspection frames and compose previews/contact-sheet.png
  publish [--slug <slug|id>] [--variant <v1,v2>] [--all]
                                                Copy audited video/poster outputs to animesice/public/
  catalog [--root <dir>]                        Rebuild output/catalog.json & check for duplicate composition IDs
  audit [--slug <slug|id>] [--root <dir>]       Audit definitions statically + rendered outputs via ffprobe
  studio [--port 3000]                          Sync registry and start Remotion Studio visual editor
  preview [--dir output] [--port 4174]          Start local AnimesIce Video Studio inspection dashboard
`);
}

async function loadFiltered(flags: Record<string, string | boolean>): Promise<LoadedVideoDefinition[]> {
  const roots: Array<{ dir: string; source: "videos" | "examples" }> = [
    { dir: DEFAULT_VIDEOS_ROOT, source: "videos" },
  ];
  if (Boolean(flags["include-examples"]) || typeof flags.slug === "string") {
    roots.push({ dir: DEFAULT_EXAMPLES_ROOT, source: "examples" });
  }
  const all = await loadVideoDefinitions(roots);
  const category = parseCategory(typeof flags.category === "string" ? flags.category : undefined);
  const collection = typeof flags.collection === "string" ? flags.collection.toLowerCase() : undefined;
  const slug = typeof flags.slug === "string" ? flags.slug.toLowerCase() : undefined;

  return all.filter((item) => {
    const d = item.definition;
    if (category && d.category !== category) return false;
    if (collection && d.collection !== collection) return false;
    if (slug && d.slug !== slug && d.id.toLowerCase() !== slug) return false;
    return true;
  });
}

async function cmdNew(flags: Record<string, string | boolean>) {
  const slug = typeof flags.slug === "string" ? flags.slug : undefined;
  if (!slug) throw new Error("new requires --slug <slug-name>");
  const category = parseCategory(typeof flags.category === "string" ? flags.category : "GACHA") ?? "GACHA";
  const res = scaffoldVideoBundle({
    category,
    collection: typeof flags.collection === "string" ? flags.collection : "default",
    slug,
    id: typeof flags.id === "string" ? flags.id : undefined,
    title: typeof flags.title === "string" ? flags.title : undefined,
    description: typeof flags.description === "string" ? flags.description : undefined,
    format: parseFormat(typeof flags.format === "string" ? flags.format : undefined),
    fps: typeof flags.fps === "string" ? Number(flags.fps) : undefined,
    durationSec: typeof flags["duration-sec"] === "string" ? Number(flags["duration-sec"]) : undefined,
    durationInFrames: typeof flags.frames === "string" ? Number(flags.frames) : undefined,
  });
  console.log(`Created video bundle: ${res.dir}`);
  console.log(`  id: ${res.id} | collection: ${res.collection} | slug: ${res.slug}`);
  console.log(`Next: edit composition.tsx, then run "npm run video:render -- --slug ${res.slug} --contact-sheet"`);
}

async function cmdList(flags: Record<string, string | boolean>) {
  const defs = await loadFiltered(flags);
  if (defs.length === 0) {
    console.log("No matching video definitions found.");
    return;
  }
  for (const item of defs) {
    const d = item.definition;
    const varStr = d.variants.length > 0 ? ` · variants=${d.variants.map((v) => v.key).join(",")}` : "";
    const pubStr = d.publish ? ` -> public/${d.publish.dir}/` : "";
    console.log(
      `[${item.source}] ${d.category}/${d.collection}/${d.slug} (${d.id}) · ${d.width}x${d.height}@${d.fps} · ${d.durationInFrames}f (${d.durationSec}s)${varStr}${pubStr}`,
    );
  }
}

async function cmdRender(flags: Record<string, string | boolean>, outputRoot: string) {
  syncRegistryFile();
  const defs = await loadFiltered(flags);
  if (defs.length === 0) {
    throw new Error("No matching video definitions found to render.");
  }

  const variantList =
    typeof flags.variant === "string"
      ? flags.variant.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

  const serveUrl = await ensureRemotionBundle();
  for (const item of defs) {
    const d = item.definition;
    console.log(`\n=== Rendering ${d.category}/${d.collection}/${d.slug} (${d.id}) ===`);
    const res = await renderVideoBundle(d, {
      outputRoot,
      variants: variantList,
      includeBase: Boolean(flags["include-base"]),
      crf: typeof flags.crf === "string" ? Number(flags.crf) : undefined,
      contactSheet: Boolean(flags["contact-sheet"]),
      publish: Boolean(flags.publish),
      updateCatalog: false,
      serveUrl,
    });
    for (const f of res.files) {
      console.log(`  [OK] ${f.compositionId} -> ${f.videoRelPath} (${(f.byteLength / 1024).toFixed(1)} KB)`);
    }
    if (res.contactSheetPath) {
      console.log(`  [OK] contact sheet -> ${res.contactSheetPath}`);
    }
    if (res.publishedPaths.length > 0) {
      console.log(`  [PUBLISHED] ${res.publishedPaths.length} file(s) copied to public/`);
    }
  }

  const catalog = rebuildCatalogIndex(outputRoot);
  console.log(`\nCatalog updated: ${catalog.total} bundle(s), ${catalog.totalFiles} video(s) -> ${path.join(outputRoot, "catalog.json")}`);
  if (catalog.duplicateIds.length > 0) {
    throw new Error(`Duplicate composition IDs detected: ${JSON.stringify(catalog.duplicateIds)}`);
  }
}

async function cmdStill(flags: Record<string, string | boolean>, outputRoot: string, forceSheet = false) {
  const slug = typeof flags.slug === "string" ? flags.slug : undefined;
  if (!slug) throw new Error(`${forceSheet ? "contact-sheet" : "still"} requires --slug <slug|id>`);
  syncRegistryFile();
  const defs = await loadFiltered({ ...flags, "include-examples": true });
  const target = defs[0];
  if (!target) throw new Error(`Video definition not found for "${slug}"`);

  let frames: number[] | undefined;
  if (typeof flags.frames === "string") {
    frames = flags.frames.split(",").map((n) => Number(n.trim())).filter(Number.isFinite);
  } else if (typeof flags.at === "string") {
    frames = [Math.round(Number(flags.at) * target.definition.fps)];
  }

  const res = await renderVideoStills(target.definition, {
    outputRoot,
    outDir: typeof flags.out === "string" ? flags.out : undefined,
    variant: typeof flags.variant === "string" ? flags.variant : undefined,
    frames,
    contactSheet: forceSheet || Boolean(flags["contact-sheet"]),
    cols: typeof flags.cols === "string" ? Number(flags.cols) : undefined,
  });
  console.log("Rendered stills:", res.stillPaths);
  if (res.contactSheetPath) console.log("Contact sheet:", res.contactSheetPath);
}

async function cmdPublish(flags: Record<string, string | boolean>, outputRoot: string) {
  const defs = await loadFiltered(flags);
  if (defs.length === 0) throw new Error("No matching video definitions found to publish.");
  const variantList =
    typeof flags.variant === "string"
      ? flags.variant.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

  let publishedTotal = 0;
  for (const item of defs) {
    if (!item.definition.publish) continue;
    const out = publishVideoBundle(item.definition, {
      outputRoot,
      variants: variantList,
    });
    publishedTotal += out.length;
    console.log(`Published ${item.definition.slug}: ${out.length} file(s)`);
  }
  if (publishedTotal === 0) {
    throw new Error("No video definitions with publish metadata matched.");
  }
}

function cmdCatalog(outputRoot: string) {
  const catalog = rebuildCatalogIndex(outputRoot);
  console.log(`Catalog (${catalog.total} bundles, ${catalog.totalFiles} files) -> ${path.join(outputRoot, "catalog.json")}`);
  console.log("  By category:", catalog.byCategory);
  console.log("  By collection:", catalog.byCollection);
  for (const e of catalog.entries) {
    const tag = !e.audit.ok ? "ERR " : e.audit.warnings > 0 ? "WARN" : "OK  ";
    console.log(`  [${tag}] ${e.relDir} (${e.id}) · ${e.files.length} file(s) · ${(e.totalBytes / 1024).toFixed(1)} KB`);
  }
  if (catalog.duplicateIds.length > 0) {
    console.error("Duplicate composition IDs:", catalog.duplicateIds);
    process.exitCode = 1;
  }
  if (catalog.entries.some((e) => !e.audit.ok)) {
    process.exitCode = 1;
  }
}

async function cmdAudit(flags: Record<string, string | boolean>, outputRoot: string) {
  const slugFlag = typeof flags.slug === "string" ? flags.slug : undefined;
  const defs = await loadVideoDefinitions([
    { dir: DEFAULT_VIDEOS_ROOT, source: "videos" },
    { dir: DEFAULT_EXAMPLES_ROOT, source: "examples" },
  ]);

  let hasError = false;
  const duplicateDefs = findDuplicateCompositionIds(defs);
  if (duplicateDefs.length > 0) {
    console.error("Duplicate composition IDs in definitions:", duplicateDefs);
    hasError = true;
  }

  const targetDefs = slugFlag
    ? defs.filter(
        (d) =>
          d.definition.slug.toLowerCase() === slugFlag.toLowerCase() ||
          d.definition.id.toLowerCase() === slugFlag.toLowerCase(),
      )
    : defs;

  for (const item of targetDefs) {
    const d = item.definition;
    const defReport = auditVideoDefinition(d);
    const tag = defReport.ok ? (defReport.warnings.length ? "WARN" : "OK  ") : "ERR ";
    console.log(`[${tag}] def ${d.category}/${d.collection}/${d.slug} (${d.id})`);
    for (const issue of defReport.items.filter((i) => i.level !== "ok")) {
      console.log(`    [${issue.level.toUpperCase()}] ${issue.rule}${issue.got ? ` (${issue.got})` : ""} — ${issue.why}`);
    }
    if (!defReport.ok) hasError = true;

    const bundle = findVideoBundle(d.slug, outputRoot);
    if (bundle) {
      const files = scanVideoBundles(outputRoot).find((e) => e.relDir === bundle.relDir)?.files ?? [];
      for (const f of files) {
        const videoPath = path.join(outputRoot, f.videoRelPath);
        const posterPath = f.posterRelPath ? path.join(outputRoot, f.posterRelPath) : undefined;
        const { report } = auditRenderedVideo(videoPath, d, { posterPath });
        const fTag = report.ok ? (report.warnings.length ? "WARN" : "OK  ") : "ERR ";
        console.log(`  [${fTag}] media ${f.compositionId} (${(f.byteLength / 1024).toFixed(1)} KB)`);
        for (const issue of report.items.filter((i) => i.level !== "ok")) {
          console.log(`      [${issue.level.toUpperCase()}] ${issue.rule}${issue.got ? ` (${issue.got})` : ""} — ${issue.why}`);
        }
        if (!report.ok) hasError = true;
      }
    }
  }

  if (hasError) process.exitCode = 1;
}

function cmdStudio(flags: Record<string, string | boolean>) {
  syncRegistryFile();
  const bin = path.join(REMOTION_ROOT, "node_modules/.bin/remotion");
  const args = ["studio", "index.tsx"];
  if (typeof flags.port === "string") args.push("--port", flags.port);
  const res = spawnSync(bin, args, { cwd: REMOTION_ROOT, stdio: "inherit" });
  if (res.error) throw res.error;
  if (res.status !== 0) process.exit(res.status ?? 1);
}

async function main() {
  const [sub, ...rest] = process.argv.slice(2);
  const { flags } = parseArgs(rest);
  const outputRoot = typeof flags.root === "string" ? path.resolve(flags.root) : DEFAULT_OUTPUT_ROOT;

  if (!sub || sub === "help" || sub === "--help" || sub === "-h") {
    printHelp();
    return;
  }

  if (sub === "new") {
    await cmdNew(flags);
    return;
  }
  if (sub === "sync") {
    const res = syncRegistryFile();
    console.log(`Synced ${res.count} video bundle(s) -> ${res.registryPath}`);
    return;
  }
  if (sub === "list") {
    await cmdList(flags);
    return;
  }
  if (sub === "render") {
    await cmdRender(flags, outputRoot);
    return;
  }
  if (sub === "still") {
    await cmdStill(flags, outputRoot, false);
    return;
  }
  if (sub === "contact-sheet") {
    await cmdStill(flags, outputRoot, true);
    return;
  }
  if (sub === "publish") {
    await cmdPublish(flags, outputRoot);
    return;
  }
  if (sub === "catalog") {
    cmdCatalog(outputRoot);
    return;
  }
  if (sub === "audit") {
    await cmdAudit(flags, outputRoot);
    return;
  }
  if (sub === "studio") {
    cmdStudio(flags);
    return;
  }
  if (sub === "preview") {
    const port = typeof flags.port === "string" ? Number(flags.port) : 4174;
    const dir = typeof flags.dir === "string" ? flags.dir : outputRoot;
    startPreviewServer({ dir, port });
    console.log(`AnimesIce Video Studio running at http://127.0.0.1:${port}`);
    return;
  }

  throw new Error(`Unknown command "${sub}". Run "node src/cli.ts help".`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
