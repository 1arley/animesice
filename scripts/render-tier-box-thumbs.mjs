import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { transform } from "sucrase";

const rootDir = path.resolve(import.meta.dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".ts": "application/javascript; charset=utf-8",
};

const htmlPage = /* html */ `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
    canvas { display: block; width: 720px; height: 720px; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "/nm/three/build/three.module.js",
      "three/addons/": "/nm/three/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <div id="mount" style="width:720px;height:720px;"></div>
  <script type="module">
    import * as THREE from "three";
    import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
    import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
    import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
    import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
    import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
    import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
    import { createGlowTexture, NAN_SHADER } from "/src/components/gacha/common-box/common-box-shaders.ts";
    import { createTierPalette } from "/src/components/gacha/tier-boxes/tier-box-config.ts";
    import { createRareVault } from "/src/components/gacha/tier-boxes/rare-box-vault.ts";
    import { createPremiumVault } from "/src/components/gacha/tier-boxes/premium-box-vault.ts";

    const W = 720;
    const H = 720;
    const dpr = 2;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 1);
    document.getElementById("mount").appendChild(renderer.domElement);

    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99);
    renderer.clippingPlanes = [clipPlane];

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    roomEnv.dispose();

    const glowTex = createGlowTexture();

    function renderTierThumb(tier) {
      const isRare = tier === "RARE";
      renderer.toneMappingExposure = isRare ? 0.94 : 0.92;

      const scene = new THREE.Scene();
      scene.environment = envRT.texture;
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

      const palette = createTierPalette(tier);
      const registry = { lineMats: [], geometries: [], materials: [] };

      const vault = isRare
        ? createRareVault(palette, registry, glowTex, clipPlane, { dustCount: 120, shardCount: 0 })
        : createPremiumVault(palette, registry, glowTex, clipPlane, { dustCount: 120, shardCount: 0 });
      scene.add(vault.root);
      vault.setLockedHeroPose();

      // Keep seal emblem glow sharp and interior ghost wireframe subtle
      vault.root.traverse((obj) => {
        if (obj.isSprite && obj.material?.color) {
          obj.material.color.multiplyScalar(0.32);
        }
        if (obj.material?.depthFunc === THREE.GreaterDepth) {
          obj.material.opacity = 0.06;
        }
      });

      const keyL = new THREE.DirectionalLight(isRare ? 0xece4ff : 0xfff3d6, isRare ? 1.95 : 2.0);
      keyL.position.set(3, 6, 4);
      scene.add(keyL);
      const rimL = new THREE.PointLight(isRare ? 0x6d78ff : 0xf59e0b, isRare ? 16 : 12, 12, 2);
      rimL.position.set(-3.5, 3, -3);
      scene.add(rimL);
      const rimL2 = new THREE.PointLight(isRare ? 0xc084fc : 0x64748b, isRare ? 9 : 7, 12, 2);
      rimL2.position.set(3.5, 2.8, -2.8);
      scene.add(rimL2);

      // Family-matched 3/4 framing with headroom for Rare pylons & Premium finials
      const az = THREE.MathUtils.degToRad(38);
      const el = THREE.MathUtils.degToRad(23);
      const dist = isRare ? 8.35 : 8.55;
      const ty = isRare ? 0.52 : 0.56;
      camera.position.set(
        Math.sin(az) * Math.cos(el) * dist,
        ty + Math.sin(el) * dist,
        Math.cos(az) * Math.cos(el) * dist,
      );
      camera.lookAt(0, ty, 0);
      camera.updateMatrixWorld();

      registry.lineMats.forEach((m) => {
        m.resolution.set(W * dpr, H * dpr);
        m.linewidth = (m.userData.w || 1.2) * dpr * 0.92;
      });
      const sc = (H * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      vault.setPointScale(sc);

      const rt = new THREE.WebGLRenderTarget(W * dpr, H * dpr, {
        type: THREE.HalfFloatType,
        samples: 4,
      });
      const composer = new EffectComposer(renderer, rt);
      composer.setSize(W, H);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new ShaderPass(NAN_SHADER));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(W, H),
        isRare ? 0.22 : 0.17,
        0.38,
        isRare ? 0.72 : 0.75,
      );
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      const haloColor = isRare
        ? new THREE.Vector3(0.026, 0.012, 0.052)
        : new THREE.Vector3(0.046, 0.028, 0.008);
      const edgeFadePass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          uHalo: { value: haloColor },
        },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: [
          "uniform sampler2D tDiffuse; uniform vec3 uHalo; varying vec2 vUv;",
          "void main() {",
          "  vec4 c = texture2D(tDiffuse, vUv);",
          "  float d = length(vUv - vec2(0.5, 0.5));",
          "  float aura = smoothstep(0.45, 0.12, d);",
          "  vec3 halo = uHalo * aura;",
          "  float perimeterMask = smoothstep(0.495, 0.435, d);",
          "  vec3 col = max(c.rgb, halo) * perimeterMask;",
          "  gl_FragColor = vec4(col, 1.0);",
          "}",
        ].join("\\n"),
      });
      composer.addPass(edgeFadePass);

      composer.render();
      const dataUrl = renderer.domElement.toDataURL("image/png");

      vault.dispose();
      registry.geometries.forEach((g) => g.dispose());
      registry.materials.forEach((m) => m.dispose());
      composer.dispose();
      rt.dispose();
      return dataUrl;
    }

    window.__THUMB_RESULTS = {
      RARE: renderTierThumb("RARE"),
      PREMIUM: renderTierThumb("PREMIUM"),
    };
    window.__RENDER_DONE = true;
  </script>
</body>
</html>`;

