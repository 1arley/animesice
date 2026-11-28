import type { Element as SvgElement } from "@svgdotjs/svg.js";
import type { CosmeticCanvas } from "../compositor/index.ts";

export type AnimationPresetName =
  | "twinkle"
  | "twinkle-alt"
  | "float"
  | "shimmer-sweep"
  | "pulse-glow"
  | "orbit-spin"
  | "meteor-streak"
  | "dash-flow"
  | "hue-prism";

const PRESET_CSS: Record<AnimationPresetName, string> = {
  twinkle: `
@keyframes ai-twinkle {
  0%, 100% { opacity: 0.35; transform: scale(0.86); }
  50% { opacity: 1; transform: scale(1.12); }
}
.anim-twinkle {
  transform-box: fill-box;
  transform-origin: center;
  animation: ai-twinkle 3.4s ease-in-out infinite;
}`.trim(),

  "twinkle-alt": `
@keyframes ai-twinkle-alt {
  0%, 100% { opacity: 0.92; transform: scale(1.06); }
  50% { opacity: 0.25; transform: scale(0.82); }
}
.anim-twinkle-alt {
  transform-box: fill-box;
  transform-origin: center;
  animation: ai-twinkle-alt 4.3s ease-in-out 1.1s infinite;
}`.trim(),

  float: `
@keyframes ai-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-7px); }
}
.anim-float {
  transform-box: fill-box;
  transform-origin: center;
  animation: ai-float 5.2s ease-in-out infinite;
}`.trim(),

  "shimmer-sweep": `
@keyframes ai-shimmer-sweep {
  0% { transform: translateX(0px) skewX(-18deg); opacity: 0; }
  12% { opacity: 0.72; }
  88% { opacity: 0.72; }
  100% { transform: translateX(1550px) skewX(-18deg); opacity: 0; }
}
.anim-shimmer-sweep {
  opacity: 0;
  animation: ai-shimmer-sweep 5.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}`.trim(),

  "pulse-glow": `
@keyframes ai-pulse-glow {
  0%, 100% { opacity: 0.52; }
  50% { opacity: 1; }
}
.anim-pulse-glow {
  animation: ai-pulse-glow 3.8s ease-in-out infinite;
}`.trim(),

  "orbit-spin": `
@keyframes ai-orbit-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.anim-orbit-spin {
  transform-box: fill-box;
  transform-origin: center;
  animation: ai-orbit-spin 24s linear infinite;
}`.trim(),

  "meteor-streak": `
@keyframes ai-meteor-streak {
  0%, 100% { opacity: 0.45; transform: translate(0px, 0px); }
  50% { opacity: 1; transform: translate(-18px, 11px); }
}
.anim-meteor-streak {
  animation: ai-meteor-streak 4.8s ease-in-out infinite;
}`.trim(),

  "dash-flow": `
@keyframes ai-dash-flow {
  0% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -160; }
}
.anim-dash-flow {
  stroke-dasharray: 28 12;
  animation: ai-dash-flow 4s linear infinite;
}`.trim(),

  "hue-prism": `
@keyframes ai-hue-prism {
  0%, 100% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(42deg); }
}
.anim-hue-prism {
  animation: ai-hue-prism 6s ease-in-out infinite;
}`.trim(),
};

/**
 * Registers CSS `@keyframes` presets inside the SVG `<style>` tag so animations run natively
 * inside `<img src="data:image/svg+xml,...">` and respect `prefers-reduced-motion`.
 */
export function injectPresetAnimations(
  canvas: CosmeticCanvas,
  presets: readonly AnimationPresetName[],
): void {
  const unique = [...new Set(presets)];
  const css = unique.map((name) => PRESET_CSS[name]).join("\n");
  if (css) canvas.addStyle(css);
}

export function addCssKeyframes(
  canvas: CosmeticCanvas,
  name: string,
  keyframesBody: string,
  selector: string,
  animationValue: string,
  extraDeclarations = "",
): void {
  const css = `
@keyframes ${name} {
${keyframesBody}
}
${selector} {
  ${extraDeclarations}
  animation: ${name} ${animationValue};
}`.trim();
  canvas.addStyle(css);
}

/**
 * Adds a native SVG SMIL `<animate>` child element (supported inside `<img>` SVGs).
 */
export function addSmilAnimate(
  el: SvgElement,
  attrs: {
    attributeName: string;
    values: string;
    dur: string;
    begin?: string;
    repeatCount?: string;
    calcMode?: "linear" | "spline" | "discrete" | "paced";
    keySplines?: string;
    keyTimes?: string;
  },
) {
  return el.element("animate", {
    attributeName: attrs.attributeName,
    values: attrs.values,
    dur: attrs.dur,
    begin: attrs.begin ?? "0s",
    repeatCount: attrs.repeatCount ?? "indefinite",
    ...(attrs.calcMode ? { calcMode: attrs.calcMode } : {}),
    ...(attrs.keySplines ? { keySplines: attrs.keySplines } : {}),
    ...(attrs.keyTimes ? { keyTimes: attrs.keyTimes } : {}),
  });
}

export function addSmilTransform(
  el: SvgElement,
  attrs: {
    type: "translate" | "scale" | "rotate" | "skewX" | "skewY";
    values: string;
    dur: string;
    begin?: string;
    repeatCount?: string;
    additive?: "replace" | "sum";
  },
) {
  return el.element("animateTransform", {
    attributeName: "transform",
    type: attrs.type,
    values: attrs.values,
    dur: attrs.dur,
    begin: attrs.begin ?? "0s",
    repeatCount: attrs.repeatCount ?? "indefinite",
    ...(attrs.additive ? { additive: attrs.additive } : {}),
  });
}
