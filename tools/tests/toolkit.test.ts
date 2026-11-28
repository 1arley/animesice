import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  addGlitterSpecks,
  addShootingStars,
  addStarfield,
  arcaneSeal,
  artWindow,
  auditCosmeticSvg,
  bakeGsapEaseToKeyframes,
  bezierPath,
  BLEED,
  booleanOp,
  braidAlongPath,
  butterflyMotif,
  CARD_ART,
  chamferedRectPath,
  cornerFiligree,
  createCosmeticCanvas,
  createNoise2D,
  createRng,
  crescentMoon,
  crownCrest,
  defaultKeyFor,
  defineCosmetic,
  defineGlowFilter,
  defineGoldFoilFilter,
  defineMetallicGradient,
  definePattern,
  doubleBorderFrame,
  exportCosmetic,
  findCosmeticBundle,
  fourPointStar,
  generateFlowFieldPaths,
  injectPresetAnimations,
  largestPlate,
  optimizeCosmeticSvg,
  overlayScale,
  parseViewBox,
  pathBounds,
  phyllotaxisPoints,
  poissonDiskSample,
  rebuildCatalogIndex,
  renderShaderToPng,
  renderSvgInspection,
  resolveCosmeticPaths,
  resolveShaderOutputPath,
  runCosmeticDefinition,
  samplePath,
  scaffoldCosmeticFile,
  scanCosmeticBundles,
  slugify,
  stampFourCorners,
  startPreviewServer,
  symmetricPath,
  taperedRibbon,
} from "../src/index.ts";

describe("AnimesIce contracts & audit", () => {
  it("matches frontend geometry helpers parseViewBox, artWindow, overlayScale, and largestPlate", () => {
    const vbFrame = parseViewBox('<svg viewBox="-30 -30 810 1060"/>');
    assert.deepEqual(vbFrame, { x: -30, y: -30, w: 810, h: 1060 });
    assert.deepEqual(overlayScale(vbFrame), { width: "108%", height: "106%" });

    const win = artWindow(vbFrame);
    assert.equal(win.left, `${(30 / 810) * 100}%`);
    assert.equal(win.top, `${(30 / 1060) * 100}%`);

    const back = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1000"><defs><rect width="999" height="999"/></defs><rect x="0" y="0" width="750" height="1000" fill="#040818"/></svg>';
    assert.deepEqual(largestPlate(back), { x: 0, y: 0, w: 750, h: 1000 });
  });

  it("rejects scripts, inline handlers, external URLs, wrong viewBox, and missing BACK plate", () => {
    const badScript = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1000"><rect width="750" height="1000" fill="#000"/><script>alert(1)</script></svg>';
    assert.equal(auditCosmeticSvg(badScript, "BACK").ok, false);

    const badHandler = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1000"><rect width="750" height="1000" onclick="x()"/></svg>';
    assert.equal(auditCosmeticSvg(badHandler, "BACK").ok, false);

    const badExt = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1000"><rect width="750" height="1000" fill="#000"/><image href="https://example.com/a.png" width="100" height="100"/></svg>';
    assert.equal(auditCosmeticSvg(badExt, "BACK").ok, false);

    const missingPlate = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1000"><circle cx="375" cy="500" r="100" fill="#fff"/></svg>';
    assert.equal(auditCosmeticSvg(missingPlate, "BACK").ok, false);

    const wrongVb = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050"><rect width="750" height="1050" fill="#000"/></svg>';
    assert.equal(auditCosmeticSvg(wrongVb, "BACK").ok, false);
  });

  it("stays synchronized with frontend src/lib/cosmetic-svg.ts CARD_ART and BLEED constants", () => {
    const frontendPath = path.resolve(import.meta.dirname, "../../src/lib/cosmetic-svg.ts");
    assert.ok(fs.existsSync(frontendPath), `Expected frontend contract file at ${frontendPath}`);
    const src = fs.readFileSync(frontendPath, "utf8");
    const artMatch = /CARD_ART\s*=\s*\{\s*w:\s*(\d+)\s*,\s*h:\s*(\d+)\s*\}/.exec(src);
    const bleedMatch = /BLEED\s*=\s*(\d+)/.exec(src);
    assert.ok(artMatch, "CARD_ART constant not found in src/lib/cosmetic-svg.ts");
    assert.ok(bleedMatch, "BLEED constant not found in src/lib/cosmetic-svg.ts");
    assert.equal(Number(artMatch[1]), CARD_ART.w);
    assert.equal(Number(artMatch[2]), CARD_ART.h);
    assert.equal(Number(bleedMatch[1]), BLEED);
  });
});

