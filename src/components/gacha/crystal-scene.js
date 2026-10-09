import * as PIXI from "pixi.js";
import * as THREE from "three";

const COLORS = [0x9cecff, 0x6bbcff, 0xd4f5ff];

export function mountCrystalScene(threeHost, pixiHost) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  camera.position.set(3.5, 3.1, 5.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.className = "h-full w-full";
  threeHost.appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0x9bdfff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 3.5);
  key.intensity = 1.4;
  key.position.set(3, 4, 5);
  scene.add(key);

  const crystal = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 0),
    new THREE.MeshPhysicalMaterial({
      color: 0x90dfff,
      emissive: 0x144a82,
      emissiveIntensity: 0.25,
      metalness: 0.3,
      roughness: 0.2,
      transmission: 0.45,
      thickness: 1.4,
      clearcoat: 1,
      flatShading: true,
      transparent: true,
      opacity: 0.78,
    }),
  );
  scene.add(crystal);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 32, 24),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { color: { value: new THREE.Color(0x56baff) } },
      vertexShader: "varying vec3 vNormal; void main(){vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: "varying vec3 vNormal; uniform vec3 color; void main(){float a=pow(1.0-abs(dot(normalize(vNormal),vec3(0.0,0.0,1.0))),4.0)*0.2;gl_FragColor=vec4(color,a);}",
    }),
  );
  scene.add(halo);

  const particles = new PIXI.Application();
  let destroyed = false;
  void particles.init({
    width: 720,
    height: 720,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
    preference: "webgl",
  }).then(() => {
    if (destroyed) {
      particles.destroy(true, { children: true });
      return;
    }
    particles.canvas.className = "h-full w-full";
    pixiHost.appendChild(particles.canvas);
    const sparks = Array.from({ length: 28 }, (_, index) => {
      const spark = new PIXI.Graphics()
        .circle(0, 0, index % 4 === 0 ? 2.5 : 1.4)
        .fill({ color: COLORS[index % COLORS.length], alpha: 0.75 });
      spark.blendMode = "add";
      particles.stage.addChild(spark);
      return spark;
    });
    particles.ticker.add(({ lastTime }) => {
      const time = lastTime / 1000;
      sparks.forEach((spark, index) => {
        const angle = time * (0.35 + index % 5 * 0.06) + index * Math.PI * 2 / sparks.length;
        const radius = 130 + index % 7 * 14;
        spark.position.set(360 + Math.cos(angle) * radius, 360 + Math.sin(angle) * radius * 0.72);
        spark.alpha = 0.35 + (Math.sin(time * 2 + index) + 1) * 0.3;
      });
    });
  });

  const resize = () => {
    const { width, height } = threeHost.getBoundingClientRect();
    const size = Math.max(1, Math.min(width, height));
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(threeHost);
  resize();

  let frame = 0;
  let previous = 0;
  const render = (now) => {
    frame = requestAnimationFrame(render);
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    crystal.rotation.x += delta * 0.23;
    crystal.rotation.y += delta * 0.58;
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(render);

  return () => {
    destroyed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    renderer.dispose();
    crystal.geometry.dispose();
    crystal.material.dispose();
    halo.geometry.dispose();
    halo.material.dispose();
    scene.clear();
    if (particles.renderer) particles.destroy(true, { children: true });
    renderer.domElement.remove();
  };
}
