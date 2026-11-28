"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type {
  GachaRoulettePrizeCategory,
  GachaRouletteSpinResult,
  GachaRouletteWheelPrize,
} from "@/types";

const SOUND_KEY = "animesice:roll-sound";
const PENDING_OP_KEY = "animesice:roulette-pending-op";
const UNREVEALED_RESULT_KEY = "animesice:roulette-unrevealed-result";

function readSoundPreference(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "false";
  } catch {
    return true;
  }
}

function createOperationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `roulette-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function categoryIconPath(
  category: GachaRoulettePrizeCategory,
  itemId: string | null,
): string {
  if (category === "CRYSTAL") return "/gacha/crystal.png";
  if (category === "KEY") return "/gacha/key.png";
  if (category === "SPIN_RESET") return "/gacha/spin-reset.png";
  if (category === "COMMON_BOX") return "/gacha/box-common.webp";
  if (category === "RARE_BOX" || category === "KEY_RARE_BOX")
    return "/gacha/box-rare.webp";
  if (category === "PREMIUM_BOX" || category === "KEY_PREMIUM_BOX")
    return "/gacha/box-premium.webp";
  if (category === "FOIL_GEM") {
    if (itemId === "GOLD_GEM") return "/gacha/gold_gem.png";
    if (itemId === "INK_GEM") return "/gacha/ink_gem.png";
    if (itemId === "PRISM_GEM") return "/gacha/prism_gem.png";
    return "/gacha/holo_gem.png";
  }
  if (itemId === "AMPULHETA_ETER") return "/gacha/ampulheta-eter.png";
  if (itemId === "TITANITA" || itemId === "TITANITA_SHARD")
    return "/gacha/titanita.png";
  if (itemId === "TITANITA_SOMBRIA" || itemId === "TITANITA_SOMBRIA_SHARD")
    return "/gacha/titanita-sombria.png";
  if (itemId === "DRACONICA" || itemId === "DRACONICA_SHARD")
    return "/gacha/magnetita.png";
  if (itemId === "SOMBRIA_DRACONICA" || itemId === "SOMBRIA_DRACONICA_SHARD")
    return "/gacha/magnetita-sombria.png";
  return "/gacha/roleta-premios.png";
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSlice(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function useRouletteAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current.state === "suspended") {
      void ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const playTick = useCallback(
    (enabled: boolean, speedRatio: number) => {
      if (!enabled) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520 + speedRatio * 420, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    },
    [ensureCtx],
  );

  const playWinChime = useCallback(
    (enabled: boolean) => {
      if (!enabled) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.065);
        gain.gain.setValueAtTime(0.001, now + idx * 0.065);
        gain.gain.linearRampToValueAtTime(0.11, now + idx * 0.065 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.065);
        osc.stop(now + idx * 0.065 + 0.48);
      });
    },
    [ensureCtx],
  );

  return { playTick, playWinChime };
}

export function GachaPrizeRoulette({
  enabled,
  spinsAvailable,
  prizes,
  onSpinComplete,
}: {
  enabled: boolean;
  spinsAvailable: number;
  prizes: GachaRouletteWheelPrize[];
  onSpinComplete: (result: GachaRouletteSpinResult) => void;
}) {
  const [soundOn, setSoundOn] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [pointerKick, setPointerKick] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<GachaRouletteSpinResult | null>(null);
  const [burstActive, setBurstActive] = useState(false);

  const rafRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const soundOnRef = useRef(true);
  const { playTick, playWinChime } = useRouletteAudio();

  useEffect(() => {
    const pref = readSoundPreference();
    setSoundOn(pref);
    soundOnRef.current = pref;
  }, []);

  useEffect(() => {
    soundOnRef.current = soundOn;
    try {
      localStorage.setItem(SOUND_KEY, String(soundOn));
    } catch {
      /* ignore */
    }
  }, [soundOn]);

  // Recupera resultado confirmado caso a página tenha sido fechada/atualizada durante a animação.
  useEffect(() => {
    try {
      const savedResult = localStorage.getItem(UNREVEALED_RESULT_KEY);
      if (savedResult) {
        const parsed = JSON.parse(savedResult) as GachaRouletteSpinResult;
        if (parsed?.spinId && parsed?.prize) {
          setRevealed(parsed);
          return;
        }
      }
      const pendingOp = localStorage.getItem(PENDING_OP_KEY);
      if (pendingOp) {
        const parsedOp = JSON.parse(pendingOp) as {
          operationId: string;
          startedAt: number;
        };
        if (
          parsedOp?.operationId &&
          Date.now() - parsedOp.startedAt < 10 * 60_000
        ) {
          void api
            .gachaSpinRoulette(parsedOp.operationId)
            .then((res) => {
              localStorage.removeItem(PENDING_OP_KEY);
              localStorage.setItem(UNREVEALED_RESULT_KEY, JSON.stringify(res));
              setRevealed(res);
              onSpinComplete(res);
            })
            .catch(() => {
              localStorage.removeItem(PENDING_OP_KEY);
            });
        } else {
          localStorage.removeItem(PENDING_OP_KEY);
        }
      }
    } catch {
      /* ignore */
    }
  }, [onSpinComplete]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const sliceCount = Math.max(1, prizes.length);
  const sliceAngle = 360 / sliceCount;

  const toggleSound = () => setSoundOn((prev) => !prev);

  const dismissReveal = () => {
    setRevealed(null);
    setBurstActive(false);
    try {
      localStorage.removeItem(UNREVEALED_RESULT_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleSpin = async () => {
    if (spinning || !enabled || spinsAvailable < 1 || prizes.length === 0) {
      return;
    }
    setError("");
    setRevealed(null);
    setBurstActive(false);
    setSpinning(true);

    const operationId = createOperationId();
    try {
      localStorage.setItem(
        PENDING_OP_KEY,
        JSON.stringify({ operationId, startedAt: Date.now() }),
      );
    } catch {
      /* ignore */
    }

    let result: GachaRouletteSpinResult;
    try {
      result = await api.gachaSpinRoulette(operationId);
    } catch (err) {
      setSpinning(false);
      try {
        localStorage.removeItem(PENDING_OP_KEY);
      } catch {
        /* ignore */
      }
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível realizar o giro da roleta.",
      );
      return;
    }

    try {
      localStorage.removeItem(PENDING_OP_KEY);
      localStorage.setItem(UNREVEALED_RESULT_KEY, JSON.stringify(result));
    } catch {
      /* ignore */
    }

    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targetSliceCenter = result.prizeIndex * sliceAngle + sliceAngle / 2;
    const jitter = (Math.random() - 0.5) * sliceAngle * 0.42;
    const desiredMod = ((360 - targetSliceCenter + jitter) % 360 + 360) % 360;
    const startAngle = rotationRef.current;
    const currentMod = ((startAngle % 360) + 360) % 360;
    const deltaMod = ((desiredMod - currentMod) + 360) % 360;
    const extraTurns = 360 * 6;
    const targetAngle = startAngle + extraTurns + deltaMod;

    if (reducedMotion) {
      rotationRef.current = targetAngle;
      setRotation(targetAngle);
      setSpinning(false);
      setBurstActive(true);
      setRevealed(result);
      playWinChime(soundOnRef.current);
      onSpinComplete(result);
      return;
    }

    const totalDuration = 4200;
    const accelRatio = 0.18;
    const startTime = performance.now();
    let lastSliceIndex = Math.floor(
      (((startAngle % 360) + 360) % 360) / sliceAngle,
    );

    // Curva contínua com aceleração progressiva inicial seguida de desaceleração suave.
    const easeSpin = (t: number): number => {
      if (t < accelRatio) {
        const u = t / accelRatio;
        return 0.12 * (u * u);
      }
      const u = (t - accelRatio) / (1 - accelRatio);
      return 0.12 + 0.88 * (1 - Math.pow(1 - u, 3.6));
    };

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDuration);
      const eased = easeSpin(progress);
      const current = startAngle + (targetAngle - startAngle) * eased;
      rotationRef.current = current;
      setRotation(current);

      const normalized = ((current % 360) + 360) % 360;
      const currentSliceIdx = Math.floor(normalized / sliceAngle);
      if (currentSliceIdx !== lastSliceIndex) {
        lastSliceIndex = currentSliceIdx;
        const speedRatio = progress < 0.5 ? 1 : Math.max(0.1, 1 - progress);
        playTick(soundOnRef.current, speedRatio);
        setPointerKick(true);
        window.setTimeout(() => setPointerKick(false), 65);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        setSpinning(false);
        setBurstActive(true);
        setRevealed(result);
        playWinChime(soundOnRef.current);
        onSpinComplete(result);
      }
    };

    rafRef.current = requestAnimationFrame(step);
  };

  const rewardSummary = useMemo(() => {
    if (!revealed) return null;
    const r = revealed.reward;
    if (r.category === "CARD" && typeof r.name === "string") {
      return `Carta obtida: ${r.name}${r.edition ? ` #${String(r.edition)}` : ""}`;
    }
    if (r.category === "SKIN" && typeof r.name === "string") {
      return `Skin obtida: ${r.name}`;
    }
    if (r.category === "CARD_BACK") {
      return r.duplicate
        ? `Capa repetida — compensação de ${String(r.crystals ?? 250)} Cristais`
        : `Capa de carta desbloqueada: ${String(r.name ?? "")}`;
    }
    if (typeof r.itemName === "string") {
      return `${revealed.prize.quantity}x ${r.itemName} adicionado ao inventário`;
    }
    if (r.category === "CRYSTAL") {
      return `+${String(r.amount ?? revealed.prize.quantity)} Cristais creditados`;
    }
    return `${revealed.prize.label} creditado ao seu inventário`;
  }, [revealed]);

  return (
    <section
      aria-labelledby="roulette-heading"
      className="relative overflow-hidden border border-hairline bg-panel p-5 sm:p-7"
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-ice/10 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-caption uppercase tracking-[0.2em] text-ice">
            Roleta de Prêmios
          </p>
          <h2 id="roulette-heading" className="font-display text-2xl text-snow">
            Gire e conquiste recompensas
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-hairline bg-ink px-3 py-1.5">
            <Image
              src="/gacha/roleta-premios.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
              unoptimized
            />
            <span className="font-mono text-body-sm text-snow">
              {spinsAvailable} {spinsAvailable === 1 ? "giro" : "giros"}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className="min-h-10 border border-hairline bg-ink px-3 font-mono text-caption text-mist transition-colors hover:text-snow"
          >
            {soundOn ? "♪ Som ativo" : "♪ Som mudo"}
          </button>
        </div>
      </div>

      {!enabled && (
        <p role="status" className="mt-4 border border-hairline bg-ink p-4 text-body-sm text-mist">
          A roleta de prêmios está temporariamente em manutenção. Seus giros acumulados continuam salvos.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </p>
      )}

      <div className="relative mt-6 flex flex-col items-center">
        {/* Ponteiro superior cristalino */}
        <div
          aria-hidden="true"
          className={`relative z-20 -mb-4 transition-transform duration-75 ${
            pointerKick ? "-rotate-12 scale-110" : "rotate-0 scale-100"
          }`}
        >
          <svg width="36" height="40" viewBox="0 0 36 40" fill="none">
            <path
              d="M18 38L4 10L18 2L32 10L18 38Z"
              fill="#38E8DA"
              stroke="#07101A"
              strokeWidth="2.5"
            />
            <path d="M18 32L11 12L18 7L25 12L18 32Z" fill="#A5F3FC" opacity="0.65" />
          </svg>
        </div>

        {/* Roda da Roleta */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500 ${
              spinning || burstActive
                ? "opacity-100 shadow-[0_0_64px_rgba(56,232,218,0.28)]"
                : "opacity-40 shadow-[0_0_32px_rgba(56,232,218,0.12)]"
            }`}
          />

          <div
            className="relative h-[310px] w-[310px] sm:h-[420px] sm:w-[420px]"
            style={{
              transform: `rotate(${rotation}deg)`,
              willChange: "transform",
            }}
          >
            <svg
              viewBox="0 0 400 400"
              className="h-full w-full drop-shadow-[0_14px_30px_rgba(0,0,0,0.65)]"
              role="img"
              aria-label="Roleta interativa de prêmios do Gacha"
            >
              <defs>
                <radialGradient id="rouletteRim" cx="50%" cy="50%" r="50%">
                  <stop offset="82%" stopColor="#1B2538" />
                  <stop offset="96%" stopColor="#0C1320" />
                  <stop offset="100%" stopColor="#38E8DA" stopOpacity="0.45" />
                </radialGradient>
              </defs>

              <circle cx="200" cy="200" r="196" fill="url(#rouletteRim)" stroke="#38E8DA" strokeOpacity="0.4" strokeWidth="2" />

              {prizes.map((prize, idx) => {
                const start = idx * sliceAngle;
                const end = start + sliceAngle;
                const mid = start + sliceAngle / 2;
                const isEven = idx % 2 === 0;
                const isWinner = !spinning && revealed?.prizeIndex === idx;
                const labelPos = polarToCartesian(200, 200, 128, mid);

                return (
                  <g key={prize.id}>
                    <path
                      d={describeSlice(200, 200, 182, start, end)}
                      fill={
                        isWinner
                          ? "#153642"
                          : isEven
                            ? "#0B111E"
                            : "#131C2E"
                      }
                      stroke="#38E8DA"
                      strokeOpacity={isWinner ? 0.95 : 0.25}
                      strokeWidth={isWinner ? 2.4 : 1}
                    />
                    <g
                      transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${mid - 90})`}
                    >
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={isWinner ? "#A5F3FC" : "#DCE7F0"}
                        fontSize={prizes.length > 18 ? "8.5" : "10"}
                        fontWeight="600"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      >
                        {prize.label.length > 17
                          ? `${prize.label.slice(0, 16)}…`
                          : prize.label}
                      </text>
                    </g>
                  </g>
                );
              })}

              <circle
                cx="200"
                cy="200"
                r="182"
                fill="none"
                stroke="#38E8DA"
                strokeOpacity="0.55"
                strokeWidth="2.5"
              />
            </svg>

            {/* Núcleo central com a arte oficial da roleta */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ice/70 bg-ink shadow-[0_0_24px_rgba(56,232,218,0.45)] sm:h-24 sm:w-24">
              <Image
                src="/gacha/roleta-premios.png"
                alt=""
                width={76}
                height={76}
                className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Botão de Girar */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSpin()}
            disabled={spinning || !enabled || spinsAvailable < 1 || prizes.length === 0}
            className="btn-ice min-h-12 px-8 font-display text-base disabled:cursor-not-allowed disabled:opacity-50"
          >
            {spinning
              ? "Girando roleta…"
              : spinsAvailable > 0
                ? "Girar Roleta (1 Giro)"
                : "Sem giros disponíveis"}
          </button>
          <p className="text-caption text-mist">
            {spinsAvailable > 0
              ? "O resultado é confirmado pelo servidor no momento do acionamento."
              : "Ganhe giros adicionais ao revelar cartas no Gacha."}
          </p>
        </div>

        {/* Painel de revelação do prêmio */}
        {revealed && (
          <div
            role="status"
            aria-live="polite"
            className="mt-6 w-full max-w-md border border-ice/60 bg-ink p-5 text-center shadow-[0_0_40px_rgba(56,232,218,0.18)]"
          >
            <p className="font-mono text-caption uppercase tracking-[0.2em] text-ice">
              Prêmio confirmado
            </p>
            <div className="mt-3 flex flex-col items-center gap-3">
              <Image
                src={categoryIconPath(revealed.prize.category, revealed.prize.itemId)}
                alt={revealed.prize.label}
                width={72}
                height={72}
                className="h-18 w-18 object-contain drop-shadow-[0_0_16px_rgba(56,232,218,0.4)]"
                unoptimized
              />
              <h3 className="font-display text-2xl text-snow">
                {revealed.prize.label}
              </h3>
              {rewardSummary && (
                <p className="text-body-sm text-mist">{rewardSummary}</p>
              )}
            </div>
            <button
              type="button"
              onClick={dismissReveal}
              className="btn-ice mt-4 min-h-10 px-6"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
