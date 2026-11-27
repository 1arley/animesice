import * as THREE from "three";
import { TAU } from "../common-box/common-box-palette";
import type { PremiumOrRareTier, TierBoxPalette } from "./tier-box-config";

const tierFillVS = /* glsl */ `
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

const tierFillFS = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uDeep;
uniform vec3 uTrim;
uniform vec3 uWarm;
uniform float uTime;
uniform float uAlpha;
uniform float uFlash;
uniform float uOpen;
uniform float uHeight;
uniform float uGrid;
uniform float uBand;
uniform float uCharge;
uniform float uMetal;
uniform float uVein;
varying vec3 vLocal;
varying vec3 vLN;
varying vec3 vN;
varying vec3 vView;
#include <clipping_planes_pars_fragment>

float sq(float x) { return x * x; }

float techGrid(vec2 p, float s) {
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
  float fres = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 2.1);

  vec3 a = abs(vLN);
  vec2 uv = a.x > 0.5 ? vLocal.zy : (a.y > 0.5 ? vLocal.xz : vLocal.xy);
  float g = techGrid(uv, 0.24) * uGrid;

  float yb = fract(uTime * 0.21) * (uHeight + 1.2) - 0.6;
  float band = exp(-sq((vLocal.y - yb) * 4.5)) * uBand;
  float yb2 = fract(uTime * 0.21 + 0.5) * (uHeight + 1.2) - 0.6;
  band += exp(-sq((vLocal.y - yb2) * 8.5)) * uBand * 0.32;

  // Arcane energy veins (prominent on Rare vault)
  float veinWave = abs(sin((uv.x + uv.y * 0.72) * 9.5 - uTime * 2.2) * cos((uv.x * 0.65 - uv.y) * 8.0 + uTime * 1.4));
  float vein = pow(clamp(1.0 - veinWave * 2.4, 0.0, 1.0), 2.6) * uVein * (0.28 + uCharge * 0.95);

  // Burnished brushed-metal specular lobe (prominent on Premium reliquary)
  vec3 keyDir = normalize(vec3(0.55, 0.78, 0.62));
  vec3 halfDir = normalize(keyDir + v);
  float spec = pow(max(dot(n, halfDir), 0.0), 22.0) * uMetal;
  float brush = 0.92 + 0.08 * sin(uv.x * 84.0 + uv.y * 8.0);

  vec3 col = uDeep * mix(1.0, brush, uMetal * 0.65);
  col += uColor * (fres * 0.34 + g * 0.07 + band * 0.16);
  col += mix(uColor, uTrim, 0.55) * (vein * 0.48 + spec * 0.42);
  col += mix(uColor, uTrim, 0.4) * uCharge * (0.04 + 0.16 * fres);

  if (!front) {
    col += uColor * uOpen * pow(clamp(1.0 - vLocal.y / max(uHeight, 0.001), 0.0, 1.0), 1.85) * 0.54;
  }

  col += uWarm * uFlash * (0.14 + 0.52 * fres);
  float fadeGate = smoothstep(0.0, 0.25, uAlpha);
  float alpha = clamp(uAlpha + (fres * 0.18 + uFlash * 0.14 + spec * 0.08) * fadeGate, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

export function createTierFillMaterial(
  palette: TierBoxPalette,
  overrides: {
    uAlpha?: number;
    uHeight?: number;
    uBand?: number;
    uGrid?: number;
    uMetal?: number;
    uVein?: number;
    uColor?: THREE.Color;
  } = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: tierFillVS,
    fragmentShader: tierFillFS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    clipping: true,
    uniforms: {
      uColor: { value: (overrides.uColor ?? palette.ice).clone() },
      uDeep: { value: palette.deep.clone() },
      uTrim: { value: palette.trim.clone() },
      uWarm: { value: palette.warm.clone() },
      uTime: { value: 0 },
      uAlpha: { value: overrides.uAlpha ?? 0.9 },
      uFlash: { value: 0 },
      uOpen: { value: 0 },
      uHeight: { value: overrides.uHeight ?? 1.2 },
      uGrid: { value: overrides.uGrid ?? 1.0 },
      uBand: { value: overrides.uBand ?? 1.0 },
      uCharge: { value: 0 },
      uMetal: { value: overrides.uMetal ?? 0.25 },
      uVein: { value: overrides.uVein ?? 0.0 },
    },
  });
}

export function createRareFloorMaterial(
  palette: TierBoxPalette,
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
      uPrimary: { value: palette.ice.clone() },
      uSecondary: { value: palette.trim.clone() },
      uDeepGlow: { value: palette.mid.clone() },
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
      uniform vec3 uPrimary, uSecondary, uDeepGlow;
      uniform vec2 uP[6];
      varying vec2 vP;

      float ln(float d, float w) {
        float aa = fwidth(d) * 1.2 + 1e-4;
        return 1.0 - smoothstep(max(w - aa, 0.0), w + aa, abs(d));
      }

      float hexDist(vec2 p) {
        p = abs(p);
        return max(p.x * 0.8660254 + p.y * 0.5, p.y);
      }

      void main() {
        float r = length(vP);
        float ang = atan(vP.y, vP.x);
        float cRot = cos(uTime * 0.14);
        float sRot = sin(uTime * 0.14);
        vec2 rp = vec2(vP.x * cRot - vP.y * sRot, vP.x * sRot + vP.y * cRot);
        float hd = hexDist(rp);

        float hexCore = ln(hd - 2.38, 0.011) * 0.95 + ln(hd - 2.66, 0.006) * 0.55;
        float outerRings = ln(r - 3.35, 0.008) * 0.55 + ln(r - 4.45, 0.005) * 0.35 + ln(r - 5.9, 0.004) * 0.22;

        // 6-fold arcane perimeter ticks + counter-rotating dual conduit arcs
        float ticks6 = step(0.88, fract((ang + uTime * 0.55) * 24.0 / ${TAU.toFixed(5)})) *
          (1.0 - smoothstep(0.028, 0.045, abs(r - 3.02)));
        float arcsA = step(0.42, fract((ang - uTime * 0.95) * 6.0 / ${TAU.toFixed(5)})) * ln(r - 3.72, 0.012);
        float arcsB = step(0.55, fract((ang + uTime * 0.72) * 3.0 / ${TAU.toFixed(5)})) * ln(r - 4.08, 0.009);

        float glow = exp(-r * r * 0.28) * (0.22 + uGlow * 0.92);
        float pulse = 0.0;
        for (int i = 0; i < 6; i++) {
          pulse += ln(r - uP[i].x, 0.036 + 0.012 * uP[i].x) * uP[i].y;
        }

        vec3 col =
          uPrimary * (hexCore * 0.62 + outerRings * 0.5 + ticks6 * 0.45 + pulse * 0.85) +
          uSecondary * (arcsA * 0.48 + arcsB * 0.38) +
          uDeepGlow * glow * 0.55;
        float edge = 1.0 - smoothstep(6.2, 9.2, r);
        gl_FragColor = vec4(col * uMaster * edge, 1.0);
      }
    `,
  });
}