describe("Generative deterministic math", () => {
  it("produces deterministic PRNG, 2D fBm/curl noise, Poisson-disk points, flow fields, and phyllotaxis", () => {
    const r1 = createRng("animesice-seed");
    const r2 = createRng("animesice-seed");
    assert.deepEqual(
      [r1.next(), r1.range(10, 50), r1.int(1, 10)],
      [r2.next(), r2.range(10, 50), r2.int(1, 10)],
    );

    const n1 = createNoise2D("noise-a");
    const n2 = createNoise2D("noise-a");
    assert.equal(n1.fbm2D(1.5, 2.5), n2.fbm2D(1.5, 2.5));
    const curl = n1.curl2D(0.5, 0.5);
    assert.ok(Math.abs(Math.hypot(curl.x, curl.y) - 1) < 1e-4);

    const pts = poissonDiskSample({ x: 0, y: 0, w: 300, h: 300 }, 28, "poisson");
    assert.ok(pts.length > 20);
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y);
        assert.ok(d >= 27.99, `Poisson spacing violated: ${d}`);
      }
    }

    const flows = generateFlowFieldPaths({ x: 0, y: 0, w: 300, h: 300 }, { seed: "flow", count: 5, steps: 10 });
    assert.equal(flows.length, 5);
    assert.equal(flows[0]!.length, 11);

    const phy = phyllotaxisPoints(150, 150, 16, 12);
    assert.equal(phy.length, 16);
  });
});

describe("Paper.js geometry & commercial ornaments", () => {
  it("builds Bézier paths, symmetric silhouettes, tapered ribbons, boolean subtract/unite, and curve samples", () => {
    const bz = bezierPath([
      { x: 0, y: 0, handleOut: { x: 20, y: 0 } },
      { x: 40, y: 40, handleIn: { x: 0, y: -20 } },
    ]);
    assert.match(bz, /^M0.*[cC]/);

    const sym = symmetricPath(
      [
        { x: 100, y: 10 },
        { x: 140, y: 50 },
        { x: 100, y: 90 },
      ],
      100,
    );
    const symB = pathBounds(sym);
    assert.equal(Math.round(symB.x), 60);
    assert.equal(Math.round(symB.w), 80);

    const ribbon = taperedRibbon(
      [{ x: 10, y: 50 }, { x: 100, y: 20 }, { x: 200, y: 80 }],
      (t) => Math.sin(t * Math.PI) * 20,
      { steps: 16 },
    );
    assert.ok(ribbon.length > 20);

    const outer = chamferedRectPath(0, 0, 200, 300, 12);
    const inner = chamferedRectPath(20, 20, 160, 260, 10);
    const sub = booleanOp("subtract", outer, inner);
    assert.equal(sub.fillRule, "evenodd");
    assert.ok(sub.d.includes("M") && sub.d.split("M").length >= 3);

    const sampled = samplePath(outer, 9);
    assert.equal(sampled.length, 9);
    assert.ok(Math.abs(Math.hypot(sampled[0]!.tx, sampled[0]!.ty) - 1) < 1e-3);
  });

  it("constructs stars, crescent, borders, corner filigrees, crown, butterfly, braids, and seal", () => {
    assert.ok(fourPointStar(100, 100, 30, 8).startsWith("M"));
    assert.ok(crescentMoon(100, 100, 40).startsWith("M"));
    const border = doubleBorderFrame({ x: 0, y: 0, w: 750, h: 1000 });
    assert.equal(border.cornerDiamonds.length, 4);

    for (const style of ["baroque", "crystal", "celestial", "gothic", "art-deco"] as const) {
      const c = cornerFiligree(80, style);
      const stamped = stampFourCorners({ x: 0, y: 0, w: 750, h: 1000 }, c);
      assert.equal(stamped.length, 4);
    }

    const crown = crownCrest(375, 300, 240, 180);
    assert.equal(crown.sparkles.length, 5);
    const fly = butterflyMotif(300, 300, 1, { variant: "profile" });
    assert.ok(fly.upperWing.length > 10 && fly.lowerWing.length > 10);

    const braid = braidAlongPath("M0 0 C 50 40 150 40 200 0", { links: 6, width: 16 });
    assert.equal(braid.length, 6);

    const seal = arcaneSeal(375, 500, 160);
    assert.equal(seal.cardinalStars.length, 4);
  });
});

