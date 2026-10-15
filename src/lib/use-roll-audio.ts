"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const SOUND_KEY = "animesice:roll-sound";
export const MASTER_GAIN = 0.55;

export type RollSfx = {
  charge: (seconds: number) => void;
  tick: (step: number) => void;
  impact: (power: number) => void;
  chime: (power: number) => void;
  /** Som exclusivo para carta duplicada: "clunk" abafado, sem o brilho do chime normal. */
  dupe: () => void;
  /** Chime especial para Galáctica: harmônico extra agudo com eco. */
  galacticChime: () => void;
  silence: () => void;
};

type ToneOptions = {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  at?: number;
  dur: number;
  vol: number;
};

type NoiseOptions = {
  type: BiquadFilterType;
  f0: number;
  f1: number;
  dur: number;
  vol: number;
  q?: number;
  at?: number;
  attack?: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function useRollAudio() {
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
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        ctx = new Ctor();
        const master = ctx.createGain();
        master.gain.value = MASTER_GAIN;
        const compressor = ctx.createDynamicsCompressor();
        master.connect(compressor);
        compressor.connect(ctx.destination);
        ctxRef.current = ctx;
        masterRef.current = master;
      } catch {
        return null;
      }
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
    } catch {
      /* storage indisponível: som permanece desligado */
    }
    const live = active.current;
    return () => {
      live.forEach((node) => {
        try {
          node.stop();
        } catch {
          /* já parou */
        }
      });
      live.clear();
      void ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      masterRef.current = null;
    };
  }, [ensure]);

  const sfx = useMemo<RollSfx>(() => {
    const track = (node: AudioScheduledSourceNode) => {
      active.current.add(node);
      node.onended = () => {
        active.current.delete(node);
      };
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
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + o.dur + 0.05);
      track(osc);
    };
    const noiseBuffer = (ctx: AudioContext) => {
      if (noiseRef.current) return noiseRef.current;
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      noiseRef.current = buffer;
      return buffer;
    };
    const noise = (ctx: AudioContext, out: AudioNode, o: NoiseOptions) => {
      const t = ctx.currentTime + (o.at ?? 0);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = o.type;
      filter.Q.value = o.q ?? 1;
      filter.frequency.setValueAtTime(o.f0, t);
      filter.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(o.vol, t + o.dur * (o.attack ?? 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      src.start(t);
      src.stop(t + o.dur + 0.05);
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
      charge: (seconds) =>
        run((ctx, out) => {
          noise(ctx, out, {
            type: "bandpass",
            f0: 260,
            f1: 3400,
            dur: seconds,
            vol: 0.22,
            q: 2.5,
            attack: 0.92,
          });
          tone(ctx, out, { type: "triangle", f0: 80, f1: 520, dur: seconds, vol: 0.1 });
        }),
      tick: (step) =>
        run((ctx, out) => {
          tone(ctx, out, { f0: 440 * (1 + step * 0.12), dur: 0.07, vol: 0.09 });
        }),
      impact: (power) =>
        run((ctx, out) => {
          const p = 0.55 + clamp01(power) * 0.45;
          tone(ctx, out, { f0: 170, f1: 36, dur: 0.6, vol: 0.85 * p });
          noise(ctx, out, {
            type: "lowpass",
            f0: 2200,
            f1: 180,
            dur: 0.45,
            vol: 0.45 * p,
            attack: 0.03,
          });
        }),
      chime: (power) =>
        run((ctx, out) => {
          const p = clamp01(power);
          const base = 523.25;
          const ratios = [1, 1.25, 1.5, 2, 2.5].slice(0, 3 + Math.round(p * 2));
          ratios.forEach((ratio, index) => {
            tone(ctx, out, {
              type: "triangle",
              f0: base * ratio,
              at: index * 0.07,
              dur: 0.9 + p * 0.8,
              vol: 0.2,
            });
          });
          tone(ctx, out, { f0: base * 4, at: 0.05, dur: 1.1 + p * 0.6, vol: 0.05 });
        }),
      dupe: () =>
        run((ctx, out) => {
          tone(ctx, out, { type: "triangle", f0: 180, f1: 90, dur: 0.22, vol: 0.28 });
          noise(ctx, out, {
            type: "lowpass",
            f0: 600,
            f1: 120,
            dur: 0.28,
            vol: 0.18,
            attack: 0.05,
          });
        }),
      galacticChime: () =>
        run((ctx, out) => {
          const base = 523.25;
          const ratios = [1, 1.25, 1.5, 2, 2.5];
          ratios.forEach((ratio, index) => {
            tone(ctx, out, {
              type: "triangle",
              f0: base * ratio,
              at: index * 0.07,
              dur: 1.7,
              vol: 0.22,
            });
          });
          ratios.slice(0, 3).forEach((ratio, index) => {
            tone(ctx, out, {
              type: "triangle",
              f0: base * ratio * 1.00404,
              at: 0.18 + index * 0.07,
              dur: 1.3,
              vol: 0.1,
            });
          });
          tone(ctx, out, { f0: 2200, f1: 3200, at: 0.04, dur: 0.55, vol: 0.04 });
        }),
      silence: () => {
        active.current.forEach((node) => {
          try {
            node.stop();
          } catch {
            /* já parou */
          }
        });
        active.current.clear();
      },
    };
  }, [ensure]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    try {
      window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      /* ignora */
    }
    if (!next) {
      sfx.silence();
      return;
    }
    const ctx = ensure();
    if (ctx) void ctx.resume().then(() => sfx.tick(1)).catch(() => {});
  }, [ensure, sfx]);

  return { enabled, toggle, sfx };
}
