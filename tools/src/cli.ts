import fs from "node:fs";
import path from "node:path";
import { auditCosmeticSvg } from "./core/audit.ts";
import { cosmeticTypeOf, parseViewBox, type AssetType } from "./core/contracts.ts";
import { rebuildCatalogIndex, scanCosmeticBundles } from "./export/catalog.ts";
import {
  loadCosmeticDefinitions,
  runCosmeticDefinition,
  scaffoldCosmeticFile,
} from "./export/define.ts";
import {
  DEFAULT_COSMETICS_ROOT,
  DEFAULT_OUTPUT_ROOT,
  findCosmeticBundle,
  resolveShaderOutputPath,
} from "./export/paths.ts";
import { renderSvgInspection } from "./preview/render.ts";
import { startPreviewServer } from "./preview/server.ts";
import { SHADER_PRESETS, type ShaderPresetName } from "./shaders/presets.ts";
import { renderShaderToPng } from "./shaders/runner.ts";

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

function parseAssetType(raw?: string): AssetType | undefined {
  if (!raw) return undefined;
  const up = raw.toUpperCase();
  if (up === "BACK" || up === "FRAME" || up === "HIGHLIGHT" || up === "SKIN" || up === "BANNER") {
    return up;
  }
  throw new Error(`Invalid --type "${raw}". Expected BACK, FRAME, HIGHLIGHT, SKIN, or BANNER.`);
}

function inferAssetType(filePath: string, svg: string, explicit?: string): AssetType {
  const parsed = parseAssetType(explicit);
  if (parsed) return parsed;
  const byKey = cosmeticTypeOf(path.basename(filePath).toUpperCase());
  if (byKey) return byKey;
  const vb = parseViewBox(svg);
  if (vb.x === -60 && vb.y === -60) return "HIGHLIGHT";
  if (vb.x === -30 && vb.y === -30) return "FRAME";
  if (vb.w === 1600 && vb.h === 500) return "BANNER";
  return "BACK";
}

function printHelp() {
  console.log(`AnimesIce Art Toolkit CLI

Commands:
  new --slug <name> [--type BACK|FRAME|HIGHLIGHT|SKIN|BANNER] [--collection <name>] [--name "..."] [--rarity COMMON|RARE|EPIC|LEGENDARY] [--price N]
                                                Scaffold a cosmetic module in tools/cosmetics/<type>/<collection>/<slug>.ts
  build [--type ...] [--collection ...] [--slug ...] [--key ...] [--include-examples] [--render]
                                                Build production cosmetics (+ optional examples) into structured output/
  build-examples [--render]                     Build all showcase examples into output/<type>/<collection>/<slug>/
  catalog                                       Rebuild output/catalog.json & check for duplicate keys
  audit [<file.svg> | --slug <slug|key>]        Audit one SVG, one bundle, or the entire output/ catalog
  render [<file.svg> | --slug <slug|key> | --all] [--type ...] [--out dir] [--context] [--frames N] [--duration sec] [--reduced-motion] [--video] [--engine chromium|rsvg]
                                                Render PNGs & inspection boards (auto co-located in bundle previews/)
  shader <preset> [--out file.png] [--width N] [--height N] [--time sec] [--seed N]
                                                Presets: ${Object.keys(SHADER_PRESETS).join(", ")}
  preview [--dir tools/output] [--port 4173]    Start local Art Studio catalog & preview web UI
`);
}

