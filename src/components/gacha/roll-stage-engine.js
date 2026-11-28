/**
 * RollStage — animação de giro do gacha (Three.js)
 *
 * Fluxo:  press → invocation → (waiting) → tease → (title) → impact → reveal → showcase
 *
 * Uso:
 *   import { RollStage } from './rollStage.js';
 *   const stage = new RollStage({ config: { teaseMode: 'climb' } });
 *   await stage.play(fetchPull());        // Promise<Pull> ou Pull direto
 *
 * Pull: { id, rarity, name, points, image, foil, condition, isNew, isDuplicate }
 *
 * Toda a animação é função pura do tempo (invocação: t absoluto; resultado: rt relativo),
 * por isso "pausar esperando a API" e "pular para o final" são triviais e determinísticos.
 * Unidades da cena: 1 unidade = 1 px CSS (câmera a 1000px, como `perspective: 1000px`).
 */
import * as THREE from "three";
import { DEFAULT_ROLL_ANIM_CONFIG as DEFAULT_CONFIG } from "@/lib/roll-anim-config";

/* ───────────────────────── dados por raridade ───────────────────────── */
export const TIERS = ['COMUM', 'INCOMUM', 'RARA', 'EPICA', 'LENDARIA', 'MITICA', 'GALACTICA'];
export const TIER_LABEL = {
  COMUM: 'COMUM', INCOMUM: 'INCOMUM', RARA: 'RARA', EPICA: 'ÉPICA',
  LENDARIA: 'LENDÁRIA', MITICA: 'MÍTICA', GALACTICA: 'GALÁCTICA',
};
export const TIER_COLOR = ['#38E8DA', '#34D399', '#38BDF8', '#A78BFA', '#FCD34D', '#FB7185', '#C084FC'];
const TEASE_DURATION = [0.6, 0.72, 0.9, 1.15, 1.5, 1.8, 1.8];
const TIER_PARTICLES = [20, 34, 52, 80, 120, 150, 180];
const TIER_FLASH = [0.45, 0.5, 0.6, 0.8, 1, 1, 1];
const TIER_TREMBLE = [0, 0, 1, 2, 3, 3, 3];
const TIER_SHAKE = [0, 0, 3, 5, 8, 8, 8];
const TIER_HOLO = [0, 0, 0.22, 0.42, 0.55, 0.55, 0.6];
const FOILS = ['NORMAL', 'GOLD', 'INK', 'PRISM', 'HOLO'];



export const DEFAULT_LABELS = {
  dialog: 'Invocação',
  eyebrow: 'ANIMESICE / SINAL DE INVOCAÇÃO',
  summoning: 'Invocando sua carta…',
  waiting: 'Aguardando o resultado…',
  revealed: 'Carta revelada',
  skip: 'Pular',
  next: 'Continuar',
  isNew: 'NOVA',
  isDupe: 'REPETIDA',
  pts: 'pts',
  sound: 'Som',
  rarity: 'raridade',
};

const SOUND_KEY = 'animesice:roll-sound';

/* ───────────────────────── utilidades ───────────────────────── */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut2 = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeIn2 = (t) => t * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const easeOutElastic = (t) =>
  t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cor com o valor do hex preservado (sem conversão sRGB→linear): bate com o CSS. */
const col = (hex) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);
const hexOf = (c) => '#' + c.getHexString(THREE.LinearSRGBColorSpace);

export function normalizeRarity(r) {
  if (typeof r === 'number') return clamp(Math.round(r), 0, 6);
  const s = String(r || 'COMUM').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const i = TIERS.indexOf(s);
  return i < 0 ? 0 : i;
}

function normalizeConfig(user = {}) {
  const c = { ...DEFAULT_CONFIG, ...user };
  if (typeof c.particleReach === 'string') {
    try { c.particleReach = JSON.parse(c.particleReach); } catch { c.particleReach = DEFAULT_CONFIG.particleReach; }
  }
  c.particleReach = { ...DEFAULT_CONFIG.particleReach, ...(c.particleReach || {}) };
  if (typeof c.particleGalaxy === 'string') c.particleGalaxy = c.particleGalaxy.split(',').map((s) => s.trim()).filter(Boolean);
  if (!Array.isArray(c.particleGalaxy) || !c.particleGalaxy.length) c.particleGalaxy = DEFAULT_CONFIG.particleGalaxy;
  for (const k of Object.keys(DEFAULT_CONFIG)) {
    if (typeof DEFAULT_CONFIG[k] === 'number') c[k] = Number.isFinite(+c[k]) ? +c[k] : DEFAULT_CONFIG[k];
  }
  return c;
}

/* ───────────────────────── plano de tempo (resultado) ─────────────────────────
 * Tudo relativo ao início da timeline de resultado (= invocationEnd no relógio absoluto). */
function buildSteps(mode, real, lock, cfg, rnd) {
  const steps = [];
  const climbTo = (top, window, startT = 0) => {
    // degraus de COMUM até `top-1` em [startT, startT+window), razão geométrica 1.34
    const w = [];
    for (let i = 0; i < top; i++) w.push(Math.pow(1.34, i));
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    let t = startT;
    for (let i = 0; i < top; i++) {
      steps.push({ t, tier: i, peak: 0.7 + 0.3 * (i / Math.max(1, real)) });
      t += (window * w[i]) / sum;
    }
  };
  if (real === 0) return [{ t: 0, tier: 0, peak: 0.85 }];

  if (mode === 'fake-drop' && real < 6) {
    const decoy = real + 1;
    const rise = lock * (1 - clamp(cfg.fakeDropFreeze, 0, 0.45));
    climbTo(decoy, rise);
    steps.push({ t: rise, tier: decoy, peak: 1, freeze: true });
    steps.push({ t: lock, tier: real, peak: 1 });
    return steps;
  }
  if (mode === 'random' || mode === 'ordered') {
    const stops = [0];
    let t = 0, step = 0.36;
    for (;;) {
      t += step; step *= 1.28;
      if (t > lock - 0.2) break;
      stops.push(t);
    }
    let prev = -1;
    stops.forEach((st, k) => {
      let tier;
      if (mode === 'ordered') {
        tier = prev < 0 ? 0 : (prev + 2) % 7;
        if (tier === prev) tier = (tier + 1) % 7;
        if (k === stops.length - 1 && tier === real) tier = (tier + 1) % 7;
      } else {
        const cand = [];
        for (let i = 0; i < 7; i++) if (i !== prev && (prev < 0 || i >= prev - cfg.maxDrop)) cand.push(i);
        tier = cand[Math.floor(rnd() * cand.length)];
      }
      prev = tier;
      steps.push({ t: st, tier, peak: 0.7 + 0.3 * (tier / 6) });
    });
    if (prev !== real) steps.push({ t: lock, tier: real, peak: 1 });
    else steps[steps.length - 1].peak = 1;
    return steps;
  }
  // climb (padrão): só sobe, nunca desce
  climbTo(real, lock);
  steps.push({ t: lock, tier: real, peak: 1 });
  return steps;
}

function buildPlan(pull, cfg, nameLen) {
  const tier = pull.tier;
  const compact = pull.compact;
  const high = tier >= 4 && !compact; // LENDÁRIA+
  const teaseDur = compact ? 0.3 : TEASE_DURATION[tier];
  const titleHold = high ? 0.65 : 0;
  const impactAt = teaseDur + titleHold;
  const impactDur = compact ? 0.18 : clamp(cfg.crystalOutDuration, 0.2, 0.32);
  const revealAt = impactAt + impactDur;
  const flipDur = clamp(cfg.flipDuration, compact ? 0.35 : 0.4, 1);
  const cardRevealedAt = revealAt + flipDur;
  const cardArtReadyAt = cardRevealedAt + 0.16;
  const cardDetailsAt = cardArtReadyAt + 0.24;
  // lock: instante em que a cor real é travada (compacto não faz tease: já nasce na cor real)
  const lock = compact ? 0 : Math.max(0.3, teaseDur - 0.35);
  const waves = compact ? 1 : tier >= 4 ? 3 : tier >= 2 ? 2 : 1;
  const rings = Math.min(waves, Math.max(0, Math.round(cfg.ringSlots)));
  const particleDur = Math.max(0.45, cfg.particleDuration);
  const nameDur = 0.3 + Math.min(nameLen, 24) * 0.02;
  const tagAt = cardDetailsAt + 0.12;
  const detailsEnd = Math.max(cardDetailsAt + nameDur, tagAt + 0.45);
  const continueAt = Math.max(cardRevealedAt + Math.max(0.18, cfg.effectsGap), detailsEnd);
  const sweepStart = cardRevealedAt;
  const sweepEnd = sweepStart + cfg.sweepDuration;
  const burstEnd = impactAt + 0.1 + particleDur;
  const ringsEnd = impactAt + Math.max(0, rings - 1) * cfg.ringStagger + cfg.ringDuration;
  const raysEnd = high ? revealAt + 0.95 : tier >= 3 && !compact ? impactAt + 0.7 : 0;
  const shardsEnd = tier === 5 && !compact ? impactAt + 0.9 : 0;
  const effectsEnd = Math.max(continueAt, burstEnd, ringsEnd, revealAt + 0.4, sweepEnd, raysEnd, shardsEnd, impactAt + 0.55);
  const rnd = mulberry32(fnv1a('tease:' + pull.id));
  const mode = compact ? 'climb' : cfg.teaseMode;
  const steps = buildSteps(mode, tier, lock, cfg, rnd);
  return {
    tier, compact, high, hasTitle: high, mythic: tier === 5 && !compact, galactic: tier === 6,
    teaseDur, titleHold, impactAt, impactDur, revealAt, flipDur, cardRevealedAt, cardArtReadyAt,
    cardDetailsAt, lock, waves, rings, particleDur, nameDur, tagAt, detailsEnd, continueAt,
    sweepStart, sweepEnd, burstEnd, ringsEnd, raysEnd, shardsEnd, effectsEnd, steps,
    flash: compact ? TIER_FLASH[tier] * 0.5 : TIER_FLASH[tier],
    tremble: compact ? 0 : TIER_TREMBLE[tier],
    shake: compact ? 0 : TIER_SHAKE[tier],
    holo: TIER_HOLO[tier],
    radialRays: tier >= 3 && !compact,
    epic: tier >= 3 && !compact,
    rough: tier >= 2 && !compact,
  };
}

