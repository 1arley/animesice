import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { withChromiumPage, resolveSiblingPixiModule } from "../preview/browser.ts";
import { SHADER_PRESETS, type ShaderPresetName } from "./presets.ts";

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

function buildWebGl2Html(opts: {
  fragmentShader: string;
  width: number;
  height: number;
  time: number;
  seed: number;
  transparent: boolean;
  format: "png" | "webp" | "jpeg";
  quality: number;
  colorA: [number, number, number];
  colorB: [number, number, number];
  accent: [number, number, number];
}): string {
  const mime = opts.format === "webp" ? "image/webp" : opts.format === "jpeg" ? "image/jpeg" : "image/png";
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  canvas { display: block; width: ${opts.width}px; height: ${opts.height}px; }
</style>
</head>
<body>
<canvas id="gl" width="${opts.width}" height="${opts.height}"></canvas>
<script>
const canvas = document.getElementById("gl");
const gl = canvas.getContext("webgl2", {
  alpha: ${opts.transparent ? "true" : "false"},
  premultipliedAlpha: true,
  preserveDrawingBuffer: true,
  antialias: true
});
if (!gl) throw new Error("WebGL2 context unavailable");

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) || "Shader compile error");
  }
  return s;
}

const vs = compile(gl.VERTEX_SHADER, ${JSON.stringify(VERTEX_SHADER)});
const fs = compile(gl.FRAGMENT_SHADER, ${JSON.stringify(opts.fragmentShader)});
const prog = gl.createProgram();
gl.attachShader(prog, vs);
gl.attachShader(prog, fs);
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(prog) || "Program link error");
}

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(prog, "aPosition");
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

gl.useProgram(prog);
gl.viewport(0, 0, canvas.width, canvas.height);

const uRes = gl.getUniformLocation(prog, "uResolution");
const uTime = gl.getUniformLocation(prog, "uTime");
const uSeed = gl.getUniformLocation(prog, "uSeed");
const uColA = gl.getUniformLocation(prog, "uColorA");
const uColB = gl.getUniformLocation(prog, "uColorB");
const uAccent = gl.getUniformLocation(prog, "uAccent");

window.__RENDER_FRAME = (timeSec) => {
  gl.clearColor(0, 0, 0, ${opts.transparent ? "0" : "1"});
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
  if (uTime) gl.uniform1f(uTime, timeSec);
  if (uSeed) gl.uniform1f(uSeed, ${opts.seed});
  if (uColA) gl.uniform3fv(uColA, ${JSON.stringify(opts.colorA)});
  if (uColB) gl.uniform3fv(uColB, ${JSON.stringify(opts.colorB)});
  if (uAccent) gl.uniform3fv(uAccent, ${JSON.stringify(opts.accent)});
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return canvas.toDataURL(${JSON.stringify(mime)}, ${opts.quality});
};

