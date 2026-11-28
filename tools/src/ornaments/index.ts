import type { Bounds, Point2D } from "../generative/index.ts";
import { polarToCartesian } from "../generative/index.ts";
import {
  bezierPath,
  booleanOp,
  chamferedRectPath,
  circlePath,
  roundPathData,
  samplePath,
  smoothPath,
  symmetricPath,
  taperedRibbon,
  transformPath,
} from "../geometry/index.ts";

/**
 * Concave 4-point celestial sparkle star with optional Bézier pinch on inner vertices.
 */
export function fourPointStar(
  cx: number,
  cy: number,
  outerR: number,
  innerR = outerR * 0.28,
  opts?: { pinch?: number; rotationDeg?: number },
): string {
  const rot = ((opts?.rotationDeg ?? 0) * Math.PI) / 180;
  const pinch = opts?.pinch ?? 0.35;
  const dirs = [
    { a: -Math.PI / 2, r: outerR, tip: true },
    { a: -Math.PI / 4, r: innerR, tip: false },
    { a: 0, r: outerR, tip: true },
    { a: Math.PI / 4, r: innerR, tip: false },
    { a: Math.PI / 2, r: outerR, tip: true },
    { a: (3 * Math.PI) / 4, r: innerR, tip: false },
    { a: Math.PI, r: outerR, tip: true },
    { a: (-3 * Math.PI) / 4, r: innerR, tip: false },
  ];

  const pts = dirs.map((d) => polarToCartesian(cx, cy, d.r, d.a + rot));
  if (pinch <= 0) {
    return roundPathData(
      pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ") + " Z",
    );
  }

  // Smooth concave curves pulled cleanly toward the inner corners
  const parts: string[] = [`M${pts[0]!.x} ${pts[0]!.y}`];
  for (let i = 0; i < pts.length; i += 2) {
    const tipA = pts[i]!;
    const valley = pts[(i + 1) % pts.length]!;
    const tipB = pts[(i + 2) % pts.length]!;
    const ctrlX = cx + (valley.x - cx) * (1 - pinch * 0.45);
    const ctrlY = cy + (valley.y - cy) * (1 - pinch * 0.45);
    parts.push(`Q${ctrlX} ${ctrlY} ${tipB.x} ${tipB.y}`);
    void tipA;
  }
  parts.push("Z");
  return roundPathData(parts.join(" "));
}

/**
 * Multi-point geometric or concave star polygon.
 */
export function multiPointStar(
  cx: number,
  cy: number,
  points: number,
  outerR: number,
  innerR: number,
  opts?: { rotationDeg?: number },
): string {
  const rot = (((opts?.rotationDeg ?? -90) * Math.PI) / 180);
  const step = Math.PI / points;
  const cmds: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const p = polarToCartesian(cx, cy, r, rot + i * step);
    cmds.push(`${i === 0 ? "M" : "L"}${p.x} ${p.y}`);
  }
  cmds.push("Z");
  return roundPathData(cmds.join(" "));
}

/**
 * True Paper.js boolean crescent moon with sharp horns.
 */
export function crescentMoon(
  cx: number,
  cy: number,
  outerR: number,
  opts?: { innerScale?: number; offsetX?: number; offsetY?: number; rotationDeg?: number },
): string {
  const innerScale = opts?.innerScale ?? 0.84;
  const offsetX = opts?.offsetX ?? outerR * 0.34;
  const offsetY = opts?.offsetY ?? -outerR * 0.14;
  const outer = circlePath(cx, cy, outerR);
  const inner = circlePath(cx + offsetX, cy + offsetY, outerR * innerScale);
  const res = booleanOp("subtract", outer, inner);
  if (opts?.rotationDeg) {
    return transformPath(res.d, { rotateDeg: opts.rotationDeg, origin: { x: cx, y: cy } });
  }
  return res.d;
}

/**
 * Double border frame with optional angular crystal chamfers and corner diamonds.
 */
