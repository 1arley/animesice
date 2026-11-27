import * as THREE from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import {
  TAU,
  type CommonBoxPalette,
} from "./common-box-palette";

const CYCLE = 11.0;

export interface LineHelperRegistry {
  lineMats: LineMaterial[];
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

export function seg(
  arr: number[],
  p: readonly [number, number, number],
  q: readonly [number, number, number],
): void {
  arr.push(p[0], p[1], p[2], q[0], q[1], q[2]);
}

export function loopPts(
  arr: number[],
  pts: ReadonlyArray<readonly [number, number, number]>,
): void {
  for (let i = 0; i < pts.length; i += 1) {
    seg(arr, pts[i], pts[(i + 1) % pts.length]);
  }
}

export function circlePts(
  r: number,
  n = 64,
): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * TAU;
    out.push([Math.cos(t) * r, Math.sin(t) * r, 0]);
  }
  return out;
}

export function createThickLine(
  registry: LineHelperRegistry,
  positions: number[],
  options: {
    color?: THREE.Color;
    w?: number;
    op?: number;
    boost?: number;
    dashed?: boolean;
    dashSize?: number;
    gapSize?: number;
    depthFunc?: number;
    depthWrite?: boolean;
    order?: number;
  } = {},
): LineSegments2 {
  const {
    color = new THREE.Color("#9fdcf5"),
    w = 1.4,
    op = 1,
    boost = 1.2,
    dashed = false,
    dashSize = 0.1,
    gapSize = 0.08,
    depthFunc,
    depthWrite = true,
    order = 3,
  } = options;
  const geom = new LineSegmentsGeometry();
  geom.setPositions(positions);
  const mat = new LineMaterial({
    color: 0xffffff,
    linewidth: w,
    transparent: true,
    opacity: op,
    dashed,
    dashSize,
    gapSize,
    worldUnits: false,
  });
  mat.color.copy(color).multiplyScalar(boost);
  if (depthFunc !== undefined) mat.depthFunc = depthFunc;
  mat.depthWrite = depthWrite;
  mat.userData.w = w;
  mat.userData.base = op;
  registry.lineMats.push(mat);
  registry.geometries.push(geom);
  registry.materials.push(mat);

  const line = new LineSegments2(geom, mat);
  if (dashed) line.computeLineDistances();
  line.renderOrder = order;
  return line;
}

const fillVS = /* glsl */ `
varying vec3 vLocal;
varying vec3 vLN;
varying vec3 vN;
varying vec3 vView;
#include <clipping_planes_pars_vertex>
void main() {
  vLocal = position;
  vLN = normal;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - wp.xyz);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}
`;

const fillFS = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uDeep;
uniform float uTime;
uniform float uAlpha;
uniform float uFlash;
uniform float uOpen;
uniform float uHeight;
uniform float uGrid;
uniform float uBand;
uniform float uCharge;
varying vec3 vLocal;
varying vec3 vLN;
varying vec3 vN;
varying vec3 vView;
#include <clipping_planes_pars_fragment>

float sq(float x) { return x * x; }
float grid(vec2 p, float s) {
  vec2 q = p / s;
  vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(1e-4));
  return 1.0 - min(min(g.x, g.y), 1.0);
}

void main() {
  #include <clipping_planes_fragment>
  vec3 n = normalize(vN);
  bool front = gl_FrontFacing;
  if (!front) n = -n;
  vec3 v = normalize(vView);
  float fres = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 2.2);
  vec3 a = abs(vLN);
  vec2 uv = a.x > 0.5 ? vLocal.zy : (a.y > 0.5 ? vLocal.xz : vLocal.xy);
  float g = grid(uv, 0.22) * uGrid;
  float yb = fract(uTime * (1.0 / 5.5)) * (uHeight + 1.2) - 0.6;
  float band = exp(-sq((vLocal.y - yb) * 4.5)) * uBand;
  float yb2 = fract(uTime * (1.0 / 5.5) + 0.5) * (uHeight + 1.2) - 0.6;
  band += exp(-sq((vLocal.y - yb2) * 9.0)) * uBand * 0.35;
  vec3 col = uDeep + uColor * (fres * 0.30 + g * 0.075 + band * 0.16);
  col += uColor * uCharge * (0.03 + 0.12 * fres);
  if (!front) {
    col += uColor * uOpen * pow(clamp(1.0 - vLocal.y / max(uHeight, 0.001), 0.0, 1.0), 2.0) * 0.45;
  }
  col += vec3(1.0, 0.93, 0.82) * uFlash * (0.12 + 0.5 * fres);
  float alpha = clamp(uAlpha + fres * 0.2 + uFlash * 0.15, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

export function createFillMaterial(
  palette: CommonBoxPalette,
  overrides: {
    uAlpha?: number;
    uHeight?: number;
    uBand?: number;
    uGrid?: number;
    uColor?: THREE.Color;
  } = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: fillVS,
    fragmentShader: fillFS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    clipping: true,
    uniforms: {
      uColor: { value: (overrides.uColor ?? palette.ice).clone() },
      uDeep: { value: palette.deep.clone() },
      uTime: { value: 0 },
      uAlpha: { value: overrides.uAlpha ?? 0.72 },
      uFlash: { value: 0 },
      uOpen: { value: 0 },
      uHeight: { value: overrides.uHeight ?? 1.2 },
      uGrid: { value: overrides.uGrid ?? 1.0 },
      uBand: { value: overrides.uBand ?? 1.0 },
      uCharge: { value: 0 },
    },
  });
}

