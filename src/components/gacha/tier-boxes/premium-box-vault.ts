import * as THREE from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import {
  TAU,
  VAULT_DIM,
  clamp,
  eIn,
  eInOut,
  eOut,
  lerp,
  mulberry32,
  sstep,
} from "../common-box/common-box-palette";
import {
  circlePts,
  createDustMaterial,
  createGlowSprite,
  createInnerFloorMaterial,
  createPulseMaterial,
  createRingMaterial,
  createScanMaterial,
  createThickLine,
  loopPts,
  seg,
  type LineHelperRegistry,
} from "../common-box/common-box-shaders";
import {
  PREMIUM_TIMELINE,
  type TierBoxPalette,
  type TierVaultController,
  type TierVaultUpdateParams,
} from "./tier-box-config";
import {
  createPremiumFloorMaterial,
  createPremiumVolumetricShaftMaterial,
  createTierFillMaterial,
} from "./tier-box-shaders";

interface GoldShardSeed {
  lx: number;
  lz: number;
  ly: number;
  tl: number;
  th0: number;
  rad: number;
  yT: number;
  om: number;
  size: number;
  tr: number;
  arc: number;
  ax: THREE.Vector3;
  sp: number;
  ph: number;
  warmMix: number;
}

const FACE_DEF = {
  pz: { n: [0, 0, 1] as const, u: [1, 0, 0] as const },
  px: { n: [1, 0, 0] as const, u: [0, 0, -1] as const },
  nz: { n: [0, 0, -1] as const, u: [-1, 0, 0] as const },
  nx: { n: [-1, 0, 0] as const, u: [0, 0, 1] as const },
};
const FACES = ["pz", "px", "nz", "nx"] as const;

function fp(
  faceKey: (typeof FACES)[number],
  u: number,
  v: number,
  off = 0,
): [number, number, number] {
  const F = FACE_DEF[faceKey];
  const dist = VAULT_DIM.hb + VAULT_DIM.fo + off;
  return [F.n[0] * dist + F.u[0] * u, v, F.n[2] * dist + F.u[2] * u];
}

/**
 * Builds a solid closed trapezoid-sector petal with hinge at `z = 0` extending inward
 * to `z = -depth` (`x` tapering from `outerHalf` to `innerHalf`), with crisp flat normals.
 */
function createPetalSectorGeometry(
  outerHalf: number,
  innerHalf: number,
  depth: number,
  thickness: number,
): THREE.BufferGeometry {
  const lh = thickness / 2;
  const v: Array<[number, number, number]> = [
    [-outerHalf, -lh, 0], // 0: bottom-outer-left
    [outerHalf, -lh, 0], // 1: bottom-outer-right
    [innerHalf, -lh, -depth], // 2: bottom-inner-right
    [-innerHalf, -lh, -depth], // 3: bottom-inner-left
    [-outerHalf, lh, 0], // 4: top-outer-left
    [outerHalf, lh, 0], // 5: top-outer-right
    [innerHalf, lh, -depth], // 6: top-inner-right
    [-innerHalf, lh, -depth], // 7: top-inner-left
  ];

  const pos: number[] = [];
  const norm: number[] = [];
  const pushQuad = (a: number, b: number, c: number, d: number) => {
    const p0 = v[a];
    const p1 = v[b];
    const p2 = v[c];
    const p3 = v[d];
    const ux = p1[0] - p0[0];
    const uy = p1[1] - p0[1];
    const uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0];
    const vy = p2[1] - p0[1];
    const vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    [p0, p1, p2, p0, p2, p3].forEach((pt) => {
      pos.push(pt[0], pt[1], pt[2]);
      norm.push(nx, ny, nz);
    });
  };

  pushQuad(4, 5, 6, 7); // Top (+Y)
  pushQuad(3, 2, 1, 0); // Bottom (-Y)
  pushQuad(0, 1, 5, 4); // Outer rim (+Z)
  pushQuad(2, 3, 7, 6); // Inner collar (-Z)
  pushQuad(3, 0, 4, 7); // Left miter (-X/-Z)
  pushQuad(1, 2, 6, 5); // Right miter (+X/-Z)

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(norm, 3));
  return geom;
}

