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
  BOX_TIMELINE,
  TAU,
  advanceCommonBoxClock,
  clamp,
  createLinearPalette,
  eOut,
  lerp,
  sstep,
  type CommonBoxAudioCue,
  type CommonBoxClockState,
  type CommonBoxPhase,
} from "./common-box-palette";
import { createRewardStage } from "./common-box-reward-stage";
import {
  createFxShaderConfig,
  createGlowTexture,
  NAN_SHADER,
  type LineHelperRegistry,
} from "./common-box-shaders";
import { createVault } from "./common-box-vault";

export interface CommonBoxEngineOptions {
  initialReward?: Record<string, unknown> | null;
  initialAmbient?: boolean;
  onPhaseChange?: (phase: CommonBoxPhase) => void;
  onComplete?: () => void;
  onWebGLUnavailable?: () => void;
  onAudioCue?: (cue: CommonBoxAudioCue) => void;
}

export interface CommonBoxEngine {
  setReward: (reward: Record<string, unknown>) => void;
  setError: () => void;
  skipToAmbient: () => void;
  completed: Promise<void>;
  dispose: () => void;
}

type QualityTier = "desktop" | "mobile" | "software";

export function detectWebGLSupport(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", {
      failIfMajorPerformanceCaveat: false,
    }) as WebGL2RenderingContext | null;
    if (!gl || typeof gl.getExtension !== "function") return false;
    const ext = gl.getExtension("WEBGL_lose_context") as {
      loseContext?: () => void;
    } | null;
    ext?.loseContext?.();
    return true;
  } catch {
    return false;
  }
}

