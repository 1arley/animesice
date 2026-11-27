import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import {
  getBoxRewardVisualMeta,
  type BoxRewardVisualMeta,
} from "@/lib/gacha-box-reward";
import {
  TAU,
  clamp,
  eOut,
  lerp,
  sstep,
  type CommonBoxPhase,
} from "../common-box/common-box-palette";
import {
  createGlowTexture,
  NAN_SHADER,
  type LineHelperRegistry,
} from "../common-box/common-box-shaders";
import {
  advanceTierBoxClock,
  createInitialTierClockState,
  createTierPalette,
  getTierTimeline,
  type PremiumOrRareTier,
  type TierBoxAudioCue,
} from "./tier-box-config";
import { createPremiumVault } from "./premium-box-vault";
import { createRareVault } from "./rare-box-vault";
import { createTierRewardStage } from "./tier-box-reward-stage";
import { createTierFxShaderConfig } from "./tier-box-shaders";

export { detectWebGLSupport } from "../common-box/common-box-engine";

export interface TierBoxEngineOptions {
  tier: PremiumOrRareTier;
  initialReward?: Record<string, unknown> | null;
  initialAmbient?: boolean;
  onPhaseChange?: (phase: CommonBoxPhase) => void;
  onComplete?: () => void;
  onWebGLUnavailable?: () => void;
  onAudioCue?: (cue: TierBoxAudioCue) => void;
}

export interface TierBoxEngine {
  setReward: (reward: Record<string, unknown>) => void;
  setError: () => void;
  skipToAmbient: () => void;
  completed: Promise<void>;
  dispose: () => void;
}

type QualityTier = "desktop" | "mobile" | "software";

function detectQualityTier(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): QualityTier {
  try {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as {
      UNMASKED_RENDERER_WEBGL: number;
    } | null;
    const rendererStr = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "")
      : String(gl.getParameter(gl.RENDERER) ?? "");
    if (
      /swiftshader|llvmpipe|software|mesa offscreen|microsoft basic/i.test(
        rendererStr,
      )
    ) {
      return "software";
    }
  } catch {
    /* fallback below */
  }
  if (typeof window !== "undefined") {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (coarse || Math.min(window.innerWidth, window.innerHeight) < 640) {
      return "mobile";
    }
  }
  return "desktop";
}