export function createFloorMaterial(
  palette: CommonBoxPalette,
): THREE.ShaderMaterial {
  const pulseSlots = Array.from({ length: 6 }, () => new THREE.Vector2());
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMaster: { value: 0 },
      uGlow: { value: 0 },
      uIce: { value: palette.ice.clone() },
      uTeal: { value: palette.teal.clone() },
      uP: { value: pulseSlots },
    },
    vertexShader: `
      varying vec2 vP;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vP = w.xz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uMaster, uGlow;
      uniform vec3 uIce, uTeal;
      uniform vec2 uP[6];
      varying vec2 vP;

      float ln(float d, float w) {
        float aa = fwidth(d) * 1.2 + 1e-4;
        return 1.0 - smoothstep(max(w - aa, 0.0), w + aa, abs(d));
      }

      void main() {
        float r = length(vP);
        float ang = atan(vP.y, vP.x);
        float base = ln(r - 2.55, 0.011) * 0.95 + ln(r - 2.78, 0.005) * 0.55 + ln(r - 3.65, 0.005) * 0.35 + ln(r - 5.4, 0.004) * 0.22;
        float tk = fract((ang + uTime * ${(TAU / CYCLE).toFixed(5)}) * 36.0 / ${TAU.toFixed(5)});
        float ticks = step(0.93, tk) * (1.0 - smoothstep(0.025, 0.04, abs(r - 3.12)));
        float ang2 = ang - uTime * ${((TAU / CYCLE) * 2).toFixed(5)};
        float arcs = step(0.38, fract(ang2 * 5.0 / ${TAU.toFixed(5)})) * ln(r - 3.95, 0.012);
        vec2 gp = fract(vP / 0.55) - 0.5;
        float dots = 1.0 - smoothstep(0.018, 0.045, length(gp));
        float dotFade = (1.0 - smoothstep(3.2, 7.2, r)) * smoothstep(2.3, 3.3, r);
        float glow = exp(-r * r * 0.32) * (0.20 + uGlow * 0.9);
        float pulse = 0.0;
        for (int i = 0; i < 6; i++) {
          pulse += ln(r - uP[i].x, 0.035 + 0.012 * uP[i].x) * uP[i].y;
        }
        vec3 col = uIce * (base * 0.55 + ticks * 0.45 + arcs * 0.35 + dots * dotFade * 0.22 + pulse * 0.8) + uTeal * glow * 0.45;
        float edge = 1.0 - smoothstep(6.0, 9.0, r);
        gl_FragColor = vec4(col * uMaster * edge, 1.0);
      }
    `,
  });
}

export function createRingMaterial(
  palette: CommonBoxPalette,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uR: { value: 1 },
      uW: { value: 0.03 },
      uA: { value: 0 },
      uColor: { value: palette.ice.clone().multiplyScalar(1.6) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uR, uW, uA;
      uniform vec3 uColor;
      varying vec2 vUv;
      float sq(float x) { return x * x; }
      void main() {
        float r = length((vUv - 0.5) * 8.0);
        float d = r - uR;
        float aa = fwidth(r) * 1.3 + 1e-4;
        float core = 1.0 - smoothstep(uW, uW + aa + 0.02, abs(d));
        float trail = step(d, 0.0) * exp(d * 3.2) * 0.22 * smoothstep(0.0, 0.4, uR);
        float halo = exp(-sq(d / (uW * 5.0))) * 0.35;
        float a = (core + trail + halo) * (1.0 - smoothstep(3.0, 4.0, r)) * uA;
        gl_FragColor = vec4(uColor * a, 1.0);
      }
    `,
  });
}

export function createBeamMaterial(
  palette: CommonBoxPalette,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    clipping: true,
    uniforms: {
      uTime: { value: 0 },
      uI: { value: 0 },
      uColor: { value: palette.ice.clone() },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      #include <clipping_planes_pars_vertex>
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uI;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        float rim = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 1.5);
        float fall = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 2.6) * smoothstep(0.0, 0.06, vUv.y);
        float st = 0.55 + 0.45 * sin(vUv.y * 38.0 - uTime * ${(TAU * 2).toFixed(3)} + vUv.x * 12.566);
        float a = fall * (0.18 + rim * 0.9) * st * uI;
        gl_FragColor = vec4(uColor * a, 1.0);
      }
    `,
  });
}