export function createRareVortexBeamMaterial(
  palette: TierBoxPalette,
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
      uPrimary: { value: palette.ice.clone() },
      uSecondary: { value: palette.trim.clone() },
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
      uniform vec3 uPrimary, uSecondary;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        float rim = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 1.35);
        float fall = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 2.1) * smoothstep(0.0, 0.07, vUv.y);
        float helixA = pow(max(0.0, 0.5 + 0.5 * sin(vUv.x * ${(TAU * 3).toFixed(4)} + vUv.y * 15.0 - uTime * 11.5)), 2.6);
        float helixB = pow(max(0.0, 0.5 + 0.5 * cos(vUv.x * ${(TAU * 5).toFixed(4)} - vUv.y * 9.5 - uTime * 7.8)), 3.4);
        vec3 col = mix(uSecondary, uPrimary, helixA * 0.72 + rim * 0.28);
        float alpha = fall * (0.16 + rim * 0.72 + helixA * 0.55 + helixB * 0.35) * uI;
        gl_FragColor = vec4(col * alpha, 1.0);
      }
    `,
  });
}

export function createPremiumFloorMaterial(
  palette: TierBoxPalette,
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
      uPrimary: { value: palette.ice.clone() },
      uTrim: { value: palette.trim.clone() },
      uBronze: { value: palette.teal.clone() },
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
      uniform vec3 uPrimary, uTrim, uBronze;
      uniform vec2 uP[6];
      varying vec2 vP;

      float ln(float d, float w) {
        float aa = fwidth(d) * 1.2 + 1e-4;
        return 1.0 - smoothstep(max(w - aa, 0.0), w + aa, abs(d));
      }

      float octDist(vec2 p) {
        p = abs(p);
        return max(max(p.x, p.y), (p.x + p.y) * 0.70710678);
      }

      void main() {
        float r = length(vP);
        float ang = atan(vP.y, vP.x);
        float od = octDist(vP);

        float plinthAura = ln(od - 2.52, 0.011) * 0.92 + ln(od - 2.74, 0.005) * 0.52;
        float dials = ln(r - 3.15, 0.007) * 0.55 + ln(r - 4.05, 0.006) * 0.42 + ln(r - 5.55, 0.004) * 0.25;

        // 8 sovereign compass needles + 48 fine horological dial ticks
        float spokeAng = abs(fract((ang + uTime * 0.09) * 8.0 / ${TAU.toFixed(5)}) - 0.5);
        float spokes = (1.0 - smoothstep(0.014, 0.032, spokeAng)) * smoothstep(2.45, 2.55, r) * (1.0 - smoothstep(3.98, 4.12, r));
        float ticks48 = step(0.91, fract((ang - uTime * 0.16) * 48.0 / ${TAU.toFixed(5)})) *
          (1.0 - smoothstep(0.022, 0.038, abs(r - 3.55)));

        float glow = exp(-r * r * 0.25) * (0.20 + uGlow * 0.85);
        float pulse = 0.0;
        for (int i = 0; i < 6; i++) {
          pulse += ln(r - uP[i].x, 0.034 + 0.012 * uP[i].x) * uP[i].y;
        }

        vec3 col =
          uPrimary * (plinthAura * 0.58 + dials * 0.45 + spokes * 0.42 + pulse * 0.78) +
          uTrim * ticks48 * 0.38 +
          uBronze * glow * 0.7;
        float edge = 1.0 - smoothstep(6.2, 9.2, r);
        gl_FragColor = vec4(col * uMaster * edge, 1.0);
      }
    `,
  });
}

