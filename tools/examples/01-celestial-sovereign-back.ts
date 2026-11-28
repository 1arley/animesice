import { pathToFileURL } from "node:url";
import {
  addGlitterSpecks,
  addParticleRibbon,
  addShootingStars,
  addStarfield,
  arcaneSeal,
  bakeGsapEaseToKeyframes,
  braidAlongPath,
  butterflyMotif,
  cornerFiligree,
  crescentMoon,
  crownCrest,
  defineCosmetic,
  defineGlowFilter,
  defineGoldFoilFilter,
  defineLinearGradient,
  defineMetallicGradient,
  definePaperGrainFilter,
  definePattern,
  defineRadialGlow,
  defineSheenGradient,
  doubleBorderFrame,
  fourPointStar,
  injectPresetAnimations,
  runCosmeticDefinition,
  smoothPath,
  stampFourCorners,
  taperedRibbon,
} from "../src/index.ts";

export const cosmetic = defineCosmetic({
  type: "BACK",
  collection: "celestial",
  slug: "celestial-sovereign",
  key: "BACK_CELESTIAL_SOVEREIGN",
  name: "Soberana Celestial",
  description: "Verso azul meia-noite com folha de ouro, crescente lunar, coroa e borboletas estelares.",
  rarity: "LEGENDARY",
  price: 3600,
  tags: ["celestial", "gold-foil", "animated", "starfield"],
  renderHints: {
    frames: 4,
    durationSec: 6,
    reducedMotion: true,
  },
  build(ctx) {
    const canvas = ctx.createCanvas({
      title: "Soberana Celestial — Verso de Carta",
      desc: "Verso celestial em azul meia-noite e folha de ouro com coroa, crescente, borboletas e poeira estelar.",
    });

  // 1. Gradients, patterns & filters
  const skyGrad = defineLinearGradient(
    canvas,
    "sky-bg",
    [
      { offset: 0, color: "#030716" },
      { offset: 0.42, color: "#0A1B47" },
      { offset: 0.72, color: "#0D245E" },
      { offset: 1, color: "#040818" },
    ],
    155,
  );
  const goldGrad = defineMetallicGradient(canvas, "gold-foil", "celestial-gold", 128);
  const goldTrimGrad = defineMetallicGradient(canvas, "gold-trim", "gold-foil", 45);
  const wingBlueGrad = defineMetallicGradient(canvas, "wing-blue", "royal-ribbon-blue", 140);
  const ribbonBlueGrad = defineLinearGradient(
    canvas,
    "ribbon-blue",
    [
      { offset: 0, color: "#1E40AF", opacity: 0.75 },
      { offset: 0.48, color: "#3B82F6", opacity: 0.42 },
      { offset: 1, color: "#0F172A", opacity: 0 },
    ],
    15,
  );
  const ribbonGoldGrad = defineLinearGradient(
    canvas,
    "ribbon-gold",
    [
      { offset: 0, color: "#FFFBEB", opacity: 0.86 },
      { offset: 0.35, color: "#FDE047", opacity: 0.55 },
      { offset: 0.72, color: "#F59E0B", opacity: 0.24 },
      { offset: 1, color: "#D97706", opacity: 0 },
    ],
    18,
  );

  const nebulaCenter = defineRadialGlow(canvas, "nebula-center", "#2563EB", {
    innerColor: "#38BDF8",
    innerOpacity: 0.26,
    midOpacity: 0.14,
    midStop: 0.52,
  });
  const warmAura = defineRadialGlow(canvas, "warm-aura", "#F59E0B", {
    innerColor: "#FEF3C7",
    innerOpacity: 0.2,
    midOpacity: 0.08,
  });
  const sheenGrad = defineSheenGradient(canvas, "celestial-sheen", "#FFFBEB", {
    peakOpacity: 0.24,
    angleDeg: 22,
  });

  const grainFilter = definePaperGrainFilter(canvas, "celestial-grain", {
    baseFrequency: 0.85,
    numOctaves: 3,
    opacity: 0.12,
    seed: 13,
  });
  const goldFoilFilter = defineGoldFoilFilter(canvas, "gold-leaf-filter", {
    baseFrequency: 0.68,
    surfaceScale: 2.0,
    specularConstant: 0.65,
    specularExponent: 20,
    seed: 29,
    lightX: 375,
    lightY: 240,
    lightZ: 280,
  });
  const starGlow = defineGlowFilter(canvas, "star-glow", {
    stdDeviation: 2.4,
    wideDeviation: 7,
    color: "#93C5FD",
    floodOpacity: 0.6,
  });
  const goldGlow = defineGlowFilter(canvas, "gold-glow", {
    stdDeviation: 2.2,
    wideDeviation: 6.5,
    color: "#FCD34D",
    floodOpacity: 0.55,
  });

  const stardustPattern = definePattern(canvas, "stardust-tile", "stardust", {
    size: 76,
    color: "#93C5FD",
    secondaryColor: "#FDE68A",
    opacity: 0.18,
  });

  const artClip = canvas.defineArtWindowClip("art-clip");

  // 2. Animations (CSS keyframes + GSAP-sampled ease baked for <img> compatibility)
  injectPresetAnimations(canvas, ["twinkle", "twinkle-alt", "float", "meteor-streak"]);
  const sweepKeyframes = bakeGsapEaseToKeyframes({
    name: "gsap-celestial-sweep",
    ease: "power2.inOut",
    steps: 18,
    properties: [
      { prop: "translateX", from: 0, to: 1500, unit: "px" },
      { prop: "skewX", from: -18, to: -18, unit: "deg" },
    ],
  });
  canvas.addStyle(
    `${sweepKeyframes}\n.celestial-sweep { opacity: 0.9; transform: translateX(0px); animation: gsap-celestial-sweep 6.4s linear infinite; }`,
  );

  // 3. Background & Nebula Plate (required top-level full-canvas <rect> for BACK audit)
  canvas.addBackPlate(skyGrad, { filterUrl: grainFilter });

  const nebulaLayer = canvas.layer("nebula", { clipPathUrl: artClip });
  nebulaLayer.rect(750, 1000).move(0, 0).fill(stardustPattern);
  nebulaLayer.circle(720).center(375, 420).fill(nebulaCenter);
  nebulaLayer.circle(540).center(200, 760).fill(nebulaCenter).opacity(0.75);
  nebulaLayer.circle(460).center(375, 295).fill(warmAura);

  // 4. Deep Starfield & Shooting Stars
  const skyLayer = canvas.layer("stars", { clipPathUrl: artClip });
  addStarfield(canvas, skyLayer, { x: 34, y: 34, w: 682, h: 932 }, {
    seed: "celestial-sovereign-sky",
    minDist: 32,
    maxCount: 195,
    heroStarCount: 22,
    colors: ["#FFFFFF", "#E0F2FE", "#FEF3C7", "#93C5FD"],
    glowFilterUrl: starGlow,
    twinkleClasses: ["anim-twinkle", "anim-twinkle-alt"],
  });
  addShootingStars(skyLayer, { x: 40, y: 40, w: 670, h: 660 }, {
    seed: "celestial-meteors",
    count: 5,
    angleDeg: 148,
    lengthRange: [150, 290],
    color: "#E0F2FE",
    headColor: "#FFFFFF",
    glowFilterUrl: starGlow,
    animClass: "anim-meteor-streak",
  });

  // 5. Arcane Seal Halo behind central emblem
  const auraLayer = canvas.layer("arcane-halo", { opacity: 0.42 });
  const seal = arcaneSeal(375, 465, 215, { starPoints: 8, tickCount: 36 });
  canvas.addPath(auraLayer, seal.outerRing, { stroke: "#93C5FD", strokeWidth: 1.2, strokeDasharray: "6 5" });
  canvas.addPath(auraLayer, seal.innerRing, { stroke: "#FCD34D", strokeWidth: 1, strokeOpacity: 0.65 });
  canvas.addPath(auraLayer, seal.coreRing, { stroke: "#93C5FD", strokeWidth: 0.9, strokeOpacity: 0.5 });
  for (const t of seal.ticks) {
    canvas.addPath(auraLayer, t, { stroke: "#BAE6FD", strokeWidth: 1, strokeOpacity: 0.45 });
  }

  // 6. Swirling Cosmic Stardust Ribbons (lower & mid-arc composition)
  const ribbonLayer = canvas.layer("cosmic-ribbons", { clipPathUrl: artClip });
  const swirlArcA = taperedRibbon(
    [
      { x: 55, y: 740 },
      { x: 185, y: 615 },
      { x: 380, y: 725 },
      { x: 560, y: 830 },
      { x: 715, y: 805 },
    ],
    (t) => Math.sin(t * Math.PI) * 58 + 6,
    { steps: 42 },
  );
  const swirlArcB = taperedRibbon(
    [
      { x: 85, y: 830 },
      { x: 255, y: 760 },
      { x: 440, y: 850 },
      { x: 650, y: 890 },
    ],
    (t) => Math.sin(t * Math.PI) * 38 + 4,
    { steps: 36 },
  );
  canvas.addPath(ribbonLayer, swirlArcA, { fill: ribbonBlueGrad, opacity: 0.85 });
  canvas.addPath(ribbonLayer, swirlArcB, { fill: ribbonGoldGrad, opacity: 0.72 });

  const flowSpine = smoothPath([
    { x: 70, y: 775 },
    { x: 230, y: 660 },
    { x: 440, y: 785 },
    { x: 685, y: 845 },
  ]);
  addParticleRibbon(ribbonLayer, flowSpine, {
    seed: "stardust-swirl",
    count: 110,
    spread: 30,
    colors: ["#FEF3C7", "#E0F2FE", "#FDE047", "#93C5FD"],
  });

  // 7. Central Celestial Hero Emblem (Crescent, Crown, Braid, Twin Butterflies)
  const emblemLayer = canvas.layer("hero-emblem");

  // Crescent Moon flanking left of crown with clean separation
  const moonD = crescentMoon(188, 298, 92, {
    innerScale: 0.83,
    offsetX: 30,
    offsetY: -14,
    rotationDeg: -24,
  });
  canvas.addPath(emblemLayer, moonD, {
    fill: goldGrad,
    stroke: "#FFFBEB",
    strokeWidth: 1.2,
    strokeOpacity: 0.65,
    filterUrl: goldFoilFilter,
  });

  // Regal 5-peak gold-leaf crown
  const crown = crownCrest(375, 295, 290, 210);
  const crownClip = canvas.defineClipPath("crown-clip", (c) => {
    c.path(crown.bodyWithCutoutsPath);
  });
  canvas.addPath(emblemLayer, crown.bodyWithCutoutsPath, {
    fill: goldGrad,
    fillRule: crown.fillRule,
    stroke: "#FFFBEB",
    strokeWidth: 1.4,
    strokeOpacity: 0.8,
    filterUrl: goldFoilFilter,
  });
  addGlitterSpecks(emblemLayer, { x: 220, y: 150, w: 310, h: 250 }, {
    seed: "crown-glitter",
    count: 68,
    clipPathUrl: crownClip,
  });
  canvas.addPath(emblemLayer, crown.bandPath, {
    fill: goldTrimGrad,
    stroke: "#FFFBEB",
    strokeWidth: 1.2,
    filterUrl: goldFoilFilter,
  });
  for (const sp of crown.sparkles) {
    canvas.addPath(emblemLayer, sp, {
      fill: "#FFFBEB",
      opacity: 0.9,
      filterUrl: goldGlow,
      className: "anim-twinkle",
    });
  }

  // Graceful braided gold garland beneath crown
  const braidCurve = smoothPath([
    { x: 252, y: 416 },
    { x: 375, y: 462 },
    { x: 498, y: 416 },
  ]);
  const braidLinks = braidAlongPath(braidCurve, { links: 11, width: 22, overlap: 1.25 });
  for (const link of braidLinks) {
    canvas.addPath(emblemLayer, link.leftPath, {
      fill: goldGrad,
      stroke: "#9A6708",
      strokeWidth: 0.9,
    });
    canvas.addPath(emblemLayer, link.rightPath, {
      fill: goldTrimGrad,
      stroke: "#9A6708",
      strokeWidth: 0.9,
    });
  }

  // Center emblem diamond medallion
  const centerMedallion = fourPointStar(375, 535, 54, 18, { pinch: 0.4 });
  canvas.addPath(emblemLayer, centerMedallion, {
    fill: goldGrad,
    stroke: "#FFFBEB",
    strokeWidth: 1.5,
    filterUrl: goldGlow,
  });
  canvas.addPath(emblemLayer, fourPointStar(375, 535, 24, 7, { pinch: 0.3 }), {
    fill: "#FFFBEB",
    opacity: 0.95,
  });

  // Hero Butterfly 1: Golden foil butterfly at upper-right
  const goldFly = butterflyMotif(555, 360, 0.96, {
    variant: "profile",
    angleDeg: -14,
  });
  const flyGroupGold = emblemLayer.group().addClass("anim-float");
  if (goldFly.upperWingSecondary) {
    canvas.addPath(flyGroupGold, goldFly.upperWingSecondary, {
      fill: goldTrimGrad,
      opacity: 0.72,
      stroke: "#FFFBEB",
      strokeWidth: 1,
    });
  }
  canvas.addPath(flyGroupGold, goldFly.lowerWing, {
    fill: goldGrad,
    stroke: "#FFFBEB",
    strokeWidth: 1.2,
    filterUrl: goldFoilFilter,
  });
  canvas.addPath(flyGroupGold, goldFly.upperWing, {
    fill: goldGrad,
    stroke: "#FFFBEB",
    strokeWidth: 1.4,
    filterUrl: goldFoilFilter,
  });
  canvas.addPath(flyGroupGold, goldFly.body, { fill: "#FFF8DC" });
  for (const ant of goldFly.antennae) {
    canvas.addPath(flyGroupGold, ant, { stroke: "#FEF3C7", strokeWidth: 1.4, strokeLinecap: "round" });
  }

  // Hero Butterfly 2: Starry midnight-blue butterfly at lower-left
  const blueFly = butterflyMotif(195, 710, 1.16, {
    variant: "profile",
    angleDeg: 14,
    flipX: true,
  });
  const flyGroupBlue = emblemLayer.group().addClass("anim-float");
  if (blueFly.upperWingSecondary) {
    canvas.addPath(flyGroupBlue, blueFly.upperWingSecondary, {
      fill: "#0B1B46",
      stroke: "#E0F2FE",
      strokeWidth: 1.2,
      opacity: 0.85,
    });
  }
  canvas.addPath(flyGroupBlue, blueFly.lowerWing, {
    fill: wingBlueGrad,
    stroke: "#F8FAFC",
    strokeWidth: 1.5,
  });
  canvas.addPath(flyGroupBlue, blueFly.upperWing, {
    fill: wingBlueGrad,
    stroke: "#F8FAFC",
    strokeWidth: 1.7,
  });
  for (const v of blueFly.veins) {
    canvas.addPath(flyGroupBlue, v, { stroke: "#93C5FD", strokeWidth: 1, strokeOpacity: 0.6 });
  }
  canvas.addPath(flyGroupBlue, blueFly.body, { fill: "#E0F2FE" });
  for (const ant of blueFly.antennae) {
    canvas.addPath(flyGroupBlue, ant, { stroke: "#E0F2FE", strokeWidth: 1.4, strokeLinecap: "round" });
  }
  addGlitterSpecks(flyGroupBlue, { x: 105, y: 615, w: 170, h: 170 }, {
    seed: "blue-butterfly-stars",
    count: 26,
    colors: ["#FFFFFF", "#BAE6FD", "#FEF08A"],
    radiusRange: [0.7, 1.8],
  });

  // Hero accent 4-point stars (balancing left & right)
  canvas.addPath(emblemLayer, fourPointStar(132, 540, 26, 7, { pinch: 0.45 }), {
    fill: goldGrad,
    filterUrl: goldGlow,
    className: "anim-twinkle",
  });
  canvas.addPath(emblemLayer, fourPointStar(618, 635, 30, 8, { pinch: 0.45 }), {
    fill: goldGrad,
    filterUrl: goldGlow,
    className: "anim-twinkle-alt",
  });
  canvas.addPath(emblemLayer, fourPointStar(602, 165, 16, 4.5, { pinch: 0.42 }), {
    fill: "#FFFBEB",
    filterUrl: starGlow,
  });

  // 8. Ornate Double Border & 4-Corner Celestial Filigree
  const borderLayer = canvas.layer("border-frame");
  const frame = doubleBorderFrame({ x: 0, y: 0, w: 750, h: 1000 }, {
    outerInset: 22,
    innerInset: 34,
    chamfer: 22,
    diamondSize: 8,
  });
  canvas.addPath(borderLayer, frame.outerPath, {
    stroke: goldGrad,
    strokeWidth: 2.6,
  });
  canvas.addPath(borderLayer, frame.innerPath, {
    stroke: "#93C5FD",
    strokeWidth: 1.1,
    strokeOpacity: 0.55,
  });
  for (const d of frame.cornerDiamonds) {
    canvas.addPath(borderLayer, d, { fill: "#FFFBEB", opacity: 0.9 });
  }

  const corner = cornerFiligree(108, "celestial");
  for (const stamped of stampFourCorners({ x: 0, y: 0, w: 750, h: 1000 }, corner, 22)) {
    for (const p of stamped.primary) {
      canvas.addPath(borderLayer, p, { fill: goldGrad, stroke: "#FFFBEB", strokeWidth: 0.7, strokeOpacity: 0.55 });
    }
    for (const a of stamped.accents) {
      canvas.addPath(borderLayer, a, { stroke: "#E0F2FE", strokeWidth: 1.1, strokeOpacity: 0.75, fill: "#E0F2FE", fillOpacity: 0.7 });
    }
  }

  // Subtle top & bottom AnimesIce celestial micro-wordmark
  canvas.addText(borderLayer, "✦  ANIMESICE  ✦", 375, 952, {
    fill: "#FDE68A",
    fontSize: 13,
    letterSpacing: "0.28em",
    opacity: 0.75,
  });

  // 9. Specular Sweep Layer (off-canvas by default so reduced-motion stays clean)
  const sheenLayer = canvas.layer("specular-sweep", { clipPathUrl: artClip, blendMode: "screen" });
  sheenLayer.rect(240, 1100).move(-450, -50).fill(sheenGrad).addClass("celestial-sweep");

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
