export type ShaderPresetName =
  | "celestial-nebula"
  | "holo-foil"
  | "ice-crystal-caustics"
  | "gold-dust-swirl";

export type ShaderPreset = {
  name: ShaderPresetName;
  description: string;
  transparent: boolean;
  defaultUniforms: {
    colorA: [number, number, number];
    colorB: [number, number, number];
    accent: [number, number, number];
  };
  fragmentShader: string;
};

const COMMON_HEADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSeed;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uAccent;

out vec4 fragColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed * 0.137);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = rot * p * 2.02 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return v;
}
`;

export const SHADER_PRESETS: Record<ShaderPresetName, ShaderPreset> = {
  "celestial-nebula": {
    name: "celestial-nebula",
    description: "Deep midnight cosmic nebula with fBm galactic clouds and subtle gold/cyan starlight.",
    transparent: false,
    defaultUniforms: {
      colorA: [0.015, 0.032, 0.098],
      colorB: [0.06, 0.17, 0.44],
      accent: [0.96, 0.82, 0.42],
    },
    fragmentShader: `${COMMON_HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

  float t = uTime * 0.18;
  vec2 q = vec2(fbm(p * 2.2 + vec2(0.0, t)), fbm(p * 2.2 + vec2(5.2, -t * 0.7)));
  vec2 r = vec2(fbm(p * 2.8 + 3.0 * q + vec2(1.7, 9.2)), fbm(p * 2.8 + 3.0 * q + vec2(8.3, 2.8)));
  float neb = fbm(p * 3.1 + 2.5 * r);

  float radial = exp(-length(p * vec2(1.15, 0.85)) * 1.45);
  vec3 col = mix(uColorA, uColorB, smoothstep(0.18, 0.82, neb * 0.78 + radial * 0.48));

  float band = smoothstep(0.42, 0.88, neb) * radial;
  col += vec3(0.22, 0.62, 0.96) * band * 0.42;
  col += uAccent * pow(smoothstep(0.56, 0.96, neb), 2.2) * 0.42;

  // Fine starlight dust
  vec2 sg = p * 95.0;
  float starCell = hash21(floor(sg));
  if (starCell > 0.968) {
    vec2 sp = fract(sg) - 0.5;
    float d = length(sp);
    float twinkle = 0.65 + 0.35 * sin(uTime * 2.5 + starCell * 40.0);
    col += mix(vec3(0.85, 0.95, 1.0), uAccent, fract(starCell * 17.0)) * smoothstep(0.32, 0.0, d) * twinkle * 1.3;
  }

  // Vignette framing
  float vig = smoothstep(1.08, 0.28, length((uv - 0.5) * vec2(1.1, 1.0)));
  col *= mix(0.42, 1.0, vig);
  fragColor = vec4(col, 1.0);
}`,
  },

  "holo-foil": {
    name: "holo-foil",
    description: "Prismatic holographic diffraction foil bands with iridescent specular sheen.",
    transparent: false,
    defaultUniforms: {
      colorA: [0.22, 0.91, 0.85],
      colorB: [0.75, 0.52, 0.99],
      accent: [0.99, 0.83, 0.3],
    },
    fragmentShader: `${COMMON_HEADER}
vec3 rainbow(float t) {
  return 0.52 + 0.48 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
  float n = fbm(p * 4.5 + uTime * 0.25);
  float phase = uv.x * 1.4 + uv.y * 0.9 + n * 0.85 + uTime * 0.15;
  vec3 irid = rainbow(phase);
  float ridge = pow(0.5 + 0.5 * sin((uv.x * 18.0 - uv.y * 12.0) + n * 8.0 + uTime), 4.0);
  vec3 base = mix(uColorA, uColorB, uv.y) * 0.35;
  vec3 col = mix(base, irid, 0.58) + uAccent * ridge * 0.42;
  fragColor = vec4(col, 1.0);
}`,
  },

  "ice-crystal-caustics": {
    name: "ice-crystal-caustics",
    description: "AnimesIce Voronoi crystalline facets and surgical ice caustics (#38E8DA / #008CDA).",
    transparent: false,
    defaultUniforms: {
      colorA: [0.02, 0.047, 0.09],
      colorB: [0.0, 0.55, 0.85],
      accent: [0.22, 0.91, 0.85],
    },
    fragmentShader: `${COMMON_HEADER}
float voronoiEdge(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  vec2 mg, mr;
  float md = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      float h = hash21(n + g);
      vec2 o = 0.5 + 0.42 * sin(uTime * 0.45 + 6.2831 * vec2(h, fract(h * 13.7)));
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) {
        md = d; mr = r; mg = g;
      }
    }
  }
  md = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = mg + vec2(float(i), float(j));
      float h = hash21(n + g);
      vec2 o = 0.5 + 0.42 * sin(uTime * 0.45 + 6.2831 * vec2(h, fract(h * 13.7)));
      vec2 r = g + o - f;
      if (dot(mr - r, mr - r) > 0.0001) {
        md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
      }
    }
  }
  return md;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
  float e1 = voronoiEdge(p * 6.5);
  float e2 = voronoiEdge(p * 11.0 + vec2(2.3, -1.4));
  float vein1 = smoothstep(0.08, 0.0, e1);
  float vein2 = smoothstep(0.06, 0.0, e2);
  float frost = fbm(p * 3.8 + uTime * 0.1);

  vec3 col = mix(uColorA, uColorB * 0.55, frost);
  col += uAccent * vein1 * 0.85;
  col += vec3(0.88, 0.98, 1.0) * vein2 * 0.35;
  fragColor = vec4(col, 1.0);
}`,
  },

  "gold-dust-swirl": {
    name: "gold-dust-swirl",
    description: "Transparent alpha gold-dust swirling stardust ribbons ready for SVG compositing.",
    transparent: true,
    defaultUniforms: {
      colorA: [0.98, 0.84, 0.42],
      colorB: [0.24, 0.48, 0.95],
      accent: [1.0, 0.97, 0.85],
    },
    fragmentShader: `${COMMON_HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
  float angle = atan(p.y, p.x);
  float rad = length(p);
  float swirl = fbm(vec2(rad * 4.5 - uTime * 0.25, angle * 1.5 + rad * 4.2));
  float ribbon = smoothstep(0.45, 0.72, swirl) * smoothstep(0.72, 0.18, abs(uv.y - 0.72 + 0.14 * sin(uv.x * 5.0)));

  vec2 dg = p * 85.0;
  float cell = hash21(floor(dg));
  float dust = 0.0;
  if (cell > 0.92) {
    dust = smoothstep(0.35, 0.0, length(fract(dg) - 0.5)) * ribbon * 1.4;
  }

  vec3 col = mix(uColorB, uColorA, swirl) + uAccent * dust;
  float alpha = clamp(ribbon * 0.65 + dust, 0.0, 1.0);
  fragColor = vec4(col * alpha, alpha);
}`,
  },
};
