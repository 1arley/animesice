import { pathToFileURL } from "node:url";
import {
  booleanOp,
  chamferedRectPath,
  cornerFiligree,
  crownCrest,
  defineCosmetic,
  defineGlowFilter,
  defineGoldFoilFilter,
  defineMetallicGradient,
  definePattern,
  defineSheenGradient,
  fourPointStar,
  injectPresetAnimations,
  runCosmeticDefinition,
  stampFourCorners,
} from "../src/index.ts";

export const cosmetic = defineCosmetic({
  type: "FRAME",
  collection: "glacial",
  slug: "glacial-crown",
  key: "FRAME_GLACIAL_CROWN",
  name: "Moldura Coroa Glacial",
  description: "Moldura cristalina e dourada com janela chanfrada e emblema superior.",
  rarity: "LEGENDARY",
  price: 2800,
  tags: ["frame", "crystal", "gold", "hud-safe"],
  renderHints: {
    frames: 4,
    durationSec: 5,
  },
  build(ctx) {
    const canvas = ctx.createCanvas({
      title: "Moldura Coroa Glacial",
      desc: "Moldura cristalina e dourada com janela chanfrada, filigrana nos cantos e brilho especular.",
    });

  // 1. Metallic gradients, crystalline facet pattern & filters
  const iceGrad = defineMetallicGradient(canvas, "ice-bevel", "ice-crystal", 132);
  const goldGrad = defineMetallicGradient(canvas, "gold-trim", "celestial-gold", 125);
  const steelGrad = defineMetallicGradient(canvas, "obsidian-bezel", "obsidian-steel", 150);
  const sheenGrad = defineSheenGradient(canvas, "frame-sheen", "#E2F7F9", {
    peakOpacity: 0.45,
    angleDeg: 22,
  });
  const crystalPattern = definePattern(canvas, "crystal-facets", "crystalline-facets", {
    size: 42,
    color: "#38E8DA",
    secondaryColor: "#FCD34D",
    opacity: 0.28,
  });
  const goldFoilFilter = defineGoldFoilFilter(canvas, "frame-gold-foil", {
    baseFrequency: 0.6,
    specularConstant: 0.65,
    seed: 11,
  });
  const iceGlow = defineGlowFilter(canvas, "frame-ice-glow", {
    stdDeviation: 2.5,
    wideDeviation: 7,
    color: "#38E8DA",
    floodOpacity: 0.55,
  });

  // 2. Cutout mask keeping the interior 750x1000 art open
  const apertureMask = canvas.defineFrameCutoutMask("frame-aperture", {
    inset: 18,
    chamfer: 26,
  });

  injectPresetAnimations(canvas, ["shimmer-sweep", "twinkle"]);

  // 3. Bleed + Bevel Ring (clipped cleanly to the outer frame band via Paper.js subtract)
  const bezelOuter = chamferedRectPath(-30, -30, 810, 1060, 0);
  const bezelInner = chamferedRectPath(18, 18, 714, 964, 26);
  const bezelRing = booleanOp("subtract", bezelOuter, bezelInner);

  const bezelLayer = canvas.layer("bezel-base", { maskUrl: apertureMask });
  canvas.addPath(bezelLayer, bezelRing.d, {
    fill: steelGrad,
    fillRule: bezelRing.fillRule,
  });
  canvas.addPath(bezelLayer, bezelRing.d, {
    fill: crystalPattern,
    fillRule: bezelRing.fillRule,
  });

  // Animated specular sheen across the masked frame bezel only (starts off-screen left)
  bezelLayer.rect(240, 1180).move(-450, -90).fill(sheenGrad).addClass("anim-shimmer-sweep");

  // 4. Inner Edge Rims (visible inside GachaCard overflow-hidden)
  const rimLayer = canvas.layer("inner-rims");
  canvas.addPath(rimLayer, chamferedRectPath(18, 18, 714, 964, 26), {
    stroke: iceGrad,
    strokeWidth: 4.5,
    filterUrl: iceGlow,
  });
  canvas.addPath(rimLayer, chamferedRectPath(10, 10, 730, 980, 29), {
    stroke: goldGrad,
    strokeWidth: 2,
  });
  canvas.addPath(rimLayer, chamferedRectPath(24, 24, 702, 952, 23), {
    stroke: "#E2F7F9",
    strokeWidth: 1,
    strokeOpacity: 0.65,
  });

  // 5. Crystal Corner Filigrees (compact so HUD rarity/foil/condition pills remain clear)
  const cornersLayer = canvas.layer("corner-ornaments");
  const corner = cornerFiligree(82, "crystal");
  for (const stamped of stampFourCorners({ x: 0, y: 0, w: 750, h: 1000 }, corner, 4)) {
    for (const p of stamped.primary) {
      canvas.addPath(cornersLayer, p, {
        fill: goldGrad,
        stroke: "#FFFBEB",
        strokeWidth: 0.7,
        strokeOpacity: 0.65,
        filterUrl: goldFoilFilter,
      });
    }
    for (const a of stamped.accents) {
      canvas.addPath(cornersLayer, a, {
        fill: iceGrad,
        opacity: 0.9,
      });
    }
    for (const j of stamped.jewels) {
      cornersLayer.circle(j.r * 2).center(j.x, j.y).fill("#E2F7F9").opacity(0.95);
    }
  }

  // 6. Top-Center Crown Medallion (x=375 clears both TL rarity & TR foil pills!)
  const crestLayer = canvas.layer("top-bottom-crests");
  const crest = crownCrest(375, 22, 118, 42, { bandHeight: 7 });
  canvas.addPath(crestLayer, crest.bodyWithCutoutsPath, {
    fill: goldGrad,
    fillRule: crest.fillRule,
    stroke: "#FFFBEB",
    strokeWidth: 1,
    filterUrl: goldFoilFilter,
  });
  canvas.addPath(crestLayer, crest.bandPath, {
    fill: iceGrad,
    stroke: "#E2F7F9",
    strokeWidth: 0.8,
  });
  canvas.addPath(crestLayer, fourPointStar(375, 20, 12, 3.6, { pinch: 0.4 }), {
    fill: "#FFFFFF",
    filterUrl: iceGlow,
    className: "anim-twinkle",
  });

  // Bottom-center diamond clasp (x=375 clears bottom-right condition pill)
  canvas.addPath(crestLayer, fourPointStar(375, 982, 22, 7.5, { pinch: 0.28 }), {
    fill: goldGrad,
    stroke: "#FFFBEB",
    strokeWidth: 0.9,
  });
  canvas.addPath(crestLayer, fourPointStar(375, 982, 10, 3.5, { pinch: 0.25 }), {
    fill: "#60F6E9",
  });

  // Side crystal lance ticks at mid-height (right side clear of left bonus shard at x=0..60)
  canvas.addPath(crestLayer, fourPointStar(734, 500, 14, 4.5), {
    fill: iceGrad,
    filterUrl: iceGlow,
  });

    return canvas;
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