export function doubleBorderFrame(
  bounds: Bounds,
  opts?: { outerInset?: number; innerInset?: number; chamfer?: number; diamondSize?: number },
): {
  outerPath: string;
  innerPath: string;
  cornerDiamonds: string[];
} {
  const outerInset = opts?.outerInset ?? 18;
  const innerInset = opts?.innerInset ?? 30;
  const chamfer = opts?.chamfer ?? 22;
  const dSize = opts?.diamondSize ?? 7;

  const outerPath = chamferedRectPath(
    bounds.x + outerInset,
    bounds.y + outerInset,
    bounds.w - outerInset * 2,
    bounds.h - outerInset * 2,
    chamfer,
  );
  const innerPath = chamferedRectPath(
    bounds.x + innerInset,
    bounds.y + innerInset,
    bounds.w - innerInset * 2,
    bounds.h - innerInset * 2,
    Math.max(0, chamfer - (innerInset - outerInset) * 0.45),
  );

  const corners: Point2D[] = [
    { x: bounds.x + innerInset + 8, y: bounds.y + innerInset + 8 },
    { x: bounds.x + bounds.w - innerInset - 8, y: bounds.y + innerInset + 8 },
    { x: bounds.x + bounds.w - innerInset - 8, y: bounds.y + bounds.h - innerInset - 8 },
    { x: bounds.x + innerInset + 8, y: bounds.y + bounds.h - innerInset - 8 },
  ];
  const cornerDiamonds = corners.map((c) => fourPointStar(c.x, c.y, dSize, dSize * 0.38, { pinch: 0.1 }));
  return { outerPath, innerPath, cornerDiamonds };
}

export type FiligreeStyle = "baroque" | "crystal" | "celestial" | "gothic" | "art-deco";

export type CornerFiligreePaths = {
  primary: string[];
  accents: string[];
  jewels: Array<{ x: number; y: number; r: number }>;
};

/**
 * Generates an intricate top-left corner ornament anchored near `(0, 0)` within `size x size`.
 * Use `stampFourCorners(bounds, corner)` to replicate cleanly into all four card corners.
 */