export function createTierBoxEngine(
  container: HTMLElement,
  options: TierBoxEngineOptions,
): TierBoxEngine {
  const { tier } = options;
  const tl = getTierTimeline(tier);
  const isRare = tier === "RARE";

  let disposed = false;
  let completedResolved = false;
  let resolveCompleted!: () => void;
  const completed = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });

  const finishCompletion = () => {
    if (!completedResolved) {
      completedResolved = true;
      resolveCompleted();
      options.onComplete?.();
    }
  };

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
    });
  } catch {
    options.onWebGLUnavailable?.();
    finishCompletion();
    return {
      setReward: () => {},
      setError: () => {},
      skipToAmbient: () => {},
      completed,
      dispose: () => {},
    };
  }

  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = isRare ? 0.98 : 0.96;
  renderer.setClearColor(0x000000, 1);

  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99);
  renderer.clippingPlanes = [clipPlane];

  const quality = detectQualityTier(renderer.getContext());
  const dpr =
    quality === "software"
      ? 1
      : quality === "mobile"
        ? Math.min(window.devicePixelRatio || 1, 1.75)
        : Math.min(window.devicePixelRatio || 1, 2);
  const samples = quality === "software" ? 0 : quality === "mobile" ? 2 : 4;
  const dustCount =
    quality === "software" ? 260 : quality === "mobile" ? 460 : isRare ? 860 : 920;
  const shardCount =
    quality === "software" ? 100 : quality === "mobile" ? 150 : isRare ? 220 : 260;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(isRare ? 32 : 30, 1, 0.1, 80);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envRT = pmrem.fromScene(roomEnv, 0.04);
  roomEnv.dispose();
  scene.environment = envRT.texture;

  const palette = createTierPalette(tier);
  const registry: LineHelperRegistry = {
    lineMats: [] as LineMaterial[],
    geometries: [],
    materials: [],
  };
  const glowTex = createGlowTexture();

  const world = new THREE.Group();
  scene.add(world);

  const vault = isRare
    ? createRareVault(palette, registry, glowTex, clipPlane, {
        dustCount,
        shardCount,
      })
    : createPremiumVault(palette, registry, glowTex, clipPlane, {
        dustCount,
        shardCount,
      });
  world.add(vault.root);

  const rewardStage = createTierRewardStage(tier, palette, registry, glowTex);
  world.add(rewardStage.root);

  // Calibrated lighting contrasting metallic facets (Premium) vs plasma rims (Rare)
  const keyL = new THREE.DirectionalLight(
    isRare ? 0xece4ff : 0xfff3d6,
    isRare ? 2.1 : 2.35,
  );
  keyL.position.set(3, 6, 4);
  scene.add(keyL);

  const rimL = new THREE.PointLight(
    isRare ? 0x6d78ff : 0xf59e0b,
    isRare ? 34 : 32,
    14,
    2,
  );
  rimL.position.set(-3.6, 3.1, -3.0);
  scene.add(rimL);

  const rimL2 = new THREE.PointLight(
    isRare ? 0xc084fc : 0x64748b,
    isRare ? 18 : 14,
    13,
    2,
  );
  rimL2.position.set(3.8, 3.0, -3.0);
  scene.add(rimL2);

  const underL = new THREE.PointLight(
    isRare ? 0xb983ff : 0xf2bf52,
    0,
    8,
    2,
  );
  underL.position.set(0, 1.25, 0);
  scene.add(underL);

  let W = Math.max(1, container.clientWidth || window.innerWidth || 1);
  let H = Math.max(1, container.clientHeight || window.innerHeight || 1);
  let lastW = W;
  let lastH = H;
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);

  const rt = new THREE.WebGLRenderTarget(
    Math.max(1, Math.round(W * dpr)),
    Math.max(1, Math.round(H * dpr)),
    { type: THREE.HalfFloatType, samples },
  );
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera);
  const nanPass = new ShaderPass(NAN_SHADER);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.round(W * dpr), Math.round(H * dpr)),
    isRare ? 0.58 : 0.46,
    isRare ? 0.55 : 0.48,
    isRare ? 0.6 : 0.66,
  );
  const outputPass = new OutputPass();
  const fxPass = new ShaderPass(createTierFxShaderConfig(tier, palette));
  composer.addPass(renderPass);
  composer.addPass(nanPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);
  composer.addPass(fxPass);
  composer.setSize(W, H);

  const applyViewportUniforms = (width: number, height: number) => {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    registry.lineMats.forEach((m) => {
      m.resolution.set(width * dpr, height * dpr);
      const baseW = typeof m.userData.w === "number" ? m.userData.w : 1.2;
      m.linewidth = baseW * dpr;
    });
    const sc =
      (height * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    vault.setPointScale(sc);
    (fxPass.uniforms.uAspect.value as number) = width / height;
    (fxPass.uniforms.uRes.value as THREE.Vector2).set(width * dpr, height * dpr);
  };

  const syncSize = () => {
    if (disposed) return;
    const nextW = Math.max(1, container.clientWidth || window.innerWidth || 1);
    const nextH = Math.max(1, container.clientHeight || window.innerHeight || 1);
    if (nextW === lastW && nextH === lastH) return;
    W = nextW;
    H = nextH;
    lastW = nextW;
    lastH = nextH;
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    applyViewportUniforms(W, H);
  };

  applyViewportUniforms(W, H);

  const resizeObserver =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => syncSize())
      : null;
  resizeObserver?.observe(container);
  window.addEventListener("resize", syncSize);

  let rewardMeta: BoxRewardVisualMeta | null = options.initialReward
    ? getBoxRewardVisualMeta(options.initialReward)
    : null;
  const rewardAccentColor = palette.ice.clone();
  if (rewardMeta) {
    const hasExplicitRarity = Boolean(
      rewardMeta.rarityKey || rewardMeta.boxRewardTier,
    );
    rewardAccentColor.set(
      hasExplicitRarity ? rewardMeta.accentHex : palette.primaryHex,
    );
    rewardStage.setReward(rewardMeta, options.initialReward ?? undefined);
  }

  const initialAmbientMode = Boolean(options.initialAmbient && rewardMeta);
  const clockState = createInitialTierClockState(
    tier,
    initialAmbientMode,
    rewardMeta !== null,
  );
  let crystalY = isRare ? 2.05 : 2.1;
  let currentPhase: CommonBoxPhase = initialAmbientMode
    ? "ambient"
    : "materializing";

  const emitPhase = (next: CommonBoxPhase) => {
    if (currentPhase !== next) {
      currentPhase = next;
      options.onPhaseChange?.(next);
    }
  };
  options.onPhaseChange?.(currentPhase);
  if (initialAmbientMode) {
    finishCompletion();
  }

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    if (disposed) return;
    options.onWebGLUnavailable?.();
    finishCompletion();
    dispose();
  };
  canvas.addEventListener("webglcontextlost", handleContextLost);

  let rafId = 0;
  let prevNow = performance.now();

  const handleVisibility = () => {
    prevNow = performance.now();
  };
  document.addEventListener("visibilitychange", handleVisibility);

  const renderFrame = (now: number) => {
    if (disposed) return;
    rafId = requestAnimationFrame(renderFrame);
    if (document.hidden) {
      prevNow = now;
      return;
    }

    const dt = clamp((now - prevNow) / 1000, 0, 0.2);
    prevNow = now;

    const step = advanceTierBoxClock(tier, clockState, dt);
    step.cues.forEach((cue) => options.onAudioCue?.(cue));
    emitPhase(step.phase);
    if (step.justCompleted) {
      finishCompletion();
    }

    const { t, holdElapsed, ambientTime, isAmbient, isError } = clockState;

    const vState = vault.update({
      t,
      holdElapsed,
      ambientTime,
      isAmbient,
      isError,
      crystalY,
      accentColor: rewardAccentColor,
    });

    const rState = rewardStage.update({
      t,
      hover: vState.hover,
      flash: vState.flash,
      isAmbient,
      ambientTime,
    });
    crystalY = rState.crystalY;

    underL.intensity = vState.underLightIntensity;
    underL.color.copy(rState.accentColor);

    const ambientFade = isAmbient ? 1 : sstep(tl.handoffStart, tl.complete, t);
    const openAmt = lerp(
      Math.max(vState.open, rState.crystalPresence),
      0.66,
      ambientFade,
    );
    const intro = isAmbient ? 0 : 1 - eOut(clamp(t / (isRare ? 0.52 : 0.65)));
    const revealCenter = isAmbient
      ? 1
      : sstep(tl.revealStart, tl.revealPeak, t);
    const clock = t + holdElapsed + ambientTime;

    // Distinct Camera Cinematography per tier
    let azDeg: number;
    let elDeg: number;
    let dist: number;
    let ty: number;
    let targetFov: number;
    let sx = 0;
    let sy = 0;

    if (isRare) {
      azDeg = lerp(
        38 + 6 * Math.sin((TAU * clock) / tl.ambientBreathCycle - 0.5) + 20 * intro,
        6 * Math.sin(clock * 0.35),
        revealCenter,
      );
      elDeg = lerp(
        14 + 7 * openAmt - 3 * intro,
        9 + 1.5 * Math.sin(clock * 0.45),
        revealCenter,
      );
      const fovBase = 32;
      const fovR = Math.tan(THREE.MathUtils.degToRad(fovBase) / 2);
      const hw = lerp(3.45, 4.1, openAmt);
      const hh = lerp(2.25, 3.15, openAmt);
      dist = Math.max(hh / fovR, hw / (fovR * camera.aspect)) * 1.04;
      dist *= 1 - 0.14 * vState.charge;
      dist *= 1 + 0.2 * intro;
      ty = lerp(0.76, 1.98, Math.max(openAmt * 0.85, revealCenter));
      const shake =
        !isAmbient && t >= tl.unlock
          ? 0.065 * Math.exp(-(t - tl.unlock) * 5.6)
          : 0;
      sx = shake * Math.sin(t * 68) * Math.sin(t * 41 + 1);
      sy = shake * Math.sin(t * 54 + 2) * Math.sin(t * 31);
      targetFov = fovBase + 4.0 * Math.min(1, vState.flash) + 1.4 * vState.charge;
    } else {
      // Premium: stately crane descent -> ceremonial dolly -> regal ascent along light shafts
      azDeg = lerp(
        42 + 4 * Math.sin((TAU * clock) / tl.ambientBreathCycle - 0.7) + 16 * intro,
        4 * Math.sin(clock * 0.2),
        revealCenter,
      );
      elDeg = lerp(
        25 - 6 * (1 - intro) + 4 * openAmt,
        8.5 + 1.0 * Math.sin(clock * 0.3),
        revealCenter,
      );
      const fovBase = 30;
      const fovR = Math.tan(THREE.MathUtils.degToRad(fovBase) / 2);
      const hw = lerp(3.65, 4.2, openAmt);
      const hh = lerp(2.45, 3.25, openAmt);
      dist = Math.max(hh / fovR, hw / (fovR * camera.aspect)) * 1.05;
      dist *= 1 - 0.13 * vState.charge;
      dist *= 1 + 0.18 * intro;
      ty = lerp(0.82, 2.02, Math.max(openAmt * 0.82, revealCenter));
      const shake =
        !isAmbient && t >= tl.unlock
          ? 0.048 * Math.exp(-(t - tl.unlock) * 4.2)
          : 0;
      sx = shake * Math.sin(t * 42) * Math.sin(t * 25 + 1);
      sy = shake * Math.sin(t * 35 + 2) * Math.sin(t * 19);
      targetFov = fovBase + 2.6 * Math.min(1, vState.flash) + 0.9 * vState.charge;
    }

    const az = THREE.MathUtils.degToRad(azDeg);
    const el = THREE.MathUtils.degToRad(elDeg);
    camera.position.set(
      Math.sin(az) * Math.cos(el) * dist + sx,
      ty + Math.sin(el) * dist + sy,
      Math.cos(az) * Math.cos(el) * dist,
    );
    camera.lookAt(0, ty, 0);
    camera.updateMatrixWorld();
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }

    bloomPass.strength = isRare
      ? lerp(
          0.56 + vState.flash * 0.58 + vState.charge * 0.2 + vState.open * 0.1,
          0.4,
          ambientFade,
        )
      : lerp(
          0.46 + vState.flash * 0.48 + vState.charge * 0.14 + vState.open * 0.08,
          0.36,
          ambientFade,
        );

    (fxPass.uniforms.uFlash.value as number) = Math.min(1, vState.flash);
    (fxPass.uniforms.uWarp.value as number) = vState.warp;
    (fxPass.uniforms.uWarpRing.value as number) = vState.warpRing;
    (fxPass.uniforms.uStreak.value as number) = vState.streak;
    (fxPass.uniforms.uTime.value as number) = clock;
    (fxPass.uniforms.uAmbientFade.value as number) = ambientFade;
    (fxPass.uniforms.uAccent.value as THREE.Color).copy(rState.accentColor);
    renderer.toneMappingExposure =
      (isRare ? 0.98 : 0.96) + vState.flash * (isRare ? 0.2 : 0.16);

    composer.render();
  };

  rafId = requestAnimationFrame(renderFrame);

  const setReward = (reward: Record<string, unknown>) => {
    if (disposed || clockState.isError) return;
    rewardMeta = getBoxRewardVisualMeta(reward);
    clockState.hasReward = true;
    const hasExplicitRarity = Boolean(
      rewardMeta.rarityKey || rewardMeta.boxRewardTier,
    );
    rewardAccentColor.set(
      hasExplicitRarity ? rewardMeta.accentHex : palette.primaryHex,
    );
    rewardStage.setReward(rewardMeta, reward);
  };

  const setError = () => {
    if (disposed) return;
    clockState.isError = true;
    emitPhase("error");
  };

  const skipToAmbient = () => {
    if (disposed || !rewardMeta || clockState.isError) return;
    clockState.t = tl.complete;
    clockState.isAmbient = true;
    emitPhase("ambient");
    finishCompletion();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    resizeObserver?.disconnect();
    window.removeEventListener("resize", syncSize);
    document.removeEventListener("visibilitychange", handleVisibility);
    canvas.removeEventListener("webglcontextlost", handleContextLost);

    rewardStage.dispose();
    vault.dispose();
    registry.geometries.forEach((g) => g.dispose());
    registry.materials.forEach((m) => m.dispose());
    glowTex.dispose();

    renderPass.dispose();
    nanPass.dispose();
    bloomPass.dispose();
    outputPass.dispose();
    fxPass.dispose();
    composer.dispose();
    rt.dispose();
    envRT.dispose();
    pmrem.dispose();
    const gl = renderer.getContext();
    renderer.dispose();
    if (gl && typeof gl.isContextLost === "function" && !gl.isContextLost()) {
      renderer.forceContextLoss();
    }

    if (canvas.parentElement === container) {
      container.removeChild(canvas);
    }
  };

  return {
    setReward,
    setError,
    skipToAmbient,
    completed,
    dispose,
  };
}