export function createDustMaterial(
  palette: CommonBoxPalette,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 600 },
      uMaster: { value: 0 },
      uColor: { value: palette.ice.clone() },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime, uScale, uMaster;
      varying float vA;
      void main() {
        float ph = uTime / ${CYCLE.toFixed(1)};
        float k = aSeed.y, m = aSeed.z, s = aSeed.x;
        float f = fract(position.y + k * ph);
        vec3 p = vec3(position.x, f * 6.4 - 0.9, position.z);
        p.x += 0.22 * sin(${TAU.toFixed(5)} * m * ph + s * 6.28);
        p.z += 0.22 * cos(${TAU.toFixed(5)} * m * ph + s * 9.1);
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.2, aSeed.w * uScale / max(-mv.z, 0.1));
        float tw = 0.55 + 0.45 * sin(${TAU.toFixed(5)} * 4.0 * ph + s * 30.0);
        vA = sin(3.14159 * f) * tw * uMaster;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(uColor * a * vA * 1.4, 1.0);
      }
    `,
  });
}

export function createPulseMaterial(
  palette: CommonBoxPalette,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    clipping: true,
    uniforms: {
      uScale: { value: 600 },
      uColor: { value: palette.bright.clone().multiplyScalar(2.2) },
      uI: { value: 1 },
    },
    vertexShader: `
      attribute float aA;
      uniform float uScale;
      varying float vA;
      #include <clipping_planes_pars_vertex>
      void main() {
        vA = aA;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = 0.11 * uScale / max(-mvPosition.z, 0.1);
        #include <clipping_planes_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uI;
      varying float vA;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        float d = length(gl_PointCoord - 0.5);
        float a = pow(1.0 - smoothstep(0.0, 0.5, d), 1.6);
        gl_FragColor = vec4(uColor * a * vA * uI, 1.0);
      }
    `,
  });
}

export function createScanMaterial(
  palette: CommonBoxPalette,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uI: { value: 0 },
      uColor: { value: palette.ice.clone() },
    },
    vertexShader: `
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uI;
      uniform vec3 uColor;
      varying vec2 vP;
      float sq(float x) { return x * x; }
      void main() {
        float r = length(vP);
        float ring = exp(-sq((r - 2.7) / 0.035)) * 1.6 + exp(-sq((r - 2.7) / 0.2)) * 0.35;
        float disc = (1.0 - smoothstep(0.0, 2.7, r)) * 0.07 + exp(-sq((r - 1.45) / 0.02)) * 0.35;
        float sqd = max(abs(vP.x), abs(vP.y));
        float box = exp(-sq((sqd - 1.28) / 0.02)) * 1.4;
        gl_FragColor = vec4(uColor * (ring + disc + box) * uI * 1.5, 1.0);
      }
    `,
  });
}

export function createInnerFloorMaterial(
  palette: CommonBoxPalette,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    clipping: true,
    uniforms: {
      uI: { value: 0 },
      uColor: { value: palette.ice.clone() },
    },
    vertexShader: `
      varying vec2 vUv;
      #include <clipping_planes_pars_vertex>
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }
    `,
    fragmentShader: `
      uniform float uI;
      uniform vec3 uColor;
      varying vec2 vUv;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float g = pow(clamp(1.0 - r, 0.0, 1.0), 1.6);
        vec2 q = abs(fract(vUv * 9.0) - 0.5);
        float gr = smoothstep(0.47, 0.5, max(q.x, q.y)) * 0.35;
        gl_FragColor = vec4(uColor * (g * 1.1 + gr * g) * uI, 1.0);
      }
    `,
  });
}

export function createHoloCardSurfaceMaterial(
  accentColor: THREE.Color,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uColor: { value: accentColor.clone() },
      uOpacity: { value: 0 },
      uSweep: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uHasMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uSweep;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv - 0.5;
        float edge = smoothstep(0.43, 0.5, max(abs(p.x), abs(p.y)));
        vec3 baseCol;
        if (uHasMap > 0.5) {
          vec4 tex = texture2D(uMap, vUv);
          float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
          vec3 tinted = mix(tex.rgb, tex.rgb * 0.92 + uColor * 0.18, 0.15);
          baseCol = mix(tinted, uColor * (0.7 + luma * 0.4), edge * 0.55);
        } else {
          float diamond = abs(p.x * 1.45) + abs(p.y);
          float ring = 1.0 - smoothstep(0.0, 0.018, abs(diamond - 0.28));
          float core = (1.0 - smoothstep(0.0, 0.25, diamond)) * 0.55;
          float gridLine = step(0.94, fract(vUv.x * 12.0)) + step(0.94, fract(vUv.y * 16.0));
          baseCol = vec3(0.025, 0.08, 0.13) + uColor * (core + ring * 0.9 + gridLine * 0.08 + edge * 0.45);
        }
        float diag = (vUv.x * 0.8 + vUv.y * 0.5) - (uSweep * 1.9 - 0.35);
        float sheen = exp(-diag * diag * 75.0) * 0.55;
        float scanline = 0.96 + 0.04 * sin(vUv.y * 160.0 + uTime * 4.0);
        vec3 finalCol = (baseCol + vec3(0.9, 0.98, 1.0) * sheen) * scanline;
        gl_FragColor = vec4(finalCol, uOpacity);
      }
    `,
  });
}