function detectQualityTier(gl: WebGLRenderingContext | WebGL2RenderingContext): QualityTier {
  try {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as {
      UNMASKED_RENDERER_WEBGL: number;
    } | null;
    const rendererStr = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "")
      : String(gl.getParameter(gl.RENDERER) ?? "");
    if (/swiftshader|llvmpipe|software|mesa offscreen|microsoft basic/i.test(rendererStr)) {
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

export function createCommonBoxEngine(
  container: HTMLElement,
  options: CommonBoxEngineOptions = {},
): CommonBoxEngine {
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
  renderer.toneMappingExposure = 0.98;
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
  const dustCount = quality === "software" ? 240 : quality === "mobile" ? 360 : 650;
  const shardCount = quality === "software" ? 96 : 150;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envRT = pmrem.fromScene(roomEnv, 0.04);
  roomEnv.dispose();
  scene.environment = envRT.texture;

  const palette = createLinearPalette();
  const registry: LineHelperRegistry = {
    lineMats: [] as LineMaterial[],
    geometries: [],
    materials: [],
  };
  const glowTex = createGlowTexture();

  const world = new THREE.Group();
  scene.add(world);

  const vault = createVault(palette, registry, glowTex, clipPlane, {
    dustCount,
    shardCount,
  });
  world.add(vault.root);

  const rewardStage = createRewardStage(palette, registry, glowTex);
  world.add(rewardStage.root);

  // Lights matching box-common.html
  const keyL = new THREE.DirectionalLight(0xdff6ff, 2.2);
  keyL.position.set(3, 6, 4);
  scene.add(keyL);
  const rimL = new THREE.PointLight(0x9b8cff, 25, 12, 2);
  rimL.position.set(-3.5, 3, -3);
  scene.add(rimL);
  const underL = new THREE.PointLight(0x4cc8ff, 0, 7, 2);
  underL.position.set(0, 1.2, 0);
  scene.add(underL);

  // Post-processing composer (built once at physical resolution, resized cleanly)
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
    0.6,
    0.55,
    0.62,
  );
  const outputPass = new OutputPass();
  const fxPass = new ShaderPass(createFxShaderConfig());
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
    rewardAccentColor.set(rewardMeta.accentHex);
    rewardStage.setReward(rewardMeta);
  }

  const initialAmbientMode = Boolean(options.initialAmbient && rewardMeta);
  const clockState: CommonBoxClockState = {
    t: initialAmbientMode ? BOX_TIMELINE.complete : 0,
    holdElapsed: 0,
    ambientTime: 0,
    isAmbient: initialAmbientMode,
    isError: false,
    hasReward: rewardMeta !== null,
    chargeCueFired: initialAmbientMode,
    unlockCueFired: initialAmbientMode,
    revealCueFired: initialAmbientMode,
  };
  let crystalY = 2.0;
  let currentPhase: CommonBoxPhase = initialAmbientMode ? "ambient" : "materializing";

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

    const step = advanceCommonBoxClock(clockState, dt);
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

    // Continuous time & smooth ambient handoff (zero 1-frame snap at T_COMPLETE)
    const ambientFade = isAmbient
      ? 1
      : sstep(BOX_TIMELINE.handoffStart, BOX_TIMELINE.complete, t);
    const openAmt = lerp(
      Math.max(vState.open, rState.crystalPresence),
      0.65,
      ambientFade,
    );
    const intro = isAmbient ? 0 : 1 - eOut(clamp(t / 0.55));
    const revealCenter = isAmbient
      ? 1
      : sstep(BOX_TIMELINE.revealStart, BOX_TIMELINE.revealPeak, t);
    const clock = t + holdElapsed + ambientTime;
    const az = THREE.MathUtils.degToRad(
      lerp(28 + 5 * Math.sin((TAU * clock) / 11 - 0.6) + 22 * intro, 5 * Math.sin(clock * 0.25), revealCenter),
    );
    const el = THREE.MathUtils.degToRad(
      lerp(19 + 6 * openAmt - 5 * intro, 10 + 1.2 * Math.sin(clock * 0.4), revealCenter),
    );
    const fovR = Math.tan(THREE.MathUtils.degToRad(32) / 2);
    const hw = lerp(3.4, 3.85, openAmt);
    const hh = lerp(2.2, 3.05, openAmt);
    let dist = Math.max(hh / fovR, hw / (fovR * camera.aspect)) * 1.04;
    dist *= 1 - 0.11 * vState.charge;
    dist *= 1 + 0.22 * intro;
    const ty = lerp(0.74, 1.92, Math.max(openAmt * 0.85, revealCenter));
    const shake =
      !isAmbient && t >= BOX_TIMELINE.unlock
        ? 0.045 * Math.exp(-(t - BOX_TIMELINE.unlock) * 5.8)
        : 0;
    const sx = shake * Math.sin(t * 63) * Math.sin(t * 37 + 1);
    const sy = shake * Math.sin(t * 51 + 2) * Math.sin(t * 29);

    camera.position.set(
      Math.sin(az) * Math.cos(el) * dist + sx,
      ty + Math.sin(el) * dist + sy,
      Math.cos(az) * Math.cos(el) * dist,
    );
    camera.lookAt(0, ty, 0);
    camera.updateMatrixWorld();
    const targetFov = 32 + 3.0 * Math.min(1, vState.flash) + 1.1 * vState.charge;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }

    bloomPass.strength = lerp(
      0.55 + vState.flash * 0.8 + vState.charge * 0.15 + vState.open * 0.08,
      0.42,
      ambientFade,
    );
    (fxPass.uniforms.uFlash.value as number) = Math.min(1, vState.flash);
    (fxPass.uniforms.uTime.value as number) = clock;
    (fxPass.uniforms.uAmbientFade.value as number) = ambientFade;
    (fxPass.uniforms.uAccent.value as THREE.Color).copy(rState.accentColor);
    renderer.toneMappingExposure = 0.95 + vState.flash * 0.2;

    composer.render();
  };

  rafId = requestAnimationFrame(renderFrame);

  const setReward = (reward: Record<string, unknown>) => {
    if (disposed || clockState.isError) return;
    rewardMeta = getBoxRewardVisualMeta(reward);
    clockState.hasReward = true;
    rewardAccentColor.set(rewardMeta.accentHex);
    rewardStage.setReward(rewardMeta);
  };

  const setError = () => {
    if (disposed) return;
    clockState.isError = true;
    emitPhase("error");
  };

  const skipToAmbient = () => {
    if (disposed || !rewardMeta || clockState.isError) return;
    clockState.t = BOX_TIMELINE.complete;
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