async function runLoadedModules(
  dirs: readonly string[],
  filters: {
    type?: AssetType;
    collection?: string;
    slug?: string;
    key?: string;
    outputRoot: string;
    render: boolean;
  },
) {
  const loaded = await loadCosmeticDefinitions(dirs);
  let builtCount = 0;

  for (const mod of loaded) {
    if (mod.definition) {
      const d = mod.definition;
      if (filters.type && d.type !== filters.type) continue;
      if (filters.collection && d.collection !== filters.collection.toLowerCase()) continue;
      if (filters.slug && d.slug !== filters.slug.toLowerCase()) continue;
      if (filters.key && d.key?.toLowerCase() !== filters.key.toLowerCase()) continue;

      console.log(`\n=== Building ${d.type} [${d.collection}/${d.slug}] (${d.key}) ===`);
      const res = await runCosmeticDefinition(d, {
        outputRoot: filters.outputRoot,
        updateCatalog: false,
      });
      builtCount++;

      if (filters.render) {
        const rendered = await renderSvgInspection({
          svgPathOrContent: res.svgPath,
          type: d.type,
          outDir: res.previewsDir,
          name: "cosmetic",
          filenameMode: "bundle",
          context: true,
          frames: d.renderHints?.frames ?? 1,
          durationSec: d.renderHints?.durationSec ?? 5,
          reducedMotion: d.renderHints?.reducedMotion ?? false,
          cardArtPath: d.renderHints?.cardArtPath,
        });
        console.log("Rendered previews:", rendered);
      }
    } else if (mod.buildFn && !filters.type && !filters.collection && !filters.slug && !filters.key) {
      console.log(`\n=== Building ${path.basename(mod.filePath)} ===`);
      await mod.buildFn(filters.outputRoot);
      builtCount++;
    }
  }

  const catalog = rebuildCatalogIndex(filters.outputRoot);
  console.log(`\nCatalog updated: ${catalog.total} cosmetics indexed (${builtCount} built this run) -> ${path.join(filters.outputRoot, "catalog.json")}`);
  if (catalog.duplicateKeys.length > 0) {
    const dups = catalog.duplicateKeys.map((d) => `${d.key}: [${d.slugs.join(", ")}]`).join("; ");
    throw new Error(`Duplicate cosmetic keys detected: ${dups}`);
  }
}

async function cmdNew(flags: Record<string, string | boolean>) {
  const slug = typeof flags.slug === "string" ? flags.slug : undefined;
  if (!slug) throw new Error("new requires --slug <slug-name>");
  const type = parseAssetType(typeof flags.type === "string" ? flags.type : "BACK") ?? "BACK";
  const res = scaffoldCosmeticFile({
    cosmeticsRoot: typeof flags.dir === "string" ? flags.dir : DEFAULT_COSMETICS_ROOT,
    type,
    collection: typeof flags.collection === "string" ? flags.collection : "default",
    slug,
    key: typeof flags.key === "string" ? flags.key : undefined,
    name: typeof flags.name === "string" ? flags.name : undefined,
    description: typeof flags.description === "string" ? flags.description : undefined,
    rarity: typeof flags.rarity === "string" ? (flags.rarity.toUpperCase() as "COMMON" | "RARE" | "EPIC" | "LEGENDARY") : undefined,
    price: typeof flags.price === "string" ? Number(flags.price) : undefined,
  });
  console.log(`Created cosmetic template: ${res.filePath}`);
  console.log(`  key: ${res.key} | collection: ${res.collection} | slug: ${res.slug}`);
  console.log(`Next: edit the build() function, then run "npm run build -- --slug ${res.slug} --render"`);
}

function cmdCatalog(outputRoot: string) {
  const catalog = rebuildCatalogIndex(outputRoot);
  console.log(`Catalog (${catalog.total} cosmetics, ${catalog.shaders.length} shaders) -> ${path.join(outputRoot, "catalog.json")}`);
  console.log("  By type:", catalog.byType);
  console.log("  By collection:", catalog.byCollection);
  for (const e of catalog.entries) {
    const status = !e.audit.ok ? "ERR " : e.audit.warnings > 0 ? "WARN" : "OK  ";
    console.log(`  [${status}] ${e.relDir} (${e.key}) · ${(e.byteLength / 1024).toFixed(1)} KB · previews=${e.previewRelPaths.length}`);
  }
  if (catalog.duplicateKeys.length > 0) {
    console.error("\nDuplicate keys detected:");
    for (const d of catalog.duplicateKeys) {
      console.error(`  ${d.key}: ${d.slugs.join(", ")}`);
    }
    process.exitCode = 1;
  }
  if (catalog.entries.some((e) => !e.audit.ok)) {
    process.exitCode = 1;
  }
}

