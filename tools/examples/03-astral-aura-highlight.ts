import { pathToFileURL } from "node:url";
import {
  addOrbitalSparks,
  chamferedRectPath,
  cornerFiligree,
  defineCosmetic,
  defineGlowFilter,
  defineMetallicGradient,
  defineRadialGlow,
  fourPointStar,
  injectPresetAnimations,
  runCosmeticDefinition,
  stampFourCorners,
  taperedRibbon,
} from "../src/index.ts";

export const cosmetic = defineCosmetic({
  type: "HIGHLIGHT",
  collection: "astral",
  slug: "astral-aura",
  key: "DESTAQUE_AURA_ASTRAL",
  name: "Aura Astral",
  description: "Destaque galáctico com contorno luminoso, arcos estelares e centelhas orbitais.",
  rarity: "LEGENDARY",
  price: 3400,
  tags: ["highlight", "astral", "glow", "animated"],
  renderHints: {
    frames: 4,
    durationSec: 4,
  },
  build(ctx) {
    const canvas = ctx.createCanvas({
      title: "Destaque Aura Astral",
      desc: "Aura luminosa prismática e dourada com centelhas orbitais ao redor da carta.",
    });

  const auraGrad = defineMetallicGradient(canvas, "astral-rim", "prism-holo", 130);
  const goldGrad = defineMetallicGradient(canvas, "astral-gold", "celestial-gold", 90);
  const topHalo = defineRadialGlow(canvas, "top-astral-halo", "#38E8DA", {
    innerColor: "#E2F7F9",
    innerOpacity: 0.48,
    midOpacity: 0.16,
  });
  const glowFilter = defineGlowFilter(canvas, "astral-bloom", {
    stdDeviation: 3.5,
    wideDeviation: 10,
    color: "#38BDF8",
    floodOpacity: 0.72,
    paddingPct: 12,
  });
  const goldGlow = defineGlowFilter(canvas, "astral-gold-bloom", {
    stdDeviation: 2.5,
    wideDeviation: 7,
    color: "#FCD34D",
    floodOpacity: 0.65,
    paddingPct: 35,
  });

  injectPresetAnimations(canvas, ["pulse-glow", "twinkle", "twinkle-alt"]);

  // 1. Soft glowing perimeter aura hugging the outer art border + bleed
  const haloLayer = canvas.layer("astral-halo", { className: "anim-pulse-glow" });
  canvas.addPath(haloLayer, chamferedRectPath(-2, -2, 754, 1004, 18), {
    stroke: auraGrad,
    strokeWidth: 7,
    strokeOpacity: 0.78,
    filterUrl: glowFilter,
  });
  canvas.addPath(haloLayer, chamferedRectPath(6, 6, 738, 988, 16), {
    stroke: "#F8FAFC",
    strokeWidth: 1.5,
    strokeOpacity: 0.7,
  });
  haloLayer.ellipse(420, 90).center(375, 4).fill(topHalo).opacity(0.65);

  // 2. Corner celestial flourishes in bleed & extreme corners
  const cornerLayer = canvas.layer("astral-corners");
  const corner = cornerFiligree(90, "celestial");
  for (const stamped of stampFourCorners({ x: -16, y: -16, w: 782, h: 1032 }, corner, 0)) {
    for (const p of stamped.primary) {
      canvas.addPath(cornerLayer, p, {
        fill: goldGrad,
        filterUrl: goldGlow,
      });
    }
    for (const a of stamped.accents) {
      canvas.addPath(cornerLayer, a, {
        stroke: "#E0F2FE",
        strokeWidth: 1.4,
        fill: "#E0F2FE",
      });
    }
  }

  // 3. Sweeping energy arcs at top-center & bottom-center (clear of center portrait)
  const arcLayer = canvas.layer("energy-arcs");
  const topArc = taperedRibbon(
    [
      { x: 185, y: 12 },
      { x: 375, y: -18 },
      { x: 565, y: 12 },
    ],
    (t) => Math.sin(t * Math.PI) * 9 + 1,
  );
  const bottomArc = taperedRibbon(
    [
      { x: 185, y: 988 },
      { x: 375, y: 1018 },
      { x: 565, y: 988 },
    ],
    (t) => Math.sin(t * Math.PI) * 9 + 1,
  );
  canvas.addPath(arcLayer, topArc, { fill: "#E2F7F9", filterUrl: glowFilter, opacity: 0.85 });
  canvas.addPath(arcLayer, bottomArc, { fill: goldGrad, filterUrl: goldGlow, opacity: 0.85 });

  // Cardinal flare stars
  canvas.addPath(arcLayer, fourPointStar(375, -14, 24, 5.5, { pinch: 0.48 }), {
    fill: "#FFFFFF",
    filterUrl: glowFilter,
    className: "anim-twinkle",
  });
  canvas.addPath(arcLayer, fourPointStar(375, 1014, 22, 5.5, { pinch: 0.48 }), {
    fill: "#FEF3C7",
    filterUrl: goldGlow,
    className: "anim-twinkle-alt",
  });

  // 4. Orbital dust ring around outer perimeter
  const sparksLayer = canvas.layer("orbital-sparks");
  addOrbitalSparks(sparksLayer, 375, 500, 392, 514, {
    seed: "astral-highlight-sparks",
    count: 34,
    colors: ["#7CF5EB", "#FCD34D", "#C084FC", "#FFFFFF"],
    animClass: "anim-twinkle",
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