/* ───────────────────────── áudio sintetizado ───────────────────────── */
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.off = 0; // deslocamento de tempo (usado só em renderização offline)
    this.on = true;
    try { this.on = localStorage.getItem(SOUND_KEY) !== 'off'; } catch { /* ignore */ }
  }
  dispose() {
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
  }
  setOn(v) {
    this.on = v;
    try { localStorage.setItem(SOUND_KEY, v ? 'on' : 'off'); } catch { /* ignore */ }
    if (this.master) this.master.gain.value = v ? 0.8 : 0;
  }
  /** Deve ser chamado dentro de um gesto do usuário (clique). Nunca toca sozinho. */
  ensure() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this._init(new AC());
      }
      if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume().catch(() => {});
    } catch { this.ctx = null; }
  }
  /**
   * Estilo "orquestra de fantasia": harpa, glockenspiel, cordas, coro, tímpano e prato.
   * Cadeia: vozes → bus ─┬─ dry ───────────────┐
   *                      └─ send → hall (IR) ──┴→ master → compressor → saída
   */
  _init(ctx) {
    this.ctx = ctx;
    const sr = ctx.sampleRate;
    this.master = ctx.createGain();
    this.master.gain.value = this.on ? 0.8 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.22;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    // reverb de "sala de concerto": cauda longa e macia, graves limpos
    const len = Math.floor(sr * 3.2), ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        lp += ((Math.random() * 2 - 1) - lp) * (0.1 + 0.75 * Math.pow(1 - t, 2));
        d[i] = lp * Math.pow(1 - t, 3.0) * (i < sr * 0.02 ? i / (sr * 0.02) : 1);
      }
    }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    const send = ctx.createGain(); send.gain.value = 0.4;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 200;
    this.bus.connect(send); send.connect(hp); hp.connect(conv); conv.connect(this.master);
    this.noise = ctx.createBuffer(1, sr * 2, sr);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }
  get ok() { return this.ctx && this.on && this.ctx.state !== 'closed'; }
  _now() { return this.ctx.currentTime + this.off + 0.02; }

  /* ── notas ── */
  /** n-ésima nota da escala pentatônica maior de Dó, n=0 → C4 (60). */
  _pn(n, base = 60) {
    const o = Math.floor(n / 5), d = [0, 2, 4, 7, 9][((n % 5) + 5) % 5];
    return 440 * Math.pow(2, (base + 12 * o + d - 69) / 12);
  }
  /** n-ésima nota de Dó lídio (com o #4 "mágico"), n=0 → C5. */
  _lyd(n) {
    const o = Math.floor(n / 7), d = [0, 2, 4, 6, 7, 9, 11][((n % 7) + 7) % 7];
    return 523.25 * Math.pow(2, (12 * o + d) / 12);
  }

  /* ── blocos de construção ── */
  _gain(t0, a, peak, dur, dest) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + Math.max(0.002, a));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(dest || this.bus);
    return g;
  }
  _pan(p, dest) {
    if (!this.ctx.createStereoPanner) return dest || this.bus;
    const n = this.ctx.createStereoPanner(); n.pan.value = p; n.connect(dest || this.bus); return n;
  }
  _osc(type, f0, f1, t0, dur, peak, a = 0.01, opts = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + (opts.sweep || dur));
    if (opts.detune) o.detune.value = opts.detune;
    let dest = this._pan(opts.pan || 0);
    if (opts.hp) {
      const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = opts.hp;
      f.connect(dest); dest = f;
    }
    if (opts.lp) {
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(opts.lp[0], t0);
      f.frequency.exponentialRampToValueAtTime(opts.lp[1], t0 + dur);
      f.connect(dest); dest = f;
    }
    if (opts.vib) { // vibrato (cordas/coro)
      const l = this.ctx.createOscillator(), lg = this.ctx.createGain();
      l.frequency.value = opts.vib[0]; lg.gain.value = opts.vib[1];
      l.connect(lg); lg.connect(o.detune); l.start(t0); l.stop(t0 + dur + 0.05);
    }
    const g = this._gain(t0, a, peak, dur, dest);
    o.connect(g); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  _noise(filt, f0, f1, q, t0, dur, peak, a = 0.02, pan = 0) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
    s.buffer = this.noise; s.loop = true;
    f.type = filt; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = this._gain(t0, a, peak, dur, this._pan(pan));
    s.connect(f); f.connect(g); s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
  }
  /** Glockenspiel/celesta: sino FM brilhante e cristalino. */
  _bell(f, t0, dur, peak, pan = 0, bright = 1) {
    const c = this.ctx.createOscillator(), m = this.ctx.createOscillator(), mg = this.ctx.createGain();
    c.type = 'sine'; m.type = 'sine';
    c.frequency.value = f; m.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.6 * bright, t0);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, f * 0.02), t0 + dur * 0.55);
    m.connect(mg); mg.connect(c.frequency);
    const g = this._gain(t0, 0.004, peak, dur, this._pan(pan));
    c.connect(g);
    const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.001;
    const g2 = this._gain(t0, 0.003, peak * 0.22, dur * 0.5, this._pan(pan));
    o2.connect(g2);
    [c, m, o2].forEach((n) => { n.start(t0); n.stop(t0 + dur + 0.05); });
  }
  /** Harpa: fundamental + harmônicos que morrem mais rápido + estalo da palheta. */
  _harp(f, t0, dur, peak, pan = 0) {
    this._osc('sine', f, f, t0, dur, peak, 0.003, { pan });
    this._osc('sine', f * 2, f * 2, t0, dur * 0.55, peak * 0.38, 0.003, { pan });
    this._osc('triangle', f * 3, f * 3, t0, dur * 0.3, peak * 0.14, 0.002, { pan });
    this._noise('bandpass', Math.min(f * 5, 9000), Math.min(f * 3, 6000), 2, t0, 0.03, peak * 0.5, 0.001, pan);
  }
  /** Cordas: serras desafinadas, vibrato e passa-baixa que abre (crescendo). */
  _pad(f, t0, dur, peak, a, lp0, lp1) {
    [-9, 0, 9].forEach((det, i) => this._osc('sawtooth', f, f, t0, dur, peak / 3, a, { detune: det, lp: [lp0, lp1], pan: (i - 1) * 0.35, vib: [5.2 + i * 0.3, 7] }));
  }
  /** Coro: serras filtradas por formantes de vogal ("ah", "oh", "oo"), com swell longo. */
  _choir(f, t0, dur, peak, vowel = 'ah', pan = 0) {
    const V = {
      ah: [[800, 1, 9], [1150, 0.5, 10], [2900, 0.16, 12]],
      oh: [[450, 1, 8], [800, 0.45, 9], [2830, 0.1, 12]],
      oo: [[325, 1, 8], [700, 0.4, 9], [2530, 0.08, 12]],
    }[vowel];
    const mix = this.ctx.createGain();
    const env = this._gain(t0, dur * 0.45, peak, dur, this._pan(pan));
    V.forEach(([fc, gn, q]) => {
      const bp = this.ctx.createBiquadFilter(), gg = this.ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = q; gg.gain.value = gn * 3;
      mix.connect(bp); bp.connect(gg); gg.connect(env);
    });
    [-12, 0, 12].forEach((det, i) => {
      const o = this.ctx.createOscillator(), l = this.ctx.createOscillator(), lg = this.ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      l.frequency.value = 5 + i * 0.4; lg.gain.value = 9; l.connect(lg); lg.connect(o.detune);
      o.connect(mix);
      [o, l].forEach((n) => { n.start(t0); n.stop(t0 + dur + 0.05); });
    });
  }
  /** Tímpano: pancada com queda de tom + corpo + pele. */
  _timp(t0, peak, f = 65.41) {
    this._osc('sine', f * 1.6, f, t0, 1.1, peak, 0.003, { sweep: 0.09 });
    this._osc('sine', f * 2, f * 2, t0, 0.35, peak * 0.35, 0.003);
    this._noise('lowpass', 900, 120, 0.8, t0, 0.25, peak * 0.5, 0.002);
  }
  /** Prato: ruído agudo + osciladores quadrados inarmônicos filtrados (metal). */
  _crash(t0, peak, dur) {
    this._noise('highpass', 6000, 2800, 0.5, t0, dur, peak, 0.002);
    this._noise('bandpass', 9000, 5000, 1.2, t0, dur * 0.7, peak * 0.6, 0.002);
    [263.6, 365.2, 415.3, 540.4, 799.2, 1109].forEach((f, i) => this._osc('square', f, f, t0, dur * 0.6, peak * 0.12, 0.002, { hp: 6500, pan: i % 2 ? 0.3 : -0.3 }));
  }

  /* ── eventos ── */
  /** Estrela cadente: whoosh + swell de prato + cordas crescendo + rufar de tímpano + glissando de harpa. */
  charge(dur = 1.05) {
    if (!this.ok) return;
    const t = this._now();
    this._noise('highpass', 1500, 8500, 0.8, t, dur, 0.07, dur * 0.9);
    this._noise('bandpass', 700, 5500, 1.4, t, dur * 0.9, 0.06, dur * 0.5, -0.2);
    [130.81, 196, 329.63].forEach((f) => this._pad(f, t, dur + 0.15, 0.075, dur * 0.85, 380, 3600));
    this._osc('sine', 65.41, 98, t, dur + 0.1, 0.16, dur * 0.8);
    const N = 7;
    for (let i = 0; i < N; i++) this._timp(t + dur * (1 - Math.pow(1 - i / N, 1.8)), 0.07 + 0.1 * (i / N));
    const G = 9;
    for (let i = 0; i < G; i++) this._harp(this._pn(i), t + dur * (0.1 + 0.8 * (i / G)), 1.2, 0.035 + 0.03 * (i / G), Math.sin(i * 1.4) * 0.4);
    for (let i = 0; i < 3; i++) this._bell(2093 * (1 + i * 0.25), t + dur * (0.5 + Math.random() * 0.5), 0.6, 0.014, Math.random() * 2 - 1, 1.2);
  }
  /** Degrau do tease: pluck de harpa + glockenspiel numa escala pentatônica ascendente. */
  tick(power = 0) {
    if (!this.ok) return;
    const i = Math.max(0, Math.min(6, Math.round(power * 6)));
    const t = this._now(), f = this._pn(5 + i), pan = (i % 2 ? 1 : -1) * 0.2;
    this._harp(f, t, 1.0, 0.09, pan);
    this._bell(f * 2, t + 0.004, 0.7, 0.035 + 0.015 * power, -pan, 1.1);
    if (power >= 0.5) this._harp(f / 2, t, 0.9, 0.06, 0);
  }
  /** Título (LENDÁRIA+): coro + cordas graves + tímpano — o momento "épico". */
  title(power = 0.7) {
    if (!this.ok) return;
    const t = this._now();
    this._osc('sine', 82, 41, t, 1.3, 0.34, 0.008);
    this._timp(t, 0.3);
    [196, 261.63, 329.63, 392].forEach((f, i) => this._choir(f, t, 1.5, 0.075 + 0.02 * power, 'ah', (i - 1.5) * 0.25));
    this._pad(98, t, 1.4, 0.1, 0.1, 500, 1800);
    this._crash(t, 0.04, 1.2);
  }
  /** Passagem de ar durante o flip da carta. */
  whoosh() {
    if (!this.ok) return;
    const t = this._now();
    this._noise('bandpass', 500, 4200, 1.1, t, 0.42, 0.09, 0.15, -0.3);
    this._noise('bandpass', 4200, 800, 1.1, t + 0.18, 0.3, 0.05, 0.08, 0.3);
  }
  /** Estouro: tímpano + prato + glissando de harpa; cordas e coro entram conforme a raridade. */
  impact(power = 0) {
    if (!this.ok) return;
    const t = this._now(), p = power;
    this._osc('sine', 110, 32, t, 1.1, 0.5 * (0.45 + 0.65 * p), 0.004, { sweep: 0.5 });
    this._timp(t, 0.28 + 0.3 * p);
    this._noise('lowpass', 3000, 150, 0.7, t, 0.6, 0.18 + 0.28 * p, 0.003);
    this._noise('highpass', 3500, 9000, 0.6, t, 0.1, 0.12 + 0.12 * p, 0.002);
    this._crash(t + 0.005, 0.045 + 0.13 * p, 1.1 + 1.2 * p);
    const n = 4 + Math.round(p * 10);
    for (let i = 0; i < n; i++) this._harp(this._pn(5 + i), t + 0.02 + i * (0.05 - 0.02 * p), 1.2, (0.05 + 0.03 * (i / n)) * (0.6 + 0.6 * p), Math.sin(i * 1.3) * 0.4);
    if (p >= 0.45) [130.81, 196, 261.63, 329.63].forEach((f) => this._pad(f, t, 1.8, 0.08, 0.05, 700, 3000));
    if (p >= 0.75) {
      [196, 261.63, 329.63, 392].forEach((f, i) => this._choir(f, t, 2.4, 0.09, 'ah', (i - 1.5) * 0.25));
      this._osc('sine', 73.42, 73.42, t, 1.9, 0.18, 0.02);
    }
  }
  /** Revelação: arpejo de harpa + glockenspiel sobre colchão de cordas; coro nas raridades altas. */
  chime(power = 0) {
    if (!this.ok) return;
    const t = this._now(), p = power;
    const n = 4 + Math.floor(p * 5);
    for (let i = 0; i < n; i++) {
      const at = t + i * 0.065;
      this._harp(this._pn(5 + i), at, 1.6 + p, 0.075 - 0.004 * i, (i - n / 2) * 0.1);
      this._bell(this._pn(5 + i) * 2, at + 0.005, 1.3, 0.03 + 0.015 * p, (n / 2 - i) * 0.1, 1 + 0.3 * p);
    }
    [261.63, 329.63, 392, 587.33].forEach((f) => this._pad(f, t, 2.2 + p, 0.06 + 0.03 * p, 0.3, 800, 3200));
    if (p >= 0.5) [392, 523.25, 659.25].forEach((f, i) => this._choir(f, t, 2.4, 0.06, 'oh', (i - 1) * 0.3));
    this._bell(130.81, t, 1.8, 0.07, 0, 0.6);
    if (p > 0.3) for (let i = 0; i < Math.round(p * 6); i++) this._bell(2093 * (1 + (i % 3) * 0.25), t + 0.25 + Math.random() * 0.7, 0.5, 0.02, Math.random() * 2 - 1, 1.2);
  }
  /** GALÁCTICA: arpejo lídio ascendente (o #4 dá o tom "mágico"), coro e chuva de estrelas. */
  galacticChime() {
    if (!this.ok) return;
    const t = this._now();
    for (let i = 0; i < 12; i++) {
      const at = t + 0.04 + i * 0.07;
      this._harp(this._lyd(i), at, 1.8, 0.07, Math.sin(i * 1.1) * 0.5);
      this._bell(this._lyd(i) * 2, at + 0.005, 1.5, 0.032, Math.cos(i * 1.1) * 0.5, 1.2);
    }
    [130.81, 196, 261.63, 392, 493.88, 739.99].forEach((f) => this._pad(f, t, 3.4, 0.085, 0.5, 900, 4000));
    [196, 261.63, 329.63, 392, 493.88].forEach((f, i) => this._choir(f, t, 3.6, 0.1, 'ah', (i - 2) * 0.25));
    this._osc('sine', 65.41, 65.41, t, 3, 0.2, 0.25);
    this._crash(t, 0.06, 2.4);
    this._noise('bandpass', 1200, 9500, 1.5, t, 1.0, 0.05, 0.5);
    for (let i = 0; i < 8; i++) this._bell(2637 * (1 + (i % 4) * 0.19), t + 0.3 + Math.random() * 1.4, 0.7, 0.02, Math.random() * 2 - 1, 1.3);
  }
  /** Carta repetida: duas notas de harpa descendentes, discretas. */
  dupe() {
    if (!this.ok) return;
    const t = this._now();
    this._harp(392, t, 0.7, 0.06);
    this._harp(293.66, t + 0.12, 0.8, 0.06);
    this._osc('sine', 150, 90, t, 0.14, 0.12, 0.004);
  }
  /** Botão "Continuar" liberado: brilho de glockenspiel. */
  ready() {
    if (!this.ok) return;
    this._bell(1318.5, this._now(), 0.35, 0.03, 0, 0.7);
  }
}

