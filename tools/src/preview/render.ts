import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { auditCosmeticSvg } from "../core/audit.ts";
import {
  ART_PLATE,
  ASSET_SPECS,
  CARD_ART,
  CARD_SAFE_ZONES,
  overlayScale,
  parseViewBox,
  svgDataUrl,
  type AssetType,
} from "../core/contracts.ts";
import { buildGsapPreviewHtml } from "../animation/gsap-bridge.ts";
import { withChromiumPage } from "./browser.ts";

export type RenderInspectionOptions = {
  svgPathOrContent: string;
  type: AssetType;
  outDir: string;
  name: string;
  filenameMode?: "prefixed" | "bundle";
  engine?: "chromium" | "rsvg";
  scale?: number;
  context?: boolean;
  frames?: number;
  durationSec?: number;
  reducedMotion?: boolean;
  video?: boolean;
  cardArtPath?: string;
  rarityLabel?: string;
  foilLabel?: string;
};

export type RenderInspectionOutputs = {
  standalonePng: string;
  contextPng?: string;
  framesPng?: string;
  reducedPng?: string;
  videoPath?: string;
};

function readSvgInput(svgPathOrContent: string): string {
  const trimmed = svgPathOrContent.trim();
  if (trimmed.startsWith("<svg")) return trimmed;
  return fs.readFileSync(path.resolve(svgPathOrContent), "utf8");
}

function resolveCardArtDataUrl(cardArtPath?: string): string {
  if (!cardArtPath) return svgDataUrl(ART_PLATE);
  const abs = path.resolve(cardArtPath);
  const ext = path.extname(abs).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".svg"
          ? "image/svg+xml"
          : "image/png";
  const b64 = fs.readFileSync(abs).toString("base64");
  return `data:${mime};base64,${b64}`;
}

function buildStandaloneHtml(svg: string, width: number, height: number): string {
  const dataUrl = svgDataUrl(svg);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; background: transparent; overflow: hidden; }
  img { display: block; width: 100%; height: 100%; object-fit: fill; }
</style>
</head>
<body>
  <img id="target" src="${dataUrl}" alt="">
  <script>
    const img = document.getElementById("target");
    if (img.complete) window.__IMG_READY = true;
    else img.onload = () => { window.__IMG_READY = true; };
  </script>