export function cornerFiligree(size: number, style: FiligreeStyle): CornerFiligreePaths {
  const s = size;
  if (style === "crystal") {
    const outerShard = roundPathData(
      `M0 ${s * 0.85} L0 ${s * 0.16} L${s * 0.16} 0 L${s * 0.85} 0 L${s * 0.68} ${s * 0.11} L${s * 0.2} ${s * 0.11} L${s * 0.11} ${s * 0.2} L${s * 0.11} ${s * 0.68} Z`,
    );
    const facetBlade = roundPathData(
      `M${s * 0.16} ${s * 0.16} L${s * 0.46} ${s * 0.16} L${s * 0.32} ${s * 0.29} L${s * 0.29} ${s * 0.32} L${s * 0.16} ${s * 0.46} Z`,
    );
    const needleH = roundPathData(`M${s * 0.48} ${s * 0.055} L${s * 0.98} ${s * 0.055} L${s * 0.78} ${s * 0.105} Z`);
    const needleV = roundPathData(`M${s * 0.055} ${s * 0.48} L${s * 0.055} ${s * 0.98} L${s * 0.105} ${s * 0.78} Z`);
    return {
      primary: [outerShard, facetBlade],
      accents: [needleH, needleV, fourPointStar(s * 0.24, s * 0.24, s * 0.12, s * 0.04)],
      jewels: [
        { x: s * 0.24, y: s * 0.24, r: s * 0.032 },
        { x: s * 0.56, y: s * 0.06, r: s * 0.018 },
        { x: s * 0.06, y: s * 0.56, r: s * 0.018 },
      ],
    };
  }

  if (style === "celestial") {
    const arcScroll = taperedRibbon(
      [
        { x: s * 0.06, y: s * 0.92 },
        { x: s * 0.08, y: s * 0.38 },
        { x: s * 0.22, y: s * 0.18 },
        { x: s * 0.48, y: s * 0.08 },
        { x: s * 0.94, y: s * 0.06 },
      ],
      (t) => Math.sin(t * Math.PI) * s * 0.075 + s * 0.014,
    );
    const innerFlourish = bezierPath([
      { x: s * 0.12, y: s * 0.54, handleOut: { x: 0, y: -s * 0.24 } },
      { x: s * 0.32, y: s * 0.24, handleIn: { x: -s * 0.14, y: 0.08 * s }, handleOut: { x: s * 0.12, y: -s * 0.1 } },
      { x: s * 0.56, y: s * 0.12 },
    ]);
    const cornerStar = fourPointStar(s * 0.2, s * 0.2, s * 0.13, s * 0.042, { pinch: 0.45 });
    const miniStarH = fourPointStar(s * 0.72, s * 0.14, s * 0.055, s * 0.018);
    const miniStarV = fourPointStar(s * 0.14, s * 0.72, s * 0.055, s * 0.018);
    return {
      primary: [arcScroll, cornerStar],
      accents: [innerFlourish, miniStarH, miniStarV],
      jewels: [{ x: s * 0.2, y: s * 0.2, r: s * 0.025 }],
    };
  }

  if (style === "art-deco") {
    const stepped = roundPathData(
      `M0 ${s * 0.72} L0 0 L${s * 0.72} 0 L${s * 0.72} ${s * 0.09} L${s * 0.28} ${s * 0.09} L${s * 0.28} ${s * 0.22} L${s * 0.22} ${s * 0.28} L${s * 0.09} ${s * 0.28} L${s * 0.09} ${s * 0.72} Z`,
    );
    const fan1 = roundPathData(`M${s * 0.12} ${s * 0.12} L${s * 0.55} ${s * 0.12} L${s * 0.12} ${s * 0.55} Z`);
    const ray1 = roundPathData(`M${s * 0.12} ${s * 0.12} L${s * 0.42} ${s * 0.42}`);
    const ray2 = roundPathData(`M${s * 0.12} ${s * 0.12} L${s * 0.48} ${s * 0.24}`);
    const ray3 = roundPathData(`M${s * 0.12} ${s * 0.12} L${s * 0.24} ${s * 0.48}`);
    return {
      primary: [stepped],
      accents: [fan1, ray1, ray2, ray3],
      jewels: [{ x: s * 0.18, y: s * 0.18, r: s * 0.032 }],
    };
  }

  if (style === "gothic") {
    const lance = roundPathData(
      `M0 ${s * 0.9} L${s * 0.04} ${s * 0.18} L${s * 0.18} ${s * 0.04} L${s * 0.9} 0 L${s * 0.62} ${s * 0.12} L${s * 0.25} ${s * 0.14} L${s * 0.14} ${s * 0.25} L${s * 0.12} ${s * 0.62} Z`,
    );
    const trefoil = smoothPath(
      [
        { x: s * 0.16, y: s * 0.42 },
        { x: s * 0.34, y: s * 0.34 },
        { x: s * 0.42, y: s * 0.16 },
        { x: s * 0.22, y: s * 0.22 },
      ],
      { closed: true },
    );
    return {
      primary: [lance, trefoil],
      accents: [fourPointStar(s * 0.25, s * 0.25, s * 0.09, s * 0.03)],
      jewels: [{ x: s * 0.25, y: s * 0.25, r: s * 0.024 }],
    };
  }

  // Default: baroque scroll filigree
  const mainCurl = taperedRibbon(
    [
      { x: s * 0.05, y: s * 0.9 },
      { x: s * 0.09, y: s * 0.44 },
      { x: s * 0.17, y: s * 0.2 },
      { x: s * 0.44, y: s * 0.09 },
      { x: s * 0.9, y: s * 0.05 },
    ],
    (t) => Math.sin(t * Math.PI) * s * 0.09 + s * 0.015,
  );
  const innerSpiral = taperedRibbon(
    [
      { x: s * 0.16, y: s * 0.56 },
      { x: s * 0.21, y: s * 0.29 },
      { x: s * 0.38, y: s * 0.28 },
      { x: s * 0.29, y: s * 0.41 },
    ],
    (t) => (1 - t * 0.65) * s * 0.05,
  );
  const mirrorSpiral = transformPath(innerSpiral, {
    rotateDeg: -90,
    origin: { x: s * 0.3, y: s * 0.3 },
  });
  return {
    primary: [mainCurl, innerSpiral, mirrorSpiral],
    accents: [fourPointStar(s * 0.21, s * 0.21, s * 0.085, s * 0.032)],
    jewels: [{ x: s * 0.21, y: s * 0.21, r: s * 0.025 }],
  };
}

