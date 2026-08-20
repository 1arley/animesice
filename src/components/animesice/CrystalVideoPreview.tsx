"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/icons/crystal_animation.mp4";
const KEY_A0 = 30 / 255;
const KEY_A1 = 50 / 255;
const DESPILL_FLOOR = 0.4;

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
uniform float uRaw;
void main() {
  vec4 c = texture2D(uTex, vUv);
  if (uRaw > 0.5) {
    gl_FragColor = vec4(c.rgb, 1.0);
    return;
  }
  // distância do branco (0..1) + chave suave + despill contra o branco:
  // recupera a cor pura do cristal nas bordas, sem anel acinzentado.
  float d = 1.0 - min(min(c.r, c.g), c.b);
  float a = smoothstep(${KEY_A0.toFixed(4)}, ${KEY_A1.toFixed(4)}, d);
  vec3 col = (c.rgb - (1.0 - a)) / max(a, ${DESPILL_FLOOR.toFixed(2)});
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), a);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader");
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "shader compile");
  }
  return shader;
}

export function CrystalVideoPreview({ size = 288 }: { size?: number }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawRef = useRef(false);
  const [raw, setRaw] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) return;

    const program = gl.createProgram();
    if (!program) return;
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "program link");
    }
    gl.useProgram(program);

    const aPos = gl.getAttribLocation(program, "aPos");
    const uTex = gl.getUniformLocation(program, "uTex");
    const uRaw = gl.getUniformLocation(program, "uRaw");
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

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let raf = 0;

    const render = () => {
      raf = requestAnimationFrame(render);
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw > 0 && vh > 0 && (canvas.width !== vw || canvas.height !== vh)) {
        canvas.width = vw;
        canvas.height = vh;
        gl.viewport(0, 0, vw, vh);
      }
      if (video.readyState >= 2) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.uniform1i(uRaw, rawRef.current ? 1 : 0);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };

    void video.play();
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      video.pause();
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(tex);
    };
  }, []);

  const toggleRaw = () => {
    rawRef.current = !raw;
    setRaw(rawRef.current);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="pointer-events-none absolute -inset-[55%]"
          style={{
            background:
              "radial-gradient(circle at 50% 46%, rgba(0, 229, 255, 0.9) 0%, rgba(0, 145, 234, 0.28) 38%, rgba(0, 145, 234, 0) 68%)",
            filter: "blur(22px)",
            opacity: 0.45,
          }}
          aria-hidden="true"
        />
        <canvas ref={canvasRef} className="relative block h-full w-full" />
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          className="pointer-events-none absolute h-px w-px opacity-0"
          aria-hidden="true"
        />
      </div>
      <button
        type="button"
        onClick={toggleRaw}
        className="rounded-full border border-hairline bg-panel px-4 py-1.5 font-mono text-caption uppercase tracking-[0.14em] text-motion-glacier/90 transition-colors hover:border-ice/60 hover:text-ice"
      >
        {raw ? "Com fundo branco (original)" : "Fundo branco removido"}
      </button>
    </div>
  );
}

export default CrystalVideoPreview;