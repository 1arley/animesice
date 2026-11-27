// forja.js — animação de confecção de item (Three.js)
import * as THREE from 'three';

// Linha do tempo (segundos)
const T = { carga: 2.7, impacto: 4.3, fim: 6.2 };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const faixa = (t, a, b) => clamp((t - a) / (b - a));
const suave = (x) => x * x * (3 - 2 * x);
const saiCubic = (x) => 1 - Math.pow(1 - x, 3);
const saiBack = (x) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);

// aleatório com semente: a animação sai igual em toda execução
function semente(s) {
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function texturaCanvas(tam, desenhar) {
  const c = document.createElement('canvas');
  c.width = c.height = tam;
  desenhar(c.getContext('2d'), tam);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

const texturaBrilho = () => texturaCanvas(256, (g, n) => {
  const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,.45)');
  r.addColorStop(0.6, 'rgba(255,255,255,.1)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, n, n);
});

const texturaCirculo = (rnd) => texturaCanvas(1024, (g, n) => {
  g.translate(n / 2, n / 2);
  g.strokeStyle = '#fff';
  g.shadowColor = '#fff';
  g.shadowBlur = 14;
  const anel = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  anel(480, 8); anel(455, 2); anel(360, 4); anel(230, 2); anel(205, 6);
  for (let i = 0; i < 24; i++) { // runas
    g.save(); g.rotate((i / 24) * Math.PI * 2); g.translate(0, -408); g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, -28); g.lineTo(0, 28);
    for (let k = 0; k < 3; k++) {
      g.moveTo(0, -24 + rnd() * 48);
      g.lineTo((rnd() < 0.5 ? -1 : 1) * (10 + rnd() * 14), -24 + rnd() * 48);
    }
    g.stroke(); g.restore();
  }
  g.lineWidth = 3;
  for (const giro of [0, Math.PI / 3]) { // estrela de seis pontas
    g.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = giro + (i / 3) * Math.PI * 2;
      g[i ? 'lineTo' : 'moveTo'](Math.sin(a) * 355, -Math.cos(a) * 355);
    }
    g.stroke();
  }
});

// Divide o quadrado da imagem em células de Voronoi (os fragmentos)
function celulas(rnd, n = 5) {
  const pts = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      pts.push([(x + 0.15 + rnd() * 0.7) / n - 0.5, (y + 0.15 + rnd() * 0.7) / n - 0.5]);
  return pts.map((p) => {
    let poli = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
    for (const q of pts) {
      if (q === p) continue;
      const nx = q[0] - p[0], ny = q[1] - p[1];
      const d = (nx * (p[0] + q[0]) + ny * (p[1] + q[1])) / 2;
      const novo = [];
      poli.forEach((a, i) => {
        const b = poli[(i + 1) % poli.length];
        const da = a[0] * nx + a[1] * ny - d, db = b[0] * nx + b[1] * ny - d;
        if (da <= 0) novo.push(a);
        if (da * db < 0) {
          const k = da / (da - db);
          novo.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
        }
      });
      poli = novo;
    }
    return poli;
  });
}