/**
 * Stamps a top-left corner path/filigree into all four corners of `bounds`.
 */
export function stampFourCorners(
  bounds: Bounds,
  corner: CornerFiligreePaths,
  inset = 0,
): Array<{
  corner: "tl" | "tr" | "br" | "bl";
  primary: string[];
  accents: string[];
  jewels: Array<{ x: number; y: number; r: number }>;
}> {
  const x0 = bounds.x + inset;
  const y0 = bounds.y + inset;
  const x1 = bounds.x + bounds.w - inset;
  const y1 = bounds.y + bounds.h - inset;

  const mapPath = (d: string, cornerId: "tl" | "tr" | "br" | "bl"): string => {
    if (cornerId === "tl") {
      return transformPath(d, { translate: { x: x0, y: y0 } });
    }
    if (cornerId === "tr") {
      return transformPath(d, {
        scale: { x: -1, y: 1 },
        origin: { x: 0, y: 0 },
        translate: { x: x1, y: y0 },
      });
    }
    if (cornerId === "br") {
      return transformPath(d, {
        scale: { x: -1, y: -1 },
        origin: { x: 0, y: 0 },
        translate: { x: x1, y: y1 },
      });
    }
    return transformPath(d, {
      scale: { x: 1, y: -1 },
      origin: { x: 0, y: 0 },
      translate: { x: x0, y: y1 },
    });
  };

  const mapPt = (pt: { x: number; y: number; r: number }, cornerId: "tl" | "tr" | "br" | "bl") => {
    if (cornerId === "tl") return { x: x0 + pt.x, y: y0 + pt.y, r: pt.r };
    if (cornerId === "tr") return { x: x1 - pt.x, y: y0 + pt.y, r: pt.r };
    if (cornerId === "br") return { x: x1 - pt.x, y: y1 - pt.y, r: pt.r };
    return { x: x0 + pt.x, y: y1 - pt.y, r: pt.r };
  };

  return (["tl", "tr", "br", "bl"] as const).map((id) => ({
    corner: id,
    primary: corner.primary.map((d) => mapPath(d, id)),
    accents: corner.accents.map((d) => mapPath(d, id)),
    jewels: corner.jewels.map((j) => mapPt(j, id)),
  }));
}

/**
 * Regal multi-peak curved Bézier crown with inlaid celestial diamond cutouts and circlet band.
 */
