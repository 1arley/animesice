"use client";

/**
 * Cristal vivo — vídeo em textura WebGL, chaveado em alpha.
 *
 * Reusa o padrão já provado em `CrystalVideoPreview.tsx` (vídeo → textura →
 * canvas) com duas diferenças que o gacha exige:
 *
 * 1. A chave é de **preto**, não de branco. O asset deste gacha tem fundo
 *    `srgb(0,0,0)` medido; o do preview era branco. Por isso a chave usa a
 *    luminância, e o despill é contra o preto.
 * 2. O controle é um objeto plano, não uma timeline. GSAP faz tween em
 *    `{ selo, dissolver }` e o RAF só lê: um relógio por propriedade, sem
 *    duas animações disputando a mesma textura.
 *
 * Sem WebGL o componente cai no vídeo com `mix-blend-screen` — mesma
 * aparência, sem uniforms.
 */
import { useEffect, useRef, useState } from "react";

/** Estado animável do cristal. GSAP faz tween direto neste objeto. */
export type CristalControle = {
  /** 0→1: raridade comprometida (cor + dispersão + pulso). */
  selo: number;
  /** 0→1: desintegração do cristal. */
  dissolver: number;
};

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uSelo;
uniform float uDissolver;
uniform float uTempo;
uniform vec3 uCor;

// Ruído determinístico: sem random, sem relógio. Mesma entrada, mesmo frame.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 uv = vUv;
  vec2 c = uv - 0.5;
  float r = length(c);

  // Refração: o centro refrata mais que a borda, como vidro grosso.
  float ondulacao = ruido(uv * 4.0 + vec2(uTempo * 0.12, -uTempo * 0.09)) - 0.5;
  float refracao = (0.004 + 0.008 * uSelo) * ondulacao * smoothstep(0.02, 0.5, r);

  // Dispersão cromática: R e B leem um pouco mais longe que G, só nas bordas.
  // Valor baixo de propósito — acima de ~3px a aresta fica suja, não vítrea.
  float disp = (0.0012 + 0.0022 * uSelo) * smoothstep(0.08, 0.5, r);
  vec3 cor;
  cor.r = texture2D(uTex, uv + refracao + vec2(disp, 0.0)).r;
  cor.g = texture2D(uTex, uv + refracao).g;
  cor.b = texture2D(uTex, uv + refracao - vec2(disp, 0.0)).b;

  // Chave pelo fundo preto do asset. Faixa alta: preserva facetas escuras.
  // Sem "despremultiplicar" a cor: o contexto já pede alpha reto
  // (premultipliedAlpha: false), então dividir só estourava a borda.
  float lum = dot(cor, vec3(0.2126, 0.7152, 0.0722));
  float a = smoothstep(0.035, 0.16, lum);

  // Selo de raridade: a cor nasce do sólido, não como filtro da camada. Entra
  // por mistura — somar brilho estourava o núcleo, que já é quase branco, e o
  // cristal inteiro saía branco, sem cor de raridade nenhuma.
  float nucleo = smoothstep(0.5, 0.05, r);
  cor = mix(cor, cor * (0.35 + uCor * 0.9), uSelo * (0.30 + 0.55 * nucleo));

  // Desintegração: o cristal quebra antes de deixar a cena.
  float limiar = ruido(uv * 18.0) * 0.85 + 0.15;
  a *= 1.0 - smoothstep(limiar - 0.24, limiar, uDissolver);

  if (a < 0.004) discard;
  gl_FragColor = vec4(clamp(cor, 0.0, 1.0), a);
}
`;

function compilar(gl: WebGLRenderingContext, tipo: number, fonte: string) {
  const shader = gl.createShader(tipo);
  if (!shader) throw new Error("createShader");
  gl.shaderSource(shader, fonte);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "shader compile");
  }
  return shader;
}

type CrystalLiveProps = {
  /** Objeto plano animado pelo GSAP. O RAF só lê. */
  controle: React.RefObject<CristalControle | null>;
  /** RGB 0..1 do selo de raridade. */
  cor: [number, number, number];
  className?: string;
};

export function CrystalLive({ controle, cor, className }: CrystalLiveProps) {
  const video = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  // A cor muda quando o pull chega (depois do mount). Espelhar em ref evita
  // recriar o contexto WebGL inteiro por causa de uma uniforme.
  const corRef = useRef(cor);
  corRef.current = cor;

  useEffect(() => {
    const elementoVideo = video.current;
    const elementoCanvas = canvas.current;
    if (!elementoVideo || !elementoCanvas) return;

    const gl = elementoCanvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) {
      setWebgl(false);
      return;
    }

    const programa = gl.createProgram();
    if (!programa) {
      setWebgl(false);
      return;
    }
    const vs = compilar(gl, gl.VERTEX_SHADER, VERT);
    const fs = compilar(gl, gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(programa, vs);
    gl.attachShader(programa, fs);
    gl.linkProgram(programa);
    if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(programa) || "program link");
    }
    gl.useProgram(programa);

    const aPos = gl.getAttribLocation(programa, "aPos");
    const uTex = gl.getUniformLocation(programa, "uTex");
    const uSelo = gl.getUniformLocation(programa, "uSelo");
    const uDissolver = gl.getUniformLocation(programa, "uDissolver");
    const uTempo = gl.getUniformLocation(programa, "uTempo");
    const uCor = gl.getUniformLocation(programa, "uCor");
    gl.uniform1i(uTex, 0);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const textura = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textura);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.viewport(0, 0, elementoCanvas.width, elementoCanvas.height);

    let raf = 0;
    let quadroAnterior = -1;

    const render = () => {
      raf = requestAnimationFrame(render);
      const largura = elementoVideo.videoWidth;
      const altura = elementoVideo.videoHeight;
      if (largura === 0 || altura === 0) return;
      if (elementoCanvas.width !== largura || elementoCanvas.height !== altura) {
        elementoCanvas.width = largura;
        elementoCanvas.height = altura;
        gl.viewport(0, 0, largura, altura);
      }

      // Upload só quando o vídeo entregou quadro novo: 1 MB/frame vira
      // ~1 MB por 41ms, não 60 vezes por segundo.
      if (elementoVideo.readyState < 2) return;
      const tempo = elementoVideo.currentTime;
      if (tempo === quadroAnterior) return;
      quadroAnterior = tempo;

      const estado = controle.current;
      const cor = corRef.current;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textura);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, elementoVideo);
      gl.uniform1f(uSelo, estado?.selo ?? 0);
      gl.uniform1f(uDissolver, estado?.dissolver ?? 0);
      gl.uniform1f(uTempo, tempo);
      gl.uniform3f(uCor, cor[0], cor[1], cor[2]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    setWebgl(true);
    void elementoVideo.play();
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      elementoVideo.pause();
      gl.deleteProgram(programa);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(textura);
      const perderContexto = gl.getExtension("WEBGL_lose_context");
      perderContexto?.loseContext();
    };
  }, [controle]);

  return (
    <>
      <canvas
        ref={canvas}
        width={512}
        height={512}
        aria-hidden="true"
        className={webgl === false ? "hidden" : className}
      />
      <video
        ref={video}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        tabIndex={-1}
        aria-hidden="true"
        className={webgl === false ? className : "hidden"}
      >
        <source src="/icons/crystal_animation_clean.webm" type="video/webm" />
        <source src="/gacha/crystal.mp4" type="video/mp4" />
      </video>
    </>
  );
}

export default CrystalLive;