export function createHoloHaloMaterial(
  accentColor: THREE.Color,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: accentColor.clone() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float ang = atan(p.y, p.x);
        float core = exp(-r * r * 3.8) * 0.36;
        float r1 = 1.0 - smoothstep(0.0, 0.015, abs(r - 0.66));
        float r2 = 1.0 - smoothstep(0.0, 0.01, abs(r - 0.84));
        float ticks = step(0.9, fract((ang + uTime * 0.35) * 24.0 / ${TAU.toFixed(5)})) *
          (1.0 - smoothstep(0.025, 0.045, abs(r - 0.75)));
        float edge = 1.0 - smoothstep(0.75, 1.0, r);
        float intensity = (core + r1 * 0.55 + r2 * 0.35 + ticks * 0.45) * edge * uOpacity;
        gl_FragColor = vec4(uColor * intensity, 1.0);
      }
    `,
  });
}

export function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.18, "rgba(255,255,255,0.55)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.12)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGlowSprite(
  glowTex: THREE.Texture,
  color: THREE.Color,
  scale: number,
  boost = 1,
): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 1,
  });
  mat.color.copy(color).multiplyScalar(boost);
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale, 1);
  sprite.renderOrder = 5;
  return sprite;
}

export const NAN_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0);
      c.rgb = clamp(c.rgb, 0.0, 24.0);
      gl_FragColor = vec4(c.rgb, 1.0);
    }
  `,
};

export function createFxShaderConfig() {
  return {
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uFlash: { value: 0 },
      uAspect: { value: 1 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uAmbientFade: { value: 0 },
      uAccent: { value: new THREE.Color("#9fdcf5") },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uTime, uFlash, uAspect, uAmbientFade;
      uniform vec2 uRes;
      uniform vec3 uAccent;
      varying vec2 vUv;

      float h(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec2 c = vUv - 0.5;
        vec2 ca = c * (0.0009 + 0.0045 * uFlash + 0.0035 * dot(c, c));
        vec3 col = vec3(
          texture2D(tDiffuse, vUv + ca).r,
          texture2D(tDiffuse, vUv).g,
          texture2D(tDiffuse, vUv - ca).b
        );
        vec2 cc = vUv - vec2(0.5, 0.53);
        cc.x *= uAspect;
        float rr = length(cc);
        vec3 centerBg = mix(vec3(0.007, 0.030, 0.048), uAccent * 0.045, uAmbientFade * 0.55);
        vec3 bg = mix(centerBg, vec3(0.002, 0.005, 0.009), smoothstep(0.0, 0.85, rr));
        col = max(col, bg * (0.85 + 0.5 * uFlash));
        col *= mix(0.5, 1.0, 1.0 - smoothstep(0.25, 1.15, length(c)));
        col *= mix(1.0, 0.72, uAmbientFade);
        float sl = 0.965 + 0.035 * sin(vUv.y * uRes.y * 1.5);
        col *= mix(sl, 1.0, uAmbientFade * 0.55);
        col += (h(vUv * uRes + fract(uTime) * 91.7) - 0.5) * mix(0.028, 0.014, uAmbientFade);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  };
}