export function createPremiumVolumetricShaftMaterial(
  palette: TierBoxPalette,
  speed = 0.35,
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
      uPrimary: { value: palette.ice.clone() },
      uBright: { value: palette.bright.clone() },
      uSpeed: { value: speed },
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
      uniform float uTime, uI, uSpeed;
      uniform vec3 uPrimary, uBright;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        // Soft cylinder edge feather so rays read like volumetric light, never a hard tube
        float facing = smoothstep(0.0, 0.48, abs(dot(normalize(vN), normalize(vV))));
        float fall = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.95) * smoothstep(0.0, 0.09, vUv.y);
        float rayA = pow(max(0.0, sin(vUv.x * ${(TAU * 4).toFixed(4)} + uTime * uSpeed)), 2.4);
        float rayB = pow(max(0.0, sin(vUv.x * ${(TAU * 7).toFixed(4)} - uTime * uSpeed * 0.72 + 1.1)), 3.2);
        float rays = 0.14 + rayA * 0.62 + rayB * 0.36;
        vec3 col = mix(uPrimary, uBright, rayB * 0.45);
        gl_FragColor = vec4(col * facing * fall * rays * uI, 1.0);
      }
    `,
  });
}

export function createTierHaloMaterial(
  tier: PremiumOrRareTier,
  accentColor: THREE.Color,
  secondaryColor: THREE.Color,
): THREE.ShaderMaterial {
  const fragmentShader =
    tier === "RARE"
      ? /* glsl */ `
        uniform float uTime, uOpacity;
        uniform vec3 uColor, uSecondary;
        varying vec2 vUv;

        float hexDist(vec2 p) {
          p = abs(p);
          return max(p.x * 0.8660254 + p.y * 0.5, p.y);
        }

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          float ang = atan(p.y, p.x);
          float c = cos(uTime * 0.32);
          float s = sin(uTime * 0.32);
          vec2 hp = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
          float h = hexDist(hp);

          float core = exp(-r * r * 3.2) * 0.34;
          float hex1 = 1.0 - smoothstep(0.0, 0.016, abs(h - 0.58));
          float ring1 = 1.0 - smoothstep(0.0, 0.013, abs(r - 0.74));
          float wave = (0.5 + 0.5 * sin(r * 24.0 - uTime * 4.5)) * exp(-abs(r - 0.55) * 3.5) * 0.28;
          float segs = step(0.48, fract((ang - uTime * 0.7) * 6.0 / ${TAU.toFixed(5)})) *
            (1.0 - smoothstep(0.012, 0.025, abs(r - 0.85)));
          float edge = 1.0 - smoothstep(0.76, 1.0, r);
          vec3 col = mix(uColor, uSecondary, segs * 0.55 + 0.15);
          float intensity = (core + hex1 * 0.58 + ring1 * 0.42 + wave + segs * 0.5) * edge * uOpacity;
          gl_FragColor = vec4(col * intensity, 1.0);
        }
      `
      : /* glsl */ `
        uniform float uTime, uOpacity;
        uniform vec3 uColor, uSecondary;
        varying vec2 vUv;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          float ang = atan(p.y, p.x);

          float core = exp(-r * r * 3.4) * 0.32;
          float rInner = 1.0 - smoothstep(0.0, 0.013, abs(r - 0.56));
          float rMid = 1.0 - smoothstep(0.0, 0.011, abs(r - 0.74));
          float rOuter = 1.0 - smoothstep(0.0, 0.012, abs(r - 0.88));
          // 12 fine astrolabe star needles
          float needleAng = abs(fract((ang + uTime * 0.16) * 12.0 / ${TAU.toFixed(5)}) - 0.5);
          float needles = (1.0 - smoothstep(0.012, 0.032, needleAng)) *
            smoothstep(0.42, 0.56, r) * (1.0 - smoothstep(0.86, 0.94, r));
          float edge = 1.0 - smoothstep(0.80, 1.0, r);
          vec3 col = mix(uColor, uSecondary, rMid * 0.3 + needles * 0.4);
          float intensity = (core + rInner * 0.5 + rMid * 0.42 + rOuter * 0.36 + needles * 0.44) * edge * uOpacity;
          gl_FragColor = vec4(col * intensity, 1.0);
        }
      `;

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: accentColor.clone() },
      uSecondary: { value: secondaryColor.clone() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader,
  });
}

export function createTierFxShaderConfig(
  tier: PremiumOrRareTier,
  palette: TierBoxPalette,
) {
  const isRare = tier === "RARE";
  const baseCenter = isRare
    ? new THREE.Color(0.022, 0.012, 0.055)
    : new THREE.Color(0.044, 0.026, 0.010);
  const outerVoid = isRare
    ? new THREE.Color(0.004, 0.002, 0.012)
    : new THREE.Color(0.008, 0.005, 0.002);

  return {
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uFlash: { value: 0 },
      uWarp: { value: 0 },
      uWarpRing: { value: 0 },
      uStreak: { value: 0 },
      uAspect: { value: 1 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uAmbientFade: { value: 0 },
      uAccent: { value: palette.ice.clone() },
      uCenterBg: { value: baseCenter },
      uOuterBg: { value: outerVoid },
      uIsRare: { value: isRare ? 1 : 0 },
      uStreakCol: { value: palette.bright.clone() },
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
      uniform float uTime, uFlash, uWarp, uWarpRing, uStreak, uAspect, uAmbientFade, uIsRare;
      uniform vec2 uRes;
      uniform vec3 uAccent, uCenterBg, uOuterBg, uStreakCol;
      varying vec2 vUv;

      float h(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec2 c = vUv - 0.5;
        vec2 cc = vUv - vec2(0.5, 0.53);
        cc.x *= uAspect;
        float rr = length(cc);

        // Controlled shockwave refraction ring (Rare shear punch)
        vec2 sampleUv = vUv;
        if (uIsRare > 0.5 && uWarp > 0.001) {
          float dRing = (rr - uWarpRing) * 7.5;
          float ringEnv = exp(-(dRing * dRing)) * uWarp;
          vec2 dir = rr > 1e-4 ? cc / rr : vec2(0.0);
          sampleUv -= dir * ringEnv * 0.016 * sin((rr - uWarpRing) * 24.0);
        }

        vec2 ca = c * (0.0008 + 0.0038 * uFlash + 0.0028 * uWarp + 0.003 * dot(c, c));
        vec3 col = vec3(
          texture2D(tDiffuse, clamp(sampleUv + ca, 0.0, 1.0)).r,
          texture2D(tDiffuse, clamp(sampleUv, 0.0, 1.0)).g,
          texture2D(tDiffuse, clamp(sampleUv - ca, 0.0, 1.0)).b
        );

        vec3 centerBg = mix(uCenterBg, uAccent * 0.048, uAmbientFade * 0.58);
        vec3 bg = mix(centerBg, uOuterBg, smoothstep(0.0, 0.88, rr));
        col = max(col, bg * (0.85 + 0.45 * uFlash));

        // Subtle horizontal golden anamorphic streak (Premium only, restrained)
        if (uIsRare < 0.5 && uStreak > 0.001) {
          float streak = exp(-abs(c.y) * 28.0) * exp(-abs(c.x) * 3.6) * uStreak * 0.24;
          col += uStreakCol * streak;
        }

        col *= mix(0.52, 1.0, 1.0 - smoothstep(0.28, 1.18, length(c)));
        col *= mix(1.0, 0.68, uAmbientFade);
        float sl = 0.97 + 0.03 * sin(vUv.y * uRes.y * 1.4);
        col *= mix(sl, 1.0, uAmbientFade * 0.6);
        col += (h(vUv * uRes + fract(uTime) * 91.7) - 0.5) * mix(0.022, 0.012, uAmbientFade);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  };
}
