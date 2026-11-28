import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  CATEGORY_MAX_BYTES,
  EASING,
  FORMAT_SPECS,
  GACHA_RARITIES,
  GACHA_RARITY_COLORS,
  RARITY_THEMES,
  REMOTION_ROOT,
  auditRenderedVideo,
  auditVideoDefinition,
  createRng,
  createTimeline,
  defaultVariantCompositionId,
  defineVideo,
  ensureRemotionBundle,
  findDuplicateCompositionIds,
  findVideoBundle,
  loadVideoDefinitions,
  loopProgress,
  pascalIdFromSlug,
  phaseEnvelope,
  publishVideoBundle,
  rebuildCatalogIndex,
  renderVideoBundle,
  renderVideoStills,
  resolvePublishPaths,
  resolveVideoBundlePaths,
  sampleInspectionFrames,
  scaffoldVideoBundle,
  segmentProgress,
  slugify,
  startPreviewServer,
  syncRegistryFile,
} from "../src/index.ts";

describe("AnimesIce Video contracts & frontend parity", () => {
  it("defines even integer dimensions across all format presets and resolves bundle/publish paths safely", () => {
    for (const spec of Object.values(FORMAT_SPECS)) {
      assert.ok(spec.width > 0 && spec.width % 2 === 0, `${spec.preset} width must be even`);
      assert.ok(spec.height > 0 && spec.height % 2 === 0, `${spec.preset} height must be even`);
      assert.ok(spec.fps > 0);
    }

    assert.equal(slugify("Natal Especial! 2026"), "natal-especial-2026");
    assert.equal(pascalIdFromSlug("natal-especial"), "NatalEspecial");
    assert.equal(defaultVariantCompositionId("GachaCrystal", "COMUM"), "GachaCrystal-COMUM");

    const p = resolveVideoBundlePaths({
      outputRoot: "/tmp/remotion-out",
      category: "PROMO",
      collection: "Eventos",
      slug: "Natal 2026",
    });
    assert.equal(p.relDir, "promos/eventos/natal-2026");
    assert.ok(p.videoPath("natal", "mp4").endsWith("promos/eventos/natal-2026/natal.mp4"));

    const pub = resolvePublishPaths({
      publicRoot: "/tmp/animesice-public",
      publish: { dir: "gacha", filePattern: "gacha-spin-{variant}" },
      stem: "gacha-spin-comum",
      ext: "mp4",
    });
    assert.equal(pub.videoPath, "/tmp/animesice-public/gacha/gacha-spin-comum.mp4");
    assert.equal(pub.posterPath, "/tmp/animesice-public/gacha/gacha-spin-comum.webp");

    assert.throws(() =>
      resolvePublishPaths({
        publicRoot: "/tmp/animesice-public",
        publish: { dir: "../escape" },
        stem: "evil",
        ext: "mp4",
      }),
    );
    assert.throws(() =>
      resolvePublishPaths({
        publicRoot: "/tmp/animesice-public",
        publish: { dir: "/etc" },
        stem: "evil",
        ext: "mp4",
      }),
    );
  });

  it("stays synchronized with frontend src/lib/gacha-rarity-colors.ts", () => {
    const frontendPath = path.resolve(REMOTION_ROOT, "../src/lib/gacha-rarity-colors.ts");
    assert.ok(fs.existsSync(frontendPath), `Missing frontend colors file: ${frontendPath}`);
    const src = fs.readFileSync(frontendPath, "utf8");

    for (const rarity of GACHA_RARITIES) {
      const m = new RegExp(`${rarity}\\s*:\\s*["'](#[0-9A-Fa-f]{6})["']`).exec(src);
      assert.ok(m, `Rarity ${rarity} missing in src/lib/gacha-rarity-colors.ts`);
      assert.equal(GACHA_RARITY_COLORS[rarity], m[1]);
      assert.equal(RARITY_THEMES[rarity].color, m[1]);
    }
  });
});

describe("Deterministic motion math & declarative timeline", () => {
  it("produces deterministic PRNG, bounded easings, envelopes, loops, and inspection frames", () => {
    const r1 = createRng("animesice-video");
    const r2 = createRng("animesice-video");
    assert.deepEqual(
      [r1.next(), r1.range(10, 50), r1.int(1, 100)],
      [r2.next(), r2.range(10, 50), r2.int(1, 100)],
    );

    for (const [name, fn] of Object.entries(EASING)) {
      assert.equal(fn(0), 0, `${name}(0) must be 0`);
      assert.equal(fn(1), 1, `${name}(1) must be 1`);
    }

    assert.equal(segmentProgress(15, 10, 20), 0.5);
    assert.equal(segmentProgress(5, 10, 20), 0);
    assert.equal(segmentProgress(25, 10, 20), 1);

    assert.equal(phaseEnvelope(0, { enterStart: 0, enterEnd: 10, exitStart: 20, exitEnd: 30 }), 0);
    assert.equal(phaseEnvelope(15, { enterStart: 0, enterEnd: 10, exitStart: 20, exitEnd: 30 }), 1);
    assert.equal(phaseEnvelope(30, { enterStart: 0, enterEnd: 10, exitStart: 20, exitEnd: 30 }), 0);

    assert.equal(loopProgress(0, 120), 0);
    assert.equal(loopProgress(120, 120), 0);
    assert.equal(loopProgress(60, 120), 0.5);

    const frames = sampleInspectionFrames(120, [0, 0, 0.5, 1]);
    assert.deepEqual(frames, [0, 60, 119]);
  });

  it("plans timelines with optional scene overlap", () => {
    const plan = createTimeline(30, [
      { id: "intro", durationInFrames: 30 },
      { id: "main", durationInFrames: 60, overlapFrames: 10 },
      { id: "outro", durationSec: 1, overlapFrames: 5 },
    ]);
    assert.equal(plan.scenes.intro.from, 0);
    assert.equal(plan.scenes.intro.to, 30);
    assert.equal(plan.scenes.main.from, 20);
    assert.equal(plan.scenes.main.to, 80);
    assert.equal(plan.scenes.outro.from, 75);
    assert.equal(plan.scenes.outro.to, 105);
    assert.equal(plan.totalFrames, 105);
    assert.equal(plan.totalDurationSec, 3.5);
  });
});

