import * as THREE from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import {
  BOX_TIMELINE,
  TAU,
  VAULT_DIM,
  clamp,
  eBack,
  eIn,
  eInOut,
  eOut,
  lerp,
  mulberry32,
  sstep,
  type CommonBoxPalette,
} from "./common-box-palette";
import {
  circlePts,
  createBeamMaterial,
  createDustMaterial,
  createFillMaterial,
  createFloorMaterial,
  createGlowSprite,
  createInnerFloorMaterial,
  createPulseMaterial,
  createRingMaterial,
  createScanMaterial,
  createThickLine,
  loopPts,
  seg,
  type LineHelperRegistry,
} from "./common-box-shaders";

interface ShardSeed {
  fromLid: boolean;
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
}

export interface VaultUpdateParams {
  t: number;
  holdElapsed: number;
  ambientTime: number;
  isAmbient: boolean;
  isError: boolean;
  crystalY: number;
  accentColor: THREE.Color;
}

export interface VaultController {
  root: THREE.Group;
  update: (params: VaultUpdateParams) => {
    hover: number;
    open: number;
    charge: number;
    flash: number;
    vaultFade: number;
    underLightIntensity: number;
  };
  setLockedHeroPose: () => void;
  setPointScale: (scale: number) => void;
  dispose: () => void;
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

export function createVault(
  palette: CommonBoxPalette,
  registry: LineHelperRegistry,
  glowTex: THREE.Texture,
  clipPlane: THREE.Plane,
  options: { dustCount?: number; shardCount?: number } = {},
): VaultController {
  const { hb: HB, hh: HH, hl: HL, lt: LT, fo: FO } = VAULT_DIM;
  const dustCount = options.dustCount ?? 650;
  const shardCount = options.shardCount ?? 150;

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
  const lid = new THREE.Group();
  root.add(box);
  root.add(lid);

  const floorMat = trackMat(createFloorMaterial(palette));
  const floorGeo = trackGeom(new THREE.PlaneGeometry(20, 20));
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.renderOrder = 0;
  root.add(floor);

  // Body geometry without top cap (matches box-common.html line 378)
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

  const bodyDepth = new THREE.Mesh(bodyGeo, makeDepthMat());
  bodyDepth.renderOrder = -1;
  box.add(bodyDepth);

  const bodyFillMat = trackMat(
    createFillMaterial(palette, { uAlpha: 0.9, uHeight: HH }),
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

  const bodyEdges = registerVaultLine(
    createThickLine(registry, edges, {
      color: palette.ice,
      w: 1.7,
      boost: 1.5,
    }),
  );
  box.add(bodyEdges);

  const bodyGhost = registerVaultLine(
    createThickLine(registry, edges, {
      color: palette.ice,
      w: 1.1,
      op: 0.22,
      boost: 1.0,
      depthFunc: THREE.GreaterDepth,
      depthWrite: false,
      order: 2,
    }),
  );
  box.add(bodyGhost);

  // Face details
  const detail: number[] = [];
  const detail2: number[] = [];
  FACES.forEach((f) => {
    seg(detail2, fp(f, -HB, 0.13), fp(f, HB, 0.13));
    const m = 0.2;
    const a: [number, number] = [-HB + m, 0.27];
    const b: [number, number] = [HB - m, 1.0];
    if (f === "pz") {
      seg(detail, fp(f, a[0], a[1]), fp(f, b[0], a[1]));
      seg(detail, fp(f, a[0], b[1]), fp(f, b[0], b[1]));
      seg(detail, fp(f, a[0], a[1]), fp(f, a[0], b[1]));
      seg(detail, fp(f, b[0], a[1]), fp(f, b[0], b[1]));
      seg(detail2, fp(f, -0.82, 0.635), fp(f, -0.36, 0.635));
      seg(detail2, fp(f, 0.36, 0.635), fp(f, 0.82, 0.635));
      seg(detail2, fp(f, -0.7, 0.5), fp(f, -0.36, 0.5));
      seg(detail2, fp(f, 0.36, 0.5), fp(f, 0.7, 0.5));
    } else {
      loopPts(detail, [
        fp(f, a[0], a[1]),
        fp(f, b[0], a[1]),
        fp(f, b[0], b[1]),
        fp(f, a[0], b[1]),
      ]);
    }
    [-1, 1].forEach((s) =>
      seg(detail2, fp(f, s * (HB - 0.09), 0.22), fp(f, s * (HB - 0.09), HH - 0.1)),
    );
  });
  box.add(
    registerVaultLine(
      createThickLine(registry, detail, {
        color: palette.ice,
        w: 1.1,
        op: 0.75,
        boost: 0.95,
      }),
    ),
  );
  box.add(
    registerVaultLine(
      createThickLine(registry, detail2, {
        color: palette.ice,
        w: 0.9,
        op: 0.5,
        boost: 0.85,
      }),
    ),
  );

  // +X data telemetry panel
  const dataLines: LineSegments2[] = [];
  const dataLengths = [0.78, 0.62, 0.7, 0.5, 0.38];
  dataLengths.forEach((len, i) => {
    const v = 0.86 - i * 0.115;
    const p: number[] = [];
    seg(p, fp("px", -0.42, v), fp("px", -0.42 + len, v));
    const line = registerVaultLine(
      createThickLine(registry, p, {
        color: palette.ice,
        w: 1.0,
        op: 0.5,
        boost: 0.9,
      }),
    );
    box.add(line);
    dataLines.push(line);
  });

  {
    const sqInd: number[] = [];
    [-0.42, -0.3].forEach((u) => {
      const q = fp("px", u, 0.39);
      const s = 0.028;
      loopPts(sqInd, [
        [q[0], q[1] - s, q[2] - s],
        [q[0], q[1] - s, q[2] + s],
        [q[0], q[1] + s, q[2] + s],
        [q[0], q[1] + s, q[2] - s],
      ]);
    });
    box.add(
      registerVaultLine(
        createThickLine(registry, sqInd, {
          color: palette.ice,
          w: 1,
          op: 0.7,
          boost: 1,
        }),
      ),
    );
  }

  // Rail corner nodes
  const nodePos: number[] = [];
  FACES.forEach((f) =>
    [-1, 1].forEach((s) =>
      [0.38, 0.72, 1.02].forEach((v) =>
        nodePos.push(...fp(f, s * (HB - 0.09), v, 0.002)),
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
    new THREE.Float32BufferAttribute(new Array(nodePos.length / 3).fill(0.55), 1),
  );
  const nodeMat = trackMat(createPulseMaterial(palette));
  nodeMat.uniforms.uI.value = 0.6;
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

  // Hexagonal front seal + central diamond lock
  const badge = new THREE.Group();
  badge.position.set(0, 0.64, HB + FO + 0.004);
  box.add(badge);

  const hexPts = (R: number): Array<[number, number, number]> =>
    Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 2 + (i * Math.PI) / 3;
      return [Math.cos(a) * R, Math.sin(a) * R, 0];
    });
  const hexShape = new THREE.Shape(
    hexPts(0.27).map((p) => new THREE.Vector2(p[0], p[1])),
  );
  const plateMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      clippingPlanes: null,
    }),
  );
  plateMat.color.copy(palette.deep).multiplyScalar(1.3);
  const plateGeo = trackGeom(new THREE.ShapeGeometry(hexShape));
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.renderOrder = 3;
  badge.add(plate);

  const hexEdge: number[] = [];
  loopPts(hexEdge, hexPts(0.27));
  const hexLine = createThickLine(registry, hexEdge, {
    color: palette.ice,
    w: 2.2,
    boost: 1.9,
    order: 4,
  });
  hexLine.position.z = 0.006;
  badge.add(hexLine);

  const hexEdge2: number[] = [];
  loopPts(hexEdge2, hexPts(0.2));
  const hexLine2 = createThickLine(registry, hexEdge2, {
    color: palette.ice,
    w: 1,
    op: 0.5,
    boost: 1,
    order: 4,
  });
  hexLine2.position.z = 0.006;
  badge.add(hexLine2);

  const kite = (h: number, w: number): Array<[number, number, number]> => [
    [0, h, 0],
    [w, 0, 0],
    [0, -h, 0],
    [-w, 0, 0],
  ];
  const kiteShape = new THREE.Shape(
    kite(0.135, 0.075).map((p) => new THREE.Vector2(p[0], p[1])),
  );
  const diamond = new THREE.Group();
  diamond.position.z = 0.008;
  badge.add(diamond);

  const diaMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    }),
  );
  diaMat.color.copy(palette.ice).multiplyScalar(1.5);
  const diaGeo = trackGeom(new THREE.ShapeGeometry(kiteShape));
  const diaMesh = new THREE.Mesh(diaGeo, diaMat);
  diaMesh.renderOrder = 4;
  diamond.add(diaMesh);

  const diaEdge: number[] = [];
  loopPts(diaEdge, kite(0.135, 0.075));
  const diaLine = createThickLine(registry, diaEdge, {
    color: palette.ice,
    w: 1.2,
    boost: 2.2,
    order: 5,
  });
  diaLine.position.z = 0.002;
  diamond.add(diaLine);

  const chargeRingPts: number[] = [];
  loopPts(chargeRingPts, circlePts(1, 72));
  const chargeRing = createThickLine(registry, chargeRingPts, {
    color: palette.ice,
    w: 1.4,
    dashed: true,
    dashSize: 0.12,
    gapSize: 0.1,
    boost: 1.8,
    order: 5,
  });
  chargeRing.position.z = 0.01;
  chargeRing.visible = false;
  badge.add(chargeRing);

  const badgeGlow = createGlowSprite(glowTex, palette.ice, 1.2, 0);
  trackMat(badgeGlow.material);
  badgeGlow.position.z = 0.05;
  badge.add(badgeGlow);

  // Overhanging square lid
  const lidGeo = trackGeom(new THREE.BoxGeometry(2 * HL, LT, 2 * HL));
  const lidDepth = new THREE.Mesh(lidGeo, makeDepthMat());
  lidDepth.renderOrder = -1;
  lid.add(lidDepth);

  const lidFillMat = trackMat(
    createFillMaterial(palette, {
      uAlpha: 0.92,
      uHeight: LT,
      uBand: 0.6,
      uGrid: 0.8,
    }),
  );
  const lidFill = new THREE.Mesh(lidGeo, lidFillMat);
  lidFill.renderOrder = 1;
  lid.add(lidFill);

  const lidE: number[] = [];
  const lh = LT / 2;
  [-lh, lh].forEach((y) =>
    loopPts(lidE, [
      [-HL, y, -HL],
      [HL, y, -HL],
      [HL, y, HL],
      [-HL, y, HL],
    ]),
  );
  (
    [
      [-HL, -HL],
      [HL, -HL],
      [HL, HL],
      [-HL, HL],
    ] as const
  ).forEach(([x, z]) => seg(lidE, [x, -lh, z], [x, lh, z]));
  lid.add(
    registerVaultLine(
      createThickLine(registry, lidE, {
        color: palette.ice,
        w: 1.7,
        boost: 1.5,
      }),
    ),
  );

  const tTop = lh + 0.003;
  const lidD1: number[] = [];
  const lidD2: number[] = [];
  const sq = (r: number, y: number): Array<[number, number, number]> => [
    [-r, y, -r],
    [r, y, -r],
    [r, y, r],
    [-r, y, r],
  ];
  loopPts(lidD1, sq(0.98, tTop));
  loopPts(lidD2, sq(0.8, tTop));
  loopPts(lidD1, sq(0.3, tTop));
  (
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const
  ).forEach(([sx, sz]) => {
    const c: [number, number, number] = [sx * 1.08, tTop, sz * 1.08];
    seg(lidD2, c, [c[0] - sx * 0.16, tTop, c[2]]);
    seg(lidD2, c, [c[0], tTop, c[2] - sz * 0.16]);
  });
  [-1, 1].forEach((s) => {
    seg(lidD2, [0, tTop, s * 0.3], [0, tTop, s * 0.8]);
    seg(lidD2, [s * 0.3, tTop, 0], [s * 0.8, tTop, 0]);
  });
  loopPts(lidD2, sq(HL + 0.003, -lh + 0.09));

  lid.add(
    registerVaultLine(
      createThickLine(registry, lidD1, {
        color: palette.ice,
        w: 1.2,
        op: 0.9,
        boost: 1.2,
      }),
    ),
  );
  lid.add(
    registerVaultLine(
      createThickLine(registry, lidD2, {
        color: palette.ice,
        w: 0.9,
        op: 0.5,
        boost: 0.9,
      }),
    ),
  );

  const plateTopMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  plateTopMat.color.copy(palette.mid).multiplyScalar(0.7);
  const plateTopGeo = trackGeom(new THREE.PlaneGeometry(0.6, 0.6));
  const plateTop = new THREE.Mesh(plateTopGeo, plateTopMat);
  plateTop.rotation.x = -Math.PI / 2;
  plateTop.position.y = tTop;
  plateTop.renderOrder = 2;
  lid.add(plateTop);

  // Light beam cylinder
  const beamMat = trackMat(createBeamMaterial(palette));
  const beamGeo = trackGeom(
    new THREE.CylinderGeometry(0.55, 0.98, 3.3, 56, 1, true),
  );
  beamGeo.translate(0, 1.65, 0);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = HH;
  beam.renderOrder = 4;
  box.add(beam);

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

  // Instanced shards bridging opening -> crystal convergence
  const shardGeo = trackGeom(new THREE.OctahedronGeometry(1, 0));
  shardGeo.scale(0.55, 1, 0.14);
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

  const shardSeeds: ShardSeed[] = [];
  {
    const R = mulberry32(11);
    for (let i = 0; i < shardCount; i += 1) {
      const fromLid = R() < 0.72;
      const s = R() * 4;
      const side = Math.floor(s);
      const u = (s % 1) * 2 - 1;
      const hx = fromLid ? HL : HB;
      let lx = 0;
      let lz = 0;
      if (side === 0) {
        lx = u * hx;
        lz = -hx;
      } else if (side === 1) {
        lx = hx;
        lz = u * hx;
      } else if (side === 2) {
        lx = u * hx;
        lz = hx;
      } else {
        lx = -hx;
        lz = u * hx;
      }
      shardSeeds.push({
        fromLid,
        lx,
        lz,
        ly: (R() - 0.5) * 0.16,
        tl: BOX_TIMELINE.unlock + 0.03 + R() * 0.22,
        th0: R() * TAU,
        rad: 1.55 + R() * 1.55,
        yT: 0.45 + R() * 2.9,
        om: (R() < 0.5 ? -1 : 1) * (0.28 + R() * 0.55),
        size: 0.045 + Math.pow(R(), 2) * 0.11,
        tr: BOX_TIMELINE.revealStart + 0.02 + R() * 0.28,
        arc: 0.28 + R() * 0.75,
        ax: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(),
        sp: 1.4 + R() * 3.6,
        ph: R() * TAU,
      });
    }
  }

  // Ambient dust particles
  const dustMat = trackMat(createDustMaterial(palette));
  {
    const pos = new Float32Array(dustCount * 3);
    const sd = new Float32Array(dustCount * 4);
    const R = mulberry32(3);
    for (let i = 0; i < dustCount; i += 1) {
      const a = R() * TAU;
      const r = 1.1 + Math.pow(R(), 0.6) * 5.2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = R();
      pos[i * 3 + 2] = Math.sin(a) * r;
      sd[i * 4] = R();
      sd[i * 4 + 1] = R() < 0.6 ? 1 : 2;
      sd[i * 4 + 2] = 1 + Math.floor(R() * 3);
      sd[i * 4 + 3] = 0.012 + Math.pow(R(), 3) * 0.035;
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
  const NP = 16;
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

  // Materialization scan plane
  const scanMat = trackMat(createScanMaterial(palette));
  const scanGeo = trackGeom(new THREE.PlaneGeometry(6, 6));
  const scan = new THREE.Mesh(scanGeo, scanMat);
  scan.rotation.x = -Math.PI / 2;
  scan.renderOrder = 6;
  root.add(scan);

  // Pre-allocated scratch objects (zero GC churn per frame)
  const tmpO = new THREE.Object3D();
  const tmpC = new THREE.Color();
  const tmpWhite = new THREE.Color();
  const tmpIce = new THREE.Color();
  const tmpWarm = new THREE.Color();
  const pureWhite = new THREE.Color(1, 1, 1);
  const darkTint = new THREE.Color(0.05, 0.1, 0.15);
  const plateFlashCol = new THREE.Color(1.6, 1.6, 1.6);
  const tmpShardCol = new THREE.Color();

  const lidPose = (t: number) => {
    const pL = clamp((t - BOX_TIMELINE.unlock) / 0.44);
    const lift = eOut(pL);
    const wob = Math.sin(t * 2.2);
    return {
      lift,
      y: 1.31 + 2.45 * lift + wob * 0.045 * lift,
      yaw: 0.36 * lift + Math.sin(t * 1.1) * 0.04 * lift,
      rx: 0.065 * Math.sin(t * 1.3 + 1) * lift,
      rz: 0.055 * Math.sin(t * 0.95) * lift,
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
    if (tint) (u.uColor.value as THREE.Color).copy(tint).multiplyScalar(1.6);
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
  }: VaultUpdateParams) => {
    const animClock = t + holdElapsed + ambientTime;
    const lp = lidPose(t);
    const open = lp.lift;
    const charge =
      sstep(BOX_TIMELINE.authStart, BOX_TIMELINE.authHold, t) *
      (t < BOX_TIMELINE.unlock ? 1 : 0);
    const flash =
      t >= BOX_TIMELINE.unlock ? Math.exp(-(t - BOX_TIMELINE.unlock) * 9.5) : 0;
    const preFlash = Math.pow(charge, 3) * 0.3;
    const ambientFade = isAmbient
      ? 1
      : sstep(BOX_TIMELINE.handoffStart, BOX_TIMELINE.complete, t);
    const master = isError
      ? 0.35
      : lerp(sstep(0, 0.32, t), 0.55, ambientFade);
    const dustMaster = isError
      ? 0.35
      : lerp(sstep(0, 0.32, t), 0.48, ambientFade);
    const vaultFade = isAmbient
      ? 0
      : 1 - sstep(BOX_TIMELINE.revealStart, BOX_TIMELINE.revealStart + 0.36, t);

    // Bottom-to-top holographic materialization clip plane
    let cy = 99;
    if (!isAmbient && !isError && t < BOX_TIMELINE.matEnd) {
      cy = eInOut(clamp(t / (BOX_TIMELINE.matEnd - 0.04))) * 1.85;
    }
    clipPlane.constant = cy;
    const scanOn =
      !isAmbient && !isError && t < BOX_TIMELINE.matEnd
        ? sstep(0, 0.06, t) * (1 - sstep(BOX_TIMELINE.matEnd - 0.12, BOX_TIMELINE.matEnd, t))
        : 0;
    scan.visible = scanOn > 0.001 && vaultFade > 0.01;
    scan.position.y = Math.min(cy, 2) + 0.001;
    scanMat.uniforms.uI.value = scanOn * vaultFade;

    const showVault = vaultFade > 0.005;
    box.visible = showVault;
    lid.visible = showVault;

    const hover =
      0.16 +
      Math.sin((TAU * 3 * animClock) / 11) * 0.028 -
      (1 - vaultFade) * 0.42;
    box.position.y = hover;
    box.scale.y = 1;
    lid.position.set(0, hover + lp.y, 0);
    lid.rotation.set(lp.rx, lp.yaw, lp.rz);

    // Fill uniforms & vault line opacity fade
    const dimError = isError ? 0.42 : 1;
    [bodyFillMat, lidFillMat].forEach((m) => {
      m.uniforms.uTime.value = animClock;
      m.uniforms.uFlash.value = flash;
      m.uniforms.uCharge.value = charge * 0.9 + preFlash;
    });
    bodyFillMat.uniforms.uAlpha.value = 0.9 * vaultFade * dimError;
    lidFillMat.uniforms.uAlpha.value = 0.92 * vaultFade * dimError;
    bodyFillMat.uniforms.uOpen.value = open;

    vaultLineMats.forEach(({ mat, baseOp }) => {
      mat.opacity = baseOp * vaultFade * dimError;
    });

    // Floor & dust persist seamlessly through ambient handoff with continuous phase
    floorMat.uniforms.uTime.value = animClock;
    floorMat.uniforms.uMaster.value = master;
    floorMat.uniforms.uGlow.value = lerp(
      (open * 0.8 + flash * 0.8 + charge * 0.25) * vaultFade,
      0.18,
      ambientFade,
    );
    const accentBlend = lerp(
      sstep(BOX_TIMELINE.revealStart, BOX_TIMELINE.revealPeak, t) * 0.55,
      0.55,
      ambientFade,
    );
    tmpIce.copy(palette.ice).lerp(accentColor, accentBlend);
    (floorMat.uniforms.uIce.value as THREE.Color).copy(tmpIce);

    dustMat.uniforms.uTime.value = animClock;
    dustMat.uniforms.uMaster.value = dustMaster;
    (dustMat.uniforms.uColor.value as THREE.Color).copy(tmpIce);

    beamMat.uniforms.uTime.value = animClock;
    beamMat.uniforms.uI.value = open * 0.92 * vaultFade;
    innerFloorMat.uniforms.uI.value = (open * 1.1 + flash * 0.6) * vaultFade;

    // Floor pulse rings (6 slots)
    const P = floorMat.uniforms.uP.value as THREE.Vector2[];
    const sl = (i: number, r: number, a: number) => P[i].set(r, a);
    {
      const s = (t - 0.12) / 0.8;
      if (!isAmbient && s > 0 && s < 1) sl(0, eOut(s) * 6.2, Math.pow(1 - s, 1.5) * 0.85);
      else sl(0, 0, 0);
    }
    {
      const s = (t - BOX_TIMELINE.unlock) / 0.95;
      if (!isAmbient && s > 0 && s < 1) sl(1, eOut(s) * 6.0, Math.pow(1 - s, 1.5) * 1.1);
      else sl(1, 0, 0);
    }
    {
      const s = (t - BOX_TIMELINE.revealStart) / 0.9;
      if (!isAmbient && s > 0 && s < 1) sl(2, 1.2 + eOut(s) * 4.8, Math.pow(1 - s, 1.5) * 0.8);
      else sl(2, 0, 0);
    }
    {
      const s = (t - BOX_TIMELINE.handoffStart) / 0.45;
      if (!isAmbient && s > 0 && s < 1) sl(3, 1.6 + eOut(s) * 4.5, Math.pow(1 - s, 1.4) * 0.55);
      else sl(3, 0, 0);
    }
    sl(4, 0, 0);
    sl(5, 0, 0);

    // 3D shockwave rings
    if (isAmbient) {
      ringLift.visible = false;
      ringBirth.visible = false;
      ringFlash.visible = false;
      ringFlash2.visible = false;
    } else {
      setRing(ringLift, t, BOX_TIMELINE.unlock + 0.06, 0.72, 1.3, 3.4, 0.9, hover + HH + 0.05);
      setRing(
        ringBirth,
        t,
        BOX_TIMELINE.revealStart - 0.25,
        0.78,
        0.5,
        2.6,
        0.8,
        hover + HH + 0.1,
        0.03,
        accentColor,
      );
      ringFlash.position.set(0, hover + 0.64, HB + 0.02);
      ringFlash2.position.set(0, hover + 0.64, HB + 0.02);
      setRing(ringFlash, t, BOX_TIMELINE.unlock, 0.55, 0.15, 2.6, 1.2, null, 0.03);
      setRing(ringFlash2, t, BOX_TIMELINE.unlock + 0.05, 0.7, 0.1, 3.0, 0.45, null, 0.02);
    }

    // Hexagonal seal & diamond lock
    const bWhite = sstep(BOX_TIMELINE.authStart + 0.18, BOX_TIMELINE.unlock - 0.02, t);
    let bs = 1;
    let ba = 1;
    if (t >= BOX_TIMELINE.unlock) {
      const p = clamp((t - BOX_TIMELINE.unlock) / 0.36);
      bs = 1 + 0.5 * eOut(p);
      ba = 1 - p;
    }
    const finalBa = ba * vaultFade * dimError;
    const dsc = 1 - sstep(BOX_TIMELINE.unlock - 0.14, BOX_TIMELINE.unlock + 0.02, t);
    badge.scale.setScalar(bs);
    badge.visible = finalBa > 0.004 && showVault;

    tmpWarm.copy(palette.warm).lerp(pureWhite, 0.6);
    tmpWhite.copy(palette.ice).lerp(tmpWarm, bWhite);
    const bright = 1 + charge * 0.5 + bWhite * 1.6;
    hexLine.material.color.copy(tmpWhite).multiplyScalar(1.9 * bright);
    hexLine.material.opacity = finalBa;
    hexLine2.material.color.copy(tmpWhite).multiplyScalar(1.2);
    hexLine2.material.opacity = 0.5 * finalBa;
    plateMat.color.copy(palette.deep).multiplyScalar(1.3).lerp(plateFlashCol, bWhite);
    plateMat.opacity = 0.94 * finalBa;
    diamond.scale.set(Math.max(0.001, dsc), Math.max(0.001, dsc), 1);
    diaMat.color.copy(palette.ice).lerp(darkTint, bWhite).multiplyScalar(1.5);
    diaMat.opacity = finalBa;
    diaLine.material.opacity = finalBa;
    diaLine.material.color.copy(tmpWhite).multiplyScalar(2.2);

    const cr = !isError && t >= BOX_TIMELINE.authStart && t < BOX_TIMELINE.unlock ? 1 : 0;
    chargeRing.visible = cr > 0 && showVault;
    if (cr) {
      const chargeGlow = charge > 0 ? charge : clamp((holdElapsed % 1.2) / 1.2);
      const r = lerp(0.95, 0.36, eOut(charge));
      chargeRing.scale.set(r, r, 1);
      chargeRing.rotation.z = animClock * (3 + charge * 10);
      chargeRing.material.opacity = (0.4 + charge * 0.6 + Math.sin(holdElapsed * 6) * 0.1 * chargeGlow) * vaultFade;
    }
    badgeGlow.material.color
      .copy(palette.ice)
      .lerp(palette.warm, bWhite)
      .multiplyScalar((0.1 + charge * 0.45 + flash * 1.6) * finalBa);
    badgeGlow.scale.setScalar(1.0 + charge * 0.6 + flash * 1.6);

    dataLines.forEach((l, i) => {
      l.material.opacity =
        (0.28 + 0.5 * (0.5 + 0.5 * Math.sin((TAU * 3 * animClock) / 11 + i * 1.45))) *
        (1 - open * 0.25) *
        vaultFade *
        dimError;
    });

    // Edge pulses
    let k = 0;
    const sp = 2.4 / 11;
    for (let i = 0; i < 4; i += 1) {
      const p = rimPt(animClock * sp + i / 4, 0.04);
      pulsePos[k * 3] = p[0];
      pulsePos[k * 3 + 1] = p[1];
      pulsePos[k * 3 + 2] = p[2];
      pulseA[k++] = 0.9;
    }
    for (let i = 0; i < 4; i += 1) {
      const p = rimPt(-animClock * sp * 1.5 + i / 4 + 0.125, HH - 0.02);
      pulsePos[k * 3] = p[0];
      pulsePos[k * 3 + 1] = p[1];
      pulsePos[k * 3 + 2] = p[2];
      pulseA[k++] = 0.9;
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
        const f = ((animClock * 3) / 11 + i * 0.25 + j * 0.5) % 1;
        pulsePos[k * 3] = x;
        pulsePos[k * 3 + 1] = 0.04 + f * (HH - 0.08);
        pulsePos[k * 3 + 2] = z;
        pulseA[k++] = Math.sin(Math.PI * f) * (1 - open * 0.6);
      }
    });
    pulsePosAttr.needsUpdate = true;
    pulseAAttr.needsUpdate = true;
    pulseMat.uniforms.uI.value = (1 + charge * 1.2 + flash) * master * vaultFade;

    plateTopMat.opacity =
      (0.4 + 0.15 * Math.sin((TAU * 2 * animClock) / 11) + charge * 0.3 + flash * 0.5) *
      vaultFade *
      dimError;

    // Shards eruption + inward convergence to emerging crystal/reward
    if (isAmbient || t < BOX_TIMELINE.unlock) {
      shardMesh.visible = false;
    } else {
      shardMesh.visible = true;
      const swirlTargetY = crystalY || 2.0;
      const revealBlend = sstep(BOX_TIMELINE.revealStart, BOX_TIMELINE.revealPeak, t);
      tmpShardCol.copy(palette.ice).lerp(accentColor, revealBlend);
      for (let i = 0; i < shardSeeds.length; i += 1) {
        const s = shardSeeds[i];
        const sF = clamp((t - s.tl) / 0.72);
        const s2 = clamp((t - s.tr) / 0.52);
        const vis = t > s.tl && s2 < 1;
        if (!vis) {
          tmpO.position.set(0, -50, 0);
          tmpO.scale.setScalar(0);
          tmpO.updateMatrix();
          shardMesh.setMatrixAt(i, tmpO.matrix);
          continue;
        }
        const lpo = lidPose(s.tl);
        const cosYaw = Math.cos(lpo.yaw);
        const sinYaw = Math.sin(lpo.yaw);
        const oy = s.fromLid ? hover + lpo.y + s.ly : hover + HH + s.ly;
        const ox = s.fromLid ? s.lx * cosYaw + s.lz * sinYaw : s.lx;
        const oz = s.fromLid ? -s.lx * sinYaw + s.lz * cosYaw : s.lz;
        const th = s.th0 + s.om * t;
        const bx = Math.cos(th) * s.rad;
        const bz = Math.sin(th) * s.rad;
        const by = s.yT + 0.14 * Math.sin(1.3 * t + s.ph);
        const e = eOut(sF);
        let x = lerp(ox, bx, e);
        let y = lerp(oy, by, e) + Math.sin(Math.PI * sF) * s.arc * 0.6;
        let z = lerp(oz, bz, e);
        const e2 = eIn(s2);
        if (s2 > 0) {
          const ang = e2 * 2.4;
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
          sstep(0, 0.14, sF) *
          (1 - sstep(0.55, 1, s2)) *
          (0.85 + 0.15 * Math.sin(t * 5 + s.ph));
        tmpO.position.set(x, y, z);
        tmpO.quaternion.setFromAxisAngle(s.ax, t * s.sp + s.ph);
        tmpO.scale.setScalar(Math.max(0.0001, sc));
        tmpO.updateMatrix();
        shardMesh.setMatrixAt(i, tmpO.matrix);
        const tw =
          (1.0 + 1.2 * (0.5 + 0.5 * Math.sin(t * 6 + s.ph * 3)) + flash * 1.5) *
          (1 - 0.4 * s2);
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
      vaultFade,
      underLightIntensity: (open * 14 + flash * 30) * vaultFade,
    };
  };

  const setLockedHeroPose = () => {
    clipPlane.constant = 99;
    scan.visible = false;
    box.visible = true;
    lid.visible = true;
    box.position.y = 0.08;
    box.scale.y = 1;
    lid.position.set(0, 0.08 + 1.31, 0);
    lid.rotation.set(0, 0, 0);
    bodyFillMat.uniforms.uTime.value = 1.6;
    bodyFillMat.uniforms.uAlpha.value = 0.92;
    bodyFillMat.uniforms.uFlash.value = 0;
    bodyFillMat.uniforms.uCharge.value = 0;
    bodyFillMat.uniforms.uOpen.value = 0;
    lidFillMat.uniforms.uTime.value = 1.6;
    lidFillMat.uniforms.uAlpha.value = 0.94;
    lidFillMat.uniforms.uFlash.value = 0;
    lidFillMat.uniforms.uCharge.value = 0;
    vaultLineMats.forEach(({ mat, baseOp }) => {
      mat.opacity = baseOp;
    });
    floorMat.uniforms.uTime.value = 1.6;
    floorMat.uniforms.uMaster.value = 0.72;
    floorMat.uniforms.uGlow.value = 0.08;
    dustMat.uniforms.uTime.value = 1.6;
    dustMat.uniforms.uMaster.value = 0.75;
    beamMat.uniforms.uI.value = 0;
    innerFloorMat.uniforms.uI.value = 0;
    badge.visible = true;
    badge.scale.setScalar(1);
    diamond.scale.set(1, 1, 1);
    chargeRing.visible = false;
    badgeGlow.material.color.copy(palette.ice).multiplyScalar(0.18);
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