function cmdAudit(positionals: string[], flags: Record<string, string | boolean>, outputRoot: string) {
  const slugFlag = typeof flags.slug === "string" ? flags.slug : undefined;
  const fileArg = positionals[0];

  if (!fileArg && !slugFlag) {
    const { entries } = scanCosmeticBundles(outputRoot);
    const catalog = rebuildCatalogIndex(outputRoot);
    if (entries.length === 0) {
      console.log(`No cosmetic bundles found in ${outputRoot}`);
      return;
    }
    let hasError = catalog.duplicateKeys.length > 0;
    for (const e of entries) {
      const svg = fs.readFileSync(path.join(outputRoot, e.svgRelPath), "utf8");
      const report = auditCosmeticSvg(svg, e.type);
      const status = report.ok ? (report.warnings.length ? "WARN" : "OK  ") : "ERR ";
      console.log(`[${status}] ${e.relDir} (${e.key}) — ${(report.byteLength / 1024).toFixed(1)} KB`);
      for (const item of report.items.filter((i) => i.level !== "ok")) {
        console.log(`    [${item.level.toUpperCase()}] ${item.rule}${item.got ? ` (${item.got})` : ""} — ${item.why}`);
      }
      if (!report.ok) hasError = true;
    }
    if (catalog.duplicateKeys.length > 0) {
      console.error("Duplicate keys:", catalog.duplicateKeys);
    }
    if (hasError) process.exitCode = 1;
    return;
  }

  let targetPath = fileArg ? path.resolve(fileArg) : "";
  let explicitType = typeof flags.type === "string" ? flags.type : undefined;
  if (slugFlag) {
    const bundle = findCosmeticBundle(slugFlag, outputRoot);
    if (!bundle) throw new Error(`Cosmetic bundle not found for "${slugFlag}" in ${outputRoot}`);
    targetPath = bundle.svgPath;
    explicitType ??= bundle.type;
  }

  const svg = fs.readFileSync(targetPath, "utf8");
  const type = inferAssetType(targetPath, svg, explicitType);
  const report = auditCosmeticSvg(svg, type);
  console.log(`Audit [${type}] ${targetPath} — ${(report.byteLength / 1024).toFixed(1)} KB`);
  for (const item of report.items) {
    const tag = item.level === "ok" ? "OK  " : item.level === "aviso" ? "WARN" : "ERR ";
    console.log(`  [${tag}] ${item.rule}${item.got ? ` (${item.got})` : ""} — ${item.why}`);
  }
  if (!report.ok) process.exitCode = 1;
}

async function cmdRender(positionals: string[], flags: Record<string, string | boolean>, outputRoot: string) {
  const slugFlag = typeof flags.slug === "string" ? flags.slug : undefined;
  const renderAll = Boolean(flags.all);
  const fileArg = positionals[0];

  if (renderAll) {
    const catalog = rebuildCatalogIndex(outputRoot);
    for (const e of catalog.entries) {
      const svgPath = path.join(outputRoot, e.svgRelPath);
      const previewsDir = path.join(outputRoot, e.relDir, "previews");
      console.log(`\nRendering ${e.relDir}...`);
      const out = await renderSvgInspection({
        svgPathOrContent: svgPath,
        type: e.type,
        outDir: previewsDir,
        name: "cosmetic",
        filenameMode: "bundle",
        engine: flags.engine === "rsvg" ? "rsvg" : "chromium",
        context: flags.context !== undefined ? Boolean(flags.context) : true,
        frames: typeof flags.frames === "string" ? Number(flags.frames) : (e.renderHints?.frames ?? 1),
        durationSec: typeof flags.duration === "string" ? Number(flags.duration) : (e.renderHints?.durationSec ?? 5),
        reducedMotion: Boolean(flags["reduced-motion"]) || Boolean(e.renderHints?.reducedMotion),
        video: Boolean(flags.video),
        cardArtPath: typeof flags.art === "string" ? flags.art : undefined,
        scale: typeof flags.scale === "string" ? Number(flags.scale) : 1,
      });
      console.log("Rendered:", out);
    }
    rebuildCatalogIndex(outputRoot);
    return;
  }

  let targetFile = fileArg;
  let inferredBundlePreviewsDir: string | undefined;
  let explicitType = typeof flags.type === "string" ? flags.type : undefined;
  let bundleHints: { frames?: number; durationSec?: number; reducedMotion?: boolean } | undefined;

  if (slugFlag) {
    const bundle = findCosmeticBundle(slugFlag, outputRoot);
    if (!bundle) throw new Error(`Cosmetic bundle not found for "${slugFlag}" in ${outputRoot}`);
    targetFile = bundle.svgPath;
    inferredBundlePreviewsDir = bundle.previewsDir;
    explicitType ??= bundle.type;
    if (fs.existsSync(bundle.metaPath)) {
      const meta = JSON.parse(fs.readFileSync(bundle.metaPath, "utf8")) as {
        renderHints?: { frames?: number; durationSec?: number; reducedMotion?: boolean };
      };
      bundleHints = meta.renderHints;
    }
  }

  if (!targetFile) {
    throw new Error("render requires <file.svg>, --slug <slug|key>, or --all");
  }

  const absTarget = path.resolve(targetFile);
  const svg = fs.readFileSync(absTarget, "utf8");
  const type = inferAssetType(absTarget, svg, explicitType);
  const isBundleFile = path.basename(absTarget) === "cosmetic.svg";
  if (isBundleFile && !inferredBundlePreviewsDir) {
    inferredBundlePreviewsDir = path.join(path.dirname(absTarget), "previews");
  }

  const base = path.basename(absTarget, path.extname(absTarget));
  const outDir =
    typeof flags.out === "string"
      ? path.resolve(flags.out)
      : inferredBundlePreviewsDir ?? path.join(path.dirname(absTarget), "previews");

  const outputs = await renderSvgInspection({
    svgPathOrContent: absTarget,
    type,
    outDir,
    name: base,
    filenameMode: isBundleFile ? "bundle" : "prefixed",
    engine: flags.engine === "rsvg" ? "rsvg" : "chromium",
    context: Boolean(flags.context),
    frames: typeof flags.frames === "string" ? Number(flags.frames) : (bundleHints?.frames ?? 1),
    durationSec: typeof flags.duration === "string" ? Number(flags.duration) : (bundleHints?.durationSec ?? 5),
    reducedMotion: Boolean(flags["reduced-motion"]) || Boolean(bundleHints?.reducedMotion),
    video: Boolean(flags.video),
    cardArtPath: typeof flags.art === "string" ? flags.art : undefined,
    scale: typeof flags.scale === "string" ? Number(flags.scale) : 1,
  });
  if (isBundleFile) rebuildCatalogIndex(outputRoot);
  console.log("Rendered outputs:", outputs);
}