/* ───────────────────────── shaders ───────────────────────── */
const QUAD_VS = /* glsl */ `
uniform vec2 uRes; uniform vec2 uOff;
varying vec2 vP; varying vec2 vUv;
void main(){ vUv=position.xy*.5+.5; vP=position.xy*.5*uRes-uOff; gl_Position=vec4(position.xy,0.,1.); }`;

const BG_FS = /* glsl */ `
varying vec2 vP; uniform float uAlpha;
void main(){ float r=length(vP)/max(900.,1.); vec3 c=mix(vec3(.028,.055,.085),vec3(.008,.016,.03),smoothstep(0.,1.,r)); gl_FragColor=vec4(c,1.); }`;

const TINT_FS = /* glsl */ `
varying vec2 vP; uniform vec3 uColor; uniform float uAlpha; uniform vec2 uRes;
void main(){ float r=length(vP)/(max(uRes.x,uRes.y)*.62); float a=pow(1.-smoothstep(0.,1.,r),1.6)*uAlpha; gl_FragColor=vec4(uColor,a); }`;

const FLASH_FS = /* glsl */ `
varying vec2 vP; uniform float uAlpha; uniform vec2 uRes;
void main(){ float r=length(vP)/(max(uRes.x,uRes.y)*.7); float a=uAlpha*(.7+.3*(1.-smoothstep(0.,1.,r))); gl_FragColor=vec4(vec3(1.),a); }`;

const RAYS_FS = /* glsl */ `
varying vec2 vP; uniform vec3 uColor; uniform float uAlpha,uRot,uCount,uWidth,uSoft,uReach;
void main(){
  float r=length(vP); float a=atan(vP.y,vP.x)+uRot;
  float v=.5+.5*cos(a*uCount);
  float ray=smoothstep(1.-uWidth-uSoft,1.-uWidth+.0001,v);
  float fall=smoothstep(60.,300.,r)*(1.-.6*smoothstep(0.,uReach,r));
  gl_FragColor=vec4(uColor,ray*fall*uAlpha);
}`;

const CARD_VS = /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

const BACK_FS = /* glsl */ `
varying vec2 vUv; uniform vec3 uColor; uniform float uOpacity,uEnergy;
float ln(float d,float w){ return 1.-smoothstep(0.,w,abs(d)); }
void main(){
  vec2 p=(vUv-.5)*vec2(1.,1.3333);
  float px=max(fwidth(p.x),1e-4)*1.1;
  float colm=exp(-pow(p.x/.26,2.));
  vec3 c=mix(vec3(.052,.07,.09),vec3(.15,.185,.21),colm*.85);
  c*=.8+.2*(1.-smoothstep(0.,.75,abs(p.y)));
  float l=0.;
  l=max(l,ln(p.y,px)*.55);
  l=max(l,ln(p.x,px)*step(abs(p.y),.5)*.55*(1.-smoothstep(.3,.5,abs(p.y))));
  float rr=length(p);
  l=max(l,ln((p.x-p.y)*.7071,px)*(1.-smoothstep(.3,.52,rr))*.5);
  l=max(l,ln((p.x+p.y)*.7071,px)*(1.-smoothstep(.3,.52,rr))*.5);
  float ang=atan(p.y,p.x);
  float dash=step(.5,fract(ang*28./6.2832));
  l=max(l,ln(rr-.34,px)*dash*.5);
  c+=uColor*l*(.55+uEnergy*.75);
  float bd=min(min(p.x+.5,.5-p.x),min(p.y+.6667,.6667-p.y));
  float border=1.-smoothstep(0.,px*1.8,bd);
  c=mix(c,uColor*(.7+uEnergy*.4),border*.85);
  gl_FragColor=vec4(c,uOpacity);
}`;