const VERT = `varying vec2 vUv; attribute float aCentro; varying float vCentro;
void main(){ vUv=uv; vCentro=aCentro; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

const COMUM = `uniform sampler2D map; uniform vec3 cor; varying vec2 vUv;
float cristal(vec3 c){ return smoothstep(.08,.45,c.g-c.r); }`;

const FRAG_FRAG = `${COMUM} uniform float uCalor, uAlpha; varying float vCentro;
void main(){
  vec4 t=texture2D(map,vUv); if(t.a<.02) discard;
  float borda=1.-smoothstep(0.,.22,vCentro);
  vec3 c=t.rgb*mix(.35,1.,uCalor*.5);
  c+=cor*cristal(t.rgb)*(.25+uCalor*.9);
  c+=mix(cor,vec3(1.),.35)*borda*(.35+uCalor);
  c=mix(c,mix(cor,vec3(1.),.8),smoothstep(.7,1.,uCalor));
  gl_FragColor=vec4(c,t.a*uAlpha);
}`;

const FRAG_ITEM = `${COMUM} uniform float uBranco, uPulso, uVarre, uAlpha;
void main(){
  vec4 t=texture2D(map,vUv); if(t.a<.01) discard;
  vec3 c=t.rgb+cor*cristal(t.rgb)*uPulso;
  float faixaLuz=exp(-pow((vUv.x*.7+(1.-vUv.y)*.7-uVarre)*11.,2.));
  c+=vec3(.75,1.,.92)*faixaLuz*.75;
  c=mix(c,vec3(.92,1.,.97),uBranco);
  gl_FragColor=vec4(c,t.a*uAlpha);
}`;

const FRAG_AURA = `${COMUM} uniform float uAlpha, uTempo;
void main(){
  vec2 uv=(vUv-.5)*1.3+.5; float s=0.;
  for(int i=0;i<16;i++){
    float a=float(i)*.3927;
    for(int k=1;k<=3;k++){
      vec2 p=uv+vec2(cos(a),sin(a))*float(k)*(.017+.003*sin(uTempo*2.+a*3.));
      if(p.x>0.&&p.x<1.&&p.y>0.&&p.y<1.) s+=texture2D(map,p).a/float(k);
    }
  }
  s/=29.;
  gl_FragColor=vec4(cor,s*uAlpha);
}`;

export async function criarForja(container, opcoes = {}) {
  const {
    imagem = 'titanita.png',
    cor = '#2ef2ad',
    fundo = '#070b0e', // use null para fundo transparente
    autoplay = true,
    loop = false,
    aoImpactar = null,
    aoConcluir = null,
  } = opcoes;

  const rnd = semente(7);
  const tex = await new THREE.TextureLoader().loadAsync(imagem);
  tex.anisotropy = 8;
  const corV = new THREE.Color().setStyle(cor, THREE.LinearSRGBColorSpace);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(fundo ?? '#000000', fundo ? 1 : 0);
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });
  container.appendChild(renderer.domElement);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const brilhoTex = texturaBrilho();

  const aditivo = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const sprite = (ordem) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilhoTex, color: cor, depthTest: false, ...aditivo }));
    s.renderOrder = ordem;
    cena.add(s);
    return s;
  };

  const halo = sprite(0);
  const clarao = sprite(20);
  clarao.material.color.set('#e8fff6');

  // círculo de forja
  const circulo = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({ map: texturaCirculo(rnd), color: cor, side: THREE.DoubleSide, ...aditivo }),
  );
  circulo.rotation.x = -Math.PI / 2 + 0.08;
  circulo.position.y = -2.45;
  circulo.renderOrder = 1;
  cena.add(circulo);

  // coluna de luz
  const coluna = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 7),
    new THREE.ShaderMaterial({
      uniforms: { cor: { value: corV }, uAlpha: { value: 0 } },
      vertexShader: VERT,
      fragmentShader: `uniform vec3 cor; uniform float uAlpha; varying vec2 vUv;
        void main(){ float x=exp(-pow((vUv.x-.5)*5.,2.)); float y=smoothstep(0.,.12,vUv.y)*pow(1.-vUv.y,1.4);
        gl_FragColor=vec4(cor,x*y*uAlpha); }`,
      ...aditivo,
    }),
  );
  coluna.position.set(0, 1.0, -0.6);
  coluna.renderOrder = 2;
  cena.add(coluna);

  // item inteiro + aura
  const item = new THREE.Group();
  cena.add(item);
  const TAM = 4;
  const matShader = (frag, extra, mais = {}) => new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, cor: { value: corV }, ...extra },
    vertexShader: VERT, fragmentShader: frag, transparent: true, depthWrite: false, depthTest: false, ...mais,
  });
  const aura = new THREE.Mesh(
    new THREE.PlaneGeometry(TAM * 1.3, TAM * 1.3),
    matShader(FRAG_AURA, { uAlpha: { value: 0 }, uTempo: { value: 0 } }, { blending: THREE.AdditiveBlending }),
  );
  aura.renderOrder = 3;
  const inteiro = new THREE.Mesh(
    new THREE.PlaneGeometry(TAM, TAM),
    matShader(FRAG_ITEM, { uBranco: { value: 0 }, uPulso: { value: 0 }, uVarre: { value: -1 }, uAlpha: { value: 0 } }),
  );
  inteiro.renderOrder = 5;
  item.add(aura, inteiro);

  // fragmentos recortados da própria imagem
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g2 = cv.getContext('2d', { willReadFrequently: true });
  g2.drawImage(tex.image, 0, 0, 128, 128);
  const pixels = g2.getImageData(0, 0, 128, 128).data;
  const opaco = (x, y) => pixels[(Math.min(127, Math.floor((0.5 - y) * 128)) * 128 + Math.min(127, Math.floor((x + 0.5) * 128))) * 4 + 3] > 80;

  const fragmentos = [];
  for (const poli of celulas(rnd)) {
    const cx = poli.reduce((s, p) => s + p[0], 0) / poli.length;
    const cy = poli.reduce((s, p) => s + p[1], 0) / poli.length;
    const pos = [], uv = [], centro = [], amostras = [];
    poli.forEach((a, i) => {
      const b = poli[(i + 1) % poli.length];
      for (const [x, y, c] of [[cx, cy, 1], [a[0], a[1], 0], [b[0], b[1], 0]]) {
        pos.push((x - cx) * TAM, (y - cy) * TAM, 0);
        uv.push(x + 0.5, y + 0.5);
        centro.push(c);
      }
      for (let u = 0.15; u < 1; u += 0.2)
        for (let v = 0.05; u + v < 1; v += 0.2)
          amostras.push([cx + (a[0] - cx) * u + (b[0] - cx) * v, cy + (a[1] - cy) * u + (b[1] - cy) * v]);
    });
    if (!amostras.some(([x, y]) => opaco(x, y))) continue; // célula vazia
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('aCentro', new THREE.Float32BufferAttribute(centro, 1));
    const m = new THREE.Mesh(geo, matShader(FRAG_FRAG, { uCalor: { value: 0 }, uAlpha: { value: 0 } }, { side: THREE.DoubleSide }));
    m.renderOrder = 4;
    const ang = Math.atan2(cy, cx) + (rnd() - 0.5) * 1.4;
    m.userData = {
      alvo: new THREE.Vector3(cx * TAM, cy * TAM, 0),
      ang, raio: 3.6 + rnd() * 2.2, z: (rnd() - 0.5) * 4,
      giro: new THREE.Vector3((rnd() - 0.5) * 7, (rnd() - 0.5) * 7, (rnd() - 0.5) * 5),
      atraso: 0.15 + rnd() * 0.9,
    };
    item.add(m);
    fragmentos.push(m);
  }

  // pedras e cristais 3D sugados para o centro
  cena.add(new THREE.AmbientLight('#8fa6b5', 1.2));
  const sol = new THREE.DirectionalLight('#ffffff', 2);
  sol.position.set(-3, 4, 5);
  const luzCentro = new THREE.PointLight(cor, 0, 14, 1.5);
  cena.add(sol, luzCentro);
  const geoPedra = new THREE.DodecahedronGeometry(1, 0);
  const geoCristal = new THREE.OctahedronGeometry(1, 0).scale(0.45, 1.5, 0.45);
  const matPedra = new THREE.MeshStandardMaterial({ color: '#4a555c', roughness: 0.85, flatShading: true });
  const matCristal = new THREE.MeshStandardMaterial({ color: '#7dffd2', emissive: cor, emissiveIntensity: 0.7, roughness: 0.2, flatShading: true });
  const detritos = Array.from({ length: 34 }, (_, i) => {
    const m = new THREE.Mesh(i % 3 ? geoPedra : geoCristal, i % 3 ? matPedra : matCristal);
    m.userData = { ang: rnd() * 6.283, raio: 2.8 + rnd() * 2.6, y: (rnd() - 0.5) * 4, tam: 0.06 + rnd() * 0.12, atraso: rnd() * 2, vel: 0.8 + rnd() };
    cena.add(m);
    return m;
  });

  // partículas calculadas na GPU: modo 0 = energia entrando, 1 = explosão, 2 = brasas
  const uni = { uT: { value: -1 }, uEscala: { value: 1 }, cor: { value: corV }, uImpacto: { value: T.impacto } };
  function particulas(qtd, modo) {
    const semP = new Float32Array(qtd * 4);
    for (let i = 0; i < semP.length; i++) semP[i] = rnd();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(qtd * 3), 3));
    geo.setAttribute('s', new THREE.BufferAttribute(semP, 4));
    const p = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: uni, defines: { MODO: modo }, depthTest: false, ...aditivo,
      vertexShader: `uniform float uT,uEscala,uImpacto; attribute vec4 s; varying float vA;
      void main(){
        vec3 p=vec3(0.); float a=0., tam=.1; float ang=s.x*6.2832;
        #if MODO==0
          float f=fract(s.y+uT*(.35+s.z*.45)+uT*uT*.03);
          float r=(1.-f*f)*(3.+s.w*3.);
          float g=ang+f*3.5;
          p=vec3(cos(g)*r, sin(g)*r*.75+(s.z-.5)*(1.-f)*2., sin(g*1.7)*r*.3);
          a=smoothstep(0.,.25,f)*smoothstep(0.,.5,uT)*(1.-smoothstep(uImpacto-.35,uImpacto,uT));
          tam=.05+s.w*.11;
        #elif MODO==1
          float d=uT-uImpacto;
          float v=3.+s.y*s.y*11.; float z=(s.z-.5)*2.;
          float dist=v*(1.-exp(-d*2.6))/2.6;
          p=vec3(cos(ang)*dist, sin(ang)*dist-d*d*.9, z*dist*.5);
          a=step(0.,d)*max(0.,1.-d/(.7+s.w*1.2));
          tam=.07+s.w*.2;
        #else
          float f=fract(s.y+uT*(.08+s.z*.14));
          p=vec3((s.x-.5)*5.+sin(uT+s.w*20.)*.2, -2.4+f*5.2, (s.z-.5)*2.5);
          a=sin(f*3.1416)*smoothstep(uImpacto,uImpacto+1.,uT)*.8;
          tam=.04+s.w*.08;
        #endif
        vA=a; vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_PointSize=tam*uEscala/-mv.z; gl_Position=projectionMatrix*mv;
      }`,
      fragmentShader: `uniform vec3 cor; varying float vA;
      void main(){ float d=length(gl_PointCoord-.5)*2.; if(d>1.||vA<=0.) discard;
        float n=pow(1.-d,2.);
        gl_FragColor=vec4(mix(cor,vec3(1.),n*n), n*vA); }`,
    }));
    p.frustumCulled = false;
    p.renderOrder = 10;
    cena.add(p);
  }
  particulas(420, 0);
  particulas(380, 1);
  particulas(70, 2);

  // ondas de choque
  const ondas = [0, 0.14].map((atraso) => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.975, 1, 128),
      new THREE.MeshBasicMaterial({ color: cor, side: THREE.DoubleSide, depthTest: false, ...aditivo }),
    );
    m.userData.atraso = atraso;
    m.renderOrder = 11;
    cena.add(m);
    return m;
  });

  // cintilâncias sobre os cristais
  const cintilas = [[-0.1, 0.24], [0.2, 0.2], [0.17, -0.15], [-0.07, -0.02], [0.27, -0.12]].map(([x, y], i) => {
    const s = sprite(12);
    s.material.color.set('#eafff7');
    s.userData = { fase: i * 1.37 };
    s.position.set(x * TAM, y * TAM, 0.05);
    item.add(s);
    return s;
  });

  let distancia = 12;
  function redimensionar() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const meio = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    distancia = Math.max(3.9 / meio, 2.9 / (meio * camera.aspect)); // sempre cabe na tela
    uni.uEscala.value = (h * renderer.getPixelRatio()) / (2 * meio);
  }

  // Desenha o quadro do instante t (t < 0 = esperando)
  function quadro(t) {
    const ativo = t >= 0;
    const carga = faixa(t, T.carga, T.impacto);
    const d = t - T.impacto;
    const depois = d >= 0;
    const vida = ativo ? t : 0;
    uni.uT.value = t;

    // câmera: aproxima durante a carga e treme no impacto
    const tremor = depois ? 0.22 * Math.exp(-d * 6) : 0.05 * carga * carga;
    const zoom = 1 - 0.1 * suave(carga) * (depois ? Math.exp(-d * 4) : 1);
    camera.position.set(Math.sin(t * 91) * tremor, -0.25 + Math.cos(t * 77) * tremor, distancia * zoom);
    camera.lookAt(0, -0.75, 0);

    // fragmentos
    for (const m of fragmentos) {
      const u = m.userData;
      const chega = faixa(t, u.atraso, T.carga + (u.atraso - 1) * 0.4);
      const k = suave(chega) ** 1.5, falta = 1 - k;
      const a = u.ang + falta * 2.4;
      m.position.set(
        u.alvo.x + Math.cos(a) * u.raio * falta,
        u.alvo.y + Math.sin(a) * u.raio * falta * 0.75,
        u.z * Math.sin(falta * Math.PI * 0.5),
      );
      const folga = 1 + 0.07 * (1 - carga ** 3); // frestas fecham durante a carga
      if (chega >= 1) m.position.set(u.alvo.x * folga, u.alvo.y * folga, 0);
      else { m.position.x += u.alvo.x * 0.07 * k; m.position.y += u.alvo.y * 0.07 * k; }
      m.position.x += Math.sin(t * 63 + u.ang * 9) * 0.025 * carga;
      m.position.y += Math.cos(t * 57 + u.raio * 9) * 0.025 * carga;
      m.rotation.set(u.giro.x * falta, u.giro.y * falta, u.giro.z * falta);
      m.material.uniforms.uCalor.value = carga ** 1.6;
      m.material.uniforms.uAlpha.value = faixa(t, u.atraso - 0.15, u.atraso + 0.35);
      m.visible = ativo && !depois;
    }

    // item pronto
    const pop = depois ? 0.82 + 0.18 * saiBack(faixa(d, 0, 0.75)) : 1;
    const flutua = suave(faixa(d, 0.5, 1.8));
    item.scale.setScalar(pop);
    item.position.y = Math.sin((t - T.impacto) * 1.6) * 0.12 * flutua;
    item.rotation.y = Math.sin(d * 0.9) * 0.16 * flutua;
    item.rotation.z = Math.sin(d * 0.7) * 0.025 * flutua;
    inteiro.visible = aura.visible = depois;
    const ui = inteiro.material.uniforms;
    ui.uAlpha.value = 1;
    ui.uBranco.value = 1 - suave(faixa(d, 0.05, 0.85));
    ui.uPulso.value = 0.12 + 0.12 * Math.sin(t * 3);
    ui.uVarre.value = d < 0.9 ? -1 : -0.3 + (((d - 0.9) % 3.2) / 1.1) * 1.9;
    aura.material.uniforms.uAlpha.value = faixa(d, 0, 0.5) * (0.75 + 0.15 * Math.sin(t * 2.4));
    aura.material.uniforms.uTempo.value = t;

    for (const s of cintilas) {
      const p = Math.max(0, Math.sin(t * 2.2 + s.userData.fase * 2)) ** 14;
      s.scale.set(p * 0.9, p * 0.12, 1);
      s.visible = d > 0.8;
    }

    // detritos 3D
    for (const m of detritos) {
      const u = m.userData;
      const f = faixa(t, u.atraso, T.impacto - 0.1);
      const a = u.ang + vida * u.vel * 0.5 + f * f * 4;
      const r = u.raio * (1 - f ** 3);
      m.position.set(Math.cos(a) * r, u.y * (1 - f ** 2), Math.sin(a) * r * 0.6);
      m.rotation.set(vida * u.vel * 2, vida * u.vel, u.ang);
      m.scale.setScalar(u.tam * faixa(t, u.atraso * 0.5, u.atraso * 0.5 + 0.4) * (1 - f ** 4));
      m.visible = ativo && !depois;
    }

    // luzes e efeitos
    const entrada = faixa(t, 0, 0.8);
    circulo.rotation.z = vida * 0.35 + carga * carga * 3;
    circulo.material.opacity = !ativo ? 0.22 : depois ? 0.3 + 0.7 * Math.exp(-d * 2) : 0.22 + 0.4 * entrada + 0.38 * carga;
    circulo.scale.setScalar(depois ? 1 + 0.12 * Math.exp(-d * 4) : 0.92 + 0.08 * entrada);

    halo.scale.setScalar(depois ? 6.5 + 4 * Math.exp(-d * 3) : 1.5 + 5 * carga);
    halo.material.opacity = !ativo ? 0.07 : depois ? 0.2 + 0.6 * Math.exp(-d * 2.5) : 0.1 + 0.15 * entrada + 0.35 * carga;
    halo.position.z = -1;

    const antes = faixa(t, T.impacto - 0.18, T.impacto);
    const flash = depois ? Math.exp(-d * 6) : antes ** 3;
    clarao.scale.setScalar(2 + flash * 14);
    clarao.material.opacity = flash;
    clarao.visible = flash > 0.01;

    coluna.material.uniforms.uAlpha.value = depois ? 0.18 + 0.8 * Math.exp(-d * 2) : 0.55 * carga ** 2;
    luzCentro.intensity = ativo && !depois ? 4 + 30 * carga : 0;

    for (const o of ondas) {
      const f = faixa(d, o.userData.atraso, o.userData.atraso + 0.9);
      o.visible = f > 0 && f < 1;
      o.scale.setScalar(0.3 + saiCubic(f) * 6.5);
      o.material.opacity = (1 - f) ** 2;
    }

    renderer.render(cena, camera);
  }

  let t = -1, rodando = false, impactou = false, concluiu = false, resolver = null;
  const relogio = new THREE.Timer();

  function tocar() {
    t = 0; rodando = true; impactou = concluiu = false;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) t = T.fim;
    resolver?.();
    renderer.setAnimationLoop(animar);
    return new Promise((r) => { resolver = r; });
  }
  function reiniciar() { t = -1; rodando = false; resolver?.(); resolver = null; quadro(t); }
  function irPara(seg) { rodando = false; t = seg; quadro(t); }

  function animar(agora) {
    relogio.update(agora);
    const dt = Math.min(relogio.getDelta(), 0.05);
    if (rodando) {
      t += dt;
      if (!impactou && t >= T.impacto) { impactou = true; aoImpactar?.(); }
      if (!concluiu && t >= T.fim) {
        concluiu = true; resolver?.(); resolver = null; aoConcluir?.();
        if (!loop) { rodando = false; renderer.setAnimationLoop(null); }
      }
      if (loop && t >= T.fim + 3) tocar();
    }
    quadro(t);
  }

  renderer.setAnimationLoop(animar);

  const observador = new ResizeObserver(() => { redimensionar(); quadro(t); });
  observador.observe(container);
  redimensionar();
  if (autoplay) tocar();
  else renderer.setAnimationLoop(null);

  function destruir() {
    renderer.setAnimationLoop(null);
    observador.disconnect();
    cena.traverse((o) => {
      o.geometry?.dispose();
      o.material?.map?.dispose();
      o.material?.dispose();
    });
    tex.dispose(); brilhoTex.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    resolver?.();
  }

  return { tocar, reiniciar, irPara, destruir, tempos: { ...T } };
}
