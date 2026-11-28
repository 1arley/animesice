import { pathToFileURL } from "node:url";
import {
  addStarfield,
  arcaneSeal,
  chamferedRectPath,
  defineCosmetic,
  defineGlowFilter,
  defineMetallicGradient,
  fourPointStar,
  renderGsapContactSheet,
  renderShaderToPng,
  runCosmeticDefinition,
} from "../src/index.ts";

export const cosmetic = defineCosmetic({
  type: "BACK",
  collection: "celestial",
  slug: "nebula-hybrid",
  key: "BACK_NEBULA_HYBRID",
  name: "Nebulosa Híbrida",
  description: "Verso com textura procedural WebGL2 + selo arcano vetorial.",
  rarity: "EPIC",
  price: 2200,
  tags: ["shader", "webgl2", "hybrid", "gsap"],
  optimize: false,
  async build(ctx) {
    // 1. Render deterministic WebGL2 GLSL shader backdrop into bundle assets/
    const shaderRes = await renderShaderToPng({
      preset: "celestial-nebula",
      width: 750,
      height: 1000,
      time: 1.35,
      seed: 77,
      format: "webp",
      quality: 0.9,
      outPath: ctx.assetPath("shader-celestial-nebula.webp"),
    });

    // 2. Build hybrid BACK SVG embedding the WebGL2 nebula + Paper.js crystal vector geometry
    const canvas = ctx.createCanvas({
      title: "Nebulosa Híbrida GLSL — Verso",
      desc: "Composição híbrida de shader WebGL2 GLSL embutido com geometria vetorial Paper.js e selo arcano.",
    });

    const goldGrad = defineMetallicGradient(canvas, "hybrid-gold", "celestial-gold", 135);
    const iceGrad = defineMetallicGradient(canvas, "hybrid-ice", "ice-crystal", 45);
    const glow = defineGlowFilter(canvas, "hybrid-glow", {
      stdDeviation: 2.8,
      wideDeviation: 9,
      color: "#38E8DA",
      floodOpacity: 0.65,
    });

    // Required top-level full-canvas <rect> for AnimesIce BACK contract
    canvas.addBackPlate("#040818");

    const bgLayer = canvas.layer("shader-texture");
    canvas.embedImage(bgLayer, shaderRes.dataUri, { x: 0, y: 0, w: 750, h: 1000 }, { opacity: 0.96 });

    const starsLayer = canvas.layer("vector-stars");
    addStarfield(canvas, starsLayer, { x: 40, y: 40, w: 670, h: 920 }, {
      seed: "hybrid-nebula-stars",
      minDist: 44,
      maxCount: 85,
      heroStarCount: 14,
      glowFilterUrl: glow,
    });

    const sealLayer = canvas.layer("arcane-seal", { id: "seal-group" });
    const seal = arcaneSeal(375, 490, 210, { starPoints: 6, tickCount: 36 });
    canvas.addPath(sealLayer, seal.outerRing, { stroke: iceGrad, strokeWidth: 2, filterUrl: glow });
    canvas.addPath(sealLayer, seal.innerRing, { stroke: goldGrad, strokeWidth: 1.6 });
    canvas.addPath(sealLayer, seal.polygonPath, { stroke: goldGrad, strokeWidth: 2, fill: "#05080E", fillOpacity: 0.35 });
    canvas.addPath(sealLayer, seal.rotatedPolygonPath, { stroke: iceGrad, strokeWidth: 1.4 });
    canvas.addPath(sealLayer, seal.coreRing, { stroke: "#E2F7F9", strokeWidth: 1.5 });
    for (const t of seal.ticks) {
      canvas.addPath(sealLayer, t, { stroke: "#7CF5EB", strokeWidth: 1.1, strokeOpacity: 0.7 });
    }
    for (const st of seal.cardinalStars) {
      canvas.addPath(sealLayer, st, { fill: goldGrad, filterUrl: glow });
    }

    const coreBurst = canvas.layer("core-burst", { id: "core-burst" });
    canvas.addPath(coreBurst, fourPointStar(375, 490, 56, 15, { pinch: 0.45 }), {
      fill: goldGrad,
      stroke: "#FFFBEB",
      strokeWidth: 1.2,
      filterUrl: glow,
    });

    const borderLayer = canvas.layer("crystal-border");
    canvas.addPath(borderLayer, chamferedRectPath(22, 22, 706, 956, 26), {
      stroke: goldGrad,
      strokeWidth: 2.5,
    });
    canvas.addPath(borderLayer, chamferedRectPath(34, 34, 682, 932, 20), {
      stroke: iceGrad,
      strokeWidth: 1.2,
      strokeOpacity: 0.75,
    });

    const exported = ctx.export(canvas, { optimize: false });

    // 3. Capture GSAP timeline choreography directly into bundle previews/
    await renderGsapContactSheet({
      svg: exported.svg,
      width: 750,
      height: 1000,
      outPath: ctx.previewPath("gsap-contact-sheet.png"),
      progressStops: [0, 0.35, 0.7, 1],
      choreographyJs: `
        gsap.set("#seal-group", { svgOrigin: "375 490", opacity: 0.15, scale: 0.65, rotation: -45 });
        gsap.set("#core-burst", { svgOrigin: "375 490", opacity: 0, scale: 0.1 });
        timeline
          .to("#seal-group", { opacity: 1, scale: 1, rotation: 0, duration: 1.2, ease: "power3.out" })
          .to("#core-burst", { opacity: 1, scale: 1.12, duration: 0.65, ease: "back.out(1.7)" }, "-=0.45")
          .to("#core-burst", { scale: 1, duration: 0.35, ease: "sine.inOut" });
      `,
    });

    return exported;
  },
});

export default cosmetic;

export function build(outputRoot?: string) {
  return runCosmeticDefinition(cosmetic, { outputRoot });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const res = await build();
  console.log(`Built ${res.svgPath} (${(res.optimizedBytes / 1024).toFixed(1)} KB)`);
}