function resolveLocalFile(urlPath) {
  if (urlPath.startsWith("/nm/")) {
    return path.join(rootDir, "node_modules", urlPath.slice(4));
  }
  if (urlPath.startsWith("/src/")) {
    return path.join(rootDir, urlPath.slice(1));
  }
  return null;
}

const server = http.createServer((req, res) => {
  const reqPath = (req.url || "/").split("?")[0];
  if (reqPath === "/") {
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(htmlPage);
    return;
  }
  const filePath = resolveLocalFile(reqPath);
  if (!filePath || !fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath);
  let code = fs.readFileSync(filePath, "utf8");
  if (ext === ".ts") {
    code = code.replace(
      /from\s+["'](\.[^"']+)(?<!\.ts|\.js)["']/g,
      'from "$1.ts"',
    );
    code = transform(code, { transforms: ["typescript"] }).code;
  }
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(code);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

let browser;
try {
  browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage({
    viewport: { width: 720, height: 720 },
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__RENDER_DONE === true, null, {
    timeout: 25000,
  });
  if (errors.length) {
    throw new Error(`Renderer errors: ${errors.join("; ")}`);
  }

  const results = await page.evaluate(() => window.__THUMB_RESULTS);
  for (const [tier, fileName] of [
    ["RARE", "box-rare.webp"],
    ["PREMIUM", "box-premium.webp"],
  ]) {
    const outPath = path.join(rootDir, "public/gacha", fileName);
    const pngBuffer = Buffer.from(results[tier].split(",")[1], "base64");
    await sharp(pngBuffer)
      .resize(720, 720, { kernel: "lanczos3" })
      .webp({ quality: 90, effort: 6 })
      .toFile(outPath);

    const meta = await sharp(outPath).metadata();
    const cornerCoords = [
      [0, 0],
      [meta.width - 8, 0],
      [0, meta.height - 8],
      [meta.width - 8, meta.height - 8],
    ];
    let maxCorner = 0;
    for (const [left, top] of cornerCoords) {
      const cornerBuf = await sharp(outPath)
        .extract({ left, top, width: 8, height: 8 })
        .raw()
        .toBuffer();
      maxCorner = Math.max(maxCorner, ...cornerBuf);
    }
    if (maxCorner !== 0) {
      throw new Error(`Expected pure black corners on ${fileName}, got maxCornerChannel=${maxCorner}`);
    }
    console.log(
      `Rendered ${outPath} (${meta.width}x${meta.height}, ${fs.statSync(outPath).size} bytes, maxCornerChannel=${maxCorner})`,
    );
  }
} finally {
  await browser?.close();
  server.close();
}