const FRONT_FS = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uMap; uniform vec3 uColor; uniform float uExposure,uHolo,uSweep,uSweepAmt,uRainbow,uFoilAmt,uTime;
uniform vec2 uTilt; uniform int uFoil;
vec3 hue(float h){ vec3 k=vec3(1.,2./3.,1./3.); vec3 p=abs(fract(vec3(h)+k)*6.-3.); return clamp(p-1.,0.,1.); }
void main(){
  vec3 c=texture2D(uMap,vUv).rgb;
  float lum=dot(c,vec3(.299,.587,.114));
  c*=uExposure;
  vec2 q=vUv-.5;
  float g=dot(q,vec2(.8,.6))*2.2+uTilt.x*.9+uTilt.y*.6+uTime*.04;
  // holo (color-dodge aproximado)
  vec3 rb=mix(vec3(1.),uColor,.5)*(.6+.4*sin(g*12.566));
  vec3 dodge=min(c/(1.-clamp(rb*uHolo*.9,0.,.8)),vec3(1.));
  c=mix(c,dodge,clamp(uHolo*1.2,0.,1.));
  if(uFoil==1){
    float gl=.5+.5*sin((q.x+q.y)*7.+uTilt.x*3.+uTime*.5);
    c=mix(c,c*vec3(1.22,1.04,.7)+vec3(.2,.13,0.)*gl,.55*uFoilAmt);
  } else if(uFoil==2){
    c=mix(c,vec3(lum)*vec3(.72,.84,1.1),.4*uFoilAmt); c*=.92;
    c+=vec3(.05,.08,.12)*smoothstep(.2,1.,.5+.5*sin((q.x-q.y)*9.+uTilt.x*4.))*uFoilAmt;
  } else if(uFoil==3){
    float st=(q.x*.9+q.y*.6)*6.+uTilt.x*2.;
    vec3 pr=mix(vec3(1.),uColor,.4);
    c=c*(1.-.08*uFoilAmt)+pr*.16*uFoilAmt*(.3+.7*smoothstep(0.,1.,fract(st)));
  } else if(uFoil==4){
    c=mix(c,min(c/(1.-clamp(mix(vec3(1.),uColor,.5)*(.15+.1*sin(g*9.))*uFoilAmt,0.,.9)),vec3(1.)),.6*uFoilAmt);
  }
  // sweep (faixa diagonal)
  float a=dot(q,vec2(.8,.6));
  float d=a-mix(-.75,.75,uSweep);
  float band=exp(-pow(d/.09,2.))+.25*exp(-pow((d+.16)/.2,2.));
  vec3 sw=mix(vec3(1.),uColor,.35);
  c+=sw*band*uSweepAmt;
  // moldura
  float px=max(fwidth(q.x),1e-4);
  float bd=min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)*.75);
  float fr=1.-smoothstep(.011,.011+px*1.2,bd);
  float inner=(1.-smoothstep(.011,.04,bd))*.28;
  c=mix(c,uColor*1.05,fr);
  c+=uColor*inner;
  gl_FragColor=vec4(c,1.);
}`;

const PTS_VS = /* glsl */ `
attribute float aSize; attribute vec4 aColor; uniform float uPx; varying vec4 vC;
void main(){ vC=aColor; gl_PointSize=aSize*uPx; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const PTS_FS = /* glsl */ `varying vec4 vC; void main(){ gl_FragColor=vec4(vC.rgb,vC.a); }`;
const LINE_VS = /* glsl */ `
attribute vec4 aColor; varying vec4 vC;
void main(){ vC=aColor; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

/* ───────────────────────── texturas auxiliares ───────────────────────── */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}
const glowRectTex = () =>
  canvasTex(512, 640, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.shadowColor = '#fff';
    g.shadowBlur = 90;
    g.fillStyle = '#fff';
    for (let i = 0; i < 2; i++) g.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4);
  });
const radialTex = () =>
  canvasTex(256, 256, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.35, 'rgba(255,255,255,.35)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
const runeTex = () =>
  canvasTex(64, 64, (g, w, h) => {
    g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.strokeRect(10, 10, 44, 44);
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(21, 21); g.lineTo(43, 43); g.moveTo(43, 21); g.lineTo(21, 43); g.stroke();
  });

function loadImage(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('imagem não carregou'));
    im.src = url;
  });
}

/** Arte de reserva (sem imagem / sem CORS): gradiente da raridade + silhueta. */
export function placeholderArt(tier, label = '') {
  const c = document.createElement('canvas');
  c.width = 768; c.height = 1024;
  const g = c.getContext('2d');
  const base = TIER_COLOR[tier];
  const gr = g.createLinearGradient(0, 0, 768, 1024);
  gr.addColorStop(0, '#0b1420'); gr.addColorStop(0.5, base + '55'); gr.addColorStop(1, '#101827');
  g.fillStyle = gr; g.fillRect(0, 0, 768, 1024);
  const rg = g.createRadialGradient(384, 420, 20, 384, 420, 420);
  rg.addColorStop(0, base + 'aa'); rg.addColorStop(1, 'transparent');
  g.fillStyle = rg; g.fillRect(0, 0, 768, 1024);
  g.fillStyle = 'rgba(255,255,255,.88)';
  g.beginPath(); g.arc(384, 400, 150, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(384, 900, 300, 330, 0, Math.PI, 0); g.fill();
  g.fillStyle = base;
  g.beginPath(); g.arc(330, 410, 22, 0, 7); g.arc(438, 410, 22, 0, 7); g.fill();
  g.font = '700 54px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffffffcc';
  g.fillText(label.slice(0, 18), 384, 980);
  return c;
}

function drawCover(ctx, img, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
}

function badgesTex(info) {
  return canvasTex(768, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const pill = (text, x, y, align, color) => {
      g.font = '700 26px ui-monospace, Menlo, Consolas, monospace';
      const tw = g.measureText(text).width + 30;
      const bx = align === 'right' ? x - tw : x;
      g.fillStyle = 'rgba(4,8,14,.82)';
      g.fillRect(bx, y, tw, 42);
      g.strokeStyle = color; g.globalAlpha = 0.6; g.lineWidth = 2; g.strokeRect(bx, y, tw, 42); g.globalAlpha = 1;
      g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText(text, bx + 15, y + 22);
    };
    pill(info.rarity, 26, 26, 'left', info.color);
    if (info.foil && info.foil !== 'NORMAL') pill(info.foil, w - 26, 26, 'right', '#e8f4ff');
    if (info.condition) pill('✕ ' + String(info.condition).toUpperCase(), w - 26, h - 68, 'right', '#ff6b6b');
  });
}

/* ───────────────────────── partículas (canvas-like, em WebGL) ───────────────────────── */
class Particles {
  constructor(max) {
    this.max = max;
    this.group = new THREE.Group();
    const mk = (n, vs, extra) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3), colr = new Float32Array(n * 4);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aColor', new THREE.BufferAttribute(colr, 4).setUsage(THREE.DynamicDrawUsage));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uPx: { value: 1 } }, vertexShader: vs, fragmentShader: PTS_FS,
        transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      return { geo, pos, colr, mat, ...extra };
    };
    const p = mk(max, PTS_VS);
    p.size = new Float32Array(max);
    p.geo.setAttribute('aSize', new THREE.BufferAttribute(p.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.p = p;
    this.points = new THREE.Points(p.geo, p.mat);
    const l = mk(max * 2, LINE_VS);
    this.l = l;
    this.lines = new THREE.LineSegments(l.geo, l.mat);
    this.points.frustumCulled = this.lines.frustumCulled = false;
    this.points.renderOrder = this.lines.renderOrder = 16;
    this.group.add(this.points, this.lines);
    this.ang = new Float32Array(max); this.dist = new Float32Array(max); this.sz = new Float32Array(max);
    this.delay = new Float32Array(max); this.mixv = new Float32Array(max); this.born = new Float32Array(max);
    this.active = 0;
    this.mode = 'none';
    this.seed(Math.random() * 1e9 | 0, Math.min(36, max), 0, 0);
  }
  seed(seedNum, count, bornAt, oldActive = 0) {
    const r = mulberry32(seedNum);
    for (let i = 0; i < this.max; i++) {
      this.ang[i] = r() * Math.PI * 2;
      this.dist[i] = 90 + r() * 300;
      this.sz[i] = 1 + r() * 2.4;
      this.delay[i] = r() * 0.32;
      this.mixv[i] = r();
      this.born[i] = i < oldActive ? 0 : bornAt;
    }
    this.active = Math.min(count, this.max);
  }
  setMode(mode) {
    this.mode = mode;
    this.points.visible = mode === 'gather';
    this.lines.visible = mode === 'burst';
  }
  dispose() {
    this.p.geo.dispose(); this.p.mat.dispose(); this.l.geo.dispose(); this.l.mat.dispose();
  }
}

/* ───────────────────────── RollStage ───────────────────────── */
const CSS = /* css */ `
.rs-dialog{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;
  background:#02050a;color:#e6f1f5;overflow:hidden;opacity:0;font-family:var(--roll-font,'Barlow Condensed','Oswald','Arial Narrow',system-ui,sans-serif);
  -webkit-user-select:none;user-select:none}
.rs-dialog::backdrop{background:#000}
.rs-frame{position:absolute;inset:0;will-change:transform}
.rs-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.rs-hud{position:absolute;inset:0;pointer-events:none}
.rs-hud>*{position:absolute;left:0;right:0;text-align:center}
.rs-eyebrow{font:600 11px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.3em;text-transform:uppercase;color:var(--rs-c,#38e8da);opacity:.85}
.rs-status{font-weight:700;font-size:18px;line-height:1;letter-spacing:.02em;color:#eaf6f9;text-shadow:0 0 18px color-mix(in srgb,var(--rs-c,#38e8da) 50%,transparent)}
.rs-title{display:flex;align-items:center;justify-content:center;font-weight:700;text-transform:uppercase;white-space:nowrap;opacity:0;line-height:1;
  letter-spacing:.22em;padding-left:.22em}
.rs-title.is-grad{background-clip:text;-webkit-background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.rs-info{display:flex;flex-direction:column;align-items:center;gap:6px}
.rs-rarity{font:500 11px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.32em;color:#8b98a5;opacity:0}
.rs-name{font-weight:700;font-size:22px;line-height:1.1;color:#f4fbff;min-height:1.1em;display:flex;justify-content:center;flex-wrap:wrap;padding:0 16px}
.rs-name span{display:inline-block;white-space:pre;opacity:0;will-change:transform,opacity}
.rs-pts{font:500 13px/1 ui-monospace,Menlo,Consolas,monospace;color:#7d8a97;letter-spacing:.08em;opacity:0}
.rs-tag{margin-top:4px;font:700 12px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.24em;padding:6px 12px;border:1px solid currentColor;border-radius:3px;opacity:0;display:inline-block}
.rs-tag.is-new{color:#34d399;background:rgba(52,211,153,.12)}
.rs-tag.is-dupe{color:#ff8a8a;background:rgba(255,107,107,.1);text-decoration:line-through;text-decoration-thickness:2px}
.rs-actions{pointer-events:none}
.rs-btn{pointer-events:auto;cursor:pointer;font-weight:700;font-size:14px;line-height:1;font-family:inherit;color:#e8f6fa;background:#07141c;border:1px solid var(--rs-c,#38e8da);
  padding:11px 26px;min-width:108px;min-height:44px;letter-spacing:.02em;transition:background .15s,color .15s,box-shadow .15s}
.rs-btn:hover{box-shadow:0 0 18px color-mix(in srgb,var(--rs-c,#38e8da) 45%,transparent)}
.rs-btn:focus-visible{outline:2px solid #fff;outline-offset:3px}
.rs-btn.is-go{background:#38e8da;border-color:#38e8da;color:#021014}
.rs-sound{position:absolute;top:14px;right:14px;left:auto;right:14px;width:auto;pointer-events:auto;cursor:pointer;
  background:transparent;border:1px solid #2a3a46;color:#9fb3c0;font:600 12px/1 ui-monospace,Menlo,monospace;padding:8px 10px;letter-spacing:.1em;min-width:0}
.rs-sound[aria-pressed="false"]{opacity:.5;text-decoration:line-through}
.rs-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

class RollStageEngine {
  /**
   * @param {object} [options]
   * @param {object} [options.config]  sobrescreve DEFAULT_CONFIG (mesmos nomes do painel)
   * @param {object} [options.labels]  textos (i18n)
   * @param {(phase:string)=>void} [options.onPhase]
   * @param {boolean} [options.manual] debug/teste: não roda rAF, use stage._tick(dt)
   */
  constructor(options = {}) {
    this.cfg = normalizeConfig(options.config);
    this.labels = { ...DEFAULT_LABELS, ...(options.labels || {}) };
    this.onPhase = options.onPhase || null;
    this.manual = !!options.manual;
    this.sfx = new Sfx();
    this.active = false;
  }

  /* ───────── API pública ───────── */
  play(input) {
    if (this.active) return Promise.reject(new Error('RollStage já está em execução'));
    this.active = true;
    this._resetState();
    if (!this.reduced) this.sfx.ensure();
    this._buildDom();
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
      if (!this.reduced) this._initGL();
      this._layout();
      this._start();
      Promise.resolve(input).then(
        (pull) => this._onResult(pull),
        (err) => this._fail(err),
      );
    });
  }

  /** Vai direto ao estado final (equivale ao botão Pular). */
  showFinal() {
    if (this.final || this.continueReady) return;
    if (!this.plan) { this.skipPending = true; this.btn.disabled = true; return; }
    this._jumpFinal();
  }

  destroy() { this._teardown(); }

  /* ───────── estado ───────── */
  _resetState() {
    this.plan = null; this.pull = null;
    this.started = false; this.final = false; this.skipPending = false; this.skipped = false;
    this.t = 0; this.rt = 0; this.loopT = 0; this.orbitAngle = 0;
    this.phase = 'press'; this.cueIdx = 0; this.cues = [];
    this.tilt = new THREE.Vector2(); this.tiltTarget = new THREE.Vector2();
    this.tiltOn = false; this.gyro = false; this.destroyed = false;
    this.cache = {};
    this.colorCur = col(TIER_COLOR[0]);
    this.neutral = col(TIER_COLOR[0]);
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mobile = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const c = this.cfg;
    const spinEnd = c.crystalSpinAt + Math.max(0.75, c.crystalSpinDuration);
    this.invEnd = Math.max(1.1, c.revealAt, spinEnd);
  }

  /* ───────── DOM ───────── */
  _buildDom() {
    if (!document.getElementById('rs-style')) {
      const st = document.createElement('style');
      st.id = 'rs-style'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    this.prevFocus = document.activeElement;
    const L = this.labels;
    const d = document.createElement('dialog');
    d.className = 'rs-dialog';
    d.setAttribute('aria-label', L.dialog);
    d.innerHTML = `
      <div class="rs-frame">
        <canvas class="rs-canvas" aria-hidden="true"></canvas>
        <div class="rs-hud">
          <p class="rs-eyebrow"></p>
          <p class="rs-status"></p>
          <div class="rs-title" aria-hidden="true"></div>
          <div class="rs-info"><span class="rs-rarity"></span><h2 class="rs-name" style="margin:0"></h2><span class="rs-pts"></span><span class="rs-tag"></span></div>
          <div class="rs-actions"><button type="button" class="rs-btn"></button></div>
        </div>
        <button type="button" class="rs-btn rs-sound" aria-pressed="true"></button>
      </div>
      <p class="rs-live" aria-live="polite"></p>`;
    document.body.appendChild(d);
    this.dlg = d;
    const q = (s) => d.querySelector(s);
    this.el = {
      frame: q('.rs-frame'), canvas: q('.rs-canvas'), eyebrow: q('.rs-eyebrow'), status: q('.rs-status'),
      title: q('.rs-title'), info: q('.rs-info'), rarity: q('.rs-rarity'), name: q('.rs-name'), pts: q('.rs-pts'),
      tag: q('.rs-tag'), actions: q('.rs-actions'), live: q('.rs-live'), sound: q('.rs-sound'),
    };
    if (this.reduced) this.el.canvas.remove();
    this.btn = q('.rs-actions .rs-btn');
    this.el.eyebrow.textContent = L.eyebrow;
    this.el.status.textContent = L.summoning;
    this.btn.textContent = 'Fechar';
    this.el.sound.textContent = '♪ ' + L.sound;
    this.el.sound.setAttribute('aria-pressed', String(this.sfx.on));

    this.btn.addEventListener('click', () => {
      if (this.continueReady || !this.pull) this._close();
      else this.showFinal();
    });
    this.el.sound.addEventListener('click', () => {
      this.sfx.setOn(!this.sfx.on); this.sfx.ensure();
      this.el.sound.setAttribute('aria-pressed', String(this.sfx.on));
    });
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      if (this.continueReady || !this.pull) this._close(); else this.showFinal();
    });
    d.addEventListener('pointerdown', (e) => {
      this.sfx.ensure();
      this._requestGyro();
      if (!e.target.closest('button') && (this.continueReady || !this.pull)) this._close();
      else if (!e.target.closest('button')) this.showFinal();
    });
    d.addEventListener('pointermove', (e) => this._onPointer(e));
    this._onKey = (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === d && !this.continueReady) { e.preventDefault(); this.showFinal(); }
    };
    d.addEventListener('keydown', this._onKey);
    this._onResize = () => this._layout();
    window.addEventListener('resize', this._onResize);
    d.showModal();
    this.btn.focus({ preventScroll: true });
  }

  _onPointer(e) {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen' && !(e.buttons & 1)) { /* toque: segue o dedo */ }
    const w = this.W || innerWidth, h = this.H || innerHeight;
    this.tiltTarget.set(clamp((e.clientX - w / 2) / (w / 2), -1, 1), clamp((e.clientY - h / 2) / (h / 2), -1, 1));
    this.gyro = false;
  }

  _requestGyro() {
    if (!this.mobile || this.gyroAsked || typeof DeviceOrientationEvent === 'undefined') return;
    this.gyroAsked = true;
    const attach = () => {
      this._onOrient = (ev) => {
        if (ev.gamma == null || ev.beta == null) return;
        this.gyro = true;
        this.tiltTarget.set(clamp(ev.gamma / 30, -1, 1), clamp((ev.beta - 45) / 30, -1, 1));
      };
      window.addEventListener('deviceorientation', this._onOrient);
    };
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then((r) => r === 'granted' && attach()).catch(() => {});
      } else attach();
    } catch { /* ignore */ }
  }

  /* ───────── Three.js ───────── */
  _initGL() {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: this.el.canvas, antialias: true, alpha: false, powerPreference: this.mobile ? 'low-power' : 'default' });
    } catch (e) {
      this.noGL = true;
      return;
    }
    this.renderer = renderer;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // valores = hex CSS
    renderer.setClearColor(0x02050a, 1);
    renderer.sortObjects = true;
    this.pr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2);
    renderer.setPixelRatio(this.pr);

    const scene = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(40, 1, 10, 6000);
    this.camera.position.set(0, 0, 1000);
    this.uRes = { value: new THREE.Vector2(1, 1) };
    this.uOff = { value: new THREE.Vector2(0, 0) };

    const quad = (frag, uniforms, blending, order) => {
      const m = new THREE.ShaderMaterial({
        uniforms: { uRes: this.uRes, uOff: this.uOff, ...uniforms },
        vertexShader: QUAD_VS, fragmentShader: frag, transparent: true, depthTest: false, depthWrite: false, blending,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
      mesh.frustumCulled = false; mesh.renderOrder = order;
      scene.add(mesh);
      return mesh;
    };
    const ADD = THREE.AdditiveBlending, NORM = THREE.NormalBlending;
    quad(BG_FS, { uAlpha: { value: 1 } }, NORM, 0).material.transparent = false;
    this.tintQ = quad(TINT_FS, { uColor: { value: new THREE.Color() }, uAlpha: { value: 0 } }, ADD, 2);
    const raysU = (color) => ({ uColor: { value: col(color) }, uAlpha: { value: 0 }, uRot: { value: 0 }, uCount: { value: 14 }, uWidth: { value: 0.5 }, uSoft: { value: 0.3 }, uReach: { value: 900 } });
    this.godA = quad(RAYS_FS, raysU('#C084FC'), ADD, 3);
    this.godB = quad(RAYS_FS, raysU('#F472B6'), ADD, 3);
    this.burstQ = quad(RAYS_FS, raysU('#ffffff'), ADD, 3);
    this.flashQ = quad(FLASH_FS, { uAlpha: { value: 0 } }, ADD, 30);

    // estrelas
    {
      const n = 170, pos = new Float32Array(n * 3), cs = new Float32Array(n * 3);
      const r = mulberry32(7);
      for (let i = 0; i < n; i++) {
        pos.set([(r() - 0.5) * 4400, (r() - 0.5) * 2800, -300], i * 3);
        const k = r(); const b = 0.25 + r() * 0.45;
        const c = k < 0.12 ? [1, 0.45, 0.55] : k < 0.3 ? [0.3, 0.9, 0.85] : [0.8, 0.9, 1];
        cs.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(cs, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.8 * this.pr, sizeAttenuation: false, vertexColors: true, transparent: true, depthTest: false, depthWrite: false, blending: ADD }));
      this.stars.renderOrder = 1;
      scene.add(this.stars);
    }

    // mundo (palco)
    const world = (this.world = new THREE.Group());
    scene.add(world);
    const unitGroup = (order) => { const g = new THREE.Group(); g.userData.order = order; world.add(g); return g; };
    this.glowTex = glowRectTex(); this.radTex = radialTex(); this.runeTexture = runeTex();
    const basic = (opts) => new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: ADD, ...opts });

    // auras
    this.auraWide = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic({ map: this.radTex, color: this.colorCur.clone(), opacity: 0 }));
    this.auraWide.renderOrder = 4;
    this.glowTight = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic({ map: this.glowTex, color: this.colorCur.clone(), opacity: 0 }));
    this.glowTight.renderOrder = 5;
    world.add(this.auraWide, this.glowTight);

    // sigil (órbitas) — atrás da carta
    const sigil = (this.sigil = unitGroup(4));
    sigil.renderOrder = 4;
    const mkLine = (segs, op) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
      const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthTest: false, depthWrite: false, blending: ADD }));
      m.renderOrder = 4; return m;
    };
    {
      const segs = [], N = 120, R = 0.66;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2, len = i % 5 === 0 ? 0.034 : 0.014;
        segs.push(Math.cos(a) * R, Math.sin(a) * R, 0, Math.cos(a) * (R - len), Math.sin(a) * (R - len), 0);
      }
      this.sigTicks = mkLine(segs, 0.55); sigil.add(this.sigTicks);
      const dots = [], M = 64;
      for (let i = 0; i < M; i++) { const a = (i / M) * Math.PI * 2; dots.push(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0, Math.cos(a) * 0.727, Math.sin(a) * 0.727, 0); }
      this.sigDots = mkLine(dots, 0.35); sigil.add(this.sigDots);
      this.sigArcs = new THREE.Group();
      [[0.2, 1.1], [2.5, 0.9], [4.2, 1.3]].forEach(([s, l]) => {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.635, 0.646, 48, 1, s, l), basic({ color: 0xffffff, opacity: 0.8, side: THREE.DoubleSide }));
        m.renderOrder = 4; this.sigArcs.add(m);
      });
      sigil.add(this.sigArcs);
      this.sigRunes = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.052), basic({ map: this.runeTexture, color: 0xffffff, opacity: 0.85 }));
        const a = (i / 3) * Math.PI * 2 + 0.6;
        m.position.set(Math.cos(a) * 0.675, Math.sin(a) * 0.675, 0);
        m.renderOrder = 4; this.sigRunes.add(m);
      }
      sigil.add(this.sigRunes);
    }

    // carta
    const card = (this.card = new THREE.Group()); // escala = largura em px
    world.add(card);
    this.cardTilt = new THREE.Group();
    this.cardFlip = new THREE.Group();
    card.add(this.cardTilt); this.cardTilt.add(this.cardFlip);
    const plane = new THREE.PlaneGeometry(1, 4 / 3);
    this.backMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: this.colorCur.clone() }, uOpacity: { value: 0 }, uEnergy: { value: 0 } },
      vertexShader: CARD_VS, fragmentShader: BACK_FS, transparent: true, depthTest: false, depthWrite: false, side: THREE.FrontSide,
    });
    const back = new THREE.Mesh(plane, this.backMat); back.renderOrder = 10;
    this.frontTex = new THREE.CanvasTexture(placeholderArt(0)); this.frontTex.colorSpace = THREE.NoColorSpace;
    this.frontMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.frontTex }, uColor: { value: this.colorCur.clone() }, uExposure: { value: 1 }, uHolo: { value: 0 },
        uSweep: { value: 0 }, uSweepAmt: { value: 0 }, uRainbow: { value: 0 }, uFoilAmt: { value: 1 }, uTime: { value: 0 },
        uTilt: { value: new THREE.Vector2() }, uFoil: { value: 0 },
      },
      vertexShader: CARD_VS, fragmentShader: FRONT_FS, side: THREE.FrontSide, transparent: true, depthTest: false, depthWrite: false,
    });
    const front = new THREE.Mesh(plane, this.frontMat); front.rotation.y = Math.PI; front.renderOrder = 10;
    this.badgeMat = basic({ blending: NORM, opacity: 0, side: THREE.FrontSide });
    const badges = new THREE.Mesh(plane, this.badgeMat); badges.rotation.y = Math.PI; badges.position.z = -0.002; badges.renderOrder = 11;
    this.cardFlip.add(back, front, badges);

    // cristal
    const crystal = (this.crystal = new THREE.Group());
    world.add(crystal);
    const octa = new THREE.OctahedronGeometry(1, 0);
    const edges = new THREE.EdgesGeometry(octa);
    this.crOuter = new THREE.Group(); this.crInner = new THREE.Group();
    const faceMat = () => basic({ color: 0xffffff, opacity: 0.2, side: THREE.DoubleSide });
    const edgeMat = () => new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false, blending: ADD });
    this.crMats = [faceMat(), faceMat(), edgeMat(), edgeMat()];
    const o1 = new THREE.Mesh(octa, this.crMats[0]), o2 = new THREE.LineSegments(edges, this.crMats[2]);
    const i1 = new THREE.Mesh(octa, this.crMats[1]), i2 = new THREE.LineSegments(edges, this.crMats[3]);
    [o1, o2, i1, i2].forEach((m) => (m.renderOrder = 15));
    this.crOuter.add(o1, o2); i1.scale.setScalar(0.55); i2.scale.setScalar(0.55); this.crInner.add(i1, i2);
    this.crCore = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic({ map: this.radTex, color: 0xffffff, opacity: 0.6 }));
    this.crCore.renderOrder = 15; this.crCore.scale.setScalar(0.9);
    crystal.add(this.crOuter, this.crInner, this.crCore);

    // anéis de impacto
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.488, 0.5, 128);
    for (let i = 0; i < Math.max(1, Math.min(3, Math.round(this.cfg.ringSlots))); i++) {
      const m = new THREE.Mesh(ringGeo, basic({ color: 0xffffff, opacity: 0 }));
      m.renderOrder = 16; m.visible = false; world.add(m); this.rings.push(m);
    }
    this.ringGeo = ringGeo;

    // fragmentos (MÍTICA)
    this.shards = [];
    const tri = new THREE.Shape(); tri.moveTo(0, 0.6); tri.lineTo(-0.42, -0.4); tri.lineTo(0.5, -0.3); tri.closePath();
    const triGeo = new THREE.ShapeGeometry(tri);
    const triEdge = new THREE.EdgesGeometry(triGeo);
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const f = new THREE.Mesh(triGeo, basic({ color: 0xffffff, opacity: 0.35, side: THREE.DoubleSide }));
      const e = new THREE.LineSegments(triEdge, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthTest: false, depthWrite: false, blending: ADD }));
      f.renderOrder = e.renderOrder = 17;
      g.add(f, e); g.visible = false; world.add(g); this.shards.push(g);
    }
    this.shardGeos = [triGeo, triEdge];

    // partículas
    this.particles = new Particles(this.mobile ? 120 : 180);
    this.particles.group.position.z = 60;
    world.add(this.particles.group);
    this.particles.setMode('gather');
  }

  _layout() {
    const d = this.dlg;
    const w = (this.W = d.clientWidth || innerWidth), h = (this.H = d.clientHeight || innerHeight);
    this.cardW = Math.max(140, Math.min(w * 0.7, 420, h * 0.375));
    this.cardH = (this.cardW * 4) / 3;
    this.centerY = h * 0.47; // distância do topo
    this.shiftY = h / 2 - this.centerY; // px para cima
    const top = this.centerY - this.cardH / 2, bottom = this.centerY + this.cardH / 2;
    const setTop = (el, v) => (el.style.top = Math.round(v) + 'px');
    setTop(this.el.eyebrow, top - 78);
    setTop(this.el.status, top - 52);
    setTop(this.el.info, bottom + 22);
    setTop(this.el.actions, Math.min(h - 64, bottom + 140));
    const n = Math.max(6, (this.pull ? TIER_LABEL[TIERS[this.pull.tier]] : 'GALÁCTICA').length);
    const fs = Math.min(this.cardW * 0.16, this.cardW / (n * 0.9));
    this.titleFs = fs;
    Object.assign(this.el.title.style, { top: Math.round(this.centerY - fs / 2 - fs * 0.04) + 'px', fontSize: fs + 'px' });
    this.el.name.style.fontSize = Math.max(17, Math.min(24, this.cardW * 0.058)) + 'px';
    this.el.status.style.fontSize = Math.max(15, Math.min(19, this.cardW * 0.047)) + 'px';

    if (!this.renderer) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = (2 * Math.atan(h / 2 / 1000) * 180) / Math.PI;
    this.camera.updateProjectionMatrix();
    this.uRes.value.set(w, h);
    this.uOff.value.set(0, this.shiftY);
    this.world.position.y = this.shiftY;
    const u = this.cardW;
    this.card.scale.setScalar(u);
    this.sigil.scale.setScalar(u);
    this.crystalBase = u * 0.19;
    this.glowTight.scale.set(u * 2.0, u * 2.5, 1);
    this.auraWide.scale.set(u * 3.4, u * 4.2, 1);
    this.rings.forEach((r) => r.scale.setScalar(u * 0.15));
    this.crystal.position.z = 30;
    this.particles.points.material.uniforms.uPx.value = this.pr;
    this.stars.material.size = 1.8 * this.pr;
  }

  /* ───────── resultado ───────── */
  async _onResult(input) {
    if (this.destroyed) return;
    const p = input || {};
    const tier = normalizeRarity(p.rarity ?? p.raridade ?? p.tier);
    const pull = {
      id: String(p.id ?? Math.random()),
      tier,
      name: String(p.name ?? p.nome ?? `Carta ${TIER_LABEL[TIERS[tier]]}`),
      points: p.points ?? p.pts ?? null,
      image: p.image ?? p.imageUrl ?? p.imagem ?? null,
      foil: FOILS.includes(String(p.foil || '').toUpperCase()) ? String(p.foil).toUpperCase() : 'NORMAL',
      condition: p.condition ?? p.condicao ?? null,
      isNew: p.isNew === true || p.nova === true,
      compact: p.isDuplicate === true || p.duplicate === true || p.repetida === true || p.compact === true,
    };
    if (pull.compact) pull.isNew = false;
    this.pull = pull;
    this._layout();

    // arte: espera carregar (máx. 4s) — a timeline pausa em "waiting" enquanto isso
    let art = null;
    if (pull.image) {
      try { art = await Promise.race([loadImage(pull.image), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]); } catch { art = null; }
    }
    if (this.destroyed) return;
    const cv = document.createElement('canvas');
    cv.width = 768; cv.height = 1024;
    const g = cv.getContext('2d');
    if (art) drawCover(g, art, 768, 1024); else g.drawImage(placeholderArt(tier, pull.name), 0, 0);
    if (this.renderer) {
      this.frontTex.image = cv; this.frontTex.needsUpdate = true;
      this.badgeMat.map = badgesTex({ rarity: TIER_LABEL[TIERS[tier]], foil: pull.foil, condition: pull.condition, color: TIER_COLOR[tier] });
      this.badgeMat.needsUpdate = true;
      this.frontMat.uniforms.uFoil.value = FOILS.indexOf(pull.foil);
      this.frontMat.uniforms.uColor.value.copy(col(TIER_COLOR[tier]));
    } else {
      this.fallbackSrc = cv.toDataURL('image/jpeg', 0.85);
    }

    const plan = (this.plan = buildPlan(pull, this.cfg, pull.name.length));
    const count = clamp(Math.round(TIER_PARTICLES[tier] * (this.cfg.particleSlots / 24)), 12, this.mobile ? 120 : 180);
    if (this.renderer) this.particles.seed(fnv1a(pull.id), Math.min(count, this.particles.max), this.t, this.particles.active);
    this._buildInfoDom();
    this._buildCues();
    this._layout();
    this.btn.disabled = false;

    if (this.reduced || this.noGL) { this._jumpFinal(true); return; }
    if (this.skipPending) this._jumpFinal();
  }

  _fail(err) {
    if (this.destroyed) return;
    const rej = this._reject;
    this._teardown();
    rej && rej(err);
  }

  _buildInfoDom() {
    const { pull } = this, L = this.labels;
    this.el.rarity.textContent = TIER_LABEL[TIERS[pull.tier]];
    this.el.name.textContent = '';
    this.letters = [...pull.name].map((ch) => {
      const s = document.createElement('span'); s.textContent = ch; this.el.name.appendChild(s); return s;
    });
    this.el.name.setAttribute('aria-label', pull.name);
    this.el.pts.textContent = pull.points != null ? `${pull.points} ${L.pts}` : '';
    this.el.tag.textContent = pull.compact ? L.isDupe : pull.isNew ? L.isNew : '';
    this.el.tag.className = 'rs-tag ' + (pull.compact ? 'is-dupe' : pull.isNew ? 'is-new' : '');
    this.btn.textContent = this.labels.skip;
    const label = TIER_LABEL[TIERS[pull.tier]];
    this.el.title.textContent = label;
    this.el.title.classList.toggle('is-grad', pull.tier >= 5);
    const gal = pull.tier === 6 ? this.cfg.particleGalaxy : pull.tier === 5 ? ['#FB7185', '#F472B6', '#FDA4AF'] : null;
    this.el.title.style.backgroundImage = gal ? `linear-gradient(90deg,${gal.join(',')})` : '';
    if (!gal) { this.el.title.style.color = TIER_COLOR[pull.tier]; this.el.title.style.textShadow = `0 0 28px ${TIER_COLOR[pull.tier]}`; }
    else { this.el.title.style.color = ''; this.el.title.style.textShadow = ''; this.el.title.style.filter = `drop-shadow(0 0 14px ${gal[0]}aa)`; }
  }

  /* ───────── cues (eventos pontuais: som, fase, aria) ───────── */
  _buildCues() {
    const P = this.plan, pull = this.pull, L = this.labels, s = this.sfx;
    const c = [];
    const add = (at, name, fn) => c.push({ at, name, fn });
    P.steps.forEach((st) => add(st.t, 'tick', () => s.tick(st.tier / 6)));
    add(0, 'phase', () => this._setPhase('tease'));
    if (P.hasTitle) add(P.teaseDur, 'phase', () => this._setPhase('title'));
    if (P.hasTitle) add(P.teaseDur, 'sfx', () => s.title(P.tier / 6));
    add(P.impactAt, 'impact', () => {
      this._setPhase('impact');
      s.impact(P.tier / 6);
      if (P.epic && !this.reduced && navigator.vibrate) { try { navigator.vibrate(P.tier >= 4 ? [40, 30, 80] : [40]); } catch { /* ignore */ } }
    });
    add(P.revealAt, 'phase', () => {
      this._setPhase('reveal');
      this.el.status.textContent = L.revealed;
    });
    add(P.revealAt, 'sfx', () => s.whoosh());
    add(P.cardRevealedAt, 'chime', () => {
      if (P.compact) s.dupe(); else if (P.galactic) s.galacticChime(); else s.chime(P.tier / 6);
      this.el.live.textContent = `${L.revealed}: ${pull.name}. ${L.rarity} ${TIER_LABEL[TIERS[pull.tier]]}. ${pull.compact ? L.isDupe : pull.isNew ? L.isNew : ''}`;
    });
    add(P.continueAt, 'continue', () => { this._enableContinue(); s.ready(); });
    add(P.effectsEnd, 'end', () => { if (this.particles) this.particles.setMode('none'); this.effectsDone = true; });
    c.sort((a, b) => a.at - b.at);
    this.cues = c; this.cueIdx = 0;
  }

  _fireCues(silent) {
    while (this.cueIdx < this.cues.length && this.cues[this.cueIdx].at <= this.rt) {
      const cue = this.cues[this.cueIdx++];
      if (silent && (cue.name === 'tick' || cue.name === 'impact' || cue.name === 'chime' || cue.name === 'sfx')) {
        if (cue.name === 'chime') this._announce();
        continue;
      }
      cue.fn();
    }
  }

  _announce() {
    const { pull } = this, L = this.labels;
    this.el.live.textContent = `${L.revealed}: ${pull.name}. ${L.rarity} ${TIER_LABEL[TIERS[pull.tier]]}. ${pull.compact ? L.isDupe : pull.isNew ? L.isNew : ''}`;
  }

  _setPhase(p) {
    if (this.phase === p) return;
    this.phase = p;
    this.dlg.dataset.phase = p;
    if (this.onPhase) { try { this.onPhase(p); } catch { /* ignore */ } }
  }

  _enableContinue() {
    if (this.continueReady) return;
    this.continueReady = true;
    this.btn.textContent = this.labels.next;
    this.btn.classList.add('is-go');
    this.btn.disabled = false;
    this.continueAtClock = this.rt;
    this._setPhase('showcase');
    this.btn.focus({ preventScroll: true });
  }

  _jumpFinal(silentChime) {
    const P = this.plan;
    this.skipped = !silentChime;
    this.final = true;
    this.started = true;
    this.t = this.invEnd;
    this.rt = P.effectsEnd + 1;
    this._fireCues(true);
    if (silentChime && this.sfx.ok) this.sfx.chime(P.tier / 6);
    if (this.particles) this.particles.setMode('none');
    this.effectsDone = true;
    this.el.status.textContent = this.labels.revealed;
    if (!this.renderer) this._staticDom();
    this.continueAtClock = P.continueAt;
    this._enableContinue();
  }

  /** Sem WebGL: mostra a carta como <img> e os textos no estado final. */
  _staticDom() {
    if (this.fallbackSrc && !this.fbImg) {
      const im = (this.fbImg = new Image());
      im.src = this.fallbackSrc; im.alt = this.pull.name;
      Object.assign(im.style, { position: 'absolute', left: '50%', top: this.centerY + 'px', width: this.cardW + 'px', transform: 'translate(-50%,-50%)', border: `3px solid ${TIER_COLOR[this.pull.tier]}` });
      this.el.frame.insertBefore(im, this.el.canvas.nextSibling);
    }
    [this.el.rarity, this.el.pts, this.el.tag].forEach((e) => (e.style.opacity = 1));
    (this.letters || []).forEach((s) => (s.style.opacity = 1));
  }

  _close() {
    const res = this._resolve, out = { pull: this.pull, skipped: this.skipped };
    this._teardown();
    res && res(out);
  }

  /* ───────── laço ───────── */
  _start() {
    this.last = performance.now();
    if (this.manual) return;
    const loop = (now) => {
      if (this.destroyed) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016);
      this.last = now;
      this._tick(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  _tick(dt) {
    if (this.destroyed) return;
    this._step(dt);
    if (this.renderer) { this._render(dt); this.renderer.render(this.scene, this.camera); }
  }

  _step(dt) {
    this.loopT += dt;
    const c = this.cfg;
    if (!this.started) {
      const prev = this.t;
      this.t = Math.min(this.t + dt, this.invEnd);
      if (prev < 0.15 && this.t >= 0.15) { this._setPhase('invocation'); this.sfx.charge(this.invEnd - 0.15); }
      if (this.t >= this.invEnd) {
        if (this.plan) { this.started = true; this.rt = 0; this._fireCues(false); }
        else if (this.phase !== 'waiting') {
          this._setPhase('waiting');
          this.el.status.textContent = this.labels.waiting;
          this.el.live.textContent = this.labels.waiting;
        }
      }
    } else if (!this.final) {
      this.rt += dt;
      this._fireCues(false);
    } else {
      this.rt += dt;
    }
    void c;
  }

  _stepAt(rt) {
    const steps = this.plan.steps;
    let i = 0;
    for (let k = 0; k < steps.length; k++) if (steps[k].t <= rt) i = k;
    return { i, step: steps[i], since: rt - steps[i].t };
  }

  _render(dt) {
    const cfg = this.cfg, P = this.plan, started = this.started;
    const t = this.t, rt = started ? this.rt : -1;
    const w = this.cardW;
    const el = this.el;
    const enter = clamp(t / Math.max(0.01, cfg.enterDuration));
    const set = (k, v, fn) => { if (this.cache[k] !== v) { this.cache[k] = v; fn(v); } };

    this.dlg.style.opacity = this.reduced ? 1 : enter;
    const fr = this.reduced ? 1 : lerp(0.985, 1, easeOut3(enter));

    /* —— cor / aura —— */
    let aura, peak = 0.5, freeze = false, tierNow = 0;
    const real = P ? P.tier : 0;
    if (!started) {
      this.colorCur.copy(this.neutral);
      const e = clamp((t - 0.15) / (this.invEnd - 0.15));
      const beat = 0.5 + 0.5 * Math.sin(this.loopT * (4 + 7 * e));
      aura = (0.18 + 0.55 * easeIn2(e)) * (0.85 + 0.15 * beat);
    } else {
      const { i, step, since } = this._stepAt(Math.min(rt, P.impactAt));
      const prevC = i > 0 ? col(TIER_COLOR[P.steps[i - 1].tier]) : this.neutral;
      this.colorCur.lerpColors(prevC, col(TIER_COLOR[step.tier]), clamp(since / 0.14));
      if (rt >= P.impactAt) this.colorCur.copy(col(TIER_COLOR[real]));
      freeze = !!step.freeze && rt < P.impactAt;
      tierNow = step.tier;
      peak = step.peak;
      if (rt < P.impactAt) aura = 0.3 + 0.75 * peak * (0.45 + 0.55 * Math.exp(-since * 5));
      else {
        const x = clamp((rt - P.impactAt) / 0.9);
        aura = lerp(P.compact ? 0.8 : 1.15, 0.7, easeOut3(x));
        if (P.rough || P.epic) aura += 0.1 * Math.sin(this.loopT * 2.2);
      }
    }
    const C = this.colorCur;
    set('cssc', hexOf(C), (v) => this.dlg.style.setProperty('--rs-c', v));

    /* —— órbitas —— */
    const impacted = started && rt >= P.impactAt;
    if (!impacted && !this.final) {
      const ts = !started ? 1 + 1.6 * easeIn2(clamp((t - 0.15) / (this.invEnd - 0.15))) : 2.6 + 1.0 * clamp(rt / P.impactAt);
      this.orbitAngle += dt * 0.9 * ts;
    }
    const sigA = this.reduced ? 0 : enter * (impacted ? 1 - clamp((rt - P.impactAt) / 0.25) : 1) * (0.55 + 0.45 * Math.min(1, aura));
    this.sigil.visible = sigA > 0.003;
    const a = this.orbitAngle;
    this.sigTicks.rotation.z = a * 0.5;
    this.sigDots.rotation.z = -a * 0.3;
    this.sigArcs.rotation.z = -a * 1.2;
    this.sigRunes.rotation.z = a;
    this.sigRunes.children.forEach((r) => (r.rotation.z = -a));
    this.sigTicks.material.color.copy(C); this.sigTicks.material.opacity = 0.55 * sigA;
    this.sigDots.material.color.copy(C); this.sigDots.material.opacity = 0.4 * sigA;
    this.sigArcs.children.forEach((m) => { m.material.color.copy(C); m.material.opacity = 0.85 * sigA; });
    this.sigRunes.children.forEach((m) => { m.material.color.copy(C); m.material.opacity = 0.9 * sigA; });

    /* —— palco: escala, tremor, shake —— */
    let stageS = lerp(0.94, 1, easeOut3(enter));
    if (this.reduced) stageS = 1;
    let tx = 0, ty = 0;
    if (started && P.epic && !this.reduced) {
      if (rt < P.impactAt) stageS *= 1 + 0.05 * easeInOut2(clamp(rt / P.impactAt));
      else stageS *= 1 + 0.05 * (1 - easeOut3(clamp((rt - P.impactAt) / P.impactDur)));
    }
    if (started && P.rough && !this.reduced && rt < P.impactAt) {
      const amp = P.tremble * clamp(rt / Math.max(0.2, P.lock)) * (freeze ? 1.8 : 1);
      tx = (Math.random() - 0.5) * 2 * amp; ty = (Math.random() - 0.5) * 2 * amp;
    }
    let fx = 0, fy = 0;
    if (started && P.rough && !this.reduced && rt >= P.impactAt) {
      const x = (rt - P.impactAt) / 0.4;
      if (x < 1) { const k = P.shake * Math.pow(1 - x, 2); fx = (Math.random() - 0.5) * 2 * k; fy = (Math.random() - 0.5) * 2 * k; }
    }

    /* —— flip, flutuação e tilt —— */
    let flipP = 0;
    if (started) flipP = easeInOut2(clamp((rt - P.revealAt) / P.flipDur));
    const revealed = started && rt >= P.cardRevealedAt;
    let punch = 1;
    if (started && !this.reduced) punch = 1 + 0.1 * Math.sin(flipP * Math.PI);
    this.cardFlip.rotation.y = flipP * Math.PI;
    // tilt
    const showT = revealed ? clamp((rt - P.cardRevealedAt) / 0.5) : 0;
    if (!this.reduced && revealed) {
      const k = 1 - Math.exp(-dt * 8);
      this.tilt.lerp(this.tiltTarget, k);
      this.cardTilt.rotation.set(this.tilt.y * 0.314 * showT, this.tilt.x * 0.314 * showT, 0);
    } else this.cardTilt.rotation.set(0, 0, 0);
    const floatY = !this.reduced && revealed ? Math.sin((rt - P.cardRevealedAt) * 1.9) * 3.5 * showT + 3.5 * showT * 0 : 0;
    this.card.position.y = floatY;
    const cardS = w * punch;
    this.card.scale.setScalar(cardS);

    this.world.position.set(tx, this.shiftY + ty, 0);
    this.world.scale.setScalar(stageS);
    el.frame.style.transform = `translate(${fx.toFixed(2)}px,${fy.toFixed(2)}px) scale(${fr.toFixed(4)})`;

    /* —— carta: uniforms —— */
    const bu = this.backMat.uniforms;
    bu.uColor.value.copy(C); bu.uOpacity.value = enter; bu.uEnergy.value = clamp(aura * 0.8, 0, 1.2);
    const fu = this.frontMat.uniforms;
    fu.uTime.value = this.loopT;
    fu.uTilt.value.copy(this.tilt);
    let expo = 1, sweep = 0, sweepAmt = 0, holo = 0;
    if (started) {
      const rv = rt - P.cardRevealedAt;
      if (rv >= 0) expo = 1 + 0.9 * Math.exp(-rv * 6);
      const sw = (rt - P.sweepStart) / Math.max(0.05, cfg.sweepDuration);
      if (sw >= 0 && sw <= 1 && !this.reduced) {
        sweep = sw; sweepAmt = (P.tier >= 2 || this.pull.foil !== 'NORMAL' ? 0.7 : 0.4);
      } else if (!this.reduced && P.tier >= 4 && rv > 3) {
        const cyc = ((rv - 3) % 6) / 0.9;
        if (cyc >= 0 && cyc <= 1) { sweep = cyc; sweepAmt = 0.35; }
      }
      holo = P.holo * easeOut3(clamp(rv / 0.4)) * (this.reduced ? 0.4 : 1);
    }
    fu.uExposure.value = expo; fu.uSweep.value = sweep; fu.uSweepAmt.value = sweepAmt; fu.uHolo.value = holo;
    fu.uRainbow.value = P && P.tier >= 4 ? 1 : 0;
    const bd = started ? clamp((rt - P.cardArtReadyAt) / Math.max(0.05, cfg.badgeDuration)) : 0;
    this.badgeMat.opacity = easeOut3(bd);

    /* —— glow / aura / tint —— */
    const showCol = started && rt >= P.impactAt;
    this.glowTight.material.color.copy(C); this.auraWide.material.color.copy(C);
    this.glowTight.material.opacity = clamp(aura * 0.95, 0, 1) * enter;
    this.auraWide.material.opacity = clamp(aura * 0.42, 0, 0.7) * enter * (showCol ? 1 : 0.9);
    let tintA = 0.1 * aura;
    if (started) {
      if (P.epic && rt < P.impactAt) tintA = lerp(0.1, 0.55, easeInOut2(clamp(rt / Math.max(0.3, P.lock)))) * 0.55;
      else if (rt >= P.impactAt) tintA = lerp(P.epic ? 0.3 : 0.14, 0.12, clamp((rt - P.impactAt) / 1.0));
    }
    this.tintQ.material.uniforms.uColor.value.copy(C);
    this.tintQ.material.uniforms.uAlpha.value = this.reduced ? 0.1 : tintA * enter;

    /* —— cristal —— */
    const spinS = clamp((t - cfg.crystalSpinAt) / Math.max(0.75, cfg.crystalSpinDuration));
    const spinP = easeInOut2(spinS);
    let crS = lerp(1, 0.88, spinP), crA = enter;
    if (impacted) {
      const p = clamp((rt - P.impactAt) / P.impactDur);
      crS *= lerp(1, 1.9, easeOut3(p)); crA *= 1 - p;
    }
    const crVis = crA > 0.003 && !this.reduced;
    this.crystal.visible = crVis;
    if (crVis) {
      this.crystal.scale.setScalar(this.crystalBase * crS);
      this.crOuter.rotation.set(0.0, spinP * Math.PI * 4 + this.loopT * 0.6, 0);
      this.crInner.rotation.set(0.35, -(spinP * Math.PI * 2.6) - this.loopT * 0.9, 0.2);
      const b = clamp(0.45 + 0.6 * aura, 0, 1.2) * crA;
      this.crMats[0].color.copy(C); this.crMats[0].opacity = 0.2 * b;
      this.crMats[1].color.copy(C); this.crMats[1].opacity = 0.16 * b;
      this.crMats[2].color.copy(C).lerp(new THREE.Color(1, 1, 1), 0.25); this.crMats[2].opacity = 0.95 * crA;
      this.crMats[3].color.copy(C); this.crMats[3].opacity = 0.7 * crA;
      this.crCore.material.color.copy(C); this.crCore.material.opacity = 0.5 * b;
      this.crCore.scale.setScalar(2.4 + 0.4 * Math.sin(this.loopT * 6));
    }

    /* —— rays, flash, anéis, fragmentos, partículas —— */
    this._renderBurstFx(rt, C, w, dt);

    /* —— DOM de texto —— */
    this._renderDom(rt, w);
  }

  _renderBurstFx(rt, C, w, dt) {
    const P = this.plan, started = this.started, cfg = this.cfg;
    const ADDV = (m, v) => (m.material.uniforms.uAlpha.value = v);
    // god rays
    let gA = 0, gB = 0, wid = 0.5, soft = 0.3, rot = 0;
    if (started && P.hasTitle && !this.reduced) {
      const inn = clamp((rt - P.teaseDur) / 0.3), out = 1 - clamp((rt - P.revealAt) / 0.95);
      gA = inn * out * 0.85;
      wid = lerp(0.5, 0.13, easeInOut2(clamp((rt - P.teaseDur) / (P.impactAt + 0.5 - P.teaseDur))));
      soft = lerp(0.3, 0.06, easeInOut2(clamp((rt - P.teaseDur) / (P.impactAt + 0.5 - P.teaseDur))));
      rot = (rt * Math.PI * 2) / 26;
      if (P.mythic) gB = inn * out * 0.7;
    }
    const gu = this.godA.material.uniforms;
    gu.uAlpha.value = gA; gu.uRot.value = rot; gu.uWidth.value = wid; gu.uSoft.value = soft;
    gu.uColor.value.copy(P && P.galactic ? col('#A78BFA') : C);
    this.godA.visible = gA > 0.002;
    const gb = this.godB.material.uniforms;
    gb.uAlpha.value = gB; gb.uRot.value = started ? (-rt * Math.PI * 2) / 18 : 0; gb.uCount.value = 22; gb.uWidth.value = Math.max(0.1, wid * 0.7); gb.uSoft.value = soft;
    this.godB.visible = gB > 0.002;
    // raios radiais do impacto (ÉPICA+)
    let bA = 0;
    if (started && P.radialRays && !this.reduced) {
      const x = (rt - P.impactAt) / 0.7;
      if (x >= 0 && x <= 1) bA = Math.pow(1 - x, 1.5) * 0.8;
    }
    const bu = this.burstQ.material.uniforms;
    bu.uAlpha.value = bA; bu.uCount.value = 32; bu.uWidth.value = 0.08; bu.uSoft.value = 0.05; bu.uRot.value = 0.3;
    bu.uColor.value.copy(C).lerp(new THREE.Color(1, 1, 1), 0.5);
    this.burstQ.visible = bA > 0.002;
    // flash
    let fl = 0;
    if (started && !this.reduced) {
      const x = rt - P.impactAt;
      if (x >= 0) fl = (x < 0.05 ? x / 0.05 : Math.exp(-(x - 0.05) * 7)) * P.flash;
    }
    this.flashQ.material.uniforms.uAlpha.value = fl;
    this.flashQ.visible = fl > 0.003;
    // anéis
    this.rings.forEach((r, i) => {
      let vis = false;
      if (started && !this.reduced && i < P.rings) {
        const p = (rt - P.impactAt - i * cfg.ringStagger) / cfg.ringDuration;
        if (p >= 0 && p <= 1) {
          vis = true;
          r.scale.setScalar(w * lerp(0.15, 3.1, easeOut3(p)));
          r.material.opacity = Math.pow(1 - p, 1.5) * 0.9;
          r.material.color.copy(i % 2 ? new THREE.Color(1, 1, 1) : C);
        }
      }
      r.visible = vis;
    });
    // fragmentos MÍTICA
    this.shards.forEach((g, i) => {
      let vis = false;
      if (started && P.mythic && !this.reduced) {
        const p = (rt - P.impactAt) / 0.85;
        if (p >= 0 && p <= 1) {
          vis = true;
          const ang = (i / 5) * Math.PI * 2 + 0.5 + Math.sin(i * 7.3) * 0.35;
          const dist = w * (0.25 + 0.75 * easeOut3(p)) * (0.8 + 0.4 * ((i * 37) % 10) / 10);
          g.position.set(Math.cos(ang) * dist, Math.sin(ang) * dist, 40);
          g.rotation.z = p * (3 + i) * (i % 2 ? 1 : -1);
          g.scale.setScalar(this.crystalBase * 0.75 * (1 - 0.4 * p));
          g.children.forEach((m) => { m.material.color.copy(C); m.material.opacity = (m.isMesh ? 0.4 : 1) * (1 - p); });
        }
      }
      g.visible = vis;
    });
    this._renderParticles(rt, C, w, dt);
  }

  _renderParticles(rt, C, w) {
    const ps = this.particles, P = this.plan, started = this.started, cfg = this.cfg;
    if (this.reduced || this.effectsDone) { if (ps.mode !== 'none') ps.setMode('none'); return; }
    const now = started ? this.invEnd + rt : this.t;
    const burst = started && rt >= P.impactAt;
    if (!burst) {
      if (ps.mode !== 'gather') ps.setMode('gather');
      const { p } = ps;
      const white = new THREE.Color(1, 1, 1);
      const enter = clamp(this.t / 0.4);
      for (let i = 0; i < ps.max; i++) {
        if (i >= ps.active) { p.colr[i * 4 + 3] = 0; p.size[i] = 0; continue; }
        const k = clamp(now / this.invEnd - ps.delay[i]);
        const minR = w * (0.2 + 0.26 * ps.mixv[i]);
        const rad = Math.max(minR, ps.dist[i] * (1 - k * k));
        const ang = ps.ang[i] + this.loopT * (0.7 + (i % 5) * 0.15) + (1 - k) * 2.2;
        p.pos[i * 3] = Math.cos(ang) * rad; p.pos[i * 3 + 1] = Math.sin(ang) * rad * 1.1; p.pos[i * 3 + 2] = 0;
        const c = ps.mixv[i] < 0.22 ? white : C;
        const born = clamp((this.t - ps.born[i]) / 0.25);
        p.colr.set([c.r, c.g, c.b, (0.25 + 0.65 * k) * born * enter], i * 4);
        p.size[i] = ps.sz[i] * 1.5 + 0.5;
      }
      p.geo.attributes.position.needsUpdate = p.geo.attributes.aColor.needsUpdate = p.geo.attributes.aSize.needsUpdate = true;
      p.geo.setDrawRange(0, ps.max);
    } else {
      if (ps.mode !== 'burst') ps.setMode('burst');
      const { l } = ps;
      const x = rt - P.impactAt;
      const reach = cfg.particleReach, rs = 1.15 + 0.22 * P.tier;
      const pal = P.galactic ? cfg.particleGalaxy.map(col) : null;
      const white = new THREE.Color(1, 1, 1);
      for (let i = 0; i < ps.max; i++) {
        if (i >= ps.active) { l.colr.fill(0, i * 8, i * 8 + 8); continue; }
        const pr = clamp((x - ps.delay[i] * 0.3) / P.particleDur);
        const e = 1 - Math.pow(1 - pr, 3);
        const et = 1 - Math.pow(1 - clamp(pr - 0.14), 3);
        const rr = (ps.dist[i] / 190) * rs;
        const hx = Math.cos(ps.ang[i]) * reach.x * rr, hy = Math.sin(ps.ang[i]) * reach.y * rr;
        l.pos.set([hx * et, hy * et, 0, hx * e, hy * e, 0], i * 6);
        const c = pal ? pal[i % pal.length] : (i % 3 === 1 ? white : C);
        const al = pr >= 1 ? 0 : 1 - pr;
        l.colr.set([c.r, c.g, c.b, al * 0.15, c.r, c.g, c.b, al], i * 8);
      }
      l.geo.attributes.position.needsUpdate = l.geo.attributes.aColor.needsUpdate = true;
      l.geo.setDrawRange(0, ps.max * 2);
    }
  }

  _renderDom(rt, w) {
    const P = this.plan, started = this.started, el = this.el;
    const set = (k, v, fn) => { if (this.cache[k] !== v) { this.cache[k] = v; fn(v); } };
    // status: letter-spacing yoyo durante a invocação
    if (!started || rt < P.revealAt) {
      const s0 = this.cfg.crystalSpinAt;
      const u = clamp((this.t - s0) / Math.max(0.01, this.invEnd - s0));
      const tri = 1 - Math.abs(((u * 3) % 2) - 1);
      const sp = 0.02 + 0.14 * easeInOut2(this.t < s0 ? 0 : tri);
      set('sp', sp.toFixed(3), (v) => (el.status.style.letterSpacing = v + 'em'));
    } else set('sp', '0.14', (v) => (el.status.style.letterSpacing = v + 'em'));
    if (!started) return;
    // título
    if (P.hasTitle && !this.reduced) {
      const tp = rt - P.teaseDur;
      let op = 0, sc = 1.6;
      if (tp >= 0) {
        op = clamp(tp / 0.2) * (1 - clamp((rt - (P.impactAt - 0.12)) / 0.12));
        sc = lerp(1.6, 1, clamp(easeOutBack(clamp(tp / 0.3)), 0, 1.2));
      }
      set('tt', `${op.toFixed(3)}|${sc.toFixed(3)}`, () => { el.title.style.opacity = op; el.title.style.transform = `scale(${sc})`; });
    } else set('tt', 'off', () => (el.title.style.opacity = 0));
    // detalhes
    const bd = this.cfg.badgeDuration;
    const rl = clamp((rt - (P.cardDetailsAt - 0.1)) / 0.25);
    set('rl', rl.toFixed(2), () => (el.rarity.style.opacity = rl));
    const q = (v) => Math.round(v * 40) / 40;
    this.letters && this.letters.forEach((s, i) => {
      const p = clamp((rt - P.cardDetailsAt - i * 0.02) / 0.3);
      const k = this.reduced ? 1 : easeOut3(p);
      set('L' + i, q(k), () => { s.style.opacity = k; s.style.transform = `translateY(${((1 - k) * 8).toFixed(1)}px)`; });
    });
    const pts = clamp((rt - P.cardDetailsAt - 0.1) / 0.3);
    set('pts', pts.toFixed(2), () => (el.pts.style.opacity = pts));
    // tag: NOVA = pop elástico, REPETIDA = entra "riscando" com blur e tremor
    const tp = clamp((rt - P.tagAt) / 0.45);
    if (this.pull.isNew || this.pull.compact) {
      if (this.pull.compact && !this.reduced) {
        const sh = tp > 0 && tp < 1 ? Math.sin(tp * 40) * 3 * (1 - tp) : 0;
        set('tg', `${tp.toFixed(2)}|${sh.toFixed(1)}`, () => {
          el.tag.style.opacity = easeOut3(tp);
          el.tag.style.filter = `blur(${((1 - tp) * 4).toFixed(1)}px)`;
          el.tag.style.transform = `translateX(${sh.toFixed(1)}px)`;
        });
      } else {
        const sc = this.reduced ? 1 : easeOutElastic(tp);
        set('tg', tp.toFixed(2), () => { el.tag.style.opacity = clamp(tp * 3); el.tag.style.transform = `scale(${sc.toFixed(3)})`; });
      }
    }
    // botão: pop ao virar "Continuar"
    if (this.continueReady && !this.reduced) {
      const bp = clamp((rt - this.continueAtClock) / 0.3);
      set('bp', bp.toFixed(2), () => (el.actions.style.transform = `scale(${(0.9 + 0.1 * easeOutBack(bp)).toFixed(3)})`));
    }
  }

  /* ───────── encerramento ───────── */
  _teardown() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.active = false;
    this.sfx.dispose();
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
    if (this._onOrient) window.removeEventListener('deviceorientation', this._onOrient);
    if (this.renderer) {
      this.scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach((m) => { m.map && m.map.dispose(); m.dispose(); });
      });
      [this.glowTex, this.radTex, this.runeTexture, this.frontTex].forEach((t) => t && t.dispose());
      this.particles.dispose();
      this.renderer.dispose();
      try { this.renderer.forceContextLoss(); } catch { /* ignore */ }
    }
    try { this.dlg.close(); } catch { /* ignore */ }
    this.dlg.remove();
    const pf = this.prevFocus;
    if (pf && typeof pf.focus === 'function') { try { pf.focus({ preventScroll: true }); } catch { /* ignore */ } }
  }
}

export { RollStageEngine, buildSteps };
