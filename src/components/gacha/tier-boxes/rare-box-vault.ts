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
  RARE_TIMELINE,
  type TierBoxPalette,
  type TierVaultController,
  type TierVaultUpdateParams,
} from "./tier-box-config";
import {
  createRareFloorMaterial,
  createRareVortexBeamMaterial,
  createTierFillMaterial,
} from "./tier-box-shaders";

interface RareShardSeed {
  tl: number;
  launchX: number;
  launchYOff: number;
  launchZ: number;
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
  hueMix: number;
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

export function createRareVault(
  palette: TierBoxPalette,
  registry: LineHelperRegistry,
  glowTex: THREE.Texture,
  clipPlane: THREE.Plane,
  options: { dustCount?: number; shardCount?: number } = {},
): TierVaultController {
  const { hb: HB, hh: HH, hl: HL, lt: LT, fo: FO } = VAULT_DIM;
  const tl = RARE_TIMELINE;
  const dustCount = options.dustCount ?? 860;
  const shardCount = options.shardCount ?? 220;

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
  const lidLeft = new THREE.Group();
  const lidRight = new THREE.Group();
  root.add(box);
  root.add(lidGroup);
  lidGroup.add(lidLeft);
  lidGroup.add(lidRight);

  // Hexagonal arcane telemetry floor
  const floorMat = trackMat(createRareFloorMaterial(palette));
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

  // Open-top body matching family dimensions
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
      uAlpha: 0.9,
      uHeight: HH,
      uVein: 1.0,
      uMetal: 0.22,
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
        w: 1.75,
        boost: 1.55,
      }),
    ),
  );
  box.add(
    registerVaultLine(
      createThickLine(registry, edges, {
        color: palette.trim,
        w: 1.05,
        op: 0.18,
        boost: 1.0,
        depthFunc: THREE.GreaterDepth,
        depthWrite: false,
        order: 2,
      }),
    ),
  );

  // 4 Chamfered Corner Stabilizer Pylons (flush [0, HH - 0.01], clear of lid underside)
  const pylonH = HH - 0.01;
  const pylonGeo = trackGeom(new THREE.BoxGeometry(0.14, pylonH, 0.14));
  const pylonFillMat = trackMat(
    createTierFillMaterial(palette, {
      uAlpha: 0.94,
      uHeight: pylonH,
      uColor: palette.trim,
      uVein: 0.85,
      uMetal: 0.35,
      uGrid: 0.5,
    }),
  );
  const pylonRawEdges = new THREE.EdgesGeometry(pylonGeo);
  const pylonEdgePos = Array.from(pylonRawEdges.attributes.position.array);
  pylonRawEdges.dispose();

  const pylons: Array<{
    group: THREE.Group;
    sx: number;
    sz: number;
  }> = [];
  (
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const
  ).forEach(([sx, sz]) => {
    const pGroup = new THREE.Group();
    const pDist = HB + 0.045;
    pGroup.position.set(sx * pDist, pylonH / 2, sz * pDist);
    pGroup.rotation.y = Math.PI / 4;

    const pFill = new THREE.Mesh(pylonGeo, pylonFillMat);
    pFill.renderOrder = 2;
    pGroup.add(pFill);

    pGroup.add(
      registerVaultLine(
        createThickLine(registry, pylonEdgePos, {
          color: palette.trim,
          w: 1.25,
          op: 0.9,
          boost: 1.45,
          order: 4,
        }),
      ),
    );
    box.add(pGroup);
    pylons.push({ group: pGroup, sx, sz });
  });

  // Chamfered side panels + twin horizontal plasma rails
  const detail: number[] = [];
  const detail2: number[] = [];
  FACES.forEach((f) => {
    seg(detail2, fp(f, -HB + 0.05, 0.12), fp(f, HB - 0.05, 0.12));
    const m = 0.2;
    const ch = 0.12;
    const x0 = -HB + m;
    const x1 = HB - m;
    const y0 = 0.24;
    const y1 = 1.03;
    // Chamfered octagon-corner panel outline
    const chamferLoop: Array<[number, number, number]> = [
      fp(f, x0 + ch, y0),
      fp(f, x1 - ch, y0),
      fp(f, x1, y0 + ch),
      fp(f, x1, y1 - ch),
      fp(f, x1 - ch, y1),
      fp(f, x0 + ch, y1),
      fp(f, x0, y1 - ch),
      fp(f, x0, y0 + ch),
    ];
    if (f === "pz") {
      // Leave open gap around front octagonal emblem
      seg(detail, fp(f, x0 + ch, y0), fp(f, x1 - ch, y0));
      seg(detail, fp(f, x0 + ch, y1), fp(f, x1 - ch, y1));
      seg(detail, fp(f, x0, y0 + ch), fp(f, x0, y1 - ch));
      seg(detail, fp(f, x1, y0 + ch), fp(f, x1, y1 - ch));
      seg(detail, fp(f, x0, y0 + ch), fp(f, x0 + ch, y0));
      seg(detail, fp(f, x1 - ch, y0), fp(f, x1, y0 + ch));
      seg(detail, fp(f, x1, y1 - ch), fp(f, x1 - ch, y1));
      seg(detail, fp(f, x0 + ch, y1), fp(f, x0, y1 - ch));
      // Twin flanking energy conduit bars on front face
      seg(detail2, fp(f, -0.84, 0.67), fp(f, -0.38, 0.67));
      seg(detail2, fp(f, -0.74, 0.57), fp(f, -0.38, 0.57));
      seg(detail2, fp(f, 0.38, 0.67), fp(f, 0.84, 0.67));
      seg(detail2, fp(f, 0.38, 0.57), fp(f, 0.74, 0.57));
    } else {
      loopPts(detail, chamferLoop);
    }
    [-1, 1].forEach((s) =>
      seg(detail2, fp(f, s * (HB - 0.1), 0.2), fp(f, s * (HB - 0.1), HH - 0.08)),
    );
  });

  box.add(
    registerVaultLine(
      createThickLine(registry, detail, {
        color: palette.ice,
        w: 1.15,
        op: 0.78,
        boost: 1.05,
      }),
    ),
  );
  box.add(
    registerVaultLine(
      createThickLine(registry, detail2, {
        color: palette.trim,
        w: 0.95,
        op: 0.55,
        boost: 0.95,
      }),
    ),
  );

  // +X telemetry bars
  const dataLines: LineSegments2[] = [];
  [0.86, 0.74, 0.62, 0.5, 0.38].forEach((v, i) => {
    const len = 0.76 - i * 0.09;
    const p: number[] = [];
    seg(p, fp("px", -0.4, v), fp("px", -0.4 + len, v));
    const line = registerVaultLine(
      createThickLine(registry, p, {
        color: i % 2 === 0 ? palette.ice : palette.trim,
        w: 1.05,
        op: 0.56,
        boost: 1.05,
      }),
    );
    box.add(line);
    dataLines.push(line);
  });

  // Rail energy nodes
  const nodePos: number[] = [];
  FACES.forEach((f) =>
    [-1, 1].forEach((s) =>
      [0.32, 0.63, 0.96].forEach((v) =>
        nodePos.push(...fp(f, s * (HB - 0.1), v, 0.002)),
      ),
    ),
  );
  const nodeGeo = trackGeom(new THREE.BufferGeometry());
  nodeGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(nodePos, 3),
  );
  nodeGeo.setAttribute(
    "aA",
    new THREE.Float32BufferAttribute(new Array(nodePos.length / 3).fill(0.62), 1),
  );
  const nodeMat = trackMat(createPulseMaterial(palette));
  nodeMat.uniforms.uI.value = 0.65;
  const nodePts = new THREE.Points(nodeGeo, nodeMat);
  nodePts.renderOrder = 4;
  box.add(nodePts);

  // Inner glowing vault floor
  const innerFloorMat = trackMat(createInnerFloorMaterial(palette));
  const innerFloorGeo = trackGeom(
    new THREE.PlaneGeometry(2 * HB - 0.1, 2 * HB - 0.1),
  );
  const innerFloor = new THREE.Mesh(innerFloorGeo, innerFloorMat);
  innerFloor.rotation.x = -Math.PI / 2;
  innerFloor.position.y = 0.06;
  innerFloor.renderOrder = 2;
  box.add(innerFloor);

  // Octagonal front seal + twin interlocking diamond lock
  const badge = new THREE.Group();
  badge.position.set(0, 0.635, HB + FO + 0.006);
  box.add(badge);

  const octPts = (R: number): Array<[number, number, number]> =>
    Array.from({ length: 8 }, (_, i) => {
      const a = Math.PI / 8 + (i * TAU) / 8;
      return [Math.cos(a) * R, Math.sin(a) * R, 0];
    });
  const octShape = new THREE.Shape(
    octPts(0.285).map((p) => new THREE.Vector2(p[0], p[1])),
  );
  const plateMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      clippingPlanes: null,
    }),
  );
  plateMat.color.copy(palette.deep).multiplyScalar(1.4);
  const plate = new THREE.Mesh(
    trackGeom(new THREE.ShapeGeometry(octShape)),
    plateMat,
  );
  plate.renderOrder = 3;
  badge.add(plate);

  const octEdge: number[] = [];
  loopPts(octEdge, octPts(0.285));
  const octLine = createThickLine(registry, octEdge, {
    color: palette.ice,
    w: 2.2,
    boost: 1.9,
    order: 4,
  });
  octLine.position.z = 0.006;
  badge.add(octLine);

  const octEdge2: number[] = [];
  loopPts(octEdge2, octPts(0.215));
  const octLine2 = createThickLine(registry, octEdge2, {
    color: palette.trim,
    w: 1.15,
    op: 0.72,
    boost: 1.35,
    order: 4,
  });
  octLine2.position.z = 0.006;
  badge.add(octLine2);

  const kite = (h: number, w: number): Array<[number, number, number]> => [
    [0, h, 0],
    [w, 0, 0],
    [0, -h, 0],
    [-w, 0, 0],
  ];
  const diamondOuter = new THREE.Group();
  diamondOuter.position.z = 0.008;
  badge.add(diamondOuter);

  const diaMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    }),
  );
  diaMat.color.copy(palette.ice).multiplyScalar(1.55);
  const diaMesh = new THREE.Mesh(
    trackGeom(
      new THREE.ShapeGeometry(
        new THREE.Shape(kite(0.145, 0.082).map((p) => new THREE.Vector2(p[0], p[1]))),
      ),
    ),
    diaMat,
  );
  diaMesh.renderOrder = 4;
  diamondOuter.add(diaMesh);

  const diaEdge: number[] = [];
  loopPts(diaEdge, kite(0.145, 0.082));
  const diaLine = createThickLine(registry, diaEdge, {
    color: palette.bright,
    w: 1.25,
    boost: 2.0,
    order: 5,
  });
  diaLine.position.z = 0.002;
  diamondOuter.add(diaLine);

  // Inner counter-rotating bright shard lock
  const diamondInner = new THREE.Group();
  diamondInner.position.z = 0.012;
  badge.add(diamondInner);

  const innerDiaMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    }),
  );
  innerDiaMat.color.copy(palette.bright).multiplyScalar(1.75);
  const innerDiaMesh = new THREE.Mesh(
    trackGeom(
      new THREE.ShapeGeometry(
        new THREE.Shape(kite(0.085, 0.048).map((p) => new THREE.Vector2(p[0], p[1]))),
      ),
    ),
    innerDiaMat,
  );
  innerDiaMesh.renderOrder = 5;
  diamondInner.add(innerDiaMesh);

  // Dual counter-rotating arcane charge rings
  const ringPts: number[] = [];
  loopPts(ringPts, circlePts(1, 72));
  const chargeRingOuter = createThickLine(registry, ringPts, {
    color: palette.ice,
    w: 1.5,
    dashed: true,
    dashSize: 0.14,
    gapSize: 0.1,
    boost: 1.85,
    order: 5,
  });
  chargeRingOuter.position.z = 0.011;
  chargeRingOuter.visible = false;
  badge.add(chargeRingOuter);

  const chargeRingInner = createThickLine(registry, ringPts, {
    color: palette.trim,
    w: 1.2,
    dashed: true,
    dashSize: 0.1,
    gapSize: 0.09,
    boost: 1.65,
    order: 5,
  });
  chargeRingInner.position.z = 0.013;
  chargeRingInner.visible = false;
  badge.add(chargeRingInner);

  const badgeGlow = createGlowSprite(glowTex, palette.ice, 1.3, 0);
  trackMat(badgeGlow.material);
  badgeGlow.position.z = 0.05;
  badge.add(badgeGlow);

  // Twin Split-Wing Lid (left wing & right wing separated by central glowing seam)
  const wingGap = 0.016;
  const wingW = HL - wingGap / 2;
  const halfGeo = trackGeom(new THREE.BoxGeometry(wingW, LT, 2 * HL));
  const lh = LT / 2;
  const tTop = lh + 0.003;

  const lidFillMat = trackMat(
    createTierFillMaterial(palette, {
      uAlpha: 0.92,
      uHeight: LT,
      uBand: 0.65,
      uGrid: 0.78,
      uVein: 0.95,
      uMetal: 0.3,
    }),
  );

  const wingEdgeLocal: number[] = [];
  const wh = wingW / 2;
  [-lh, lh].forEach((y) =>
    loopPts(wingEdgeLocal, [
      [-wh, y, -HL],
      [wh, y, -HL],
      [wh, y, HL],
      [-wh, y, HL],
    ]),
  );
  (
    [
      [-wh, -HL],
      [wh, -HL],
      [wh, HL],
      [-wh, HL],
    ] as const
  ).forEach(([x, z]) => seg(wingEdgeLocal, [x, -lh, z], [x, lh, z]));

  const buildWing = (side: -1 | 1, host: THREE.Group) => {
    const cx = side * (wingGap / 2 + wh);
    const wingSub = new THREE.Group();
    wingSub.position.x = cx;
    host.add(wingSub);

    const depthMesh = new THREE.Mesh(halfGeo, makeDepthMat());
    depthMesh.renderOrder = -1;
    wingSub.add(depthMesh);

    const fillMesh = new THREE.Mesh(halfGeo, lidFillMat);
    fillMesh.renderOrder = 1;
    wingSub.add(fillMesh);

    wingSub.add(
      registerVaultLine(
        createThickLine(registry, wingEdgeLocal, {
          color: palette.ice,
          w: 1.75,
          boost: 1.55,
        }),
      ),
    );

    // Top wing chevron/stepped panel trim & outer corner clamps
    const wingDetail: number[] = [];
    const wingDetail2: number[] = [];
    const innerX = -side * (wh - 0.14);
    const outerX = side * (wh - 0.16);
    const zMax = HL - 0.18;
    loopPts(wingDetail, [
      [innerX, tTop, -zMax],
      [outerX, tTop, -zMax + 0.14],
      [outerX, tTop, zMax - 0.14],
      [innerX, tTop, zMax],
    ]);
    // Inner glowing seam rail
    seg(
      wingDetail2,
      [-side * (wh - 0.03), tTop, -HL + 0.06],
      [-side * (wh - 0.03), tTop, HL - 0.06],
    );
    // Outer wing corner brackets
    [-1, 1].forEach((sz) => {
      const bx = side * (wh - 0.07);
      const bz = sz * (HL - 0.07);
      seg(wingDetail2, [bx, tTop, bz], [bx - side * 0.22, tTop, bz]);
      seg(wingDetail2, [bx, tTop, bz], [bx, tTop, bz - sz * 0.22]);
    });
    // Central half-diamond contour anchored cleanly on each wing (never crossing the seam)
    const seamX = -side * (wh - 0.03);
    seg(wingDetail, [seamX, tTop, 0.28], [seamX + side * 0.26, tTop, 0]);
    seg(wingDetail, [seamX + side * 0.26, tTop, 0], [seamX, tTop, -0.28]);

    wingSub.add(
      registerVaultLine(
        createThickLine(registry, wingDetail, {
          color: palette.ice,
          w: 1.2,
          op: 0.9,
          boost: 1.25,
        }),
      ),
    );
    wingSub.add(
      registerVaultLine(
        createThickLine(registry, wingDetail2, {
          color: palette.trim,
          w: 1.0,
          op: 0.68,
          boost: 1.2,
        }),
      ),
    );

    const wingPlateMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
      }),
    );
    wingPlateMat.color.copy(palette.mid).multiplyScalar(0.8);
    const wingPlate = new THREE.Mesh(
      trackGeom(new THREE.PlaneGeometry(0.24, 0.52)),
      wingPlateMat,
    );
    wingPlate.rotation.x = -Math.PI / 2;
    wingPlate.position.set(-side * (wh - 0.24), tTop, 0);
    wingPlate.renderOrder = 2;
    wingSub.add(wingPlate);
    return wingPlateMat;
  };

  const wingPlateLeftMat = buildWing(-1, lidLeft);
  const wingPlateRightMat = buildWing(1, lidRight);

  // Glowing central seam bar inside lidGroup (flashes incandescent right before shear)
  const seamGeo = trackGeom(new THREE.PlaneGeometry(0.055, 2 * HL - 0.08));
  const seamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  seamMat.color.copy(palette.bright).multiplyScalar(1.4);
  const seamStrip = new THREE.Mesh(seamGeo, seamMat);
  seamStrip.rotation.x = -Math.PI / 2;
  seamStrip.position.y = tTop + 0.002;
  seamStrip.renderOrder = 4;
  lidGroup.add(seamStrip);

  // Helical Violet Vortex Beam (2 nested counter-rotating plasma columns)
  const vortexMatOuter = trackMat(createRareVortexBeamMaterial(palette));
  const vortexGeoOuter = trackGeom(
    new THREE.CylinderGeometry(0.68, 1.04, 3.8, 52, 1, true),
  );
  vortexGeoOuter.translate(0, 1.9, 0);
  const vortexOuter = new THREE.Mesh(vortexGeoOuter, vortexMatOuter);
  vortexOuter.position.y = HH;
  vortexOuter.renderOrder = 4;
  box.add(vortexOuter);

  const vortexMatInner = trackMat(createRareVortexBeamMaterial(palette));
  (vortexMatInner.uniforms.uPrimary.value as THREE.Color).copy(palette.bright);
  const vortexGeoInner = trackGeom(
    new THREE.CylinderGeometry(0.32, 0.58, 3.6, 40, 1, true),
  );
  vortexGeoInner.translate(0, 1.8, 0);
  const vortexInner = new THREE.Mesh(vortexGeoInner, vortexMatInner);
  vortexInner.position.y = HH;
  vortexInner.renderOrder = 4;
  box.add(vortexInner);

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

  // Higher-density energetic crystalline shards
  const shardGeo = trackGeom(new THREE.OctahedronGeometry(1, 0));
  shardGeo.scale(0.5, 1.08, 0.14);
  const shardMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.96,
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

  const wingPose = (t: number) => {
    const pL = clamp((t - tl.unlock) / 0.42);
    const lift = eOut(pL);
    const wob = Math.sin(t * 2.8);
    return {
      lift,
      splitX: 1.32 * lift,
      y: 1.31 + 1.08 * lift + wob * 0.048 * lift,
      tiltZ: 0.62 * lift + Math.sin(t * 1.4) * 0.03 * lift,
      yaw: 0.18 * lift,
      rx: 0.08 * lift + 0.04 * Math.sin(t * 1.6) * lift,
    };
  };

  const shardSeeds: RareShardSeed[] = [];
  {
    const R = mulberry32(29);
    for (let i = 0; i < shardCount; i += 1) {
      const fromWing = i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 0;
      const u = R() * 2 - 1;
      const lx = fromWing === 0 ? u * HB : fromWing * (0.1 + R() * 0.9);
      const lz = (R() * 2 - 1) * HL;
      const ly = (R() - 0.5) * 0.14;
      const launchT = tl.unlock + 0.02 + R() * 0.22;
      const wpo = wingPose(launchT);
      const launchX =
        fromWing === 0
          ? lx
          : fromWing * wpo.splitX + lx * Math.cos(wpo.tiltZ);
      const launchYOff =
        fromWing === 0
          ? HH + ly
          : wpo.y + Math.abs(lx) * Math.sin(wpo.tiltZ) + ly;
      shardSeeds.push({
        tl: launchT,
        launchX,
        launchYOff,
        launchZ: lz,
        th0: R() * TAU,
        rad: 1.4 + R() * 1.85,
        yT: 0.45 + R() * 3.1,
        om: (R() < 0.5 ? -1 : 1) * (0.55 + R() * 0.85),
        size: 0.042 + Math.pow(R(), 1.8) * 0.115,
        tr: tl.revealStart + 0.02 + R() * 0.28,
        arc: 0.35 + R() * 0.8,
        ax: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(),
        sp: 2.0 + R() * 4.4,
        ph: R() * TAU,
        hueMix: R(),
      });
    }
  }

  // Abundant ambient arcane dust
  const dustMat = trackMat(createDustMaterial(palette));
  {
    const pos = new Float32Array(dustCount * 3);
    const sd = new Float32Array(dustCount * 4);
    const R = mulberry32(17);
    for (let i = 0; i < dustCount; i += 1) {
      const a = R() * TAU;
      const r = 1.0 + Math.pow(R(), 0.58) * 5.6;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = R();
      pos[i * 3 + 2] = Math.sin(a) * r;
      sd[i * 4] = R();
      sd[i * 4 + 1] = R() < 0.5 ? 1.15 : 2.3;
      sd[i * 4 + 2] = 1 + Math.floor(R() * 3);
      sd[i * 4 + 3] = 0.013 + Math.pow(R(), 2.8) * 0.038;
    }
    const dustGeo = trackGeom(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 4));
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    dust.renderOrder = 4;
    root.add(dust);
  }

  // Edge pulses
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

  // Scan plane
  const scanMat = trackMat(createScanMaterial(palette));
  const scanGeo = trackGeom(new THREE.PlaneGeometry(6.4, 6.4));
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
  const darkTint = new THREE.Color(0.08, 0.04, 0.16);
  const plateFlashCol = new THREE.Color(1.7, 1.4, 1.9);
  const tmpShardCol = new THREE.Color();

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
    (u.uA.value as number) = Math.pow(1 - s, 1.45) * amp;
    (u.uW.value as number) = w;
    if (tint) (u.uColor.value as THREE.Color).copy(tint).multiplyScalar(1.65);
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
    const wp = wingPose(t);
    const open = wp.lift;
    const charge =
      sstep(tl.authStart, tl.authHold, t) * (t < tl.unlock ? 1 : 0);
    const flash = t >= tl.unlock ? Math.exp(-(t - tl.unlock) * 9.0) : 0;
    const warp = t >= tl.unlock ? Math.exp(-(t - tl.unlock) * 5.2) : 0;
    const warpRing = t >= tl.unlock ? (t - tl.unlock) * 1.4 : 0;
    const preFlash = Math.pow(charge, 2.8) * 0.36;
    const ambientFade = isAmbient ? 1 : sstep(tl.handoffStart, tl.complete, t);
    const master = isError ? 0.35 : lerp(sstep(0, 0.3, t), 0.56, ambientFade);
    const dustMaster = isError ? 0.35 : lerp(sstep(0, 0.3, t), 0.52, ambientFade);
    const vaultFade = isAmbient
      ? 0
      : 1 - sstep(tl.revealStart + 0.04, tl.revealStart + 0.44, t);

    let cy = 99;
    if (!isAmbient && !isError && t < tl.matEnd) {
      cy = eInOut(clamp(t / (tl.matEnd - 0.04))) * 1.95;
    }
    clipPlane.constant = cy;
    const scanOn =
      !isAmbient && !isError && t < tl.matEnd
        ? sstep(0, 0.05, t) * (1 - sstep(tl.matEnd - 0.11, tl.matEnd, t))
        : 0;
    scan.visible = scanOn > 0.001 && vaultFade > 0.01;
    scan.position.y = Math.min(cy, 2) + 0.001;
    scanMat.uniforms.uI.value = scanOn * vaultFade;

    const showVault = vaultFade > 0.005;
    box.visible = showVault;
    lidGroup.visible = showVault;

    // Energetic high-frequency tremor during peak charge
    const tremor =
      !isError && !isAmbient && charge > 0.1
        ? charge * charge * 0.015
        : 0;
    const tx = tremor * Math.sin(animClock * 58);
    const tz = tremor * Math.cos(animClock * 47);

    const hover =
      0.16 +
      Math.sin((TAU * 3 * animClock) / tl.ambientBreathCycle) * 0.032 -
      (1 - vaultFade) * 0.44;
    box.position.set(tx, hover, tz);

    pylons.forEach(({ group, sx, sz }) => {
      const pDist = HB + 0.045 + open * 0.14;
      group.position.set(sx * pDist, pylonH / 2 + open * 0.12, sz * pDist);
    });

    lidGroup.position.set(tx, hover + wp.y, tz);
    lidLeft.position.set(-wp.splitX, 0, 0);
    lidLeft.rotation.set(wp.rx, -wp.yaw, -wp.tiltZ);
    lidRight.position.set(wp.splitX, 0, 0);
    lidRight.rotation.set(wp.rx, wp.yaw, wp.tiltZ);

    seamStrip.visible = t < tl.unlock + 0.08 && showVault;
    seamMat.opacity = (0.45 + charge * 0.9 + flash) * (1 - open) * vaultFade;

    const dimError = isError ? 0.4 : 1;
    [bodyFillMat, lidFillMat, pylonFillMat].forEach((m) => {
      m.uniforms.uTime.value = animClock;
      m.uniforms.uFlash.value = flash;
      m.uniforms.uCharge.value = charge + preFlash;
    });
    bodyFillMat.uniforms.uAlpha.value = 0.9 * vaultFade * dimError;
    lidFillMat.uniforms.uAlpha.value = 0.92 * vaultFade * dimError;
    pylonFillMat.uniforms.uAlpha.value = 0.94 * vaultFade * dimError;
    bodyFillMat.uniforms.uOpen.value = open;

    vaultLineMats.forEach(({ mat, baseOp }) => {
      mat.opacity = baseOp * vaultFade * dimError;
    });

    // Floor & vortex & dust
    floorMat.uniforms.uTime.value = animClock;
    floorMat.uniforms.uMaster.value = master;
    floorMat.uniforms.uGlow.value = lerp(
      (open * 0.9 + flash * 0.9 + charge * 0.35) * vaultFade,
      0.24,
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

    vortexOuter.visible = open > 0.01 && showVault;
    vortexInner.visible = open > 0.01 && showVault;
    vortexOuter.rotation.y = animClock * 1.45;
    vortexInner.rotation.y = -animClock * 2.1;
    vortexMatOuter.uniforms.uTime.value = animClock;
    vortexMatOuter.uniforms.uI.value = open * 1.05 * vaultFade;
    vortexMatInner.uniforms.uTime.value = animClock * 1.25;
    vortexMatInner.uniforms.uI.value = open * 0.85 * vaultFade;
    innerFloorMat.uniforms.uI.value = (open * 1.25 + flash * 0.7) * vaultFade;

    // Floor pulses
    const P = floorMat.uniforms.uP.value as THREE.Vector2[];
    const sl = (i: number, r: number, a: number) => P[i].set(r, a);
    {
      const s = (t - 0.12) / 0.78;
      if (!isAmbient && s > 0 && s < 1) sl(0, eOut(s) * 6.4, Math.pow(1 - s, 1.5) * 0.9);
      else sl(0, 0, 0);
    }
    {
      const s = (t - tl.unlock) / 0.95;
      if (!isAmbient && s > 0 && s < 1) sl(1, eOut(s) * 6.6, Math.pow(1 - s, 1.4) * 1.25);
      else sl(1, 0, 0);
    }
    {
      const s = (t - tl.revealStart) / 0.9;
      if (!isAmbient && s > 0 && s < 1) sl(2, 1.3 + eOut(s) * 5.0, Math.pow(1 - s, 1.45) * 0.9);
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
      setRing(ringLift, t, tl.unlock + 0.05, 0.72, 1.2, 3.8, 1.05, hover + HH + 0.08);
      setRing(
        ringBirth,
        t,
        tl.revealStart - 0.2,
        0.75,
        0.6,
        3.0,
        0.95,
        hover + HH + 0.15,
        0.032,
        accentColor,
      );
      ringFlash.position.set(0, hover + 0.64, HB + 0.03);
      ringFlash2.position.set(0, hover + 0.64, HB + 0.03);
      setRing(ringFlash, t, tl.unlock, 0.56, 0.15, 3.0, 1.35, null, 0.034, palette.warm);
      setRing(ringFlash2, t, tl.unlock + 0.07, 0.72, 0.1, 3.4, 0.55, null, 0.022, palette.trim);
    }

    // Octagonal Seal & Twin Diamonds
    const bWhite = sstep(tl.authStart + 0.18, tl.unlock - 0.02, t);
    let bs = 1;
    let ba = 1;
    if (t >= tl.unlock) {
      const p = clamp((t - tl.unlock) / 0.34);
      bs = 1 + 0.6 * eOut(p);
      ba = 1 - p;
    }
    const finalBa = ba * vaultFade * dimError;
    const dsc = 1 - sstep(tl.unlock - 0.12, tl.unlock + 0.02, t);
    badge.scale.setScalar(bs);
    badge.visible = finalBa > 0.004 && showVault;

    tmpWarm.copy(palette.warm).lerp(pureWhite, 0.55);
    tmpWhite.copy(palette.ice).lerp(tmpWarm, bWhite);
    const bright = 1 + charge * 0.65 + bWhite * 1.7;
    octLine.material.color.copy(tmpWhite).multiplyScalar(1.95 * bright);
    octLine.material.opacity = finalBa;
    octLine2.material.color.copy(palette.trim).lerp(tmpWarm, bWhite).multiplyScalar(1.4 * bright);
    octLine2.material.opacity = 0.72 * finalBa;
    plateMat.color.copy(palette.deep).multiplyScalar(1.4).lerp(plateFlashCol, bWhite);
    plateMat.opacity = 0.95 * finalBa;

    diamondOuter.scale.set(Math.max(0.001, dsc), Math.max(0.001, dsc), 1);
    diamondOuter.rotation.z = charge * 0.25;
    diamondInner.scale.set(Math.max(0.001, dsc), Math.max(0.001, dsc), 1);
    diamondInner.rotation.z = -animClock * (0.45 + charge * 3.5);
    diaMat.color.copy(palette.ice).lerp(darkTint, bWhite).multiplyScalar(1.55);
    diaMat.opacity = finalBa;
    diaLine.material.opacity = finalBa;
    innerDiaMat.opacity = finalBa;

    const cr = !isError && t >= tl.authStart && t < tl.unlock ? 1 : 0;
    chargeRingOuter.visible = cr > 0 && showVault;
    chargeRingInner.visible = cr > 0 && showVault;
    if (cr) {
      const rOut = lerp(1.05, 0.4, eOut(charge));
      const rIn = lerp(0.84, 0.3, eOut(charge));
      chargeRingOuter.scale.set(rOut, rOut, 1);
      chargeRingOuter.rotation.z = animClock * (3.5 + charge * 11);
      chargeRingOuter.material.opacity = (0.48 + charge * 0.52) * vaultFade;
      chargeRingInner.scale.set(rIn, rIn, 1);
      chargeRingInner.rotation.z = -animClock * (4.5 + charge * 13);
      chargeRingInner.material.opacity = (0.45 + charge * 0.55) * vaultFade;
    }

    badgeGlow.material.color
      .copy(palette.ice)
      .lerp(palette.warm, bWhite)
      .multiplyScalar((0.12 + charge * 0.55 + flash * 1.7) * finalBa);
    badgeGlow.scale.setScalar(1.05 + charge * 0.65 + flash * 1.7);

    dataLines.forEach((l, i) => {
      l.material.opacity =
        (0.32 + 0.52 * (0.5 + 0.5 * Math.sin((TAU * 3 * animClock) / tl.ambientBreathCycle + i * 1.4))) *
        (1 - open * 0.25) *
        vaultFade *
        dimError;
    });

    // Edge pulses
    let k = 0;
    const sp = 2.8 / tl.ambientBreathCycle;
    for (let i = 0; i < 6; i += 1) {
      const p = rimPt(animClock * sp + i / 6, 0.04);
      pulsePos[k * 3] = p[0];
      pulsePos[k * 3 + 1] = p[1];
      pulsePos[k * 3 + 2] = p[2];
      pulseA[k++] = 0.92;
    }
    for (let i = 0; i < 6; i += 1) {
      const p = rimPt(-animClock * sp * 1.6 + i / 6 + 0.08, HH - 0.02);
      pulsePos[k * 3] = p[0];
      pulsePos[k * 3 + 1] = p[1];
      pulsePos[k * 3 + 2] = p[2];
      pulseA[k++] = 0.92;
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
        const f = ((animClock * 3.4) / tl.ambientBreathCycle + i * 0.25 + j * 0.5) % 1;
        pulsePos[k * 3] = x;
        pulsePos[k * 3 + 1] = 0.04 + f * (HH - 0.08);
        pulsePos[k * 3 + 2] = z;
        pulseA[k++] = Math.sin(Math.PI * f) * (1 - open * 0.55);
      }
    });
    pulsePosAttr.needsUpdate = true;
    pulseAAttr.needsUpdate = true;
    pulseMat.uniforms.uI.value = (1.1 + charge * 1.3 + flash) * master * vaultFade;

    [wingPlateLeftMat, wingPlateRightMat].forEach((m) => {
      m.opacity =
        (0.45 + 0.16 * Math.sin(animClock * 1.9) + charge * 0.35 + flash * 0.5) *
        vaultFade *
        dimError;
    });

    // Instanced Shards erupting along split seam & spiraling into reward singularity
    if (isAmbient || t < tl.unlock) {
      shardMesh.visible = false;
    } else {
      shardMesh.visible = true;
      const swirlTargetY = crystalY || 2.0;
      const revealBlend = sstep(tl.revealStart, tl.revealPeak, t);
      for (let i = 0; i < shardSeeds.length; i += 1) {
        const s = shardSeeds[i];
        const sF = clamp((t - s.tl) / 0.66);
        const s2 = clamp((t - s.tr) / 0.48);
        const vis = t > s.tl && s2 < 1;
        if (!vis) {
          tmpO.position.set(0, -50, 0);
          tmpO.scale.setScalar(0);
          tmpO.updateMatrix();
          shardMesh.setMatrixAt(i, tmpO.matrix);
          continue;
        }
        const ox = s.launchX;
        const oy = hover + s.launchYOff;
        const oz = s.launchZ;
        const th = s.th0 + s.om * t;
        const bx = Math.cos(th) * s.rad;
        const bz = Math.sin(th) * s.rad;
        const by = s.yT + 0.16 * Math.sin(1.6 * t + s.ph);
        const e = eOut(sF);
        let x = lerp(ox, bx, e);
        let y = lerp(oy, by, e) + Math.sin(Math.PI * sF) * s.arc * 0.62;
        let z = lerp(oz, bz, e);
        const e2 = eIn(s2);
        if (s2 > 0) {
          const ang = e2 * 3.1;
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
          sstep(0, 0.12, sF) *
          (1 - sstep(0.55, 1, s2)) *
          (0.85 + 0.15 * Math.sin(t * 5.6 + s.ph));
        tmpO.position.set(x, y, z);
        tmpO.quaternion.setFromAxisAngle(s.ax, t * s.sp + s.ph);
        tmpO.scale.setScalar(Math.max(0.0001, sc));
        tmpO.updateMatrix();
        shardMesh.setMatrixAt(i, tmpO.matrix);

        tmpShardCol
          .copy(palette.ice)
          .lerp(palette.trim, s.hueMix * 0.6)
          .lerp(accentColor, revealBlend * 0.85);
        const tw =
          (1.1 + 1.2 * (0.5 + 0.5 * Math.sin(t * 6.5 + s.ph * 3)) + flash * 1.5) *
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
      warp,
      warpRing,
      streak: 0,
      vaultFade,
      underLightIntensity: (open * 18 + flash * 32) * vaultFade,
    };
  };

  const setLockedHeroPose = () => {
    clipPlane.constant = 99;
    scan.visible = false;
    box.visible = true;
    lidGroup.visible = true;
    box.position.set(0, 0.08, 0);
    pylons.forEach(({ group, sx, sz }) => {
      const pDist = HB + 0.045;
      group.position.set(sx * pDist, pylonH / 2, sz * pDist);
    });
    lidGroup.position.set(0, 0.08 + 1.31, 0);
    lidLeft.position.set(0, 0, 0);
    lidLeft.rotation.set(0, 0, 0);
    lidRight.position.set(0, 0, 0);
    lidRight.rotation.set(0, 0, 0);
    seamStrip.visible = true;
    seamMat.opacity = 0.55;
    [bodyFillMat, lidFillMat, pylonFillMat].forEach((m) => {
      m.uniforms.uTime.value = 1.4;
      m.uniforms.uFlash.value = 0;
      m.uniforms.uCharge.value = 0.05;
      m.uniforms.uOpen.value = 0;
    });
    bodyFillMat.uniforms.uAlpha.value = 0.92;
    lidFillMat.uniforms.uAlpha.value = 0.94;
    pylonFillMat.uniforms.uAlpha.value = 0.94;
    vaultLineMats.forEach(({ mat, baseOp }) => {
      mat.opacity = baseOp;
    });
    floorMat.uniforms.uTime.value = 1.4;
    floorMat.uniforms.uMaster.value = 0.74;
    floorMat.uniforms.uGlow.value = 0.12;
    dustMat.uniforms.uTime.value = 1.4;
    dustMat.uniforms.uMaster.value = 0.72;
    vortexOuter.visible = false;
    vortexInner.visible = false;
    innerFloorMat.uniforms.uI.value = 0;
    badge.visible = true;
    badge.scale.setScalar(1);
    diamondOuter.scale.set(1, 1, 1);
    diamondOuter.rotation.z = 0;
    diamondInner.scale.set(1, 1, 1);
    diamondInner.rotation.z = 0;
    chargeRingOuter.visible = false;
    chargeRingInner.visible = false;
    badgeGlow.material.color.copy(palette.ice).multiplyScalar(0.2);
    badgeGlow.scale.setScalar(1.0);
    shardMesh.visible = false;
    pulseMat.uniforms.uI.value = 0.65;
  };

  const setPointScale = (scale: number) => {
    dustMat.uniforms.uScale.value = scale;
    pulseMat.uniforms.uScale.value = scale;
    nodeMat.uniforms.uScale.value = scale;
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