window.__SHADER_DATA_URL = window.__RENDER_FRAME(${opts.time});
window.__SHADER_READY = true;
</script>
</body>
</html>`;
}

export type ShaderRenderResult = {
  pngBuffer: Buffer;
  dataUri: string;
  outPath?: string;
};

/**
 * Renders a WebGL2 GLSL ES 3.00 preset or custom fragment shader headlessly in Chromium.
 */
export async function renderShaderToPng(opts: {
  preset?: ShaderPresetName;
  fragmentShader?: string;
  width?: number;
  height?: number;
  time?: number;
  seed?: number;
  transparent?: boolean;
  format?: "png" | "webp" | "jpeg";
  quality?: number;
  colorA?: [number, number, number];
  colorB?: [number, number, number];
  accent?: [number, number, number];
  outPath?: string;
}): Promise<ShaderRenderResult> {
  const preset = opts.preset ? SHADER_PRESETS[opts.preset] : undefined;
  const fragmentShader = opts.fragmentShader ?? preset?.fragmentShader;
  if (!fragmentShader) {
    throw new Error("Provide either `preset` or `fragmentShader`");
  }
  const width = opts.width ?? 750;
  const height = opts.height ?? 1000;
  const transparent = opts.transparent ?? preset?.transparent ?? false;
  const format = opts.format ?? "png";
  const quality = opts.quality ?? 0.92;
  const defaults = preset?.defaultUniforms ?? {
    colorA: [0.02, 0.05, 0.12] as [number, number, number],
    colorB: [0.08, 0.25, 0.55] as [number, number, number],
    accent: [0.22, 0.91, 0.85] as [number, number, number],
  };

  const html = buildWebGl2Html({
    fragmentShader,
    width,
    height,
    time: opts.time ?? 0,
    seed: opts.seed ?? 42,
    transparent,
    format,
    quality,
    colorA: opts.colorA ?? defaults.colorA,
    colorB: opts.colorB ?? defaults.colorB,
    accent: opts.accent ?? defaults.accent,
  });

  const dataUri = await withChromiumPage(
    async (page) => {
      await page.setContent(html, { waitUntil: "load" });
      await page.waitForFunction(() => (window as unknown as { __SHADER_READY?: boolean }).__SHADER_READY === true);
      return page.evaluate(() => (window as unknown as { __SHADER_DATA_URL: string }).__SHADER_DATA_URL);
    },
    { width, height },
  );

  const pngBuffer = Buffer.from(dataUri.split(",")[1] ?? "", "base64");
  if (opts.outPath) {
    fs.mkdirSync(path.dirname(path.resolve(opts.outPath)), { recursive: true });
    fs.writeFileSync(opts.outPath, pngBuffer);
  }
  return { pngBuffer, dataUri, outPath: opts.outPath };
}

/**
 * Renders a multi-frame WebGL2 shader animation to MP4 or animated WebP via ffmpeg.
 */
export async function renderShaderLoop(opts: {
  preset?: ShaderPresetName;
  fragmentShader?: string;
  width?: number;
  height?: number;
  fps?: number;
  durationSec?: number;
  seed?: number;
  outPath: string;
}): Promise<string> {
  const preset = opts.preset ? SHADER_PRESETS[opts.preset] : undefined;
  const fragmentShader = opts.fragmentShader ?? preset?.fragmentShader;
  if (!fragmentShader) throw new Error("Provide either `preset` or `fragmentShader`");

  const width = opts.width ?? 750;
  const height = opts.height ?? 1000;
  const fps = opts.fps ?? 24;
  const durationSec = opts.durationSec ?? 3;
  const totalFrames = Math.max(2, Math.round(fps * durationSec));
  const defaults = preset?.defaultUniforms ?? {
    colorA: [0.02, 0.05, 0.12] as [number, number, number],
    colorB: [0.08, 0.25, 0.55] as [number, number, number],
    accent: [0.22, 0.91, 0.85] as [number, number, number],
  };

  const html = buildWebGl2Html({
    fragmentShader,
    width,
    height,
    time: 0,
    seed: opts.seed ?? 42,
    transparent: preset?.transparent ?? false,
    format: "png",
    quality: 1,
    colorA: defaults.colorA,
    colorB: defaults.colorB,
    accent: defaults.accent,
  });

  const tmpDir = fs.mkdtempSync(path.join(path.dirname(path.resolve(opts.outPath)), ".shader-frames-"));
  try {
    await withChromiumPage(
      async (page) => {
        await page.setContent(html, { waitUntil: "load" });
        await page.waitForFunction(() => (window as unknown as { __SHADER_READY?: boolean }).__SHADER_READY === true);
        for (let i = 0; i < totalFrames; i++) {
          const t = i / fps;
          const dataUrl = await page.evaluate(
            (timeSec) => (window as unknown as { __RENDER_FRAME: (t: number) => string }).__RENDER_FRAME(timeSec),
            t,
          );
          const buf = Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
          fs.writeFileSync(path.join(tmpDir, `frame_${String(i).padStart(4, "0")}.png`), buf);
        }
      },
      { width, height },
    );

    const outAbs = path.resolve(opts.outPath);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    const isWebp = outAbs.toLowerCase().endsWith(".webp");
    const args = isWebp
      ? [
          "-y", "-loglevel", "error", "-framerate", String(fps),
          "-i", path.join(tmpDir, "frame_%04d.png"),
          "-loop", "0", "-lossless", "0", "-quality", "88", outAbs,
        ]
      : [
          "-y", "-loglevel", "error", "-framerate", String(fps),
          "-i", path.join(tmpDir, "frame_%04d.png"),
          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", outAbs,
        ];
    execFileSync("ffmpeg", args, { stdio: "inherit" });
    return outAbs;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Optional headless PixiJS v8 2D GPU harness resolving `../node_modules/pixi.js`
 * without duplicating the 80MB dependency inside `tools/`.
 */
export async function renderPixiSceneToPng(opts: {
  sceneCode: string;
  width?: number;
  height?: number;
  outPath?: string;
}): Promise<ShaderRenderResult> {
  const pixiPath = resolveSiblingPixiModule();
  if (!pixiPath) {
    throw new Error("Parent frontend ../node_modules/pixi.js not found.");
  }
  const pixiCode = fs.readFileSync(pixiPath, "utf8");
  const width = opts.width ?? 750;
  const height = opts.height ?? 1000;
  const pixiDataUrl = `data:application/javascript;base64,${Buffer.from(pixiCode, "utf8").toString("base64")}`;

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head>
<body>
<script type="module">
  import * as PIXI from ${JSON.stringify(pixiDataUrl)};
  const app = new PIXI.Application();
  await app.init({
    width: ${width},
    height: ${height},
    backgroundAlpha: 0,
    antialias: true,
    preserveDrawingBuffer: true
  });
  document.body.appendChild(app.canvas);
  await (async (PIXI, app) => {
    ${opts.sceneCode}
  })(PIXI, app);
  app.render();
  window.__PIXI_DATA_URL = app.canvas.toDataURL("image/png");
  window.__PIXI_READY = true;
</script>
</body>
</html>`;

  const dataUri = await withChromiumPage(
    async (page) => {
      await page.setContent(html, { waitUntil: "load" });
      await page.waitForFunction(() => (window as unknown as { __PIXI_READY?: boolean }).__PIXI_READY === true);
      return page.evaluate(() => (window as unknown as { __PIXI_DATA_URL: string }).__PIXI_DATA_URL);
    },
    { width, height },
  );

  const pngBuffer = Buffer.from(dataUri.split(",")[1] ?? "", "base64");
  if (opts.outPath) {
    fs.mkdirSync(path.dirname(path.resolve(opts.outPath)), { recursive: true });
    fs.writeFileSync(opts.outPath, pngBuffer);
  }
  return { pngBuffer, dataUri, outPath: opts.outPath };
}