describe("Compositor, materials, animations, SVGO & visual render", () => {
  it("isolates multiple CosmeticCanvas instances and passes SVGO + auditCosmeticSvg", () => {
    const c1 = createCosmeticCanvas({ type: "BACK", title: "Canvas 1" });
    const c2 = createCosmeticCanvas({ type: "FRAME", title: "Canvas 2" });

    const gold = defineMetallicGradient(c1, "g1", "celestial-gold");
    const foilFilter = defineGoldFoilFilter(c1, "ff1");
    const glowFilter = defineGlowFilter(c1, "gl1", { color: "#38E8DA" });
    const pat = definePattern(c1, "p1", "stardust");

    c1.addBackPlate(gold, { filterUrl: foilFilter });
    const l1 = c1.layer("stars");
    l1.rect(750, 1000).fill(pat);
    addStarfield(c1, l1, { x: 20, y: 20, w: 710, h: 960 }, { seed: "t1", maxCount: 24, glowFilterUrl: glowFilter });
    addShootingStars(l1, { x: 20, y: 20, w: 710, h: 500 }, { seed: "m1", count: 2 });
    addGlitterSpecks(l1, { x: 100, y: 100, w: 200, h: 200 }, { seed: "glitter", count: 12 });

    injectPresetAnimations(c1, ["twinkle", "shimmer-sweep"]);
    const baked = bakeGsapEaseToKeyframes({
      name: "gsap-test",
      ease: "back.out(1.7)",
      steps: 8,
      properties: [{ prop: "opacity", from: 0, to: 1 }],
    });
    assert.ok(baked.includes("@keyframes gsap-test"));
    c1.addStyle(baked);

    const mask = c2.defineFrameCutoutMask("m2", { inset: 20, chamfer: 20 });
    c2.layer("rim", { maskUrl: mask }).rect(810, 1060).move(-30, -30).fill("#38E8DA");

    const svg1 = optimizeCosmeticSvg(c1.toSvg());
    const svg2 = optimizeCosmeticSvg(c2.toSvg());

    const rep1 = auditCosmeticSvg(svg1, "BACK");
    const rep2 = auditCosmeticSvg(svg2, "FRAME");
    assert.equal(rep1.ok, true, JSON.stringify(rep1.errors));
    assert.equal(rep2.ok, true, JSON.stringify(rep2.errors));
    assert.ok(svg1.includes("prefers-reduced-motion"), "Reduced motion rule missing");
    assert.ok(svg1.includes("<rect"), "SVGO must preserve <rect> back plate");
    assert.ok(svg1.includes("<title"), "SVGO must preserve <title>");

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "animesice-export-"));
    try {
      const ex = exportCosmetic({
        canvas: c1,
        outPath: path.join(tmpDir, "test-back.svg"),
        metadata: {
          key: "BACK_TEST",
          name: "Test",
          description: "Test",
          type: "BACK",
        },
      });
      assert.ok(fs.existsSync(ex.svgPath));
      assert.ok(ex.metaPath && fs.existsSync(ex.metaPath));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("renders SVG inspection PNG and WebGL2 GLSL shader PNG via headless Chromium", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "animesice-render-"));
    try {
      const c = createCosmeticCanvas({ type: "BACK", title: "Render Smoke" });
      c.addBackPlate("#0B1B46");
      c.addPath(c.layer("star"), fourPointStar(375, 500, 120, 32), { fill: "#FCD34D" });

      const rendered = await renderSvgInspection({
        svgPathOrContent: c.toSvg(),
        type: "BACK",
        outDir: tmpDir,
        name: "smoke",
        context: true,
      });
      assert.ok(fs.statSync(rendered.standalonePng).size > 2000);
      assert.ok(rendered.contextPng && fs.statSync(rendered.contextPng).size > 5000);

      const shader = await renderShaderToPng({
        preset: "ice-crystal-caustics",
        width: 240,
        height: 320,
        time: 0.5,
      });
      assert.equal(shader.pngBuffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      assert.ok(shader.pngBuffer.length > 3000);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("Scalable output catalog, defineCosmetic & Art Studio server", () => {
  it("resolves structured bundle paths, scaffolds templates, detects duplicate keys, and serves Art Studio", async () => {
    assert.equal(slugify("Guerra Sangrenta! 2026"), "guerra-sangrenta-2026");
    assert.equal(defaultKeyFor("HIGHLIGHT", "aura-astral"), "DESTAQUE_AURA_ASTRAL");
    assert.equal(defaultKeyFor("BACK", "lua-sangrenta"), "BACK_LUA_SANGRENTA");

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "animesice-scalable-"));
    const outRoot = path.join(tmpRoot, "output");
    const cosRoot = path.join(tmpRoot, "cosmetics");

    try {
      const p = resolveCosmeticPaths({
        outputRoot: outRoot,
        type: "BACK",
        collection: "Eventos Especiais",
        slug: "Lua Sangrenta",
      });
      assert.equal(p.relDir, "backs/eventos-especiais/lua-sangrenta");
      assert.equal(p.svgPath, path.join(outRoot, "backs/eventos-especiais/lua-sangrenta/cosmetic.svg"));
      assert.ok(resolveShaderOutputPath({ outputRoot: outRoot, name: "Ice Glow" }).endsWith("shaders/ice-glow.png"));

      // Build via defineCosmetic
      const def = defineCosmetic({
        type: "BACK",
        collection: "eventos",
        slug: "lua-sangrenta",
        name: "Lua Sangrenta",
        description: "Verso temático de evento.",
        rarity: "EPIC",
        price: 1800,
        build(ctx) {
          const canvas = ctx.createCanvas();
          canvas.addBackPlate("#080C12");
          canvas.addPath(canvas.layer("emblem"), fourPointStar(375, 500, 90, 24), { fill: "#E5484D" });
          return canvas;
        },
      });
      const res = await runCosmeticDefinition(def, { outputRoot: outRoot });
      assert.ok(fs.existsSync(res.svgPath));
      assert.ok(res.metaPath && fs.existsSync(res.metaPath));
      assert.ok(fs.existsSync(path.join(outRoot, "catalog.json")));

      // Lookup by slug and by key
      const bySlug = findCosmeticBundle("lua-sangrenta", outRoot);
      const byKey = findCosmeticBundle("BACK_LUA_SANGRENTA", outRoot);
      assert.ok(bySlug && byKey);
      assert.equal(bySlug.svgPath, res.svgPath);
      assert.equal(byKey.svgPath, res.svgPath);

      // Bundle preview naming mode
      const rendered = await renderSvgInspection({
        svgPathOrContent: res.svgPath,
        type: "BACK",
        outDir: res.previewsDir,
        name: "cosmetic",
        filenameMode: "bundle",
        context: true,
      });
      assert.ok(rendered.standalonePng.endsWith(path.join("previews", "standalone.png")));
      assert.ok(rendered.contextPng?.endsWith(path.join("previews", "context.png")));

      // Duplicate key detection
      const dupDef = defineCosmetic({
        type: "FRAME",
        collection: "eventos",
        slug: "moldura-duplicada",
        key: "BACK_LUA_SANGRENTA",
        name: "Duplicada",
        description: "Colisão intencional.",
        build(ctx) {
          const canvas = ctx.createCanvas();
          canvas.addPath(canvas.layer("rim"), chamferedRectPath(16, 16, 718, 968, 20), { stroke: "#E5484D", strokeWidth: 4 });
          return canvas;
        },
      });
      await runCosmeticDefinition(dupDef, { outputRoot: outRoot });
      const catalog = rebuildCatalogIndex(outRoot);
      assert.equal(catalog.total, 2);
      assert.equal(catalog.duplicateKeys.length, 1);
      assert.equal(catalog.duplicateKeys[0]!.key, "BACK_LUA_SANGRENTA");

      const scanned = scanCosmeticBundles(outRoot);
      assert.equal(scanned.entries[0]!.previewRelPaths.length, 2);

      // Scaffold template + overwrite protection
      const scaf = scaffoldCosmeticFile({
        cosmeticsRoot: cosRoot,
        type: "FRAME",
        collection: "natal",
        slug: "floco-imperial",
      });
      assert.ok(fs.existsSync(scaf.filePath));
      assert.equal(scaf.key, "FRAME_FLOCO_IMPERIAL");
      assert.throws(() =>
        scaffoldCosmeticFile({ cosmeticsRoot: cosRoot, type: "FRAME", collection: "natal", slug: "floco-imperial" }),
      );

      // Art Studio HTTP routes & path traversal guard
      const srv = startPreviewServer({ dir: outRoot, port: 0 });
      try {
        await new Promise<void>((resolve) => srv.once("listening", () => resolve()));
        const addr = srv.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;
        const [rHtml, rCat, rFile, travStatus] = await Promise.all([
          fetch(`http://127.0.0.1:${port}/`),
          fetch(`http://127.0.0.1:${port}/api/catalog`),
          fetch(`http://127.0.0.1:${port}/files/backs/eventos/lua-sangrenta/cosmetic.svg`),
          new Promise<number>((resolve, reject) => {
            http
              .get({ host: "127.0.0.1", port, path: "/files/../cosmetics/frames/natal/floco-imperial.ts" }, (res) => {
                res.resume();
                resolve(res.statusCode ?? 0);
              })
              .on("error", reject);
          }),
        ]);
        assert.equal(rHtml.status, 200);
        assert.ok((await rHtml.text()).includes("ANIMESICE STUDIO"));
        assert.equal(rCat.status, 200);
        const catBody = (await rCat.json()) as { total: number };
        assert.equal(catBody.total, 2);
        assert.equal(rFile.status, 200);
        assert.ok((await rFile.text()).includes("<svg"));
        assert.equal(travStatus, 403);
      } finally {
        await new Promise<void>((resolve) => srv.close(() => resolve()));
      }
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