export function crownCrest(
  cx: number,
  cy: number,
  width: number,
  height: number,
  opts?: { peaks?: number; bandHeight?: number },
): {
  silhouettePath: string;
  bodyWithCutoutsPath: string;
  bandPath: string;
  sparkles: string[];
  fillRule: "evenodd" | "nonzero";
} {
  const halfW = width * 0.5;
  const baseHalfW = halfW * 0.72;
  const bandH = opts?.bandHeight ?? height * 0.16;
  const baseY = cy + height * 0.35;
  const topY = cy - height * 0.65;
  const valleyY = baseY - bandH - height * 0.24;

  // Build crisp 5-peak symmetrical crown right/left profile
  const halfCrown = [
    { x: cx, y: topY, handleOut: { x: -width * 0.045, y: height * 0.32 } },
    { x: cx - halfW * 0.23, y: valleyY, handleIn: { x: width * 0.03, y: 0 }, handleOut: { x: -width * 0.03, y: -height * 0.18 } },
    { x: cx - halfW * 0.52, y: topY + height * 0.12, handleIn: { x: width * 0.02, y: height * 0.2 }, handleOut: { x: -width * 0.025, y: height * 0.26 } },
    { x: cx - halfW * 0.72, y: valleyY + height * 0.05, handleOut: { x: -width * 0.03, y: -height * 0.12 } },
    { x: cx - halfW, y: topY + height * 0.28, handleOut: { x: width * 0.05, y: height * 0.28 } },
    { x: cx - baseHalfW, y: baseY - bandH },
    { x: cx, y: baseY - bandH },
  ];

  const silhouettePath = symmetricPath(halfCrown, cx);

  const bandPath = bezierPath(
    [
      { x: cx - baseHalfW * 1.03, y: baseY - bandH, handleOut: { x: baseHalfW * 0.5, y: -bandH * 0.35 } },
      { x: cx + baseHalfW * 1.03, y: baseY - bandH, handleIn: { x: -baseHalfW * 0.5, y: -bandH * 0.35 } },
      { x: cx + baseHalfW * 1.05, y: baseY, handleOut: { x: -baseHalfW * 0.5, y: -bandH * 0.25 } },
      { x: cx - baseHalfW * 1.05, y: baseY, handleIn: { x: baseHalfW * 0.5, y: -bandH * 0.25 } },
    ],
    { closed: true },
  );

  // Inlaid 4-point celestial diamond jewels inside the main peaks
  const sparkleSpecs = [
    { x: cx, y: topY + height * 0.44, r: height * 0.14 },
    { x: cx - halfW * 0.50, y: topY + height * 0.48, r: height * 0.10 },
    { x: cx + halfW * 0.50, y: topY + height * 0.48, r: height * 0.10 },
    { x: cx - halfW * 0.84, y: topY + height * 0.54, r: height * 0.065 },
    { x: cx + halfW * 0.84, y: topY + height * 0.54, r: height * 0.065 },
  ];
  const sparkles = sparkleSpecs.map((s) => fourPointStar(s.x, s.y, s.r, s.r * 0.36, { pinch: 0.3 }));

  let current = silhouettePath;
  let fillRule: "evenodd" | "nonzero" = "nonzero";
  for (const sp of sparkles) {
    const res = booleanOp("subtract", current, sp);
    current = res.d;
    fillRule = res.fillRule;
  }

  return {
    silhouettePath,
    bodyWithCutoutsPath: current,
    bandPath,
    sparkles,
    fillRule,
  };
}

/**
 * Detailed Bézier butterfly motif in either 3/4 profile (hero accent) or symmetric top-down view.
 */