</body>
</html>`;
}

function buildContextCompositeHtml(opts: {
  svg: string;
  type: AssetType;
  artDataUrl: string;
  rarityLabel: string;
  foilLabel: string;
}): string {
  const spec = ASSET_SPECS[opts.type];
  const vb = parseViewBox(opts.svg, spec.viewBox);
  const ov = overlayScale(vb);
  const svgUrl = svgDataUrl(opts.svg);
  const audit = auditCosmeticSvg(opts.svg, opts.type);

  const panelW = 360;
  const cardW = 300;
  const cardH = 400; // exact 3:4
  const standH = Math.round((panelW - 40) * (vb.h / vb.w));
  const stageH = Math.max(cardH + 64, standH + 40);

  const inContextContent =
    opts.type === "BACK"
      ? `<div class="card-slot"><img src="${svgUrl}" class="back-img" alt=""></div>`
      : opts.type === "SKIN" || opts.type === "BANNER"
        ? `<div class="card-slot"><img src="${svgUrl}" class="back-img" alt=""></div>`
        : `<div class="card-slot card-frame-clip">
            <img src="${opts.artDataUrl}" class="front-art" alt="">
            <img src="${svgUrl}" class="overlay-img" style="width:${ov.width};height:${ov.height};" alt="">
            <span class="pill pill-tl">${opts.rarityLabel}</span>
            <span class="pill pill-tr">${opts.foilLabel}</span>
            <span class="pill pill-br">◆◆◆ MINT</span>
          </div>`;

  const guideScale = cardW / CARD_ART.w;
  const bleedW = Math.round(vb.w * guideScale);
  const bleedH = Math.round(vb.h * guideScale);
  const artLeft = Math.round((-vb.x / vb.w) * bleedW);
  const artTop = Math.round((-vb.y / vb.h) * bleedH);

  const guideZone = (z: { x: number; y: number; w: number; h: number }, label: string) =>
    `<div class="safe-zone" style="left:${artLeft + z.x * guideScale}px;top:${artTop + z.y * guideScale}px;width:${z.w * guideScale}px;height:${z.h * guideScale}px;"><span>${label}</span></div>`;

  const auditBadgeCls = audit.ok ? "badge-ok" : "badge-err";
  const auditLabel = audit.ok
    ? `AUDIT OK · ${(audit.byteLength / 1024).toFixed(1)} KB${audit.warnings.length ? ` · ${audit.warnings.length} WARN` : ""}`
    : `AUDIT ERROR (${audit.errors.length}) · ${(audit.byteLength / 1024).toFixed(1)} KB`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: #080C12; color: #F1F5F9;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    width: 1200px;
  }
  .board { padding: 24px; }
  .header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid #1F2B3E; padding-bottom: 12px; margin-bottom: 20px;
  }
  .title { font-size: 16px; font-weight: 700; color: #38E8DA; letter-spacing: 0.08em; }
  .badge { font-size: 12px; padding: 4px 10px; border: 1px solid; }
  .badge-ok { color: #34D399; border-color: rgba(52,211,153,0.45); background: rgba(52,211,153,0.08); }
  .badge-err { color: #FF6B4A; border-color: rgba(255,107,74,0.45); background: rgba(255,107,74,0.08); }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .panel {
    background: #0E141D; border: 1px solid #1F2B3E; padding: 14px;
    display: flex; flex-direction: column; align-items: center;
  }
  .panel-label {
    width: 100%; font-size: 11px; color: #94A3B8; text-transform: uppercase;
    letter-spacing: 0.1em; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;
  }
  .stage {
    width: 100%; height: ${stageH}px;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at center, rgba(56,232,218,0.05), transparent 65%), #05070B;
    border: 1px dashed rgba(255,255,255,0.08);
    position: relative;
  }
  .standalone-img { width: ${panelW - 44}px; height: auto; display: block; }
  .card-slot {
    width: ${cardW}px; height: ${cardH}px;
    position: relative; overflow: hidden;
    border: 1px solid rgba(252,211,77,0.6);
    box-shadow: 0 0 24px rgba(252,211,77,0.18);
    background: #080C12;
  }
  .back-img, .front-art {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .overlay-img {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    max-width: none; object-fit: fill; pointer-events: none; z-index: 10;
  }
  .pill {
    position: absolute; z-index: 20; background: rgba(8,12,18,0.85);
    padding: 3px 7px; font-size: 11px; font-weight: 700;
  }
  .pill-tl { top: 6px; left: 6px; color: #FCD34D; }
  .pill-tr { top: 6px; right: 6px; color: #38E8DA; }
  .pill-br { bottom: 6px; right: 6px; color: #38E8DA; }
  .guide-box { position: relative; width: ${bleedW}px; height: ${bleedH}px; background: #0B1220; }
  .guide-art { position: absolute; left: ${artLeft}px; top: ${artTop}px; width: ${cardW}px; height: ${cardH}px; object-fit: cover; opacity: 0.68; }
  .guide-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .guide-win { position: absolute; left: ${artLeft}px; top: ${artTop}px; width: ${cardW}px; height: ${cardH}px; border: 1.5px dashed #38E8DA; pointer-events: none; }
  .safe-zone {
    position: absolute; border: 1px dashed rgba(252,211,77,0.8); background: rgba(252,211,77,0.08);
    display: flex; align-items: center; justify-content: center; font-size: 9px; color: #FDE68A; pointer-events: none;
  }
</style>
</head>
<body>
<div class="board">
  <div class="header">
    <div class="title">ANIMESICE INSPECTION · ${opts.type} · viewBox [${vb.x} ${vb.y} ${vb.w} ${vb.h}]</div>
    <div class="badge ${auditBadgeCls}">${auditLabel}</div>
  </div>
  <div class="grid">
    <div class="panel">
      <div class="panel-label">1. Standalone (&lt;img&gt; data URI)</div>
      <div class="stage"><img src="${svgUrl}" class="standalone-img" alt=""></div>
    </div>
    <div class="panel">
      <div class="panel-label">2. In-Game GachaCard Composite</div>
      <div class="stage">${inContextContent}</div>
    </div>
    <div class="panel">
      <div class="panel-label">3. Bleed &amp; HUD Safe Zones</div>
      <div class="stage">
        <div class="guide-box">
          ${opts.type !== "BACK" && opts.type !== "BANNER" ? `<img src="${opts.artDataUrl}" class="guide-art" alt="">` : ""}
          <img src="${svgUrl}" class="guide-svg" alt="">
          <div class="guide-win"></div>
          ${opts.type === "FRAME" || opts.type === "HIGHLIGHT" ? guideZone(CARD_SAFE_ZONES.rarityPill, "RARITY") + guideZone(CARD_SAFE_ZONES.foilPill, "FOIL") + guideZone(CARD_SAFE_ZONES.conditionPill, "COND") : ""}
        </div>
      </div>
    </div>
  </div>
</div>
<script>
  Promise.all(Array.from(document.images).map(i => i.complete ? Promise.resolve() : new Promise(r => { i.onload = r; i.onerror = r; })))
    .then(() => { window.__COMPOSITE_READY = true; });
</script>
</body>
</html>`;
}

