import * as THREE from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import type { BoxRewardVisualMeta } from "@/lib/gacha-box-reward";
import { isOptimizableImageUrl } from "@/lib/url";
import {
  TAU,
  clamp,
  eIn,
  eOut,
  lerp,
  mulberry32,
  sstep,
} from "../common-box/common-box-palette";
import {
  circlePts,
  createGlowSprite,
  createHoloCardSurfaceMaterial,
  createRingMaterial,
  createThickLine,
  loopPts,
  seg,
  type LineHelperRegistry,
} from "../common-box/common-box-shaders";
import {
  getTierTimeline,
  type PremiumOrRareTier,
  type TierBoxPalette,
} from "./tier-box-config";
import { createTierHaloMaterial } from "./tier-box-shaders";

export interface TierRewardStageController {
  root: THREE.Group;
  setReward: (meta: BoxRewardVisualMeta, rawReward?: Record<string, unknown>) => void;
  update: (params: {
    t: number;
    hover: number;
    flash: number;
    isAmbient: boolean;
    ambientTime: number;
  }) => {
    crystalY: number;
    crystalPresence: number;
    accentColor: THREE.Color;
  };
  dispose: () => void;
}

interface OrbitFleck {
  radius: number;
  tiltX: number;
  tiltZ: number;
  phase: number;
  speed: number;
  size: number;
}