async function main() {
  const [sub, ...rest] = process.argv.slice(2);
  const { positionals, flags } = parseArgs(rest);
  const outputRoot = typeof flags.root === "string" ? path.resolve(flags.root) : DEFAULT_OUTPUT_ROOT;

  if (!sub || sub === "help" || sub === "--help" || sub === "-h") {
    printHelp();
    return;
  }

  if (sub === "new") {
    await cmdNew(flags);
    return;
  }

  if (sub === "build") {
    const dirs = [DEFAULT_COSMETICS_ROOT];
    if (Boolean(flags["include-examples"])) {
      dirs.push(path.resolve(import.meta.dirname, "../examples"));
    }
    await runLoadedModules(dirs, {
      type: parseAssetType(typeof flags.type === "string" ? flags.type : undefined),
      collection: typeof flags.collection === "string" ? flags.collection : undefined,
      slug: typeof flags.slug === "string" ? flags.slug : undefined,
      key: typeof flags.key === "string" ? flags.key : undefined,
      outputRoot,
      render: Boolean(flags.render),
    });
    return;
  }

  if (sub === "build-examples") {
    await runLoadedModules([path.resolve(import.meta.dirname, "../examples")], {
      type: parseAssetType(typeof flags.type === "string" ? flags.type : undefined),
      collection: typeof flags.collection === "string" ? flags.collection : undefined,
      slug: typeof flags.slug === "string" ? flags.slug : undefined,
      key: typeof flags.key === "string" ? flags.key : undefined,
      outputRoot,
      render: Boolean(flags.render),
    });
    return;
  }

  if (sub === "catalog") {
    cmdCatalog(outputRoot);
    return;
  }

  if (sub === "audit") {
    cmdAudit(positionals, flags, outputRoot);
    return;
  }

  if (sub === "render") {
    await cmdRender(positionals, flags, outputRoot);
    return;
  }

  if (sub === "shader") {
    const presetName = positionals[0] as ShaderPresetName | undefined;
    if (!presetName || !(presetName in SHADER_PRESETS)) {
      throw new Error(`Unknown shader preset. Available: ${Object.keys(SHADER_PRESETS).join(", ")}`);
    }
    const outPath =
      typeof flags.out === "string"
        ? flags.out
        : resolveShaderOutputPath({ outputRoot, name: presetName, ext: "png" });
    await renderShaderToPng({
      preset: presetName,
      width: typeof flags.width === "string" ? Number(flags.width) : 750,
      height: typeof flags.height === "string" ? Number(flags.height) : 1000,
      time: typeof flags.time === "string" ? Number(flags.time) : 0,
      seed: typeof flags.seed === "string" ? Number(flags.seed) : 42,
      outPath,
    });
    rebuildCatalogIndex(outputRoot);
    console.log(`Rendered shader ${presetName} -> ${outPath}`);
    return;
  }

  if (sub === "preview") {
    startPreviewServer({
      dir: typeof flags.dir === "string" ? flags.dir : outputRoot,
      port: typeof flags.port === "string" ? Number(flags.port) : 4173,
    });
    return;
  }

  throw new Error(`Unknown command "${sub}". Run "node src/cli.ts help".`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