export function createPremiumVault(
  palette: TierBoxPalette,
  registry: LineHelperRegistry,
  glowTex: THREE.Texture,
  clipPlane: THREE.Plane,
  options: { dustCount?: number; shardCount?: number } = {},
): TierVaultController {
  const { hb: HB, hh: HH, hl: HL, lt: LT, fo: FO } = VAULT_DIM;
  const tl = PREMIUM_TIMELINE;
  const dustCount = options.dustCount ?? 920;
  const shardCount = options.shardCount ?? 260;

  const vaultLineMats: Array<{
    mat: { opacity: number; userData: Record<string, unknown> };
    baseOp: number;
  }> = [];

  const registerVaultLine = (line: LineSegments2): LineSegments2 => {
    const baseOp =
      typeof line.material.userData.base === "number"
        ? line.material.userData.base
        : line.material.opacity;
    vaultLineMats.push({ mat: line.material, baseOp });
    return line;
  };

  const trackGeom = <T extends THREE.BufferGeometry>(g: T): T => {
    registry.geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    registry.materials.push(m);
    return m;
  };

  const root = new THREE.Group();
  const box = new THREE.Group();
  const lidGroup = new THREE.Group();
  root.add(box);
  root.add(lidGroup);

  // Ceremonial octagonal astrolabe floor
  const floorMat = trackMat(createPremiumFloorMaterial(palette));
  const floorGeo = trackGeom(new THREE.PlaneGeometry(22, 22));
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = 0;
  root.add(floor);

  const makeDepthMat = () =>
    trackMat(
      new THREE.MeshBasicMaterial({
        colorWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1.5,
        polygonOffsetUnits: 2,
      }),
    );

  // Stepped obsidian-bronze plinth base (grounds the Premium reliquary)
  const plinthW = 2 * (HB + 0.11);
  const plinthH = 0.13;
  const plinthGeo = trackGeom(new THREE.BoxGeometry(plinthW, plinthH, plinthW));
  plinthGeo.translate(0, plinthH / 2, 0);
  const plinthMat = trackMat(
    createTierFillMaterial(palette, {
      uAlpha: 0.96,
      uHeight: plinthH,
      uMetal: 1.0,
      uVein: 0,
      uGrid: 0.45,
      uBand: 0.5,
    }),
  );
  const plinthDepth = new THREE.Mesh(plinthGeo, makeDepthMat());
  plinthDepth.renderOrder = -1;
  box.add(plinthDepth);

  const plinthFill = new THREE.Mesh(plinthGeo, plinthMat);
  plinthFill.renderOrder = 1;
  box.add(plinthFill);

  const plinthRaw = new THREE.EdgesGeometry(plinthGeo);
  const plinthEdges = registerVaultLine(
    createThickLine(registry, Array.from(plinthRaw.attributes.position.array), {
      color: palette.trim,
      w: 1.5,
      op: 0.92,
      boost: 1.55,
      order: 3,
    }),
  );
  plinthRaw.dispose();
  box.add(plinthEdges);

  // Main obsidian-bronze open-top vault body
  const bodyGeo = trackGeom(new THREE.BoxGeometry(2 * HB, HH, 2 * HB));
  bodyGeo.translate(0, HH / 2, 0);
  if (bodyGeo.index) {
    const idx = bodyGeo.index.array;
    const keep: number[] = [];
    bodyGeo.groups.forEach((gr, i) => {
      if (i === 2) return;
      for (let k = gr.start; k < gr.start + gr.count; k += 1) {
        keep.push(idx[k]);
      }
    });
    bodyGeo.setIndex(keep);
    bodyGeo.clearGroups();
  }

  const bodyDepth = new THREE.Mesh(bodyGeo, makeDepthMat());
  bodyDepth.renderOrder = -1;
  box.add(bodyDepth);

  const bodyFillMat = trackMat(
    createTierFillMaterial(palette, {
      uAlpha: 0.94,
      uHeight: HH,
      uMetal: 1.0,
      uVein: 0.14,
      uGrid: 0.7,
    }),
  );
  const bodyFill = new THREE.Mesh(bodyGeo, bodyFillMat);
  bodyFill.renderOrder = 1;
  box.add(bodyFill);

  const edges: number[] = [];
  loopPts(edges, [
    [-HB, 0, -HB],
    [HB, 0, -HB],
    [HB, 0, HB],
    [-HB, 0, HB],
  ]);
  loopPts(edges, [
    [-HB, HH, -HB],
    [HB, HH, -HB],
    [HB, HH, HB],
    [-HB, HH, HB],
  ]);
  (
    [
      [-HB, -HB],
      [HB, -HB],
      [HB, HB],
      [-HB, HB],
    ] as const
  ).forEach(([x, z]) => seg(edges, [x, 0, z], [x, HH, z]));

  box.add(
    registerVaultLine(
      createThickLine(registry, edges, {
        color: palette.ice,
        w: 1.8,
        boost: 1.55,
      }),
    ),
  );
  box.add(
    registerVaultLine(
      createThickLine(registry, edges, {
        color: palette.trim,
        w: 1.0,
        op: 0.16,
        boost: 0.95,
        depthFunc: THREE.GreaterDepth,
        depthWrite: false,
        order: 2,
      }),
    ),
  );

  // 4 Sculpted Gilded Corner Buttresses (between plinth top and petal underside) + Diamond Spire Finials
  const buttressH = HH - plinthH - 0.01;
  const buttressGeo = trackGeom(new THREE.BoxGeometry(0.13, buttressH, 0.13));
  const buttressRaw = new THREE.EdgesGeometry(buttressGeo);
  const buttressEdgePos = Array.from(buttressRaw.attributes.position.array);
  buttressRaw.dispose();

  const finialGeo = trackGeom(new THREE.OctahedronGeometry(0.078, 0));
  finialGeo.scale(1, 1.55, 1);
  const finialMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: palette.ice,
      emissive: palette.mid,
      emissiveIntensity: 0.32,
      roughness: 0.1,
      metalness: 0.25,
      clearcoat: 1,
      flatShading: true,
      iridescence: 0.8,
      transparent: true,
      opacity: 0.96,
    }),
  );

  (
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const
  ).forEach(([sx, sz]) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(sx * (HB + 0.03), plinthH + buttressH / 2, sz * (HB + 0.03));
    const bFill = new THREE.Mesh(buttressGeo, plinthMat);
    bFill.renderOrder = 2;
    bGroup.add(bFill);
    bGroup.add(
      registerVaultLine(
        createThickLine(registry, buttressEdgePos, {
          color: palette.ice,
          w: 1.3,
          op: 0.88,
          boost: 1.45,
          order: 4,
        }),
      ),
    );
    box.add(bGroup);

    // Finial perched above corner buttress outside lid travel
    const finial = new THREE.Mesh(finialGeo, finialMat);
    finial.position.set(sx * (HB + 0.095), HH + 0.34, sz * (HB + 0.095));
    finial.rotation.y = Math.PI / 4;
    finial.renderOrder = 4;
    box.add(finial);
  });

  // Filigree Architectural Face Panelling
  const detail: number[] = [];
  const detail2: number[] = [];
  FACES.forEach((f) => {
    seg(detail2, fp(f, -HB + 0.04, 0.16), fp(f, HB - 0.04, 0.16));
    const m = 0.22;
    const x0 = -HB + m;
    const x1 = HB - m;
    const y0 = 0.26;
    const y1 = 1.04;
    if (f === "pz") {
      // Split filigree border framing the central 12-sided medallion seal
      seg(detail, fp(f, x0, y0), fp(f, -0.35, y0));
      seg(detail, fp(f, 0.35, y0), fp(f, x1, y0));
      seg(detail, fp(f, x0, y1), fp(f, -0.35, y1));
      seg(detail, fp(f, 0.35, y1), fp(f, x1, y1));
      seg(detail, fp(f, x0, y0), fp(f, x0, y1));
      seg(detail, fp(f, x1, y0), fp(f, x1, y1));
      seg(detail2, fp(f, -0.82, 0.65), fp(f, -0.38, 0.65));
      seg(detail2, fp(f, 0.38, 0.65), fp(f, 0.82, 0.65));
    } else {
      loopPts(detail, [
        fp(f, x0, y0),
        fp(f, x1, y0),
        fp(f, x1, y1),
        fp(f, x0, y1),
      ]);
      // Inner mitered filigree collar
      loopPts(detail2, [
        fp(f, x0 + 0.12, y0 + 0.12),
        fp(f, x1 - 0.12, y0 + 0.12),
        fp(f, x1 - 0.12, y1 - 0.12),
        fp(f, x0 + 0.12, y1 - 0.12),
      ]);
      // Corner miter ticks
      (
        [
          [x0, y0, 1, 1],
          [x1, y0, -1, 1],
          [x1, y1, -1, -1],
          [x0, y1, 1, -1],
        ] as const
      ).forEach(([cx, cy, dx, dy]) =>
        seg(detail2, fp(f, cx, cy), fp(f, cx + dx * 0.12, cy + dy * 0.12)),
      );
    }
  });
  box.add(
    registerVaultLine(
      createThickLine(registry, detail, {
        color: palette.ice,
        w: 1.2,
        op: 0.84,
        boost: 1.2,
      }),
    ),
  );
  box.add(
    registerVaultLine(
      createThickLine(registry, detail2, {
        color: palette.trim,
        w: 0.9,
        op: 0.52,
        boost: 0.95,
      }),
    ),
  );

  // Sovereign 12-Sided Layered Front Crest Seal (+Z)
  const badge = new THREE.Group();
  badge.position.set(0, 0.65, HB + FO + 0.01);
  box.add(badge);

  const dodecPts = (R: number): Array<[number, number, number]> =>
    Array.from({ length: 12 }, (_, i) => {
      const a = Math.PI / 12 + (i * TAU) / 12;
      return [Math.cos(a) * R, Math.sin(a) * R, 0];
    });
  const crestPlateMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      clippingPlanes: null,
    }),
  );
  crestPlateMat.color.copy(palette.deep).multiplyScalar(1.35);
  const crestPlate = new THREE.Mesh(
    trackGeom(
      new THREE.ShapeGeometry(
        new THREE.Shape(dodecPts(0.295).map((p) => new THREE.Vector2(p[0], p[1]))),
      ),
    ),
    crestPlateMat,
  );
  crestPlate.renderOrder = 3;
  badge.add(crestPlate);

  const dodecEdge: number[] = [];
  loopPts(dodecEdge, dodecPts(0.295));
  const dodecLine = createThickLine(registry, dodecEdge, {
    color: palette.ice,
    w: 2.0,
    boost: 1.55,
    order: 4,
  });
  dodecLine.position.z = 0.006;
  badge.add(dodecLine);

  const dodecEdge2: number[] = [];
  loopPts(dodecEdge2, dodecPts(0.225));
  const dodecLine2 = createThickLine(registry, dodecEdge2, {
    color: palette.bright,
    w: 1.05,
    op: 0.68,
    boost: 1.3,
    order: 4,
  });
  dodecLine2.position.z = 0.006;
  badge.add(dodecLine2);

  const diamondFramePts: number[] = [];
  loopPts(diamondFramePts, [
    [0, 0.16, 0.01],
    [0.095, 0, 0.01],
    [0, -0.16, 0.01],
    [-0.095, 0, 0.01],
  ]);
  const diamondFrameLine = createThickLine(registry, diamondFramePts, {
    color: palette.bright,
    w: 1.35,
    boost: 1.7,
    order: 5,
  });
  badge.add(diamondFrameLine);

  // 3D Octahedral Sun-Gem Core on Crest
  const sunGemGeo = trackGeom(new THREE.OctahedronGeometry(0.105, 0));
  sunGemGeo.scale(0.84, 1.45, 0.56);
  const sunGemMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: palette.ice,
      emissive: palette.mid,
      emissiveIntensity: 0.52,
      roughness: 0.08,
      metalness: 0.15,
      clearcoat: 1,
      flatShading: true,
      iridescence: 1,
      transparent: true,
      opacity: 0.96,
    }),
  );
  const sunGem = new THREE.Mesh(sunGemGeo, sunGemMat);
  sunGem.position.z = 0.024;
  sunGem.renderOrder = 5;
  badge.add(sunGem);

  // 3 Concentric Horological Lock Rings (ignite & lock in sequence)
  const unitCirclePts: number[] = [];
  loopPts(unitCirclePts, circlePts(1, 72));
  const lockRings = [
    createThickLine(registry, unitCirclePts, {
      color: palette.trim,
      w: 1.25,
      dashed: true,
      dashSize: 0.18,
      gapSize: 0.08,
      boost: 1.5,
      order: 5,
    }),
    createThickLine(registry, unitCirclePts, {
      color: palette.ice,
      w: 1.4,
      dashed: true,
      dashSize: 0.14,
      gapSize: 0.09,
      boost: 1.65,
      order: 5,
    }),
    createThickLine(registry, unitCirclePts, {
      color: palette.bright,
      w: 1.55,
      dashed: true,
      dashSize: 0.1,
      gapSize: 0.08,
      boost: 1.85,
      order: 5,
    }),
  ];
  lockRings.forEach((lr, idx) => {
    lr.position.z = 0.012 + idx * 0.002;
    lr.visible = false;
    badge.add(lr);
  });

  const badgeGlow = createGlowSprite(glowTex, palette.ice, 1.35, 0);
  trackMat(badgeGlow.material);
  badgeGlow.position.z = 0.05;
  badge.add(badgeGlow);

  // Inner molten-gold sanctum floor (positioned cleanly above plinthDepth top)
  const rimBaseY = plinthH + 0.03;
  const innerFloorMat = trackMat(createInnerFloorMaterial(palette));
  const innerFloorGeo = trackGeom(
    new THREE.PlaneGeometry(2 * HB - 0.1, 2 * HB - 0.1),
  );
  const innerFloor = new THREE.Mesh(innerFloorGeo, innerFloorMat);
  innerFloor.rotation.x = -Math.PI / 2;
  innerFloor.position.y = rimBaseY;
  innerFloor.renderOrder = 2;
  box.add(innerFloor);

  // Four-Petal Horological Crown Lid + Central Levitating Crown Medallion
  const innerHoleHalf = 0.34;
  const petalDepth = HL - innerHoleHalf;
  const lh = LT / 2;
  const tTop = lh + 0.003;
  const petalGeo = trackGeom(
    createPetalSectorGeometry(HL, innerHoleHalf, petalDepth, LT),
  );
  const petalRawEdges = new THREE.EdgesGeometry(petalGeo);
  const petalEdgePos = Array.from(petalRawEdges.attributes.position.array);
  petalRawEdges.dispose();

  const petalFillMat = trackMat(
    createTierFillMaterial(palette, {
      uAlpha: 0.94,
      uHeight: LT,
      uBand: 0.55,
      uGrid: 0.6,
      uMetal: 1.0,
      uVein: 0.08,
    }),
  );

  const petalTrimLocal: number[] = [];
  // Stepped filigree trapezoid inlay on top face of each petal
  loopPts(petalTrimLocal, [
    [-HL + 0.22, tTop, -0.1],
    [HL - 0.22, tTop, -0.1],
    [innerHoleHalf + 0.09, tTop, -(petalDepth - 0.1)],
    [-(innerHoleHalf + 0.09), tTop, -(petalDepth - 0.1)],
  ]);
  // Central axial spine rib along each petal
  seg(petalTrimLocal, [0, tTop, -0.12], [0, tTop, -(petalDepth - 0.1)]);

  const petalPivots: THREE.Group[] = [];
  const petalSpec = [
    { pos: [0, 0, HL] as const, ry: 0 },
    { pos: [HL, 0, 0] as const, ry: Math.PI / 2 },
    { pos: [0, 0, -HL] as const, ry: Math.PI },
    { pos: [-HL, 0, 0] as const, ry: -Math.PI / 2 },
  ] as const;

  petalSpec.forEach(({ pos, ry }) => {
    const yawHolder = new THREE.Group();
    yawHolder.position.set(pos[0], 0, pos[2]);
    yawHolder.rotation.y = ry;
    lidGroup.add(yawHolder);

    const hingePivot = new THREE.Group();
    yawHolder.add(hingePivot);

    const depthMesh = new THREE.Mesh(petalGeo, makeDepthMat());
    depthMesh.renderOrder = -1;
    hingePivot.add(depthMesh);

    const fillMesh = new THREE.Mesh(petalGeo, petalFillMat);
    fillMesh.renderOrder = 1;
    hingePivot.add(fillMesh);

    hingePivot.add(
      registerVaultLine(
        createThickLine(registry, petalEdgePos, {
          color: palette.ice,
          w: 1.7,
          boost: 1.5,
        }),
      ),
    );
    hingePivot.add(
      registerVaultLine(
        createThickLine(registry, petalTrimLocal, {
          color: palette.trim,
          w: 1.05,
          op: 0.72,
          boost: 1.15,
        }),
      ),
    );
    petalPivots.push(hingePivot);
  });

  // Raised Central Gilded Crown Medallion seated over the petal convergence
  const crownMedallion = new THREE.Group();
  crownMedallion.position.y = lh + 0.045;
  lidGroup.add(crownMedallion);

  const crownBaseGeo = trackGeom(new THREE.CylinderGeometry(0.36, 0.42, 0.09, 8));
  const crownBaseMat = trackMat(
    createTierFillMaterial(palette, {
      uAlpha: 0.96,
      uHeight: 0.09,
      uMetal: 1.0,
      uVein: 0,
      uGrid: 0.35,
    }),
  );
  const crownBase = new THREE.Mesh(crownBaseGeo, crownBaseMat);
  crownBase.rotation.y = Math.PI / 8;
  crownBase.renderOrder = 3;
  crownMedallion.add(crownBase);

  const crownRaw = new THREE.EdgesGeometry(crownBaseGeo);
  const crownEdges = createThickLine(
    registry,
    Array.from(crownRaw.attributes.position.array),
    {
      color: palette.ice,
      w: 1.4,
      boost: 1.32,
      order: 4,
    },
  );
  crownEdges.rotation.y = Math.PI / 8;
  crownRaw.dispose();
  crownMedallion.add(crownEdges);

  const crownGemMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: palette.ice,
      emissive: palette.mid,
      emissiveIntensity: 0.52,
      roughness: 0.08,
      metalness: 0.15,
      clearcoat: 1,
      flatShading: true,
      iridescence: 1,
      transparent: true,
      opacity: 0.96,
    }),
  );
  const crownGem = new THREE.Mesh(sunGemGeo, crownGemMat);
  crownGem.rotation.x = Math.PI / 2;
  crownGem.scale.set(0.95, 0.95, 0.95);
  crownGem.position.y = 0.07;
  crownGem.renderOrder = 4;
  crownMedallion.add(crownGem);

  // Dual Nested Volumetric Golden Light Shaft Cones
  const shaftMatOuter = trackMat(createPremiumVolumetricShaftMaterial(palette, 0.32));
  const shaftGeoOuter = trackGeom(
    new THREE.CylinderGeometry(0.92, 0.96, 4.1, 56, 1, true),
  );
  shaftGeoOuter.translate(0, 2.05, 0);
  const shaftOuter = new THREE.Mesh(shaftGeoOuter, shaftMatOuter);
  shaftOuter.position.y = HH;
  shaftOuter.renderOrder = 4;
  box.add(shaftOuter);

  const shaftMatInner = trackMat(createPremiumVolumetricShaftMaterial(palette, -0.45));
  const shaftGeoInner = trackGeom(
    new THREE.CylinderGeometry(0.42, 0.62, 3.8, 44, 1, true),
  );
  shaftGeoInner.translate(0, 1.9, 0);
  const shaftInner = new THREE.Mesh(shaftGeoInner, shaftMatInner);
  shaftInner.position.y = HH;
  shaftInner.renderOrder = 4;
  box.add(shaftInner);

  // Shockwave rings
  const ringGeo = trackGeom(new THREE.PlaneGeometry(8, 8));
  const mkRing = (vertical = false): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> => {
    const mat = trackMat(createRingMaterial(palette));
    const mesh = new THREE.Mesh(ringGeo, mat);
    if (!vertical) mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 5;
    mesh.visible = false;
    root.add(mesh);
    return mesh;
  };
  const ringLift = mkRing();
  const ringBirth = mkRing();
  const ringFlash = mkRing(true);
  const ringFlash2 = mkRing(true);

  // Ascending Sovereign Gold-Leaf Embers & Crystal Motes
  const shardGeo = trackGeom(new THREE.OctahedronGeometry(1, 0));
  shardGeo.scale(0.58, 0.95, 0.12);
  const shardMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const shardMesh = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
  shardMesh.frustumCulled = false;
  shardMesh.renderOrder = 4;
  shardMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (shardCount > 0) {
    shardMesh.setColorAt(0, palette.ice);
    if (shardMesh.instanceColor) {
      shardMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
  }
  root.add(shardMesh);

  const shardSeeds: GoldShardSeed[] = [];
  {
    const R = mulberry32(43);
    for (let i = 0; i < shardCount; i += 1) {
      const a = R() * TAU;
      const dist = 0.2 + Math.pow(R(), 0.7) * 0.88;
      shardSeeds.push({
        lx: Math.cos(a) * dist,
        lz: Math.sin(a) * dist,
        ly: (R() - 0.5) * 0.16,
        tl: tl.unlock + 0.04 + R() * 0.34,
        th0: a,
        rad: 1.5 + R() * 1.95,
        yT: 0.65 + R() * 3.25,
        om: (R() < 0.5 ? -1 : 1) * (0.24 + R() * 0.42),
        size: 0.04 + Math.pow(R(), 2) * 0.1,
        tr: tl.revealStart + 0.08 + R() * 0.36,
        arc: 0.45 + R() * 0.85,
        ax: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(),
        sp: 1.1 + R() * 2.6,
        ph: R() * TAU,
        warmMix: R(),
      });
    }
  }

  // Abundant stately gold atmospheric dust
  const dustMat = trackMat(createDustMaterial(palette));
  {
    const pos = new Float32Array(dustCount * 3);
    const sd = new Float32Array(dustCount * 4);
    const R = mulberry32(19);
    for (let i = 0; i < dustCount; i += 1) {
      const a = R() * TAU;
      const r = 1.05 + Math.pow(R(), 0.58) * 5.6;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = R();
      pos[i * 3 + 2] = Math.sin(a) * r;
      sd[i * 4] = R();
      sd[i * 4 + 1] = R() < 0.65 ? 0.85 : 1.5;
      sd[i * 4 + 2] = 1 + Math.floor(R() * 2);
      sd[i * 4 + 3] = 0.012 + Math.pow(R(), 2.8) * 0.036;
    }
    const dustGeo = trackGeom(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 4));
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    dust.renderOrder = 4;
    root.add(dust);
  }

  // Edge energy pulses
  const NP = 20;
  const pulsePos = new Float32Array(NP * 3);
  const pulseA = new Float32Array(NP);
  const pulseGeo = trackGeom(new THREE.BufferGeometry());
  const pulsePosAttr = new THREE.BufferAttribute(pulsePos, 3);
  const pulseAAttr = new THREE.BufferAttribute(pulseA, 1);
  pulseGeo.setAttribute("position", pulsePosAttr);
  pulseGeo.setAttribute("aA", pulseAAttr);
  const pulseMat = trackMat(createPulseMaterial(palette));
  const pulsePts = new THREE.Points(pulseGeo, pulseMat);
  pulsePts.frustumCulled = false;
  pulsePts.renderOrder = 4;
  box.add(pulsePts);

  // Materialization veil scan plane
  const scanMat = trackMat(createScanMaterial(palette));
  const scanGeo = trackGeom(new THREE.PlaneGeometry(6.6, 6.6));
  const scan = new THREE.Mesh(scanGeo, scanMat);
  scan.rotation.x = -Math.PI / 2;
  scan.renderOrder = 6;
  root.add(scan);

  // Scratch allocations
  const tmpO = new THREE.Object3D();
  const tmpC = new THREE.Color();
  const tmpWhite = new THREE.Color();
  const tmpAccent = new THREE.Color();
  const tmpWarm = new THREE.Color();
  const pureWhite = new THREE.Color(1, 1, 1);
  const bronzeTint = new THREE.Color(0.24, 0.14, 0.04);
  const plateFlashCol = new THREE.Color(1.65, 1.45, 0.95);
  const tmpShardCol = new THREE.Color();

  const crownPose = (t: number) => {
    const pPetal = clamp((t - tl.unlock) / 0.56);
    const bloom = eOut(pPetal);
    const pCrown = clamp((t - (tl.unlock - 0.04)) / 0.62);
    const crownLift = eOut(pCrown);
    return {
      bloom,
      petalAngle: bloom * 1.04 + Math.sin(t * 1.5) * 0.025 * bloom,
      crownY: lh + 0.045 + crownLift * 1.55,
      crownFade: 1 - sstep(tl.unlock + 0.18, tl.unlock + 0.68, t),
      crownYaw: crownLift * 1.25,
    };
  };

  const setRing = (
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>,
    t: number,
    t0: number,
    dur: number,
    r0: number,
    r1: number,
    amp = 1,
    y: number | null = null,
    w = 0.03,
    tint?: THREE.Color,
  ) => {
    const s = (t - t0) / dur;
    if (s <= 0 || s >= 1) {
      mesh.visible = false;
      return;
    }
    const u = mesh.material.uniforms;
    (u.uR.value as number) = lerp(r0, r1, eOut(s));
    (u.uA.value as number) = Math.pow(1 - s, 1.5) * amp;
    (u.uW.value as number) = w;
    if (tint) (u.uColor.value as THREE.Color).copy(tint).multiplyScalar(1.45);
    mesh.visible = true;
    if (y !== null) mesh.position.y = y;
  };

  const rimPt = (uRaw: number, y: number): [number, number, number] => {
    const hs = HB - 0.06;
    const u = ((uRaw % 1) + 1) % 1;
    const s = u * 4;
    const side = Math.floor(s);
    const f = s - side;
    const a = -hs + 2 * hs * f;
    if (side === 0) return [a, y, -hs];
    if (side === 1) return [hs, y, a];
    if (side === 2) return [-a, y, hs];
    return [-hs, y, -a];
  };

  const update = ({
    t,
    holdElapsed,
    ambientTime,
    isAmbient,
    isError,
    crystalY,
    accentColor,
  }: TierVaultUpdateParams) => {
    const animClock = t + holdElapsed + ambientTime;
    const cp = crownPose(t);
    const open = cp.bloom;
    const charge =
      sstep(tl.authStart, tl.authHold, t) * (t < tl.unlock ? 1 : 0);
    const flash = t >= tl.unlock ? Math.exp(-(t - tl.unlock) * 7.8) : 0;
    const streak =
      (t >= tl.unlock ? Math.exp(-(t - tl.unlock) * 4.5) : 0) +
      0.55 * sstep(tl.revealStart - 0.05, tl.revealPeak, t) * (1 - sstep(tl.revealPeak, tl.handoffStart, t));
    const preFlash = Math.pow(charge, 2.5) * 0.28;
    const ambientFade = isAmbient ? 1 : sstep(tl.handoffStart, tl.complete, t);
    const master = isError ? 0.35 : lerp(sstep(0, 0.36, t), 0.54, ambientFade);
    const dustMaster = isError ? 0.35 : lerp(sstep(0, 0.36, t), 0.5, ambientFade);
    // Premium opened reliquary lingers longer as an illuminated obsidian-gold altar before dissolving
    const vaultFade = isAmbient
      ? 0
      : 1 - sstep(tl.revealStart + 0.16, tl.revealStart + 0.84, t);

    let cy = 99;
    if (!isAmbient && !isError && t < tl.matEnd) {
      cy = eInOut(clamp(t / (tl.matEnd - 0.04))) * 2.15;
    }
    clipPlane.constant = cy;
    const scanOn =
      !isAmbient && !isError && t < tl.matEnd
        ? sstep(0, 0.06, t) * (1 - sstep(tl.matEnd - 0.14, tl.matEnd, t))
        : 0;
    scan.visible = scanOn > 0.001 && vaultFade > 0.01;
    scan.position.y = Math.min(cy, 2.1) + 0.001;
    scanMat.uniforms.uI.value = scanOn * vaultFade;

    const showVault = vaultFade > 0.005;
    box.visible = showVault;
    lidGroup.visible = showVault;

    const hover =
      0.16 +
      Math.sin((TAU * 2 * animClock) / tl.ambientBreathCycle) * 0.024 -
      (1 - vaultFade) * 0.45;
    box.position.y = hover;
    lidGroup.position.set(0, hover + 1.31, 0);

    petalPivots.forEach((pivot) => {
      pivot.rotation.x = cp.petalAngle;
    });

    const dimError = isError ? 0.4 : 1;
    crownMedallion.visible = showVault && cp.crownFade > 0.01;
    crownMedallion.position.y = cp.crownY;
    crownMedallion.rotation.y = cp.crownYaw;
    crownBaseMat.uniforms.uAlpha.value = 0.96 * cp.crownFade * vaultFade * dimError;
    crownEdges.material.opacity = cp.crownFade * vaultFade * dimError;
    crownGemMat.opacity = 0.96 * cp.crownFade * vaultFade * dimError;
    [bodyFillMat, plinthMat, petalFillMat, crownBaseMat].forEach((m) => {
      m.uniforms.uTime.value = animClock;
      m.uniforms.uFlash.value = flash;
      m.uniforms.uCharge.value = charge + preFlash;
    });
    bodyFillMat.uniforms.uAlpha.value = 0.94 * vaultFade * dimError;
    plinthMat.uniforms.uAlpha.value = 0.96 * vaultFade * dimError;
    petalFillMat.uniforms.uAlpha.value = 0.94 * vaultFade * dimError;
    bodyFillMat.uniforms.uOpen.value = open;
    finialMat.opacity = 0.96 * vaultFade * dimError;

    vaultLineMats.forEach(({ mat, baseOp }) => {
      mat.opacity = baseOp * vaultFade * dimError;
    });

    floorMat.uniforms.uTime.value = animClock;
    floorMat.uniforms.uMaster.value = master;
    floorMat.uniforms.uGlow.value = lerp(
      (open * 0.85 + flash * 0.85 + charge * 0.35) * vaultFade,
      0.22,
      ambientFade,
    );
    const accentBlend = lerp(
      sstep(tl.revealStart, tl.revealPeak, t) * 0.55,
      0.55,
      ambientFade,
    );
    tmpAccent.copy(palette.ice).lerp(accentColor, accentBlend);
    (floorMat.uniforms.uPrimary.value as THREE.Color).copy(tmpAccent);

    dustMat.uniforms.uTime.value = animClock;
    dustMat.uniforms.uMaster.value = dustMaster;
    (dustMat.uniforms.uColor.value as THREE.Color).copy(tmpAccent);

    // Volumetric Gold Shafts ascending from the open reliquary
    shaftOuter.visible = open > 0.01 && showVault;
    shaftInner.visible = open > 0.01 && showVault;
    shaftMatOuter.uniforms.uTime.value = animClock;
    shaftMatOuter.uniforms.uI.value = open * 0.78 * vaultFade;
    shaftMatInner.uniforms.uTime.value = animClock;
    shaftMatInner.uniforms.uI.value = open * 0.65 * vaultFade;
    innerFloorMat.uniforms.uI.value = (open * 1.15 + flash * 0.7) * vaultFade;

    // Floor pulses
    const P = floorMat.uniforms.uP.value as THREE.Vector2[];
    const sl = (i: number, r: number, a: number) => P[i].set(r, a);
    {
      const s = (t - 0.14) / 0.86;
      if (!isAmbient && s > 0 && s < 1) sl(0, eOut(s) * 6.0, Math.pow(1 - s, 1.5) * 0.82);
      else sl(0, 0, 0);
    }
    {
      const s = (t - tl.unlock) / 1.05;
      if (!isAmbient && s > 0 && s < 1) sl(1, eOut(s) * 6.5, Math.pow(1 - s, 1.45) * 1.1);
      else sl(1, 0, 0);
    }
    {
      const s = (t - tl.revealStart) / 0.95;
      if (!isAmbient && s > 0 && s < 1) sl(2, 1.4 + eOut(s) * 4.8, Math.pow(1 - s, 1.45) * 0.85);
      else sl(2, 0, 0);
    }
    sl(3, 0, 0);
    sl(4, 0, 0);
    sl(5, 0, 0);

    // 3D shockwave rings
    if (isAmbient) {
      ringLift.visible = false;
      ringBirth.visible = false;
      ringFlash.visible = false;
      ringFlash2.visible = false;
    } else {
      setRing(ringLift, t, tl.unlock + 0.08, 0.82, 1.3, 3.6, 0.88, hover + HH + 0.12);
      setRing(
        ringBirth,
        t,
        tl.revealStart - 0.18,
        0.85,
        0.65,
        3.1,
        0.82,
        hover + HH + 0.2,
        0.028,
        accentColor,
      );
      ringFlash.position.set(0, hover + 0.65, HB + 0.03);
      ringFlash2.position.set(0, hover + 0.65, HB + 0.03);
      setRing(ringFlash, t, tl.unlock, 0.62, 0.18, 2.8, 1.15, null, 0.028, palette.warm);
      setRing(ringFlash2, t, tl.unlock + 0.08, 0.78, 0.12, 3.3, 0.45, null, 0.02, palette.trim);
    }

    // 12-Sided Sovereign Crest Seal + 3 Sequential Lock Rings
    const bWhite = sstep(tl.authStart + 0.25, tl.unlock - 0.04, t);
    let bs = 1;
    let ba = 1;
    if (t >= tl.unlock) {
      const p = clamp((t - tl.unlock) / 0.4);
      bs = 1 + 0.48 * eOut(p);
      ba = 1 - p;
    }
    const finalBa = ba * vaultFade * dimError;
    const dsc = 1 - sstep(tl.unlock - 0.14, tl.unlock + 0.02, t);
    badge.scale.setScalar(bs);
    badge.visible = finalBa > 0.004 && showVault;

    tmpWarm.copy(palette.warm).lerp(pureWhite, 0.45);
    tmpWhite.copy(palette.ice).lerp(tmpWarm, bWhite);
    const bright = 1 + charge * 0.48 + bWhite * 1.45;
    dodecLine.material.color.copy(tmpWhite).multiplyScalar(1.8 * bright);
    dodecLine.material.opacity = finalBa;
    dodecLine2.material.color.copy(palette.bright).lerp(tmpWarm, bWhite).multiplyScalar(1.3 * bright);
    dodecLine2.material.opacity = 0.68 * finalBa;
    diamondFrameLine.material.opacity = finalBa;
    crestPlateMat.color.copy(palette.deep).multiplyScalar(1.35).lerp(plateFlashCol, bWhite);
    crestPlateMat.opacity = 0.96 * finalBa;

    sunGem.scale.setScalar(Math.max(0.001, dsc));
    sunGem.rotation.y = animClock * 0.9;
    sunGemMat.color.copy(palette.ice).lerp(bronzeTint, bWhite * 0.5);
    sunGemMat.opacity = 0.96 * finalBa;

    const cr = !isError && t >= tl.authStart && t < tl.unlock;
    lockRings.forEach((lr, idx) => {
      const ringGate = clamp((t - (tl.authStart + idx * 0.14)) / 0.22);
      lr.visible = cr && ringGate > 0.01 && showVault;
      if (lr.visible) {
        const baseR = 0.36 + idx * 0.14;
        const sc = lerp(baseR * 1.38, baseR, eOut(ringGate));
        lr.scale.set(sc, sc, 1);
        const speed = idx % 2 === 0 ? 1 : -1;
        lr.rotation.z = speed * (1 - eOut(ringGate)) * 2.2 + Math.sin(holdElapsed * 1.8 + idx) * 0.06;
        lr.material.opacity = (0.42 + charge * 0.55) * ringGate * vaultFade;
      }
    });

    badgeGlow.material.color
      .copy(palette.ice)
      .lerp(palette.warm, bWhite)
      .multiplyScalar((0.12 + charge * 0.42 + flash * 1.35) * finalBa);
    badgeGlow.scale.setScalar(1.0 + charge * 0.55 + flash * 1.5);

    // Edge pulses (clear plinthDepth top at rimBaseY)
    let k = 0;
    const sp = 2.0 / tl.ambientBreathCycle;
    for (let i = 0; i < 6; i += 1) {
      const p = rimPt(animClock * sp + i / 6, rimBaseY);
      pulsePos[k * 3] = p[0];
      pulsePos[k * 3 + 1] = p[1];
      pulsePos[k * 3 + 2] = p[2];
      pulseA[k++] = 0.88;
    }
    for (let i = 0; i < 6; i += 1) {
      const p = rimPt(-animClock * sp * 1.3 + i / 6 + 0.08, HH - 0.02);
      pulsePos[k * 3] = p[0];
      pulsePos[k * 3 + 1] = p[1];
      pulsePos[k * 3 + 2] = p[2];
      pulseA[k++] = 0.88;
    }
    const hs = HB - 0.06;
    (
      [
        [-hs, -hs],
        [hs, -hs],
        [hs, hs],
        [-hs, hs],
      ] as const
    ).forEach(([x, z], i) => {
      for (let j = 0; j < 2; j += 1) {
        const f = ((animClock * 2.4) / tl.ambientBreathCycle + i * 0.25 + j * 0.5) % 1;
        pulsePos[k * 3] = x;
        pulsePos[k * 3 + 1] = rimBaseY + f * (HH - rimBaseY - 0.03);
        pulsePos[k * 3 + 2] = z;
        pulseA[k++] = Math.sin(Math.PI * f) * (1 - open * 0.5);
      }
    });
    pulsePosAttr.needsUpdate = true;
    pulseAAttr.needsUpdate = true;
    pulseMat.uniforms.uI.value = (0.95 + charge * 1.1 + flash) * master * vaultFade;

    // Ascending faceted gold embers -> stately halo convergence
    if (isAmbient || t < tl.unlock) {
      shardMesh.visible = false;
    } else {
      shardMesh.visible = true;
      const swirlTargetY = crystalY || 2.05;
      const revealBlend = sstep(tl.revealStart, tl.revealPeak, t);
      for (let i = 0; i < shardSeeds.length; i += 1) {
        const s = shardSeeds[i];
        const sF = clamp((t - s.tl) / 0.84);
        const s2 = clamp((t - s.tr) / 0.58);
        const vis = t > s.tl && s2 < 1;
        if (!vis) {
          tmpO.position.set(0, -50, 0);
          tmpO.scale.setScalar(0);
          tmpO.updateMatrix();
          shardMesh.setMatrixAt(i, tmpO.matrix);
          continue;
        }
        const ox = s.lx;
        const oy = hover + HH + 0.1 + s.ly;
        const oz = s.lz;
        const th = s.th0 + s.om * t;
        const bx = Math.cos(th) * s.rad;
        const bz = Math.sin(th) * s.rad;
        const by = s.yT + 0.12 * Math.sin(1.2 * t + s.ph);
        const e = eOut(sF);
        let x = lerp(ox, bx, e);
        let y = lerp(oy, by, e) + Math.sin(Math.PI * sF) * s.arc * 0.45;
        let z = lerp(oz, bz, e);
        const e2 = eIn(s2);
        if (s2 > 0) {
          const ang = e2 * 2.1;
          const cc = Math.cos(ang);
          const ss = Math.sin(ang);
          const rx = x * cc - z * ss;
          const rz = x * ss + z * cc;
          x = lerp(rx, 0, e2);
          z = lerp(rz, 0, e2);
          y = lerp(y, swirlTargetY, e2);
        }
        const sc =
          s.size *
          sstep(0, 0.16, sF) *
          (1 - sstep(0.58, 1, s2)) *
          (0.86 + 0.14 * Math.sin(t * 4.2 + s.ph));
        tmpO.position.set(x, y, z);
        tmpO.quaternion.setFromAxisAngle(s.ax, t * s.sp + s.ph);
        tmpO.scale.setScalar(Math.max(0.0001, sc));
        tmpO.updateMatrix();
        shardMesh.setMatrixAt(i, tmpO.matrix);

        tmpShardCol
          .copy(palette.ice)
          .lerp(palette.bright, s.warmMix * 0.45)
          .lerp(accentColor, revealBlend * 0.8);
        const tw =
          (1.0 + 0.95 * (0.5 + 0.5 * Math.sin(t * 4.8 + s.ph * 2.5)) + flash * 1.2) *
          (1 - 0.35 * s2);
        tmpC.copy(tmpShardCol).multiplyScalar(tw);
        shardMesh.setColorAt(i, tmpC);
      }
      shardMesh.instanceMatrix.needsUpdate = true;
      if (shardMesh.instanceColor) shardMesh.instanceColor.needsUpdate = true;
    }

    return {
      hover,
      open,
      charge,
      flash,
      warp: 0,
      warpRing: 0,
      streak: Math.min(1, streak),
      vaultFade,
      underLightIntensity: (open * 16 + flash * 26) * vaultFade,
    };
  };

  const setLockedHeroPose = () => {
    clipPlane.constant = 99;
    scan.visible = false;
    box.visible = true;
    lidGroup.visible = true;
    box.position.y = 0.08;
    lidGroup.position.set(0, 0.08 + 1.31, 0);
    petalPivots.forEach((p) => {
      p.rotation.x = 0;
    });
    crownMedallion.visible = true;
    crownMedallion.position.y = lh + 0.045;
    crownMedallion.rotation.y = 0;
    [bodyFillMat, plinthMat, petalFillMat, crownBaseMat].forEach((m) => {
      m.uniforms.uTime.value = 1.6;
      m.uniforms.uFlash.value = 0;
      m.uniforms.uCharge.value = 0;
      m.uniforms.uOpen.value = 0;
    });
    bodyFillMat.uniforms.uAlpha.value = 0.94;
    plinthMat.uniforms.uAlpha.value = 0.96;
    petalFillMat.uniforms.uAlpha.value = 0.94;
    crownBaseMat.uniforms.uAlpha.value = 0.96;
    crownEdges.material.opacity = 1;
    crownGemMat.opacity = 0.96;
    finialMat.opacity = 0.96;
    vaultLineMats.forEach(({ mat, baseOp }) => {
      mat.opacity = baseOp;
    });
    floorMat.uniforms.uTime.value = 1.6;
    floorMat.uniforms.uMaster.value = 0.76;
    floorMat.uniforms.uGlow.value = 0.1;
    dustMat.uniforms.uTime.value = 1.6;
    dustMat.uniforms.uMaster.value = 0.74;
    shaftOuter.visible = false;
    shaftInner.visible = false;
    innerFloorMat.uniforms.uI.value = 0;
    badge.visible = true;
    badge.scale.setScalar(1);
    sunGem.scale.setScalar(1);
    sunGem.rotation.y = 0;
    lockRings.forEach((lr) => {
      lr.visible = false;
    });
    badgeGlow.material.color.copy(palette.ice).multiplyScalar(0.18);
    badgeGlow.scale.setScalar(1.0);
    shardMesh.visible = false;
    pulseMat.uniforms.uI.value = 0.62;
  };

  const setPointScale = (scale: number) => {
    dustMat.uniforms.uScale.value = scale;
    pulseMat.uniforms.uScale.value = scale;
  };

  const dispose = () => {
    shardMesh.dispose();
  };

  return {
    root,
    update,
    setLockedHeroPose,
    setPointScale,
    dispose,
  };
}