export function createTierRewardStage(
  tier: PremiumOrRareTier,
  palette: TierBoxPalette,
  registry: LineHelperRegistry,
  glowTex: THREE.Texture,
): TierRewardStageController {
  const tl = getTierTimeline(tier);
  const isRare = tier === "RARE";
  let disposed = false;
  let activeMeta: BoxRewardVisualMeta | null = null;
  let skinCount = 1;

  const loadedTextures: THREE.Texture[] = [];
  const dynamicGeoms: THREE.BufferGeometry[] = [];
  const dynamicMats: THREE.Material[] = [];
  const dynamicLineMats: LineMaterial[] = [];

  const trackGeom = <T extends THREE.BufferGeometry>(g: T): T => {
    registry.geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    registry.materials.push(m);
    return m;
  };

  const root = new THREE.Group();
  const crystal = new THREE.Group();
  crystal.visible = false;
  root.add(crystal);

  // Stage A Emerging Core Crystal (distinct geometry & cage per tier)
  const cGeo = trackGeom(new THREE.OctahedronGeometry(isRare ? 0.52 : 0.56, 0));
  cGeo.scale(1, isRare ? 1.8 : 2.05, 1);
  const cMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: palette.ice,
      emissive: palette.mid,
      emissiveIntensity: isRare ? 0.36 : 0.32,
      roughness: 0.06,
      metalness: isRare ? 0.05 : 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      flatShading: true,
      iridescence: 1,
      iridescenceIOR: 1.55,
      envMapIntensity: 1.75,
      transparent: true,
      opacity: 1,
    }),
  );
  const cOuter = new THREE.Mesh(cGeo, cMat);
  crystal.add(cOuter);

  const cCoreGeo = trackGeom(new THREE.OctahedronGeometry(0.21, 0));
  cCoreGeo.scale(1, isRare ? 1.8 : 2.05, 1);
  const cCoreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    }),
  );
  cCoreMat.color.copy(palette.bright).multiplyScalar(1.45);
  const cCore = new THREE.Mesh(cCoreGeo, cCoreMat);
  crystal.add(cCore);

  const cRawEdges = new THREE.EdgesGeometry(cGeo);
  const cEdgeGeo = trackGeom(new LineSegmentsGeometry());
  cEdgeGeo.fromEdgesGeometry(cRawEdges);
  cRawEdges.dispose();
  const cEdgeMat = trackMat(
    new LineMaterial({
      color: 0xffffff,
      linewidth: 1.85,
      transparent: true,
      opacity: 0.95,
      worldUnits: false,
    }),
  );
  cEdgeMat.color.copy(palette.bright).multiplyScalar(1.55);
  cEdgeMat.userData.w = 1.85;
  registry.lineMats.push(cEdgeMat);
  const cEdges = new LineSegments2(cEdgeGeo, cEdgeMat);
  cEdges.scale.setScalar(1.005);
  cEdges.renderOrder = 4;
  crystal.add(cEdges);

  // Orbiting core satellites (4 diamond shards for Rare, open filigree cage for Premium)
  const satCount = isRare ? 4 : 3;
  const satGeo = trackGeom(new THREE.OctahedronGeometry(isRare ? 0.075 : 0.065, 0));
  satGeo.scale(1, 1.6, 1);
  const satMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    }),
  );
  satMat.color.copy(palette.bright).multiplyScalar(1.85);
  const sats: THREE.Mesh[] = [];
  for (let i = 0; i < satCount; i += 1) {
    const m = new THREE.Mesh(satGeo, satMat);
    crystal.add(m);
    sats.push(m);
  }

  let cageLine: LineSegments2 | null = null;
  if (!isRare) {
    const cagePts: number[] = [];
    const cw = 0.78;
    const ch = 1.28;
    loopPts(cagePts, [
      [0, ch, 0],
      [cw, 0, 0],
      [0, -ch, 0],
      [-cw, 0, 0],
    ]);
    loopPts(cagePts, [
      [0, ch, 0],
      [0, 0, cw],
      [0, -ch, 0],
      [0, 0, -cw],
    ]);
    loopPts(cagePts, [
      [cw, 0, 0],
      [0, 0, cw],
      [-cw, 0, 0],
      [0, 0, -cw],
    ]);
    cageLine = createThickLine(registry, cagePts, {
      color: palette.trim,
      w: 1.2,
      op: 0.78,
      boost: 1.45,
      order: 4,
    });
    crystal.add(cageLine);
  }

  const gyros: Array<{ line: LineSegments2; dir: number; idx: number }> = [];
  (isRare
    ? ([
        [0.98, 1],
        [1.34, -1],
      ] as const)
    : ([
        [1.06, 1],
        [1.42, -1],
      ] as const)
  ).forEach(([r, dir], idx) => {
    const a: number[] = [];
    loopPts(a, circlePts(r, 96));
    const line = createThickLine(registry, a, {
      color: palette.ice,
      w: 1.15,
      op: 0.82,
      dashed: true,
      dashSize: isRare ? 0.16 + idx * 0.05 : 0.24 + idx * 0.08,
      gapSize: isRare ? 0.11 : 0.09,
      boost: 1.35,
      order: 4,
    });
    crystal.add(line);
    gyros.push({ line, dir, idx });
  });

  const crystalHalo = createGlowSprite(glowTex, palette.ice, 4.4, 0);
  trackMat(crystalHalo.material);
  crystal.add(crystalHalo);

  // Expanding horizontal reveal pulse
  const ringPulseGeo = trackGeom(new THREE.PlaneGeometry(8, 8));
  const ringPulseMat = trackMat(createRingMaterial(palette));
  const ringPulse = new THREE.Mesh(ringPulseGeo, ringPulseMat);
  ringPulse.rotation.x = -Math.PI / 2;
  ringPulse.renderOrder = 5;
  ringPulse.visible = false;
  root.add(ringPulse);

  // Stage B Reveal Centerpiece Group
  const rewardGroup = new THREE.Group();
  rewardGroup.visible = false;
  root.add(rewardGroup);

  const accentColor = palette.ice.clone();
  const secondaryColor = palette.bright.clone();

  const holoHaloMat = trackMat(
    createTierHaloMaterial(tier, accentColor, secondaryColor),
  );
  const holoHaloGeo = trackGeom(new THREE.PlaneGeometry(4.1, 4.1));
  const holoHaloMesh = new THREE.Mesh(holoHaloGeo, holoHaloMat);
  holoHaloMesh.position.z = -0.28;
  holoHaloMesh.renderOrder = 3;
  rewardGroup.add(holoHaloMesh);

  // Armillary / plasma rings framing revealed reward
  const armillaryRings: LineSegments2[] = [];
  const ringConfigs = isRare
    ? [
        { r: 1.44, w: 1.3, op: 0.88, dash: 0.2, gap: 0.12, boost: 1.5 },
        { r: 1.72, w: 1.0, op: 0.62, dash: 0.14, gap: 0.14, boost: 1.3 },
      ]
    : [
        { r: 1.38, w: 1.35, op: 0.88, dash: 0.34, gap: 0.09, boost: 1.45 },
        { r: 1.62, w: 1.1, op: 0.72, dash: 0.24, gap: 0.11, boost: 1.32 },
        { r: 1.88, w: 0.95, op: 0.56, dash: 0.16, gap: 0.12, boost: 1.2 },
      ];
  ringConfigs.forEach((cfg, idx) => {
    const pts: number[] = [];
    loopPts(pts, circlePts(cfg.r, 96));
    const ringLine = createThickLine(registry, pts, {
      color: idx % 2 === 0 ? palette.ice : palette.trim,
      w: cfg.w,
      op: cfg.op,
      dashed: true,
      dashSize: cfg.dash,
      gapSize: cfg.gap,
      boost: cfg.boost,
      order: 4,
    });
    rewardGroup.add(ringLine);
    armillaryRings.push(ringLine);
  });

  // Orbiting 3D Luminous Flecks around Revealed Artifact (12 for Rare, 16 for Premium)
  const fleckCount = isRare ? 12 : 16;
  const fleckGeo = trackGeom(new THREE.OctahedronGeometry(1, 0));
  fleckGeo.scale(0.6, 1.3, 0.35);
  const fleckMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const orbitFleckMesh = new THREE.InstancedMesh(fleckGeo, fleckMat, fleckCount);
  orbitFleckMesh.frustumCulled = false;
  orbitFleckMesh.renderOrder = 5;
  orbitFleckMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rewardGroup.add(orbitFleckMesh);

  const flecks: OrbitFleck[] = [];
  {
    const R = mulberry32(isRare ? 61 : 83);
    for (let i = 0; i < fleckCount; i += 1) {
      flecks.push({
        radius: 1.18 + R() * 0.65,
        tiltX: (R() - 0.5) * 1.1,
        tiltZ: (R() - 0.5) * 1.1,
        phase: (i / fleckCount) * TAU + R() * 0.4,
        speed: (isRare ? 1.45 : 0.78) * (i % 2 === 0 ? 1 : -0.85),
        size: isRare ? 0.04 + R() * 0.045 : 0.036 + R() * 0.04,
      });
    }
  }

  const rewardGlow = createGlowSprite(glowTex, palette.ice, 4.8, 0);
  trackMat(rewardGlow.material);
  rewardGroup.add(rewardGlow);

  const artifactAnchor = new THREE.Group();
  rewardGroup.add(artifactAnchor);

  let cardSurfaceMat: THREE.ShaderMaterial | null = null;
  let artifactBodyMat: THREE.MeshPhysicalMaterial | null = null;
  let artifactInnerMat: THREE.MeshBasicMaterial | null = null;
  const artifactLineEntries: Array<{
    mat: LineMaterial;
    boost: number;
    baseOp: number;
  }> = [];

  const clearArtifact = () => {
    while (artifactAnchor.children.length > 0) {
      artifactAnchor.remove(artifactAnchor.children[0]);
    }
    dynamicGeoms.forEach((g) => g.dispose());
    dynamicGeoms.length = 0;
    dynamicMats.forEach((m) => m.dispose());
    dynamicMats.length = 0;
    dynamicLineMats.forEach((m) => {
      const idx = registry.lineMats.indexOf(m);
      if (idx !== -1) registry.lineMats.splice(idx, 1);
      m.dispose();
    });
    dynamicLineMats.length = 0;
    loadedTextures.forEach((tex) => tex.dispose());
    loadedTextures.length = 0;
    artifactLineEntries.length = 0;
    cardSurfaceMat = null;
    artifactBodyMat = null;
    artifactInnerMat = null;
  };

  const addDynamicLine = (
    parent: THREE.Object3D,
    positions: number[],
    options: {
      color?: THREE.Color;
      w?: number;
      op?: number;
      boost?: number;
      dashed?: boolean;
      dashSize?: number;
      gapSize?: number;
    } = {},
  ) => {
    const geom = new LineSegmentsGeometry();
    geom.setPositions(positions);
    dynamicGeoms.push(geom);
    const w = options.w ?? 1.5;
    const op = options.op ?? 0.95;
    const boost = options.boost ?? 1.5;
    const mat = new LineMaterial({
      color: 0xffffff,
      linewidth: w,
      transparent: true,
      opacity: op,
      dashed: options.dashed ?? false,
      dashSize: options.dashSize ?? 0.1,
      gapSize: options.gapSize ?? 0.08,
      worldUnits: false,
    });
    mat.color.copy(options.color ?? accentColor).multiplyScalar(boost);
    mat.userData.w = w;
    if (registry.lineMats.length > 0) {
      const refMat = registry.lineMats[0];
      mat.resolution.copy(refMat.resolution);
      const refW = typeof refMat.userData.w === "number" ? refMat.userData.w : 1;
      const dprScale = refW > 0 ? refMat.linewidth / refW : 1;
      mat.linewidth = w * dprScale;
    }
    registry.lineMats.push(mat);
    dynamicLineMats.push(mat);
    artifactLineEntries.push({ mat, boost, baseOp: op });

    const line = new LineSegments2(geom, mat);
    if (options.dashed) line.computeLineDistances();
    line.renderOrder = 5;
    parent.add(line);
    return line;
  };

  const buildCardArtifact = (imageUrl: string | null) => {
    const W = 1.44;
    const H = 1.92;
    const backingGeo = new THREE.PlaneGeometry(W + 0.08, H + 0.08);
    dynamicGeoms.push(backingGeo);
    const backingMat = new THREE.MeshBasicMaterial({
      color: isRare ? 0x0d061c : 0x120b04,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    dynamicMats.push(backingMat);
    artifactInnerMat = backingMat;
    const backing = new THREE.Mesh(backingGeo, backingMat);
    backing.position.z = -0.02;
    backing.renderOrder = 3;
    artifactAnchor.add(backing);

    const cardGeo = new THREE.PlaneGeometry(W, H);
    dynamicGeoms.push(cardGeo);
    cardSurfaceMat = createHoloCardSurfaceMaterial(accentColor);
    dynamicMats.push(cardSurfaceMat);
    const cardMesh = new THREE.Mesh(cardGeo, cardSurfaceMat);
    cardMesh.position.z = 0.01;
    cardMesh.renderOrder = 4;
    artifactAnchor.add(cardMesh);

    const hw = W / 2 + 0.05;
    const hh = H / 2 + 0.05;
    const framePts: number[] = [];
    loopPts(framePts, [
      [-hw, -hh, 0.02],
      [hw, -hh, 0.02],
      [hw, hh, 0.02],
      [-hw, hh, 0.02],
    ]);
    addDynamicLine(artifactAnchor, framePts, { w: 1.75, boost: 1.5 });

    // Tier-specific frame ornamentation
    const ornamentPts: number[] = [];
    const bw = hw + 0.075;
    const bh = hh + 0.075;
    const len = 0.24;
    (
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const
    ).forEach(([sx, sy]) => {
      const cx = sx * bw;
      const cy = sy * bh;
      seg(ornamentPts, [cx, cy, 0.03], [cx - sx * len, cy, 0.03]);
      seg(ornamentPts, [cx, cy, 0.03], [cx, cy - sy * len, 0.03]);
      if (!isRare) {
        // Additional sovereign inner corner diamond serif for Premium gallery frame
        seg(ornamentPts, [cx, cy, 0.03], [cx - sx * 0.09, cy - sy * 0.09, 0.03]);
      }
    });
    if (!isRare) {
      // Double gilded outer border line on Premium card
      const hw2 = hw + 0.04;
      const hh2 = hh + 0.04;
      loopPts(ornamentPts, [
        [-hw2, -hh2, 0.025],
        [hw2, -hh2, 0.025],
        [hw2, hh2, 0.025],
        [-hw2, hh2, 0.025],
      ]);
    }
    addDynamicLine(artifactAnchor, ornamentPts, {
      color: secondaryColor,
      w: isRare ? 2.0 : 1.7,
      boost: 1.7,
    });

    if (imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      const targetMat = cardSurfaceMat;
      const textureSrc =
        imageUrl.startsWith("http") && isOptimizableImageUrl(imageUrl)
          ? `/_next/image?url=${encodeURIComponent(imageUrl)}&w=640&q=85`
          : imageUrl;
      loader.load(
        textureSrc,
        (tex) => {
          if (disposed || cardSurfaceMat !== targetMat) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          loadedTextures.push(tex);
          targetMat.uniforms.uMap.value = tex;
          targetMat.uniforms.uHasMap.value = 1;
        },
        undefined,
        () => {
          /* CORS fallback keeps clean geometric holo emblem */
        },
      );
    }
  };

  const buildKeyArtifact = () => {
    const keyRoot = new THREE.Group();
    artifactAnchor.add(keyRoot);
    const bowPts = (R: number, z: number): Array<[number, number, number]> =>
      Array.from({ length: 6 }, (_, i) => {
        const a = Math.PI / 2 + (i * Math.PI) / 3;
        return [Math.cos(a) * R, 0.45 + Math.sin(a) * R, z];
      });
    const bowEdges: number[] = [];
    loopPts(bowEdges, bowPts(0.42, 0.02));
    loopPts(bowEdges, bowPts(0.42, -0.02));
    loopPts(bowEdges, bowPts(0.28, 0.02));
    for (let i = 0; i < 6; i += 1) {
      const a = Math.PI / 2 + (i * Math.PI) / 3;
      seg(
        bowEdges,
        [Math.cos(a) * 0.42, 0.45 + Math.sin(a) * 0.42, -0.02],
        [Math.cos(a) * 0.42, 0.45 + Math.sin(a) * 0.42, 0.02],
      );
    }
    const sw = 0.075;
    loopPts(bowEdges, [
      [-sw, 0.03, 0.02],
      [sw, 0.03, 0.02],
      [sw, -0.82, 0.02],
      [-sw, -0.82, 0.02],
    ]);
    loopPts(bowEdges, [
      [sw, -0.45, 0.02],
      [0.34, -0.45, 0.02],
      [0.34, -0.56, 0.02],
      [sw, -0.56, 0.02],
    ]);
    loopPts(bowEdges, [
      [sw, -0.65, 0.02],
      [0.26, -0.65, 0.02],
      [0.26, -0.76, 0.02],
      [sw, -0.76, 0.02],
    ]);
    addDynamicLine(keyRoot, bowEdges, { w: 1.9, boost: 1.65 });

    const coreGeo = new THREE.OctahedronGeometry(0.18, 0);
    coreGeo.scale(0.8, 1.35, 0.55);
    dynamicGeoms.push(coreGeo);
    artifactBodyMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      clearcoat: 1,
      flatShading: true,
      iridescence: 1,
      transparent: true,
      opacity: 0.94,
    });
    dynamicMats.push(artifactBodyMat);
    const bowGem = new THREE.Mesh(coreGeo, artifactBodyMat);
    bowGem.position.y = 0.45;
    keyRoot.add(bowGem);

    const shaftGeo = new THREE.BoxGeometry(0.11, 0.82, 0.04);
    dynamicGeoms.push(shaftGeo);
    artifactInnerMat = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.35,
    });
    dynamicMats.push(artifactInnerMat);
    const shaft = new THREE.Mesh(shaftGeo, artifactInnerMat);
    shaft.position.y = -0.39;
    keyRoot.add(shaft);
  };

  const buildSpinResetArtifact = () => {
    const dialRoot = new THREE.Group();
    artifactAnchor.add(dialRoot);
    const arcPts = (r: number, start: number, sweep: number): number[] => {
      const arr: number[] = [];
      const steps = 40;
      for (let i = 0; i < steps; i += 1) {
        const a0 = start + (i / steps) * sweep;
        const a1 = start + ((i + 1) / steps) * sweep;
        seg(
          arr,
          [Math.cos(a0) * r, Math.sin(a0) * r, 0],
          [Math.cos(a1) * r, Math.sin(a1) * r, 0],
        );
      }
      return arr;
    };
    const pts = [
      ...arcPts(0.76, 0.35, Math.PI * 0.78),
      ...arcPts(0.76, Math.PI + 0.35, Math.PI * 0.78),
      ...arcPts(0.56, -0.3, Math.PI * 0.65),
      ...arcPts(0.56, Math.PI - 0.3, Math.PI * 0.65),
    ];
    addDynamicLine(dialRoot, pts, { w: 2.0, boost: 1.7 });

    const prismGeo = new THREE.OctahedronGeometry(0.32, 0);
    prismGeo.scale(1, 1.35, 0.65);
    dynamicGeoms.push(prismGeo);
    artifactBodyMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      clearcoat: 1,
      flatShading: true,
      iridescence: 1,
      transparent: true,
      opacity: 0.95,
    });
    dynamicMats.push(artifactBodyMat);
    dialRoot.add(new THREE.Mesh(prismGeo, artifactBodyMat));
  };

  const buildTierBoxArtifact = () => {
    const miniRoot = new THREE.Group();
    miniRoot.rotation.set(0.28, -0.58, 0);
    artifactAnchor.add(miniRoot);

    const bGeo = new THREE.BoxGeometry(1.05, 0.62, 1.05);
    dynamicGeoms.push(bGeo);
    artifactBodyMat = new THREE.MeshPhysicalMaterial({
      color: "#110a1a",
      emissive: accentColor,
      emissiveIntensity: 0.25,
      roughness: 0.14,
      clearcoat: 1,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
    });
    dynamicMats.push(artifactBodyMat);
    miniRoot.add(new THREE.Mesh(bGeo, artifactBodyMat));

    const lidGeo = new THREE.BoxGeometry(1.14, 0.13, 1.14);
    dynamicGeoms.push(lidGeo);
    const lidMesh = new THREE.Mesh(lidGeo, artifactBodyMat);
    lidMesh.position.y = 0.375;
    miniRoot.add(lidMesh);

    const eRaw = new THREE.EdgesGeometry(bGeo);
    const lidRaw = new THREE.EdgesGeometry(lidGeo);
    const boxEdges: number[] = [];
    const posA = eRaw.attributes.position;
    for (let i = 0; i < posA.array.length; i += 3) {
      boxEdges.push(posA.array[i], posA.array[i + 1], posA.array[i + 2]);
    }
    const posL = lidRaw.attributes.position;
    for (let i = 0; i < posL.array.length; i += 3) {
      boxEdges.push(posL.array[i], posL.array[i + 1] + 0.375, posL.array[i + 2]);
    }
    eRaw.dispose();
    lidRaw.dispose();
    loopPts(boxEdges, [
      [0, 0.14, 0.54],
      [0.09, 0, 0.54],
      [0, -0.14, 0.54],
      [-0.09, 0, 0.54],
    ]);
    addDynamicLine(miniRoot, boxEdges, { w: 1.8, boost: 1.7 });
  };

  const buildRelicArtifact = (paired: boolean) => {
    const relicRoot = new THREE.Group();
    artifactAnchor.add(relicRoot);

    artifactBodyMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.42,
      roughness: 0.08,
      clearcoat: 1,
      flatShading: true,
      iridescence: 1,
      transparent: true,
      opacity: 0.94,
    });
    dynamicMats.push(artifactBodyMat);

    if (paired) {
      const twinGeo = new THREE.OctahedronGeometry(0.32, 0);
      twinGeo.scale(0.95, 1.55, 0.95);
      dynamicGeoms.push(twinGeo);
      [-0.36, 0.36].forEach((ox, idx) => {
        const mesh = new THREE.Mesh(twinGeo, artifactBodyMat!);
        mesh.position.set(ox, idx === 0 ? 0.08 : -0.08, 0);
        mesh.rotation.z = idx === 0 ? 0.12 : -0.12;
        relicRoot.add(mesh);
      });
    } else {
      const rGeo = new THREE.OctahedronGeometry(0.46, 0);
      rGeo.scale(1, 1.55, 1);
      dynamicGeoms.push(rGeo);
      relicRoot.add(new THREE.Mesh(rGeo, artifactBodyMat));
    }

    const cagePts: number[] = [];
    const d = paired ? 0.84 : 0.72;
    loopPts(cagePts, [
      [0, d * 1.35, 0],
      [d, 0, 0],
      [0, -d * 1.35, 0],
      [-d, 0, 0],
    ]);
    loopPts(cagePts, [
      [0, d * 1.35, 0],
      [0, 0, d],
      [0, -d * 1.35, 0],
      [0, 0, -d],
    ]);
    loopPts(cagePts, [
      [d, 0, 0],
      [0, 0, d],
      [-d, 0, 0],
      [0, 0, -d],
    ]);
    addDynamicLine(relicRoot, cagePts, {
      color: secondaryColor,
      w: 1.6,
      boost: 1.6,
    });
  };

  const setReward = (
    meta: BoxRewardVisualMeta,
    rawReward?: Record<string, unknown>,
  ) => {
    activeMeta = meta;
    skinCount =
      rawReward && Array.isArray(rawReward.skins) && rawReward.skins.length > 1
        ? rawReward.skins.length
        : 1;

    // Untyped commodities/items inherit tier's bespoke Rare/Premium palette
    const hasExplicitRarity = Boolean(meta.rarityKey || meta.boxRewardTier);
    accentColor.set(hasExplicitRarity ? meta.accentHex : palette.primaryHex);
    secondaryColor.set(hasExplicitRarity ? meta.secondaryHex : palette.accentHex);

    (holoHaloMat.uniforms.uColor.value as THREE.Color).copy(accentColor);
    (holoHaloMat.uniforms.uSecondary.value as THREE.Color).copy(secondaryColor);
    armillaryRings.forEach((ring, idx) => {
      const col = idx % 2 === 0 ? accentColor : secondaryColor;
      ring.material.color.copy(col).multiplyScalar(idx === 0 ? 1.45 : 1.25);
    });
    rewardGlow.material.color.copy(accentColor);

    clearArtifact();
    if (meta.artifactKind === "card") {
      buildCardArtifact(meta.imageUrl);
    } else if (meta.artifactKind === "key") {
      buildKeyArtifact();
    } else if (meta.artifactKind === "spin_reset") {
      buildSpinResetArtifact();
    } else if (meta.artifactKind === "tier_box") {
      buildTierBoxArtifact();
    } else if (meta.artifactKind === "relic") {
      buildRelicArtifact(skinCount > 1);
    }
  };

  const tmpColor = new THREE.Color();
  const tmpO = new THREE.Object3D();
  const yAxis = new THREE.Vector3(0, 1, 0);

  const update = ({
    t,
    hover,
    flash,
    isAmbient,
    ambientTime,
  }: {
    t: number;
    hover: number;
    flash: number;
    isAmbient: boolean;
    ambientTime: number;
  }) => {
    if (isAmbient) {
      crystal.visible = false;
      rewardGroup.visible = false;
      ringPulse.visible = false;
      return {
        crystalY: 2.02,
        crystalPresence: 0,
        accentColor,
      };
    }

    const isCrystalPrize = activeMeta?.artifactKind === "crystal";
    const pC = clamp((t - (tl.unlock + (isRare ? 0.14 : 0.2))) / (isRare ? 0.48 : 0.6));
    const emerge = eOut(pC);
    const bob = Math.sin(t * (isRare ? 2.4 : 1.7)) * 0.055 * sstep(0.5, 1, pC);

    const morphOut = isCrystalPrize
      ? clamp((t - tl.handoffStart) / 0.3)
      : clamp((t - tl.revealStart) / (isRare ? 0.24 : 0.34));
    const handoffFade = 1 - sstep(tl.handoffStart, tl.complete, t);

    const crystalPresent = t > tl.unlock + (isRare ? 0.12 : 0.18) && morphOut < 0.995;
    const cScale = sstep(0, 0.24, pC) * Math.max(0.001, 1 - eIn(morphOut));
    const targetY = isRare ? 2.05 : 2.1;
    const crystalY =
      hover +
      0.55 +
      (targetY - 0.55) * emerge +
      bob -
      (isCrystalPrize ? 0 : 0.14 * eIn(morphOut));

    crystal.visible = crystalPresent;
    crystal.position.set(0, crystalY, 0);
    const boostScale = isCrystalPrize
      ? 1 + 0.28 * sstep(tl.revealStart, tl.revealPeak, t)
      : 1;
    crystal.scale.setScalar(
      0.001 + cScale * boostScale * (0.94 + 0.06 * Math.sin(t * 3.0)),
    );
    crystal.rotation.y = t * (isRare ? 1.55 : 0.88);
    crystal.rotation.z = Math.sin(t * 0.85) * 0.045;

    const cGlow = 1 - eIn(morphOut);
    const tintBlend = sstep(tl.revealStart - 0.1, tl.revealPeak, t);
    tmpColor.copy(palette.ice).lerp(accentColor, tintBlend);

    cMat.color.copy(tmpColor);
    cMat.emissive.copy(tmpColor);
    cMat.emissiveIntensity =
      (isRare ? 0.32 : 0.28) + 0.12 * Math.sin(t * 2.2) + flash * 1.4 + morphOut * 1.3;
    cMat.opacity = cGlow;
    cCoreMat.opacity = cGlow;
    cEdgeMat.opacity = 0.95 * cGlow;
    satMat.opacity = cGlow;
    if (cageLine) {
      cageLine.rotation.y = -t * 0.55;
      cageLine.material.opacity = 0.78 * cGlow;
      cageLine.material.color.copy(palette.trim).lerp(accentColor, tintBlend).multiplyScalar(1.45);
    }

    cCore.scale.setScalar(1 + 0.08 * Math.sin(t * 5.5) + morphOut * 1.05);
    cCore.rotation.y = -t * (isRare ? 2.6 : 1.7);

    sats.forEach((s, i) => {
      const a = t * ((isRare ? 2.0 : 1.25) + i * 0.3) + (i * TAU) / satCount;
      const rad = isRare ? 0.9 : 1.02;
      s.position.set(
        Math.cos(a) * rad,
        Math.sin(a * 1.3 + i) * 0.36 + (i - 1) * 0.22,
        Math.sin(a) * rad,
      );
      s.rotation.y = a * 2;
    });

    gyros.forEach(({ line, dir, idx }) => {
      line.rotation.set(
        idx === 0 ? 1.15 : 0.38,
        t * (isRare ? 0.85 : 0.45) * dir,
        idx === 0 ? t * 0.55 : -1.0 + t * 0.35,
      );
      line.material.dashOffset = -t * ((isRare ? 0.65 : 0.3) + idx * 0.25);
      line.material.opacity = 0.75 * cGlow;
      line.material.color.copy(tmpColor).multiplyScalar(1.35);
    });

    crystalHalo.material.color
      .copy(tmpColor)
      .multiplyScalar((0.55 + flash * 1.4 + morphOut * 0.75) * cGlow * (crystalPresent ? 1 : 0));
    crystalHalo.scale.setScalar(4.2 + morphOut * 2.3);

    // Expanding horizontal shock ring
    {
      const tt = t - (tl.unlock + 0.52);
      if (tt > 0 && t < tl.complete - 0.1) {
        const cycleDur = isRare ? 0.75 : 1.05;
        const s = (tt % cycleDur) / cycleDur;
        const a = Math.pow(1 - s, 1.45) * (isRare ? 0.78 : 0.62) * handoffFade;
        ringPulse.visible = a > 0.01;
        ringPulse.position.y = crystalY;
        ringPulse.material.uniforms.uR.value = 0.5 + eOut(s) * 2.95;
        ringPulse.material.uniforms.uA.value = a;
        ringPulse.material.uniforms.uW.value = isRare ? 0.025 : 0.02;
        (ringPulse.material.uniforms.uColor.value as THREE.Color)
          .copy(tmpColor)
          .multiplyScalar(1.55);
      } else {
        ringPulse.visible = false;
      }
    }

    // Stage B Reveal Centerpiece + Tier Halo + Armillary / Plasma Rings + Orbiting Flecks
    const revEnter = sstep(tl.revealStart - 0.06, tl.revealPeak, t);
    const showReward = revEnter > 0.005 && handoffFade > 0.005;
    rewardGroup.visible = showReward;
    if (showReward) {
      const rewardY = isCrystalPrize
        ? crystalY
        : lerp(isRare ? 1.72 : 1.62, isRare ? 2.04 : 2.08, eOut(revEnter)) +
          Math.sin(t * (isRare ? 2.1 : 1.5)) * 0.042;
      rewardGroup.position.set(0, rewardY, 0);

      const exitScale = lerp(1.0, 1.08, 1 - handoffFade);
      // Premium settles with solemn eOut weight; Rare snaps dynamically
      const enterScale = isCrystalPrize
        ? 1.0
        : isRare
          ? Math.max(0.001, eOut(revEnter) * 1.02)
          : Math.max(0.001, eOut(revEnter));
      rewardGroup.scale.setScalar(enterScale * exitScale);

      holoHaloMat.uniforms.uTime.value = t + ambientTime;
      holoHaloMat.uniforms.uOpacity.value = revEnter * handoffFade * 0.95;

      armillaryRings.forEach((ring, idx) => {
        if (isRare) {
          ring.rotation.set(
            idx === 0 ? 0.28 : -0.36,
            t * (idx === 0 ? 0.72 : -0.52),
            t * (idx === 0 ? 0.34 : -0.28),
          );
          ring.material.dashOffset = (idx === 0 ? -1 : 1) * t * 0.48;
        } else {
          // Harmonic 3-axis Golden Armillary Sphere
          ring.rotation.set(
            idx === 0 ? 0.35 + t * 0.18 : idx === 1 ? -0.45 : 0.65 - t * 0.2,
            t * (idx === 0 ? 0.28 : idx === 1 ? -0.34 : 0.22),
            idx === 2 ? t * 0.32 : t * (idx === 0 ? 0.14 : -0.18),
          );
          ring.material.dashOffset = (idx % 2 === 0 ? -1 : 1) * t * 0.22;
        }
        ring.material.opacity = (idx === 0 ? 0.88 : idx === 1 ? 0.68 : 0.54) * revEnter * handoffFade;
      });

      const fleckAlpha = revEnter * handoffFade;
      for (let i = 0; i < flecks.length; i += 1) {
        const f = flecks[i];
        const ang = f.phase + t * f.speed;
        const x0 = Math.cos(ang) * f.radius;
        const z0 = Math.sin(ang) * f.radius;
        const y0 = Math.sin(ang * 2 + f.phase) * 0.28;
        // Apply static plane tilt
        const cosX = Math.cos(f.tiltX);
        const sinX = Math.sin(f.tiltX);
        const y1 = y0 * cosX - z0 * sinX;
        const z1 = y0 * sinX + z0 * cosX;
        const cosZ = Math.cos(f.tiltZ);
        const sinZ = Math.sin(f.tiltZ);
        const fx = x0 * cosZ - y1 * sinZ;
        const fy = x0 * sinZ + y1 * cosZ;
        tmpO.position.set(fx, fy, z1);
        tmpO.quaternion.setFromAxisAngle(yAxis, t * 2.5 + f.phase);
        tmpO.scale.setScalar(Math.max(0.001, f.size * fleckAlpha));
        tmpO.updateMatrix();
        orbitFleckMesh.setMatrixAt(i, tmpO.matrix);
      }
      orbitFleckMesh.instanceMatrix.needsUpdate = true;
      fleckMat.color.copy(secondaryColor).multiplyScalar(1.35 * fleckAlpha);

      rewardGlow.material.color
        .copy(accentColor)
        .multiplyScalar(0.55 * revEnter * handoffFade);

      const alpha = revEnter * handoffFade;
      if (activeMeta?.artifactKind === "card") {
        const turnIn = eOut(clamp((t - tl.revealStart) / (isRare ? 0.52 : 0.66)));
        artifactAnchor.rotation.set(
          Math.sin(t * 1.4) * 0.025,
          lerp(isRare ? 0.52 : 0.36, 0, turnIn) + Math.sin(t * 1.2) * 0.04,
          0,
        );
        if (cardSurfaceMat) {
          cardSurfaceMat.uniforms.uOpacity.value = alpha;
          cardSurfaceMat.uniforms.uTime.value = t;
          cardSurfaceMat.uniforms.uSweep.value = clamp(
            (t - (tl.revealStart + 0.14)) / (isRare ? 0.68 : 0.85),
          );
        }
      } else {
        artifactAnchor.rotation.set(
          0.08 * Math.sin(t * 1.3),
          t * (isRare ? 1.1 : 0.72),
          0.05 * Math.cos(t * 1.0),
        );
      }

      if (artifactBodyMat) artifactBodyMat.opacity = 0.94 * alpha;
      if (artifactInnerMat) {
        const base = activeMeta?.artifactKind === "card" ? 0.9 : 0.35;
        artifactInnerMat.opacity = base * alpha;
      }
      artifactLineEntries.forEach((entry) => {
        entry.mat.opacity = entry.baseOp * alpha;
      });
    }

    return {
      crystalY,
      crystalPresence: Math.max(cScale, revEnter) * handoffFade,
      accentColor: tmpColor,
    };
  };

  const dispose = () => {
    disposed = true;
    orbitFleckMesh.dispose();
    clearArtifact();
    loadedTextures.forEach((tex) => tex.dispose());
    loadedTextures.length = 0;
  };

  return {
    root,
    setReward,
    update,
    dispose,
  };
}