describe("Static audit & repository definitions", () => {
  it("rejects invalid Remotion IDs, odd dimensions, bad poster timestamps, duplicate variants, and unsafe publish paths", () => {
    const base = {
      id: "ValidClip",
      category: "GACHA" as const,
      slug: "valid-clip",
      title: "Valid",
      description: "Valid",
      format: "GACHA_SQUARE" as const,
      durationInFrames: 60,
      defaultProps: {},
    };

    assert.equal(auditVideoDefinition(defineVideo({ ...base, id: "Bad_Id Space" })).ok, false);
    assert.equal(auditVideoDefinition(defineVideo({ ...base, width: 721 })).ok, false);
    assert.equal(auditVideoDefinition(defineVideo({ ...base, posterAtSec: 99 })).ok, false);
    assert.equal(auditVideoDefinition(defineVideo({ ...base, publish: { dir: "../bad" } })).ok, false);
    assert.equal(
      auditVideoDefinition(
        defineVideo({
          ...base,
          variants: [
            { key: "a", compositionId: "SameId", props: {} },
            { key: "b", compositionId: "SameId", props: {} },
          ],
        }),
      ).ok,
      false,
    );
  });

  it("loads and audits all real definitions in videos/ and examples/ without duplicate IDs", async () => {
    const defs = await loadVideoDefinitions();
    assert.ok(defs.length >= 3, "Expected GachaCrystal + 2 examples");
    const dups = findDuplicateCompositionIds(defs);
    assert.equal(dups.length, 0, `Duplicate composition IDs: ${JSON.stringify(dups)}`);

    for (const item of defs) {
      const report = auditVideoDefinition(item.definition);
      assert.equal(report.ok, true, `Definition ${item.definition.id} failed audit: ${JSON.stringify(report.errors)}`);
    }
  });
});

