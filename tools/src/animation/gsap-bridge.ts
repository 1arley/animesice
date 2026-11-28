import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import gsap from "gsap";
import { lerp } from "../generative/index.ts";

const require = createRequire(import.meta.url);

export type KeyframeProperty = {
  prop: string;
  from: number;
  to: number;
  unit?: string;
  format?: (val: number) => string;
};

/**
 * Samples a real GSAP easing curve in Node to bake smooth `@keyframes` CSS rules
 * usable inside static `<img>`-hosted cosmetic SVGs without runtime JS.
 */
export function bakeGsapEaseToKeyframes(opts: {
  name: string;
  ease: string;
  steps?: number;
  yoyo?: boolean;
  properties: readonly KeyframeProperty[];
}): string {
  const easeFn = gsap.parseEase(opts.ease) ?? ((t: number) => t);
  const steps = Math.max(4, opts.steps ?? 16);
  const lines: string[] = [`@keyframes ${opts.name} {`];

  const emitStop = (pct: number, eased: number) => {
    const decls: string[] = [];
    const transforms: string[] = [];
    for (const p of opts.properties) {
      const v = lerp(p.from, p.to, eased);
      const formatted = p.format
        ? p.format(v)
        : `${Number(v.toFixed(3))}${p.unit ?? ""}`;
      if (
        p.prop === "translateX" ||
        p.prop === "translateY" ||
        p.prop === "scale" ||
        p.prop === "rotate" ||
        p.prop === "skewX"
      ) {
        transforms.push(`${p.prop}(${formatted})`);
      } else {
        decls.push(`${p.prop}: ${formatted}`);
      }
    }
    if (transforms.length > 0) {
      decls.unshift(`transform: ${transforms.join(" ")}`);
    }
    lines.push(`  ${Number(pct.toFixed(2))}% { ${decls.join("; ")}; }`);
  };

  if (opts.yoyo) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      emitStop(t * 50, easeFn(t));
    }
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      emitStop(50 + t * 50, easeFn(1 - t));
    }
  } else {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      emitStop(t * 100, easeFn(t));
    }
  }

  lines.push("}");
  return lines.join("\n");
}

function resolveGsapBrowserBundle(): string {
  const gsapMain = require.resolve("gsap");
  const dir = path.dirname(gsapMain);
  const minPath = path.join(dir, "gsap.min.js");
  return fs.existsSync(minPath) ? minPath : gsapMain;
}

/**
 * Generates an offline self-contained HTML harness running GSAP choreography over an SVG stage,
 * exposing `window.__SEEK(progress)` for deterministic Playwright frame capture.
 */
export function buildGsapPreviewHtml(opts: {
  svg: string;
  choreographyJs: string;
  width: number;
  height: number;
  background?: string;
}): string {
  const gsapCode = fs.readFileSync(resolveGsapBrowserBundle(), "utf8");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body {
    margin: 0; padding: 0;
    width: ${opts.width}px; height: ${opts.height}px;
    background: ${opts.background ?? "#080C12"};
    overflow: hidden;
  }
  #stage { width: 100%; height: 100%; position: relative; }
  #stage > svg { width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
  <div id="stage">${opts.svg}</div>
  <script>${gsapCode}</script>
  <script>
    const stage = document.getElementById("stage");
    const svg = stage.querySelector("svg");
    const tl = gsap.timeline({ paused: true });
    (function(gsap, timeline, svg, stage) {
      ${opts.choreographyJs}
    })(gsap, tl, svg, stage);
    window.__TIMELINE = tl;
    window.__SEEK = (progress) => {
      const p = Math.max(0, Math.min(1, Number(progress) || 0));
      tl.progress(p).pause();
      return p;
    };
    window.__SEEK(0);
    window.__GSAP_READY = true;
  </script>
</body>
</html>`;
}
