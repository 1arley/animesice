import * as THREE from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import type { BoxRewardVisualMeta } from "@/lib/gacha-box-reward";
import { isOptimizableImageUrl } from "@/lib/url";
import {
  BOX_TIMELINE,
  TAU,
  clamp,
  eBack,
  eIn,
  eOut,
  lerp,
  sstep,
  type CommonBoxPalette,
} from "./common-box-palette";
import {
  circlePts,
  createGlowSprite,
  createHoloCardSurfaceMaterial,
  createHoloHaloMaterial,
  createRingMaterial,
  createThickLine,
  loopPts,
  seg,
  type LineHelperRegistry,
} from "./common-box-shaders";

export interface RewardStageController {
  root: THREE.Group;
  setReward: (meta: BoxRewardVisualMeta) => void;
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

export function createRewardStage(
  palette: CommonBoxPalette,
  registry: LineHelperRegistry,
  glowTex: THREE.Texture,
): RewardStageController {
  let disposed = false;
  let activeMeta: BoxRewardVisualMeta | null = null;
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

  // Core crystal geometry matching box-common.html
  const cGeo = trackGeom(new THREE.OctahedronGeometry(0.5, 0));
  cGeo.scale(1, 1.75, 1);
  const cMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: "#8fd8f5",
      emissive: "#1f7fb0",
      emissiveIntensity: 0.3,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      flatShading: true,
      iridescence: 1,
      iridescenceIOR: 1.5,
      envMapIntensity: 1.7,
      transparent: true,
      opacity: 1,
    }),
  );
  const cOuter = new THREE.Mesh(cGeo, cMat);
  crystal.add(cOuter);

  const cCoreGeo = trackGeom(new THREE.OctahedronGeometry(0.2, 0));
  cCoreGeo.scale(1, 1.75, 1);
  const cCoreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    }),
  );
  cCoreMat.color.copy(palette.bright).multiplyScalar(1.5);
  const cCore = new THREE.Mesh(cCoreGeo, cCoreMat);
  crystal.add(cCore);

  const cRawEdges = new THREE.EdgesGeometry(cGeo);
  const cEdgeGeo = trackGeom(new LineSegmentsGeometry());
  cEdgeGeo.fromEdgesGeometry(cRawEdges);
  cRawEdges.dispose();
  const cEdgeMat = trackMat(
    new LineMaterial({
      color: 0xffffff,
      linewidth: 1.8,
      transparent: true,
      opacity: 0.95,
      worldUnits: false,
    }),
  );
  cEdgeMat.color.copy(palette.bright).multiplyScalar(1.6);
  cEdgeMat.userData.w = 1.8;
  registry.lineMats.push(cEdgeMat);
  const cEdges = new LineSegments2(cEdgeGeo, cEdgeMat);
  cEdges.scale.setScalar(1.004);
  cEdges.renderOrder = 4;
  crystal.add(cEdges);

  // 3 orbiting satellite micro-crystals
  const satGeo = trackGeom(new THREE.OctahedronGeometry(0.07, 0));
  satGeo.scale(1, 1.6, 1);
  const satMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    }),
  );
  satMat.color.copy(palette.bright).multiplyScalar(2);
  const sats: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const m = new THREE.Mesh(satGeo, satMat);
    crystal.add(m);
    sats.push(m);
  }

  // 2 tilted dashed gyroscopic rings
  const gyros: Array<{ line: LineSegments2; dir: number; idx: number }> = [];
  (
    [
      [0.95, 1],
      [1.28, -1],
    ] as const
  ).forEach(([r, dir], idx) => {
    const a: number[] = [];
    loopPts(a, circlePts(r, 96));
    const line = createThickLine(registry, a, {
      color: palette.ice,
      w: 1.1,
      op: 0.8,
      dashed: true,
      dashSize: 0.16 + idx * 0.06,
      gapSize: 0.12,
      boost: 1.3,
      order: 4,
    });
    crystal.add(line);
    gyros.push({ line, dir, idx });
  });

  const crystalHalo = createGlowSprite(glowTex, palette.ice, 4.2, 0);
  trackMat(crystalHalo.material);
  crystal.add(crystalHalo);

  // Pulsing reveal ring
  const ringPulseGeo = trackGeom(new THREE.PlaneGeometry(8, 8));
  const ringPulseMat = trackMat(createRingMaterial(palette));
  const ringPulse = new THREE.Mesh(ringPulseGeo, ringPulseMat);
  ringPulse.rotation.x = -Math.PI / 2;
  ringPulse.renderOrder = 5;
  ringPulse.visible = false;
  root.add(ringPulse);

  // Act IV Reward Artifact Showcase group
  const rewardGroup = new THREE.Group();
  rewardGroup.visible = false;
  root.add(rewardGroup);

  const accentColor = palette.ice.clone();
  const secondaryColor = palette.bright.clone();

  const holoHaloMat = trackMat(createHoloHaloMaterial(accentColor));
  const holoHaloGeo = trackGeom(new THREE.PlaneGeometry(3.8, 3.8));
  const holoHaloMesh = new THREE.Mesh(holoHaloGeo, holoHaloMat);
  holoHaloMesh.position.z = -0.25;
  holoHaloMesh.renderOrder = 3;
  rewardGroup.add(holoHaloMesh);

  const outerRing1Pts: number[] = [];
  loopPts(outerRing1Pts, circlePts(1.42, 96));
  const outerRing1 = createThickLine(registry, outerRing1Pts, {
    color: palette.ice,
    w: 1.15,
    op: 0.85,
    dashed: true,
    dashSize: 0.22,
    gapSize: 0.12,
    boost: 1.45,
    order: 4,
  });
  rewardGroup.add(outerRing1);

  const outerRing2Pts: number[] = [];
  loopPts(outerRing2Pts, circlePts(1.68, 96));
  const outerRing2 = createThickLine(registry, outerRing2Pts, {
    color: palette.ice,
    w: 0.9,
    op: 0.55,
    dashed: true,
    dashSize: 0.14,
    gapSize: 0.16,
    boost: 1.2,
    order: 4,
  });
  rewardGroup.add(outerRing2);

  const rewardGlow = createGlowSprite(glowTex, palette.ice, 4.6, 0);
  trackMat(rewardGlow.material);
  rewardGroup.add(rewardGlow);

  const artifactAnchor = new THREE.Group();
  rewardGroup.add(artifactAnchor);

  // Reference to card texture surface when artifactKind === "card"
  let cardSurfaceMat: THREE.ShaderMaterial | null = null;
  let artifactBodyMat: THREE.MeshPhysicalMaterial | null = null;
  let artifactInnerMat: THREE.MeshBasicMaterial | null = null;
  const artifactLineEntries: Array<{ mat: LineMaterial; boost: number; baseOp: number }> = [];

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
    // Match current resolution from existing lineMats if available
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
      color: 0x04111c,
      transparent: true,
      opacity: 0.9,
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

    // Sleek perimeter frame + 4 corner L-brackets matching vault lid cantoneiras
    const framePts: number[] = [];
    const hw = W / 2 + 0.05;
    const hh = H / 2 + 0.05;
    loopPts(framePts, [
      [-hw, -hh, 0.02],
      [hw, -hh, 0.02],
      [hw, hh, 0.02],
      [-hw, hh, 0.02],
    ]);
    addDynamicLine(artifactAnchor, framePts, { w: 1.7, boost: 1.5 });

    const bracketPts: number[] = [];
    const bw = hw + 0.07;
    const bh = hh + 0.07;
    const len = 0.22;
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
      seg(bracketPts, [cx, cy, 0.03], [cx - sx * len, cy, 0.03]);
      seg(bracketPts, [cx, cy, 0.03], [cx, cy - sy * len, 0.03]);
    });
    addDynamicLine(artifactAnchor, bracketPts, {
      color: secondaryColor,
      w: 2.0,
      boost: 1.8,
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
          // CORS or network error: keep geometric holographic emblem fallback
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
    // Shaft + angular teeth
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
    addDynamicLine(keyRoot, bowEdges, { w: 1.9, boost: 1.7 });

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
      opacity: 0.92,
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
    addDynamicLine(dialRoot, pts, { w: 2.0, boost: 1.75 });

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
    const prism = new THREE.Mesh(prismGeo, artifactBodyMat);
    dialRoot.add(prism);
  };

  const buildTierBoxArtifact = () => {
    const miniRoot = new THREE.Group();
    miniRoot.rotation.set(0.28, -0.58, 0);
    artifactAnchor.add(miniRoot);

    const bGeo = new THREE.BoxGeometry(1.05, 0.62, 1.05);
    dynamicGeoms.push(bGeo);
    artifactBodyMat = new THREE.MeshPhysicalMaterial({
      color: "#0b1a28",
      emissive: accentColor,
      emissiveIntensity: 0.25,
      roughness: 0.14,
      clearcoat: 1,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
    });
    dynamicMats.push(artifactBodyMat);
    const body = new THREE.Mesh(bGeo, artifactBodyMat);
    miniRoot.add(body);

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
    // Front mini-diamond seal
    loopPts(boxEdges, [
      [0, 0.14, 0.54],
      [0.09, 0, 0.54],
      [0, -0.14, 0.54],
      [-0.09, 0, 0.54],
    ]);
    addDynamicLine(miniRoot, boxEdges, { w: 1.8, boost: 1.75 });
  };

  const buildRelicArtifact = () => {
    const relicRoot = new THREE.Group();
    artifactAnchor.add(relicRoot);

    const rGeo = new THREE.OctahedronGeometry(0.46, 0);
    rGeo.scale(1, 1.55, 1);
    dynamicGeoms.push(rGeo);
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
    const coreMesh = new THREE.Mesh(rGeo, artifactBodyMat);
    relicRoot.add(coreMesh);

    const cagePts: number[] = [];
    const d = 0.72;
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
      boost: 1.65,
    });
  };

  const setReward = (meta: BoxRewardVisualMeta) => {
    activeMeta = meta;
    accentColor.set(meta.accentHex);
    secondaryColor.set(meta.secondaryHex);
    (holoHaloMat.uniforms.uColor.value as THREE.Color).copy(accentColor);
    outerRing1.material.color.copy(accentColor).multiplyScalar(1.45);
    outerRing2.material.color.copy(secondaryColor).multiplyScalar(1.2);
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
      buildRelicArtifact();
    }
    // Note: artifactKind === "crystal" showcases the amplified primary crystal itself!
  };

  const tmpColor = new THREE.Color();

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
        crystalY: 2.0,
        crystalPresence: 0,
        accentColor,
      };
    }

    const isCrystalPrize = activeMeta?.artifactKind === "crystal";
    const pC = clamp((t - (BOX_TIMELINE.unlock + 0.16)) / 0.5);
    const emerge = eOut(pC);
    const bob = Math.sin(t * 2.1) * 0.06 * sstep(0.55, 1, pC);

    // Crystal dissolves into reward artifact at T_REVEAL_START -> T_REVEAL_START+0.25 unless prize IS crystal
    const morphOut = isCrystalPrize
      ? clamp((t - BOX_TIMELINE.handoffStart) / 0.28)
      : clamp((t - BOX_TIMELINE.revealStart) / 0.25);
    const handoffFade = 1 - sstep(BOX_TIMELINE.handoffStart, BOX_TIMELINE.complete, t);

    const crystalPresent = t > BOX_TIMELINE.unlock + 0.14 && morphOut < 0.995;
    const cScale = sstep(0, 0.22, pC) * Math.max(0.001, 1 - eIn(morphOut));
    const crystalY =
      hover + 0.55 + (2.05 - 0.55) * emerge + bob - (isCrystalPrize ? 0 : 0.15 * eIn(morphOut));

    crystal.visible = crystalPresent;
    crystal.position.set(0, crystalY, 0);
    const boostScale = isCrystalPrize
      ? 1 + 0.28 * sstep(BOX_TIMELINE.revealStart, BOX_TIMELINE.revealPeak, t)
      : 1;
    crystal.scale.setScalar(
      0.001 + cScale * boostScale * (0.94 + 0.06 * Math.sin(t * 3.2)),
    );
    crystal.rotation.y = t * 1.25;
    crystal.rotation.z = Math.sin(t * 0.9) * 0.05;

    const cGlow = 1 - eIn(morphOut);
    const tintBlend = sstep(BOX_TIMELINE.revealStart - 0.1, BOX_TIMELINE.revealPeak, t);
    tmpColor.copy(palette.ice).lerp(accentColor, tintBlend);

    cMat.color.copy(tmpColor);
    cMat.emissive.copy(tmpColor);
    cMat.emissiveIntensity =
      0.28 + 0.12 * Math.sin(t * 2.2) + flash * 1.5 + morphOut * 1.4;
    cMat.opacity = cGlow;
    cCoreMat.opacity = cGlow;
    cEdgeMat.opacity = 0.95 * cGlow;
    satMat.opacity = cGlow;

    cCore.scale.setScalar(1 + 0.08 * Math.sin(t * 6) + morphOut * 1.1);
    cCore.rotation.y = -t * 2.3;

    sats.forEach((s, i) => {
      const a = t * (1.7 + i * 0.35) + (i * TAU) / 3;
      s.position.set(
        Math.cos(a) * 0.86,
        Math.sin(a * 1.3 + i) * 0.35 + (i - 1) * 0.28,
        Math.sin(a) * 0.86,
      );
      s.rotation.y = a * 2;
    });

    gyros.forEach(({ line, dir, idx }) => {
      line.rotation.set(
        idx === 0 ? 1.15 : 0.35,
        t * 0.65 * dir,
        idx === 0 ? t * 0.5 : -1.0 + t * 0.3,
      );
      line.material.dashOffset = -t * (0.5 + idx * 0.3);
      line.material.opacity = 0.7 * cGlow;
      line.material.color.copy(tmpColor).multiplyScalar(1.3);
    });

    crystalHalo.material.color
      .copy(tmpColor)
      .multiplyScalar((0.55 + flash * 1.6 + morphOut * 0.8) * cGlow * (crystalPresent ? 1 : 0));
    crystalHalo.scale.setScalar(4.0 + morphOut * 2.4);

    // Pulsing horizontal ring around crystal/reward
    {
      const tt = t - (BOX_TIMELINE.unlock + 0.55);
      if (tt > 0 && t < BOX_TIMELINE.complete - 0.1) {
        const s = (tt % 0.85) / 0.85;
        const a = Math.pow(1 - s, 1.5) * 0.72 * handoffFade;
        ringPulse.visible = a > 0.01;
        ringPulse.position.y = crystalY;
        ringPulse.material.uniforms.uR.value = 0.5 + eOut(s) * 2.8;
        ringPulse.material.uniforms.uA.value = a;
        ringPulse.material.uniforms.uW.value = 0.022;
        (ringPulse.material.uniforms.uColor.value as THREE.Color)
          .copy(tmpColor)
          .multiplyScalar(1.6);
      } else {
        ringPulse.visible = false;
      }
    }

    // Act IV Reward Centerpiece & Telemetry Halo
    const revEnter = sstep(BOX_TIMELINE.revealStart - 0.05, BOX_TIMELINE.revealPeak, t);
    const showReward = revEnter > 0.005 && handoffFade > 0.005;
    rewardGroup.visible = showReward;
    if (showReward) {
      const rewardY = isCrystalPrize
        ? crystalY
        : lerp(1.75, 2.04, eOut(revEnter)) + Math.sin(t * 2.0) * 0.045;
      rewardGroup.position.set(0, rewardY, 0);

      const exitScale = lerp(1.0, 1.09, 1 - handoffFade);
      const enterScale = isCrystalPrize ? 1.0 : Math.max(0.001, eBack(revEnter, 1.25));
      rewardGroup.scale.setScalar(enterScale * exitScale);

      holoHaloMat.uniforms.uTime.value = t + ambientTime;
      holoHaloMat.uniforms.uOpacity.value = revEnter * handoffFade * 0.95;

      outerRing1.rotation.set(0.25, t * 0.45, t * 0.25);
      outerRing1.material.dashOffset = -t * 0.35;
      outerRing1.material.opacity = 0.85 * revEnter * handoffFade;

      outerRing2.rotation.set(-0.35, -t * 0.32, -t * 0.2);
      outerRing2.material.dashOffset = t * 0.28;
      outerRing2.material.opacity = 0.55 * revEnter * handoffFade;

      rewardGlow.material.color
        .copy(accentColor)
        .multiplyScalar(0.55 * revEnter * handoffFade);

      const alpha = revEnter * handoffFade;
      if (activeMeta?.artifactKind === "card") {
        // Rotate gracefully from 26deg into crisp front alignment + gentle float
        const turnIn = eOut(clamp((t - BOX_TIMELINE.revealStart) / 0.55));
        artifactAnchor.rotation.set(
          Math.sin(t * 1.6) * 0.03,
          lerp(0.45, 0, turnIn) + Math.sin(t * 1.3) * 0.045,
          0,
        );
        if (cardSurfaceMat) {
          cardSurfaceMat.uniforms.uOpacity.value = alpha;
          cardSurfaceMat.uniforms.uTime.value = t;
          cardSurfaceMat.uniforms.uSweep.value = clamp(
            (t - (BOX_TIMELINE.revealStart + 0.15)) / 0.72,
          );
        }
      } else {
        artifactAnchor.rotation.set(
          0.08 * Math.sin(t * 1.4),
          t * 0.95,
          0.05 * Math.cos(t * 1.1),
        );
      }

      if (artifactBodyMat) artifactBodyMat.opacity = 0.94 * alpha;
      if (artifactInnerMat) {
        const base = activeMeta?.artifactKind === "card" ? 0.88 : 0.35;
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
