"use client";

import { useEffect, useState } from "react";
import { TextLoop } from "@/components/core/TextLoop";
import { CrystalMotion } from "@/components/animesice/CrystalMotion";

const LIMIT_SECONDS = 8;

const PHRASES = [
  "Sintonizando o sinal…",
  "Ajustando a antena…",
  "Buscando o melhor servidor…",
];

export function EpisodeLoadingState() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const tooSlow = elapsed > LIMIT_SECONDS;
  const progress = Math.min((elapsed / LIMIT_SECONDS) * 100, 100);

  return (
    <div className="reveal flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <CrystalMotion mode="loop" size={64} />
      <p className="text-body font-medium text-snow">
        <span
          className="mr-2 inline-block h-2 w-2 animate-blink bg-ice align-middle"
          aria-hidden="true"
        />
        <TextLoop texts={PHRASES} interval={3000} fixedHeight />
      </p>

      {!tooSlow && (
        <div className="mt-2 flex w-full max-w-xs flex-col items-center gap-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full bg-ice transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-caption tabular-nums text-mist">
            {elapsed}s / {LIMIT_SECONDS}s
          </span>
        </div>
      )}

      {tooSlow && (
        <div role="status" className="mt-2 flex flex-col items-center gap-3">
          <p className="max-w-md text-body-sm text-signal">
            O servidor de vídeo pode estar lento — tenta recarregar:
          </p>
          <button
            type="button"
            className="btn-ice"
            onClick={() => window.location.reload()}
          >
            ↻ Recarregar
          </button>
        </div>
      )}
    </div>
  );
}

export default EpisodeLoadingState;
