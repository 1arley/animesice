"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { gsap } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { GachaSkin } from "@/types";

/* ------------------------------------------------------------------ */
/* Constantes visuais                                                  */
/* ------------------------------------------------------------------ */

// Cor de acento para skins — gradiente de roxo→ciano similar ao estilo galáctico.
const SKIN_ACCENT = "#a78bfa";
const SKIN_ACCENT_B = "#38e8da";

// Geometria do círculo de invocação (viewBox 400x400, centro 200,200).
const CX = 200;
const CY = 200;

function pt(radius: number, deg: number) {
  const angle = (deg * Math.PI) / 180;
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)] as const;
}

function ticksPath(r1: number, r2: number, count: number) {
  let d = "";
  for (let i = 0; i < count; i += 1) {
    const [x1, y1] = pt(r1, (i * 360) / count);
    const [x2, y2] = pt(r2, (i * 360) / count);
    d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}

function polyPath(radius: number, start: number, sides: number) {
  let d = "";
  for (let i = 0; i < sides; i += 1) {
    const [x, y] = pt(radius, start + (i * 360) / sides);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

function runesPath(radius: number, count: number, size: number) {
  let d = "";
  for (let i = 0; i < count; i += 1) {
    const [x, y] = pt(radius, (i * 360) / count + 22.5);
    d += `M${x.toFixed(1)} ${(y - size).toFixed(1)}L${(x + size).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y + size).toFixed(1)}L${(x - size).toFixed(1)} ${y.toFixed(1)}Z`;
    d += `M${(x - size * 0.45).toFixed(1)} ${y.toFixed(1)}h${(size * 0.9).toFixed(1)}M${x.toFixed(1)} ${(y - size * 0.45).toFixed(1)}v${(size * 0.9).toFixed(1)}`;
  }
  return d;
}

const SIGIL = {
  ticks: ticksPath(178, 188, 60),
  hexA: polyPath(152, -90, 3),
  hexB: polyPath(152, 90, 3),
  runes: runesPath(172, 8, 8),
  spokes: ticksPath(36, 130, 12),
};

/* ------------------------------------------------------------------ */
/* Partículas                                                          */
/* ------------------------------------------------------------------ */

function createParticles(count: number, seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return Array.from({ length: count }, (_, index) => {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    const unit = (hash >>> 0) / 4294967295;
    return {
      angle: (index / Math.max(1, count)) * Math.PI * 2 + unit * 0.24,
      distance: 80 + unit * 240,
      size: 1 + unit * 2.2,
      delay: unit * 0.28,
    };
  });
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

/* ------------------------------------------------------------------ */
/* Áudio (idêntico ao RollStage, opt-in)                              */
/* ------------------------------------------------------------------ */

const SOUND_KEY = "animesice:roll-sound";
const MASTER_GAIN = 0.55;

type ToneOptions = { type?: OscillatorType; f0: number; f1?: number; at?: number; dur: number; vol: number };
type NoiseOptions = { type: BiquadFilterType; f0: number; f1: number; dur: number; vol: number; q?: number; at?: number; attack?: number };

function useSkinAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const noiseRef = useRef<AudioBuffer | null>(null);
  const enabledRef = useRef(false);
  const active = useRef(new Set<AudioScheduledSourceNode>());
  const [enabled, setEnabled] = useState(false);

  const ensure = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    let ctx = ctxRef.current;
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        ctx = new Ctor();
        const master = ctx.createGain();
        master.gain.value = MASTER_GAIN;
        const comp = ctx.createDynamicsCompressor();
        master.connect(comp);
        comp.connect(ctx.destination);
        ctxRef.current = ctx;
        masterRef.current = master;
      } catch { return null; }
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  }, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SOUND_KEY) === "on") {
        enabledRef.current = true;
        setEnabled(true);
        ensure();
      }
    } catch { /* storage indisponível */ }
    const live = active.current;
    return () => {
      live.forEach((n) => { try { n.stop(); } catch { /* já parou */ } });
      live.clear();
      void ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      masterRef.current = null;
    };
  }, [ensure]);

  const sfx = useMemo(() => {
    const track = (n: AudioScheduledSourceNode) => {
      active.current.add(n);
      n.onended = () => { active.current.delete(n); };
    };
    const tone = (ctx: AudioContext, out: AudioNode, o: ToneOptions) => {
      const t = ctx.currentTime + (o.at ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = o.type ?? "sine";
      osc.frequency.setValueAtTime(o.f0, t);
      if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(o.vol, t + Math.min(0.02, o.dur / 4));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(gain); gain.connect(out);
      osc.start(t); osc.stop(t + o.dur + 0.05);
      track(osc);
    };
    const noiseBuffer = (ctx: AudioContext) => {
      if (noiseRef.current) return noiseRef.current;
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      noiseRef.current = buf;
      return buf;
    };
    const noise = (ctx: AudioContext, out: AudioNode, o: NoiseOptions) => {
      const t = ctx.currentTime + (o.at ?? 0);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = o.type; filter.Q.value = o.q ?? 1;
      filter.frequency.setValueAtTime(o.f0, t);
      filter.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(o.vol, t + o.dur * (o.attack ?? 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      src.connect(filter); filter.connect(gain); gain.connect(out);
      src.start(t); src.stop(t + o.dur + 0.05);
      track(src);
    };
    const run = (fn: (ctx: AudioContext, out: AudioNode) => void) => {
      if (!enabledRef.current) return;
      const ctx = ensure();
      const out = masterRef.current;
      if (!ctx || !out || ctx.state !== "running") return;
      fn(ctx, out);
    };
    return {
      charge: (seconds: number) => run((ctx, out) => {
        noise(ctx, out, { type: "bandpass", f0: 220, f1: 2800, dur: seconds, vol: 0.18, q: 2.0, attack: 0.9 });
        tone(ctx, out, { type: "triangle", f0: 70, f1: 440, dur: seconds, vol: 0.08 });
      }),
      impact: () => run((ctx, out) => {
        tone(ctx, out, { f0: 150, f1: 32, dur: 0.55, vol: 0.7 });
        noise(ctx, out, { type: "lowpass", f0: 1800, f1: 150, dur: 0.4, vol: 0.38, attack: 0.03 });
      }),
      /** Chime de skin: tom mais etéreo/misterioso que o gacha de cartas. */
      chime: () => run((ctx, out) => {
        const base = 440;
        const ratios = [1, 1.333, 1.5, 2];
        ratios.forEach((r, i) => {
          tone(ctx, out, { type: "triangle", f0: base * r, at: i * 0.06, dur: 1.4, vol: 0.18 });
        });
        // Eco levemente desafinado dá caráter único.
        tone(ctx, out, { type: "sine", f0: base * 2 * 1.00404, at: 0.14, dur: 1.1, vol: 0.08 });
        tone(ctx, out, { f0: 1800, f1: 2600, at: 0.03, dur: 0.5, vol: 0.035 });
      }),
      silence: () => {
        active.current.forEach((n) => { try { n.stop(); } catch { /* já parou */ } });
        active.current.clear();
      },
    };
  }, [ensure]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    try { window.localStorage.setItem(SOUND_KEY, next ? "on" : "off"); } catch { /* ignora */ }
    if (!next) { sfx.silence(); return; }
    const ctx = ensure();
    if (ctx) void ctx.resume().catch(() => {});
  }, [ensure, sfx]);

  return { enabled, toggle, sfx };
}

/* ------------------------------------------------------------------ */
/* CSS inline                                                         */
/* ------------------------------------------------------------------ */

const SKIN_CSS = `
.skin-reveal-dialog[data-animating="true"] [data-stage],
.skin-reveal-dialog[data-animating="true"] [data-flip],
.skin-reveal-dialog[data-animating="true"] [data-glow],
.skin-reveal-dialog[data-animating="true"] [data-godrays-skin] { will-change: transform, opacity; }
.skin-reveal-dialog .skin-card-tilt {
  transform: rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg));
  transition: transform 140ms ease-out;
}
.skin-reveal-dialog [data-sweep-skin] {
  background: linear-gradient(105deg, transparent 28%, rgba(167,139,250,0.55) 42%, rgba(255,255,255,0.9) 50%, rgba(56,232,218,0.45) 58%, transparent 72%);
  mix-blend-mode: color-dodge;
}
`;

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

interface SkinRevealProps {
  skin: GachaSkin;
  onClose: () => void;
}

export function SkinReveal({ skin, onClose }: SkinRevealProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const filterId = useId().replace(/:/g, "");
  const reduceMotion = usePrefersReducedMotion();
  const flat = reduceMotion;
  const flatRef = useRef(flat);
  flatRef.current = flat;
  const audio = useSkinAudio();
  const sfxRef = useRef(audio.sfx);
  sfxRef.current = audio.sfx;

  const [motionReady, setMotionReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [effectsDone, setEffectsDone] = useState(false);

  const particlesRef = useRef(createParticles(70, skin.id));
  const particleMode = useRef<"gather" | "burst" | "none">("gather");
  const burstStart = useRef(0);
  const userTilt = useRef(false);
  const continuation = useRef<HTMLButtonElement>(null);
  const timeline = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const activeLoops = useRef<Array<{ kill: () => void }>>([]);

  const fxLive = motionReady && !reduceMotion && !effectsDone;
  const invocationEnd = 1.4; // duração da fase de invocação antes do impacto

  /* Abre o modal */
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (el.open) el.close();
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, []);

  useEffect(() => { setMotionReady(true); }, []);
  useEffect(() => { if (canContinue) continuation.current?.focus(); }, [canContinue]);

  /* Tilt da carta na vitrine */
  const applyTilt = useCallback((x: number, y: number) => {
    const root = dialog.current;
    if (!root) return;
    const tilt = root.querySelector<HTMLElement>("[data-card-tilt-skin]");
    tilt?.style.setProperty("--tilt-x", `${(-y * 16).toFixed(2)}deg`);
    tilt?.style.setProperty("--tilt-y", `${(x * 16).toFixed(2)}deg`);
  }, []);

  /* Vitrine: flutuação + derive suave */
  useEffect(() => {
    if (!revealed || flat) return;
    const flip = dialog.current?.querySelector<HTMLElement>("[data-flip]");
    if (!flip) return;
    const drift = { p: 0.5 };
    const bob = gsap.to(flip, { y: -6, duration: 2.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
    const sway = gsap.to(drift, {
      p: 1, duration: 3.8, yoyo: true, repeat: -1, ease: "sine.inOut",
      onUpdate: () => {
        if (!userTilt.current) applyTilt((drift.p - 0.5) * 0.45, Math.sin(drift.p * Math.PI) * 0.18 - 0.09);
      },
    });
    return () => { bob.kill(); sway.kill(); };
  }, [revealed, flat, applyTilt]);

  /* Vitrine: sweep periódico */
  useEffect(() => {
    if (!revealed || flat) return;
    const root = dialog.current;
    if (!root) return;
    const sweep = root.querySelector<HTMLElement>("[data-sweep-skin]");
    if (!sweep) return;
    let handle: ReturnType<typeof setTimeout>;
    const fire = () => {
      gsap.set(sweep, { opacity: 1, xPercent: -150 });
      gsap.to(sweep, {
        xPercent: 150, duration: 0.7, ease: "power1.inOut",
        onComplete: () => { gsap.set(sweep, { opacity: 0 }); },
      });
      handle = setTimeout(fire, 3500 + Math.random() * 1000);
    };
    handle = setTimeout(fire, 1000);
    return () => { clearTimeout(handle); gsap.set(sweep, { opacity: 0 }); };
  }, [revealed, flat]);

  /* Timeline principal */
  useEffect(() => {
    if (!motionReady) return;
    const root = dialog.current;
    if (!root) return;

    if (reduceMotion) {
      setRevealed(true); setCanContinue(true); setEffectsDone(true);
      sfxRef.current.chime();
      // Glow visível em modo estático.
      const glow = root.querySelector<HTMLElement>("[data-glow]");
      const tint = root.querySelector<HTMLElement>("[data-tint-skin]");
      if (glow) gsap.set(glow, { opacity: 0.28 });
      if (tint) gsap.set(tint, { opacity: 0.18 });
      return;
    }

    root.setAttribute("data-animating", "true");

    const one = <T extends Element>(sel: string) => root.querySelector<T>(sel);
    const all = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

    const stage = one<HTMLElement>("[data-stage]");
    const frame = one<HTMLElement>("[data-shake-frame]");
    const canvas = one<HTMLCanvasElement>("canvas");
    const ctx2d = canvas?.getContext("2d") ?? null;
    const glow = one<HTMLElement>("[data-glow]");
    const tint = one<HTMLElement>("[data-tint-skin]");
    const crystal = one<HTMLElement>("[data-crystal-skin]");
    const orbitSvg = one<SVGElement>("[data-orbit-svg]");
    const orbitOuter = one<SVGElement>("[data-orbit-outer]");
    const orbitInner = one<SVGElement>("[data-orbit-inner]");
    const runeOrbit = one<SVGElement>("[data-rune-orbit]");
    const flip = one<HTMLElement>("[data-flip]");
    const flash = one<HTMLElement>("[data-flash-skin]");
    const rings = all<SVGCircleElement>("[data-ring-skin]");
    const rays = one<SVGGElement>("[data-radial-rays-skin]");
    const godrays = one<HTMLElement>("[data-godrays-skin]");
    const skinArt = one<HTMLElement>("[data-skin-art]");
    const sweep = one<HTMLElement>("[data-sweep-skin]");
    const skinName = one<HTMLElement>("[data-skin-name]");
    const loops: Array<{ kill: () => void }> = [];
    let cleared = false;
    const t0 = performance.now();
    const clock = () => (performance.now() - t0) / 1000;
    let rootRect = root.getBoundingClientRect();
    let stageRect = stage?.getBoundingClientRect() ?? rootRect;
    const isMobile = window.matchMedia("(max-width: 480px)").matches;
    const measureBounds = () => {
      rootRect = root.getBoundingClientRect();
      if (stage) stageRect = stage.getBoundingClientRect();
    };
    measureBounds();
    window.addEventListener("resize", measureBounds);

    particleMode.current = "gather";

    /* Draw loop de partículas */
    const draw = () => {
      if (!canvas || !ctx2d || !stage || !canvas.isConnected) return;
      const mode = particleMode.current;
      if (mode === "none") {
        if (!cleared) { ctx2d.setTransform(1, 0, 0, 1, 0, 0); ctx2d.clearRect(0, 0, canvas.width, canvas.height); cleared = true; }
        return;
      }
      cleared = false;
      const rect = rootRect;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, width, height);
      const box = stageRect;
      const cx = box.left - rect.left + box.width / 2;
      const cy = box.top - rect.top + box.height / 2;
      const list = particlesRef.current;
      const now = clock();
      if (mode === "gather") {
        const visible = Math.min(list.length, isMobile ? 50 : 70);
        for (let i = 0; i < visible; i += 1) {
          const p = list[i]!;
          const progress = clamp01(now / invocationEnd - p.delay);
          const eased = progress * progress;
          const orbitMin = 14 + (i % 6) * 5;
          const radius = progress < 1
            ? p.distance * (1 - eased) + orbitMin
            : orbitMin + Math.sin(now * 3 + i) * 2.5;
          const angle = p.angle + now * (0.55 + (i % 5) * 0.18) + progress * 1.2;
          ctx2d.globalAlpha = 0.2 + 0.55 * eased;
          ctx2d.fillStyle = i % 3 === 1 ? "#F1F5F9" : (i % 2 === 0 ? SKIN_ACCENT : SKIN_ACCENT_B);
          ctx2d.fillRect(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, p.size, p.size);
        }
      } else {
        const duration = 0.58;
        ctx2d.globalCompositeOperation = "lighter";
        for (let i = 0; i < list.length; i += 1) {
          const p = list[i]!;
          const progress = clamp01((now - burstStart.current - p.delay * 0.3) / duration);
          if (progress <= 0) continue;
          const eased = 1 - (1 - progress) ** 3;
          const tail = 1 - (1 - Math.max(0, progress - 0.06)) ** 3;
          const rx = p.distance * (180 / 180);
          const ry = p.distance * (220 / 230);
          ctx2d.globalAlpha = (1 - progress) * 0.95;
          const palette = [SKIN_ACCENT, "#F1F5F9", SKIN_ACCENT_B];
          ctx2d.strokeStyle = palette[i % palette.length]!;
          ctx2d.lineWidth = p.size;
          ctx2d.beginPath();
          ctx2d.moveTo(cx + Math.cos(p.angle) * rx * tail, cy + Math.sin(p.angle) * ry * tail);
          ctx2d.lineTo(cx + Math.cos(p.angle) * rx * eased, cy + Math.sin(p.angle) * ry * eased);
          ctx2d.stroke();
        }
        ctx2d.globalCompositeOperation = "source-over";
      }
      ctx2d.globalAlpha = 1;
    };
    gsap.ticker.add(draw);

    const placeFx = () => {
      if (!stage) return;
      const rect = root.getBoundingClientRect();
      const box = stage.getBoundingClientRect();
      const cx = box.left - rect.left + box.width / 2;
      const cy = box.top - rect.top + box.height / 2;
      if (godrays) gsap.set(godrays, { left: cx, top: cy });
      const raysPos = one<SVGGElement>("[data-rays-pos-skin]");
      if (raysPos) {
        const k = Math.max(rect.width, rect.height) / 100;
        const ux = (cx - (rect.width - 100 * k) / 2) / k;
        const uy = (cy - (rect.height - 100 * k) / 2) / k;
        raysPos.setAttribute("transform", `translate(${ux.toFixed(2)} ${uy.toFixed(2)})`);
      }
    };

    const tl = gsap.timeline({ paused: true });
    timeline.current = tl;

    /* Spins das órbitas */
    if (orbitOuter) loops.push(gsap.to(orbitOuter, { rotation: 360, duration: 9, repeat: -1, ease: "none", transformOrigin: "50% 50%" }));
    if (orbitInner) loops.push(gsap.to(orbitInner, { rotation: -360, duration: 6.5, repeat: -1, ease: "none", transformOrigin: "50% 50%" }));
    if (runeOrbit) loops.push(gsap.to(runeOrbit, { rotation: 360, duration: 3.8, repeat: -1, ease: "none", transformOrigin: "50% 50%" }));

    /* Pulsação do glow */
    let beat: ReturnType<typeof gsap.timeline> | null = null;
    if (glow) {
      beat = gsap.timeline({ paused: true, repeat: -1 });
      beat
        .to(glow, { opacity: 0.55, scale: 1.12, duration: 0.12, ease: "power2.out" })
        .to(glow, { opacity: 0.28, scale: 1.03, duration: 0.14, ease: "power1.in" })
        .to(glow, { opacity: 0.62, scale: 1.16, duration: 0.14, ease: "power2.out" })
        .to(glow, { opacity: 0.18, scale: 1, duration: 0.5, ease: "sine.inOut" });
      loops.push(beat);
    }
    activeLoops.current = loops;

    /* Fase de entrada */
    tl.fromTo("[data-vignette-skin]", { opacity: 0 }, { opacity: 0.72, duration: 0.18, ease: "power1.out" }, 0);
    if (frame) tl.fromTo(frame, { scale: 0.985 }, { scale: 1, duration: 0.3, ease: "power3.out" }, 0);
    if (stage) tl.fromTo(stage, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: "power3.out" }, 0);

    tl.call(() => sfxRef.current.charge(invocationEnd - 0.1), [], 0.1);
    if (crystal) tl.to(crystal, { rotation: 720, scale: 0.85, duration: 0.95, ease: "power2.inOut" }, 0.2);
    if (orbitSvg) {
      // Acelera os rings durante a tensão.
      const spinTweens = loops.slice(0, 3);
      if (spinTweens.length) tl.to(spinTweens, { timeScale: 2.8, duration: invocationEnd - 0.1, ease: "power2.in" }, 0.1);
    }
    if (beat) {
      const pulse = beat;
      tl.call(() => pulse.play(), [], 0.1);
      tl.to(pulse, { timeScale: 1.3, duration: invocationEnd, ease: "none" }, 0.1);
    }
    if (tint) tl.to(tint, { opacity: 0.38, duration: invocationEnd, ease: "power1.in" }, 0);

    /* Impacto */
    const impactAt = invocationEnd;
    const flipDur = 0.44;
    const revealAt = impactAt + 0.22;
    const cardReadyAt = revealAt + flipDur;
    const detailsAt = cardReadyAt + 0.18;
    const stopAtImpact = loops.slice(0, 4); // spins + beat

    tl.call(() => {
      stopAtImpact.forEach((l) => l.kill());
      placeFx();
      particleMode.current = "burst";
      burstStart.current = clock();
      sfxRef.current.impact();
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(30);
      }
    }, [], impactAt);

    if (orbitSvg) tl.to(orbitSvg, { opacity: 0, duration: 0.22, ease: "power1.out" }, impactAt);
    if (glow) tl.to(glow, { opacity: 0.28, scale: 1.04, duration: 0.4, ease: "power2.out" }, impactAt);
    if (stage) tl.to(stage, { scale: 1, duration: 0.22, ease: "power3.out" }, impactAt);
    if (crystal) tl.to(crystal, { scale: 1.8, opacity: 0, duration: 0.22, ease: "power2.out" }, impactAt);

    if (flash) {
      tl.fromTo(flash, { opacity: 0 }, { opacity: 0.7, duration: 0.05, ease: "none" }, impactAt);
      tl.to(flash, { opacity: 0, duration: 0.07, ease: "power1.out" }, impactAt + 0.05);
    }
    if (tint) {
      tl.to(tint, { opacity: 1, duration: 0.08, ease: "power1.out" }, impactAt);
      tl.to(tint, { opacity: 0.28, duration: 0.4, ease: "power1.out" }, impactAt + 0.1);
    }

    // Ondas de ring: 2 ondas para skins.
    rings.slice(0, 2).forEach((ring, i) => {
      tl.fromTo(ring, { scale: 0.15, opacity: 0.85 }, {
        scale: 3,
        opacity: 0,
        duration: 0.55,
        ease: "power2.out",
        transformOrigin: "50% 50%",
      }, impactAt + i * 0.12);
    });

    // Raios radiais.
    if (rays) {
      tl.fromTo(rays, { opacity: 0, rotation: -8, scale: 0.55, transformOrigin: "50% 50%" }, {
        opacity: 0.7, rotation: 0, scale: 1, duration: 0.22, ease: "power2.out",
      }, impactAt);
      tl.to(rays, { opacity: 0, rotation: 12, scale: 1.28, duration: 0.5, ease: "power1.in" }, impactAt + 0.22);
    }

    // God rays para skin — girando suavemente.
    if (godrays) {
      gsap.set(godrays, { xPercent: -50, yPercent: -50, opacity: 0 });
      const godSpin = gsap.to(godrays, { rotation: 360, duration: 22, repeat: -1, ease: "none", paused: true });
      loops.push(godSpin);
      tl.call(() => { placeFx(); godSpin.play(); }, [], impactAt);
      tl.fromTo(godrays, { opacity: 0 }, { opacity: 0.7, duration: 0.55, ease: "power2.out" }, impactAt);
      tl.to(godrays, { opacity: 0, duration: 0.4, ease: "power1.inOut" }, revealAt + flipDur * 0.5);
    }

    // Shake no frame.
    if (frame) {
      [1, -0.8, 0.6, -0.45, 0.2, 0].forEach((mult, si) => {
        tl.to(frame, { x: mult * 5, y: -mult * 5 * 0.6, duration: 0.042, ease: "none" }, impactAt + si * 0.042);
      });
    }

    /* Revelação */
    tl.call(() => setRevealed(true), [], revealAt);
    if (flip) {
      tl.to(flip, { rotationY: 180, duration: flipDur, ease: "power2.inOut" }, revealAt);
      tl.to(flip, { scale: 1.08, duration: flipDur * 0.4, ease: "power2.out" }, revealAt);
      tl.to(flip, { scale: 1, duration: flipDur * 0.6, ease: "power2.inOut" }, revealAt + flipDur * 0.4);
    }
    if (skinArt) tl.fromTo(skinArt, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power1.out" }, cardReadyAt - 0.16);

    // Sweep.
    if (sweep) {
      tl.set(sweep, { opacity: 1, xPercent: -150 }, cardReadyAt);
      tl.to(sweep, { xPercent: 150, duration: 0.65, ease: "power1.inOut" }, cardReadyAt);
      tl.set(sweep, { opacity: 0 }, cardReadyAt + 0.65);
    }

    // Nome da skin.
    if (skinName) {
      tl.fromTo(skinName, { scale: 1.8, opacity: 0 }, {
        scale: 1, opacity: 1, duration: 0.32, ease: "back.out(2.2)",
      }, detailsAt);
    }

    tl.call(() => sfxRef.current.chime(), [], cardReadyAt);

    const continueAt = Math.max(cardReadyAt + 0.2, detailsAt + 0.32 + 0.1);
    tl.call(() => {
      setCanContinue(true);
      if (continuation.current) {
        gsap.fromTo(continuation.current, { opacity: 0.35, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.38, ease: "power2.out" });
      }
    }, [], continueAt);

    const effectsEnd = Math.max(continueAt, impactAt + 0.58 + 0.1, revealAt + 0.4);
    tl.call(() => {
      particleMode.current = "none";
      loops.forEach((l) => l.kill());
      activeLoops.current = [];
      root.removeAttribute("data-animating");
      setEffectsDone(true);
    }, [], effectsEnd);

    tl.play();

    return () => {
      gsap.ticker.remove(draw);
      window.removeEventListener("resize", measureBounds);
      tl.kill();
      loops.forEach((l) => l.kill());
      activeLoops.current = [];
      timeline.current = null;
      root.removeAttribute("data-animating");
    };
  }, [motionReady, reduceMotion]);

  const showGodrays = fxLive;
  const showRays = fxLive;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="skin-reveal-title"
      className="skin-reveal-dialog fixed inset-0 m-0 h-[100dvh] min-h-[100dvh] max-h-none w-screen max-w-none overflow-x-hidden overflow-y-auto border-0 bg-ink-deep/95 p-4 text-snow backdrop:bg-ink-deep/95"
      style={{ "--skin-accent": SKIN_ACCENT } as CSSProperties}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault(); onClose();
        }
      }}
    >
      <style>{SKIN_CSS}</style>

      {/* Vignette */}
      <div data-vignette-skin aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-black opacity-0" />

      {/* Tint de cor */}
      <div
        data-tint-skin
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-0"
        style={{
          backgroundColor: SKIN_ACCENT,
          maskImage: "radial-gradient(circle at 50% 45%, #000 0%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 45%, #000 0%, transparent 65%)",
        }}
      />

      {/* Canvas de partículas */}
      {fxLive && <canvas aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] h-full w-full opacity-90" />}

      {/* God rays */}
      {showGodrays && (
        <div
          data-godrays-skin
          aria-hidden="true"
          className="pointer-events-none fixed z-[1]"
          style={{
            left: "50%",
            top: "50%",
            width: "150vmax",
            height: "150vmax",
            opacity: 0,
            mixBlendMode: "screen",
            backgroundImage: `repeating-conic-gradient(from 0deg, ${SKIN_ACCENT}55 0deg 3deg, transparent 3deg 13deg)`,
            maskImage: "radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.65) 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.65) 40%, transparent 100%)",
          }}
        />
      )}

      {/* Raios radiais SVG */}
      {showRays && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none fixed inset-0 z-[2] h-full w-full"
        >
          <g data-rays-pos-skin transform="translate(50 50)">
            <g data-radial-rays-skin fill="none" stroke={SKIN_ACCENT} strokeWidth="0.28" style={{ opacity: 0 }}>
              {Array.from({ length: 28 }, (_, i) => (
                <path key={i} d={i % 2 ? "M0-4V-65" : "M0-7V-88"} transform={`rotate(${i * 12.857})`} />
              ))}
              <circle r="28" strokeDasharray="0.5 2" />
            </g>
          </g>
        </svg>
      )}

      {/* Flash */}
      {!flat && <div data-flash-skin aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 bg-white opacity-0" />}

      {/* Conteúdo principal */}
      <div data-shake-frame className="relative z-10 flex min-h-full flex-col items-center justify-center gap-4 py-4 sm:gap-5">
        <p className="max-w-[calc(100%-7rem)] text-center font-mono text-caption uppercase tracking-[0.24em] text-ice/90 sm:max-w-none">
          ANIMESICE <span aria-hidden="true">/</span> SINAL DE INVOCAÇÃO
        </p>
        <h2 id="skin-reveal-title" className="sr-only">Revelação de skin</h2>
        <h2 aria-hidden="true" className="min-h-8 text-center font-display text-display-lg">
          {revealed ? "Sua nova skin" : "Invocando sua skin…"}
        </h2>
        <p className="sr-only" aria-live="polite">
          {revealed ? `Skin revelada: ${skin.name}. Adicionada à sua coleção.` : "Invocação em andamento."}
        </p>

        {/* Stage */}
        <div
          data-stage
          className="relative z-10 aspect-square w-[min(70vw,360px)] max-w-full"
          style={{ perspective: 1000 }}
          onPointerMove={(e) => {
            if (flat || !revealed) return;
            const rect = e.currentTarget.getBoundingClientRect();
            userTilt.current = true;
            applyTilt((e.clientX - rect.left) / rect.width - 0.5, (e.clientY - rect.top) / rect.height - 0.5);
          }}
          onPointerLeave={() => { userTilt.current = false; applyTilt(0, 0); }}
        >
          {/* Glow de fundo */}
          <div data-glow aria-hidden="true" className="absolute inset-[-10%] rounded-full opacity-18 blur-3xl" style={{ backgroundColor: SKIN_ACCENT }} />

          {/* Órbitas SVG */}
          {fxLive && (
            <svg
              data-orbit-svg
              aria-hidden="true"
              viewBox="0 0 400 400"
              className="pointer-events-none absolute inset-[-10%] h-[120%] w-[120%] overflow-visible"
              style={{ color: SKIN_ACCENT }}
            >
              <defs>
                <filter id={`${filterId}-glow-skin`} x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1.8 0" result="colored" />
                  <feMerge><feMergeNode in="colored" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g data-orbit-outer fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.6" filter={`url(#${filterId}-glow-skin)`}>
                <circle cx={CX} cy={CY} r="196" strokeDasharray="2 9" />
                <circle cx={CX} cy={CY} r="185" strokeWidth="0.7" opacity="0.7" />
                <path d={SIGIL.ticks} strokeWidth="0.9" />
              </g>
              <g data-orbit-inner fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.75">
                <circle cx={CX} cy={CY} r="155" strokeDasharray="52 16 4 16" />
                <path d={SIGIL.hexA} strokeWidth="1" />
                <path d={SIGIL.hexB} strokeWidth="1" />
              </g>
              <g data-rune-orbit fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.9">
                <path d={SIGIL.runes} />
              </g>
              <path d={SIGIL.spokes} fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.14" />

              {/* Rings de impacto */}
              {[0, 1].map((i) => (
                <circle
                  key={i}
                  data-ring-skin
                  cx={CX} cy={CY} r="90"
                  fill="none"
                  stroke={SKIN_ACCENT}
                  strokeWidth={i === 0 ? 2.2 : 1.3}
                  style={{ opacity: 0 }}
                />
              ))}
            </svg>
          )}

          {/* Flip da carta */}
          <div
            data-flip
            className="relative aspect-square"
            style={{ transformStyle: flat ? "flat" : "preserve-3d", transform: flat ? "none" : undefined }}
          >
            {/* Frente: cristal de invocação */}
            <div
              data-card-front
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center overflow-hidden border border-ice/50 bg-panel shadow-[0_0_40px_rgba(167,139,250,0.18)]"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div
                data-crystal-skin
                className="relative h-24 w-24 rotate-45 border shadow-[0_0_18px_rgba(167,139,250,0.5)]"
                style={{ borderColor: `${SKIN_ACCENT}cc`, background: `linear-gradient(135deg, transparent, ${SKIN_ACCENT}40, ${SKIN_ACCENT_B}20)` }}
              >
                <span className="absolute inset-3 border border-violet-400/40" />
                <span className="absolute inset-6 border border-violet-400/25" />
              </div>
              <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
                style={{ color: SKIN_ACCENT }}>
                <path d="M50 0v100M0 50h100M15 15l70 70M85 15 15 85" stroke="currentColor" strokeWidth=".45" />
                <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth=".7" strokeDasharray="2 4" />
              </svg>
            </div>

            {/* Verso: arte da skin */}
            <div
              data-card-back
              inert={!revealed}
              aria-hidden={!revealed}
              className="absolute inset-0"
              style={{
                backfaceVisibility: flat ? "visible" : "hidden",
                transform: flat ? "none" : "rotateY(180deg)",
              }}
            >
              <div data-card-tilt-skin className="skin-card-tilt relative h-full w-full">
                <div
                  data-skin-art
                  className="absolute inset-0 overflow-hidden border shadow-[0_0_32px_rgba(167,139,250,0.3)]"
                  style={{
                    opacity: flat ? (revealed ? 1 : 0) : 0,
                    borderColor: `${SKIN_ACCENT}80`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={skin.imageUrl}
                    alt={skin.name}
                    width={512}
                    height={512}
                    className="h-full w-full object-cover"
                  />
                  {/* Gradiente sobre a imagem */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-deep/60 via-transparent to-transparent"
                  />
                  {/* Sweep */}
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div data-sweep-skin className="h-full w-full" style={{ opacity: 0 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nome e subtítulo */}
        <div
          data-skin-name
          className={`relative z-10 text-center ${flat ? "" : "opacity-0"}`}
          aria-hidden={!revealed}
        >
          <p className="font-mono text-label uppercase tracking-[0.2em]" style={{ color: SKIN_ACCENT }}>
            Nova skin desbloqueada
          </p>
          <h3 className="mt-1 font-display text-display-lg font-semibold text-snow">{skin.name}</h3>
          <p className="mt-1 font-mono text-body-sm text-mist">Adicionada à sua coleção.</p>
        </div>

        <button
          ref={continuation}
          autoFocus
          type="button"
          onClick={onClose}
          className="relative z-20 min-h-11 min-w-32 border border-ice/70 bg-ink px-7 py-3 font-display font-semibold text-snow shadow-[0_0_20px_rgba(167,139,250,0.18)] transition-[colors,transform] hover:bg-ice hover:text-ink active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
        >
          {canContinue ? "Continuar" : "Aguarde…"}
        </button>
      </div>

      {/* Botão de som */}
      <button
        type="button"
        onClick={audio.toggle}
        aria-pressed={audio.enabled}
        aria-label={audio.enabled ? "Desativar som" : "Ativar som"}
        className="fixed right-3 top-3 z-40 flex min-h-11 min-w-11 items-center justify-center border border-ice/50 bg-ink/80 text-snow transition-colors hover:bg-ice hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          {audio.enabled
            ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
            : <path d="M16 9l5 6M21 9l-5 6" />}
        </svg>
      </button>
    </dialog>
  );
}