export function butterflyMotif(
  cx: number,
  cy: number,
  scale = 1,
  opts?: { variant?: "profile" | "symmetric"; angleDeg?: number; flipX?: boolean },
): {
  upperWing: string;
  lowerWing: string;
  upperWingSecondary?: string;
  lowerWingSecondary?: string;
  body: string;
  antennae: string[];
  veins: string[];
} {
  const variant = opts?.variant ?? "profile";
  const angleDeg = opts?.angleDeg ?? 0;

  if (variant === "profile") {
    const upperWing = bezierPath(
      [
        { x: -4, y: 0, handleOut: { x: 8, y: -56 } },
        { x: 34, y: -74, handleIn: { x: -16, y: 12 }, handleOut: { x: 18, y: 10 } },
        { x: 54, y: -52, handleIn: { x: -6, y: -14 }, handleOut: { x: 8, y: 26 } },
        { x: 26, y: 4, handleIn: { x: 18, y: -10 } },
      ],
      { closed: true },
    );
    const lowerWing = bezierPath(
      [
        { x: -2, y: 2, handleOut: { x: 28, y: -6 } },
        { x: 46, y: 20, handleIn: { x: -8, y: -14 }, handleOut: { x: 10, y: 22 } },
        { x: 64, y: 56, handleIn: { x: -12, y: -6 }, handleOut: { x: -18, y: 8 } },
        { x: 18, y: 38, handleIn: { x: 16, y: 6 }, handleOut: { x: -12, y: -10 } },
      ],
      { closed: true },
    );
    const upperWingSecondary = transformPath(upperWing, {
      scale: { x: 0.78, y: 0.88 },
      rotateDeg: -14,
      translate: { x: -8, y: -4 },
    });
    const body = bezierPath(
      [
        { x: -10, y: -22 },
        { x: -4, y: 2 },
        { x: 4, y: 28 },
        { x: -8, y: 4 },
      ],
      { closed: true, smooth: true },
    );
    const ant1 = bezierPath([
      { x: -9, y: -18, handleOut: { x: -6, y: -18 } },
      { x: -24, y: -40 },
    ]);
    const ant2 = bezierPath([
      { x: -7, y: -18, handleOut: { x: -2, y: -18 } },
      { x: -14, y: -44 },
    ]);
    const vein1 = bezierPath([
      { x: 0, y: -4, handleOut: { x: 18, y: -26 } },
      { x: 40, y: -50 },
    ]);
    const vein2 = bezierPath([
      { x: 2, y: 4, handleOut: { x: 22, y: 8 } },
      { x: 44, y: 34 },
    ]);

    const xform = (d: string) =>
      transformPath(d, {
        scale: { x: (opts?.flipX ? -1 : 1) * scale, y: scale },
        origin: { x: 0, y: 0 },
        rotateDeg: angleDeg,
        translate: { x: cx, y: cy },
      });

    return {
      upperWing: xform(upperWing),
      lowerWing: xform(lowerWing),
      upperWingSecondary: xform(upperWingSecondary),
      body: xform(body),
      antennae: [xform(ant1), xform(ant2)],
      veins: [xform(vein1), xform(vein2)],
    };
  }

  // Symmetric top-down view
  const rightUpper = bezierPath(
    [
      { x: 2, y: -6, handleOut: { x: 22, y: -46 } },
      { x: 58, y: -48, handleIn: { x: -18, y: -10 }, handleOut: { x: 14, y: 24 } },
      { x: 48, y: 2, handleIn: { x: 14, y: -12 }, handleOut: { x: -14, y: 8 } },
      { x: 3, y: 4 },
    ],
    { closed: true },
  );
  const rightLower = bezierPath(
    [
      { x: 3, y: 4, handleOut: { x: 32, y: 4 } },
      { x: 44, y: 34, handleIn: { x: 4, y: -16 }, handleOut: { x: -6, y: 24 } },
      { x: 18, y: 58, handleIn: { x: 12, y: -2 }, handleOut: { x: -10, y: -14 } },
      { x: 2, y: 24 },
    ],
    { closed: true },
  );
  const leftUpper = transformPath(rightUpper, { scale: { x: -1, y: 1 }, origin: { x: 0, y: 0 } });
  const leftLower = transformPath(rightLower, { scale: { x: -1, y: 1 }, origin: { x: 0, y: 0 } });
  const body = bezierPath(
    [
      { x: 0, y: -24 },
      { x: 4, y: -4 },
      { x: 3, y: 26 },
      { x: 0, y: 34 },
      { x: -3, y: 26 },
      { x: -4, y: -4 },
    ],
    { closed: true, smooth: true },
  );
  const antL = bezierPath([{ x: -2, y: -22, handleOut: { x: -6, y: -18 } }, { x: -16, y: -42 }]);
  const antR = bezierPath([{ x: 2, y: -22, handleOut: { x: 6, y: -18 } }, { x: 16, y: -42 }]);

  const xform = (d: string) =>
    transformPath(d, {
      scale: { x: (opts?.flipX ? -1 : 1) * scale, y: scale },
      origin: { x: 0, y: 0 },
      rotateDeg: angleDeg,
      translate: { x: cx, y: cy },
    });

  return {
    upperWing: xform(rightUpper),
    lowerWing: xform(rightLower),
    upperWingSecondary: xform(leftUpper),
    lowerWingSecondary: xform(leftLower),
    body: xform(body),
    antennae: [xform(antL), xform(antR)],
    veins: [],
  };
}

/**
 * Tapered shooting star streak + glowing 4-point celestial head.
 */
export function shootingStar(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opts?: { tailWidth?: number; headRadius?: number },
): { tailPath: string; headStarPath: string; coreRadius: number; head: Point2D } {
  const tailW = opts?.tailWidth ?? 3.6;
  const headR = opts?.headRadius ?? 11;
  const tailPath = taperedRibbon(
    [
      { x: x1, y: y1 },
      { x: (x1 + x2) * 0.5, y: (y1 + y2) * 0.5 },
      { x: x2, y: y2 },
    ],
    (t) => tailW * Math.pow(t, 1.45),
    { steps: 14, smooth: false },
  );
  const headStarPath = fourPointStar(x2, y2, headR, headR * 0.25, { pinch: 0.45 });
  return { tailPath, headStarPath, coreRadius: headR * 0.16, head: { x: x2, y: y2 } };
}