describe("Scaffold, registry sync, catalog & Video Studio HTTP server", () => {
  it("scaffolds bundles, blocks overwrite, syncs registry, indexes catalog, and serves files with Range + traversal protection", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "animesice-video-test-"));
    const videosRoot = path.join(tmp, "videos");
    const examplesRoot = path.join(tmp, "examples");
    const outRoot = path.join(tmp, "output");
    const regPath = path.join(tmp, "src/registry.generated.ts");

    try {
      const scaf = scaffoldVideoBundle({
        videosRoot,
        examplesRoot,
        registryPath: regPath,
        category: "PROMO",
        collection: "natal",
        slug: "evento-inverno",
        durationSec: 3,
      });
      assert.ok(fs.existsSync(scaf.metaPath));
      assert.ok(fs.existsSync(scaf.compositionPath));
      assert.ok(fs.existsSync(regPath));
      const regSrc = fs.readFileSync(regPath, "utf8");
      assert.ok(regSrc.includes("evento-inverno/meta.ts"));
      assert.ok(regSrc.includes("evento-inverno/composition.tsx"));

      assert.throws(() =>
        scaffoldVideoBundle({
          videosRoot,
          examplesRoot,
          registryPath: regPath,
          category: "PROMO",
          collection: "natal",
          slug: "evento-inverno",
        }),
      );

      // Build synthetic catalog entries and verify duplicate ID detection
      const dirA = resolveVideoBundlePaths({ outputRoot: outRoot, category: "GACHA", collection: "c", slug: "clip-a" });
      const dirB = resolveVideoBundlePaths({ outputRoot: outRoot, category: "GACHA", collection: "c", slug: "clip-b" });
      fs.mkdirSync(dirA.previewsDir, { recursive: true });
      fs.mkdirSync(dirB.previewsDir, { recursive: true });
      fs.writeFileSync(dirA.videoPath("clip-a"), Buffer.from("0123456789abcdef"));
      fs.writeFileSync(dirB.videoPath("clip-b"), Buffer.from("0123456789abcdef"));
      fs.writeFileSync(
        dirA.metaPath,
        JSON.stringify({
          id: "DupComp",
          title: "Clip A",
          files: [{ stem: "clip-a", compositionId: "DupComp", videoRelPath: "gacha/c/clip-a/clip-a.mp4", byteLength: 16, auditOk: true, errors: 0, warnings: 0 }],
        }),
      );
      fs.writeFileSync(
        dirB.metaPath,
        JSON.stringify({
          id: "DupComp",
          title: "Clip B",
          files: [{ stem: "clip-b", compositionId: "DupComp", videoRelPath: "gacha/c/clip-b/clip-b.mp4", byteLength: 16, auditOk: true, errors: 0, warnings: 0 }],
        }),
      );

      const catalog = rebuildCatalogIndex(outRoot);
      assert.equal(catalog.total, 2);
      assert.equal(catalog.duplicateIds.length, 1);
      assert.equal(catalog.duplicateIds[0]!.id, "DupComp");
      assert.ok(findVideoBundle("clip-a", outRoot));

      // HTTP Video Studio routes, Range 206, and traversal protection
      const srv = startPreviewServer({ dir: outRoot, port: 0 });
      try {
        await new Promise<void>((resolve) => srv.once("listening", () => resolve()));
        const addr = srv.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;

        const [rHtml, rCat, rRange, rTrav] = await Promise.all([
          fetch(`http://127.0.0.1:${port}/`),
          fetch(`http://127.0.0.1:${port}/api/catalog`),
          fetch(`http://127.0.0.1:${port}/files/gacha/c/clip-a/clip-a.mp4`, {
            headers: { Range: "bytes=0-3" },
          }),
          new Promise<number>((resolve, reject) => {
            http
              .get({ host: "127.0.0.1", port, path: "/files/../package.json" }, (res) => {
                res.resume();
                resolve(res.statusCode ?? 0);
              })
              .on("error", reject);
          }),
        ]);

        assert.equal(rHtml.status, 200);
        assert.ok((await rHtml.text()).includes("ANIMESICE VIDEO STUDIO"));
        assert.equal(rCat.status, 200);
        assert.equal(((await rCat.json()) as { total: number }).total, 2);
        assert.equal(rRange.status, 206);
        assert.equal(rRange.headers.get("content-range"), "bytes 0-3/16");
        assert.equal(await rRange.text(), "0123");
        assert.equal(rTrav, 403);
      } finally {
        await new Promise<void>((resolve) => srv.close(() => resolve()));
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("Remotion end-to-end bundle, still, MP4 render & ffprobe audit", () => {
  it("bundles index.tsx, renders a real PNG still, renders MP4 + WebP poster, passes ffprobe audit, and publishes safely", async () => {
    syncRegistryFile();
    const defs = await loadVideoDefinitions();
    const gachaDef = defs.find((d) => d.definition.slug === "gacha-crystal")?.definition;
    assert.ok(gachaDef, "Expected gacha-crystal definition");

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "animesice-remotion-e2e-"));
    const outRoot = path.join(tmp, "output");
    const pubRoot = path.join(tmp, "public");

    try {
      const serveUrl = await ensureRemotionBundle();

      // 1. Real PNG still render check
      const stillRes = await renderVideoStills(gachaDef, {
        outputRoot: outRoot,
        variant: "comum",
        frames: [15],
        contactSheet: false,
        serveUrl,
      });
      assert.equal(stillRes.stillPaths.length, 1);
      const pngBytes = fs.readFileSync(stillRes.stillPaths[0]!);
      assert.equal(pngBytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

      // 2. Real MP4 + WebP poster + ffprobe audit + temp publish
      const renderRes = await renderVideoBundle(gachaDef, {
        outputRoot: outRoot,
        publicRoot: pubRoot,
        variants: ["comum"],
        contactSheet: false,
        publish: true,
        serveUrl,
      });
      assert.equal(renderRes.files.length, 1);
      const file = renderRes.files[0]!;
      assert.equal(file.codec, "h264");
      assert.ok(
        file.pixFmt === "yuv420p" || file.pixFmt === "yuvj420p",
        `Unexpected pixFmt: ${file.pixFmt}`,
      );
      assert.equal(file.width, 720);
      assert.equal(file.height, 720);
      assert.ok(file.byteLength > 1000 && file.byteLength <= CATEGORY_MAX_BYTES.GACHA);
      assert.equal(file.auditOk, true);

      const videoAbs = path.join(outRoot, file.videoRelPath);
      const posterAbs = path.join(outRoot, file.posterRelPath!);
      const { report } = auditRenderedVideo(videoAbs, gachaDef, { posterPath: posterAbs });
      assert.equal(report.ok, true, JSON.stringify(report.errors));

      assert.ok(fs.existsSync(path.join(pubRoot, "gacha/gacha-spin-comum.mp4")));
      assert.ok(fs.existsSync(path.join(pubRoot, "gacha/gacha-spin-comum.webp")));

      // Verify explicit publishVideoBundle helper also works standalone
      const repPublished = publishVideoBundle(gachaDef, {
        outputRoot: outRoot,
        publicRoot: pubRoot,
        variants: ["comum"],
      });
      assert.equal(repPublished.length, 2);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