function buildAnimatedInlineHtml(svg: string, width: number, height: number): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; background: #080C12; overflow: hidden; }
  svg { width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
${svg}
<script>
  window.__SEEK_SVG_TIME = (timeSec) => {
    const svg = document.querySelector("svg");
    if (svg && typeof svg.pauseAnimations === "function") {
      try { svg.pauseAnimations(); svg.setCurrentTime(timeSec); } catch {}
    }
    const ms = timeSec * 1000;
    for (const anim of document.getAnimations()) {
      try {
        anim.pause();
        anim.currentTime = ms;
      } catch {}
    }
  };
  window.__ANIM_READY = true;
</script>
</body>
</html>`;
}

async function stitchContactSheet(
  frames: Array<{ label: string; buffer: Buffer }>,
  cols: number,
  cellW: number,
  cellH: number,
  outPath: string,
): Promise<void> {
  const rows = Math.ceil(frames.length / cols);
  const pad = 16;
  const headerH = 26;
  const totalW = pad + cols * (cellW + pad);
  const totalH = pad + rows * (cellH + headerH + pad);

  const cards = frames
    .map((f, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = pad + col * (cellW + pad);
      const y = pad + row * (cellH + headerH + pad);
      const uri = `data:image/png;base64,${f.buffer.toString("base64")}`;
      return `<div style="position:absolute;left:${x}px;top:${y}px;width:${cellW}px;border:1px solid #1F2B3E;background:#0E141D;">
        <div style="height:${headerH}px;line-height:${headerH}px;padding:0 10px;font-size:11px;color:#38E8DA;border-bottom:1px solid #1F2B3E;">${f.label}</div>
        <img src="${uri}" style="display:block;width:${cellW}px;height:${cellH}px;object-fit:contain;">
      </div>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${totalW}px;height:${totalH}px;background:#080C12;font-family:ui-monospace,monospace;}
  </style></head><body>${cards}<script>window.__SHEET_OK=true;</script></body></html>`;

  const shot = await withChromiumPage(
    async (page) => {
      await page.setContent(html, { waitUntil: "load" });
      await page.waitForFunction(() => (window as unknown as { __SHEET_OK?: boolean }).__SHEET_OK === true);
      return page.screenshot({ type: "png" });
    },
    { width: totalW, height: totalH },
  );
  fs.writeFileSync(outPath, shot);
}

/**
 * Renders standalone PNG, in-game GachaCard 3-panel composite, animation contact sheet,
 * reduced-motion verification, and optional video loop for visual agent inspection.
 */
export async function renderSvgInspection(
  opts: RenderInspectionOptions,
): Promise<RenderInspectionOutputs> {
  const svg = readSvgInput(opts.svgPathOrContent);
  const spec = ASSET_SPECS[opts.type];
  const vb = parseViewBox(svg, spec.viewBox);
  const outDir = path.resolve(opts.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const bundleMode = opts.filenameMode === "bundle" || opts.name === "cosmetic";
  const outFile = (suffix: string, ext = "png") =>
    bundleMode ? path.join(outDir, `${suffix}.${ext}`) : path.join(outDir, `${opts.name}-${suffix}.${ext}`);

  const standalonePng = bundleMode
    ? path.join(outDir, "standalone.png")
    : path.join(outDir, `${opts.name}.png`);

  if (opts.engine === "rsvg") {
    const tmpSvg = path.join(outDir, `.tmp-${opts.name}.svg`);
    fs.writeFileSync(tmpSvg, svg, "utf8");
    try {
      execFileSync("rsvg-convert", ["-w", String(Math.round(vb.w)), "-o", standalonePng, tmpSvg]);
    } finally {
      fs.rmSync(tmpSvg, { force: true });
    }
    return { standalonePng };
  }

  const scale = opts.scale ?? 1;
  const w = Math.round(vb.w);
  const h = Math.round(vb.h);

  // 1. Standalone PNG through <img> data URI (100% parity with CosmeticSvg.tsx)
  const standaloneBuf = await withChromiumPage(
    async (page) => {
      await page.setContent(buildStandaloneHtml(svg, w, h), { waitUntil: "load" });
      await page.waitForFunction(() => (window as unknown as { __IMG_READY?: boolean }).__IMG_READY === true);
      return page.screenshot({ type: "png", omitBackground: opts.type !== "BACK" });
    },
    { width: w, height: h, scale },
  );
  fs.writeFileSync(standalonePng, standaloneBuf);

  const outputs: RenderInspectionOutputs = { standalonePng };

  // 2. 3-panel In-Context GachaCard Composite Sheet
  if (opts.context) {
    const contextPng = outFile("context");
    const html = buildContextCompositeHtml({
      svg,
      type: opts.type,
      artDataUrl: resolveCardArtDataUrl(opts.cardArtPath),
      rarityLabel: opts.rarityLabel ?? "LENDARIA",
      foilLabel: opts.foilLabel ?? "GOLD",
    });
    const ctxBuf = await withChromiumPage(
      async (page) => {
        await page.setContent(html, { waitUntil: "load" });
        await page.waitForFunction(() => (window as unknown as { __COMPOSITE_READY?: boolean }).__COMPOSITE_READY === true);
        return page.screenshot({ type: "png", fullPage: true });
      },
      { width: 1200, height: 640 },
    );
    fs.writeFileSync(contextPng, ctxBuf);
    outputs.contextPng = contextPng;
  }

  // 3. Multi-frame animation contact sheet (CSS + SMIL seeking)
  const framesCount = opts.frames ?? 1;
  const duration = opts.durationSec ?? 5;
  if (framesCount > 1) {
    const framesPng = outFile("frames");
    const cellW = 280;
    const cellH = Math.round(cellW * (h / w));
    const captured: Array<{ label: string; buffer: Buffer }> = [];

    await withChromiumPage(
      async (page) => {
        await page.setContent(buildAnimatedInlineHtml(svg, w, h), { waitUntil: "load" });
        await page.waitForFunction(() => (window as unknown as { __ANIM_READY?: boolean }).__ANIM_READY === true);
        for (let i = 0; i < framesCount; i++) {
          const t = (i / Math.max(1, framesCount - 1)) * duration * 0.85;
          await page.evaluate(
            (sec) => (window as unknown as { __SEEK_SVG_TIME: (s: number) => void }).__SEEK_SVG_TIME(sec),
            t,
          );
          const buf = await page.screenshot({ type: "png" });
          captured.push({ label: `t = ${t.toFixed(2)}s`, buffer: buf });
        }
      },
      { width: w, height: h },
    );

    await stitchContactSheet(captured, Math.min(4, framesCount), cellW, cellH, framesPng);
    outputs.framesPng = framesPng;
  }

  // 4. Reduced motion check
  if (opts.reducedMotion) {
    const reducedPng = outFile("reduced");
    const redBuf = await withChromiumPage(
      async (page) => {
        await page.setContent(buildAnimatedInlineHtml(svg, w, h), { waitUntil: "load" });
        await page.waitForFunction(() => (window as unknown as { __ANIM_READY?: boolean }).__ANIM_READY === true);
        return page.screenshot({ type: "png" });
      },
      { width: w, height: h, reducedMotion: true },
    );
    fs.writeFileSync(reducedPng, redBuf);
    outputs.reducedPng = reducedPng;
  }

  // 5. Optional MP4 / WebP animation capture via ffmpeg
  if (opts.video) {
    const fps = 24;
    const totalFrames = Math.max(12, Math.round(duration * fps));
    const tmpDir = fs.mkdtempSync(path.join(outDir, `.vid-${opts.name}-`));
    const videoPath = bundleMode
      ? path.join(outDir, "animation.webp")
      : path.join(outDir, `${opts.name}.webp`);
    try {
      await withChromiumPage(
        async (page) => {
          await page.setContent(buildAnimatedInlineHtml(svg, w, h), { waitUntil: "load" });
          await page.waitForFunction(() => (window as unknown as { __ANIM_READY?: boolean }).__ANIM_READY === true);
          for (let i = 0; i < totalFrames; i++) {
            const t = i / fps;
            await page.evaluate(
              (sec) => (window as unknown as { __SEEK_SVG_TIME: (s: number) => void }).__SEEK_SVG_TIME(sec),
              t,
            );
            const buf = await page.screenshot({ type: "png" });
            fs.writeFileSync(path.join(tmpDir, `f_${String(i).padStart(4, "0")}.png`), buf);
          }
        },
        { width: Math.min(w, 540), height: Math.round(Math.min(w, 540) * (h / w)) },
      );
      execFileSync(
        "ffmpeg",
        [
          "-y", "-loglevel", "error", "-framerate", String(fps),
          "-i", path.join(tmpDir, "f_%04d.png"),
          "-loop", "0", "-lossless", "0", "-quality", "86", videoPath,
        ],
        { stdio: "inherit" },
      );
      outputs.videoPath = videoPath;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  return outputs;
}

/**
 * Captures a multi-step contact sheet of a GSAP timeline choreography over an SVG.
 */
export async function renderGsapContactSheet(opts: {
  svg: string;
  choreographyJs: string;
  width: number;
  height: number;
  outPath: string;
  progressStops?: readonly number[];
}): Promise<string> {
  const stops = opts.progressStops ?? [0, 0.3, 0.65, 1];
  const html = buildGsapPreviewHtml({
    svg: opts.svg,
    choreographyJs: opts.choreographyJs,
    width: opts.width,
    height: opts.height,
  });

  const captured: Array<{ label: string; buffer: Buffer }> = [];
  await withChromiumPage(
    async (page) => {
      await page.setContent(html, { waitUntil: "load" });
      await page.waitForFunction(() => (window as unknown as { __GSAP_READY?: boolean }).__GSAP_READY === true);
      for (const p of stops) {
        await page.evaluate(
          (prog) => (window as unknown as { __SEEK: (p: number) => number }).__SEEK(prog),
          p,
        );
        const buffer = await page.screenshot({ type: "png" });
        captured.push({ label: `GSAP progress = ${Math.round(p * 100)}%`, buffer });
      }
    },
    { width: opts.width, height: opts.height },
  );

  const cellW = 280;
  const cellH = Math.round(cellW * (opts.height / opts.width));
  const outAbs = path.resolve(opts.outPath);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  await stitchContactSheet(captured, Math.min(4, stops.length), cellW, cellH, outAbs);
  return outAbs;
}