/**
 * Generates interlocking braided chevron/teardrop Bézier links along any curve path.
 */
export function braidAlongPath(
  pathData: string,
  opts: { links: number; width: number; overlap?: number },
): Array<{ leftPath: string; rightPath: string; center: Point2D }> {
  const samples = samplePath(pathData, Math.max(4, opts.links));
  const stepDist =
    samples.length > 1
      ? Math.hypot(samples[1]!.x - samples[0]!.x, samples[1]!.y - samples[0]!.y)
      : opts.width;
  const linkLen = stepDist * (opts.overlap ?? 1.25);
  const halfW = opts.width * 0.5;

  const basePlaitL = bezierPath(
    [
      { x: -linkLen * 0.45, y: -halfW * 0.2 },
      { x: 0, y: -halfW * 0.95, handleIn: { x: -linkLen * 0.2, y: 0 }, handleOut: { x: linkLen * 0.35, y: 0 } },
      { x: linkLen * 0.55, y: 0 },
      { x: 0, y: halfW * 0.12 },
    ],
    { closed: true, smooth: true },
  );
  const basePlaitR = bezierPath(
    [
      { x: -linkLen * 0.45, y: halfW * 0.2 },
      { x: 0, y: -halfW * 0.12 },
      { x: linkLen * 0.55, y: 0 },
      { x: 0, y: halfW * 0.95, handleIn: { x: linkLen * 0.35, y: 0 }, handleOut: { x: -linkLen * 0.2, y: 0 } },
    ],
    { closed: true, smooth: true },
  );

  return samples.map((s) => ({
    center: { x: s.x, y: s.y },
    leftPath: transformPath(basePlaitL, {
      origin: { x: 0, y: 0 },
      rotateDeg: s.angleDeg,
      translate: { x: s.x, y: s.y },
    }),
    rightPath: transformPath(basePlaitR, {
      origin: { x: 0, y: 0 },
      rotateDeg: s.angleDeg,
      translate: { x: s.x, y: s.y },
    }),
  }));
}

/**
 * Concentric arcane / celestial seal geometry (rings, radial ticks, polygrams, cardinal stars).
 */
export function arcaneSeal(
  cx: number,
  cy: number,
  radius: number,
  opts?: { starPoints?: number; tickCount?: number },
): {
  outerRing: string;
  innerRing: string;
  coreRing: string;
  polygonPath: string;
  rotatedPolygonPath: string;
  ticks: string[];
  cardinalStars: string[];
} {
  const starPts = opts?.starPoints ?? 4;
  const tickCount = opts?.tickCount ?? 24;
  const outerRing = circlePath(cx, cy, radius);
  const innerRing = circlePath(cx, cy, radius * 0.84);
  const coreRing = circlePath(cx, cy, radius * 0.42);
  const polygonPath = multiPointStar(cx, cy, starPts, radius * 0.84, radius * 0.56);
  const rotatedPolygonPath = multiPointStar(cx, cy, starPts, radius * 0.78, radius * 0.46, {
    rotationDeg: -90 + 180 / starPts,
  });

  const ticks: string[] = [];
  for (let i = 0; i < tickCount; i++) {
    const a = (i / tickCount) * Math.PI * 2;
    const r0 = i % 3 === 0 ? radius * 0.85 : radius * 0.9;
    const r1 = radius * 0.98;
    const p0 = polarToCartesian(cx, cy, r0, a);
    const p1 = polarToCartesian(cx, cy, r1, a);
    ticks.push(roundPathData(`M${p0.x} ${p0.y} L${p1.x} ${p1.y}`));
  }

  const cardinalStars = [0, 90, 180, 270].map((deg) => {
    const p = polarToCartesian(cx, cy, radius * 0.92, (deg * Math.PI) / 180);
    return fourPointStar(p.x, p.y, radius * 0.09, radius * 0.03);
  });

  return {
    outerRing,
    innerRing,
    coreRing,
    polygonPath,
    rotatedPolygonPath,
    ticks,
    cardinalStars,
  };
}
