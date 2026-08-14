"use client";

import { useEffect, useState } from "react";
import { TextLoop } from "@/components/core/TextLoop";
import { CrystalMotion } from "@/components/animesice/CrystalMotion";

/** Tempo "normal" de espera, em segundos. A partir daqui a mensagem muda
 *  e sugerimos recarregar a página. */
const LIMIT_SECONDS = 15;

/** Mensagens que se revezam enquanto o sinal chega — voz do canal. */
const LOADING_PHRASES = [
  "Carregando o episódio…",
  "Sintonizando o sinal…",
  "Ajustando a antena…",
  "Buscando o melhor servidor…",
];

/**
 * Estado de carregamento do player: mensagem amigável (pipoca 🍿) com um
 * cronômetro ao vivo e, se passar de LIMIT_SECONDS, um convite pra
 * recarregar a página. Usado na página do episódio e na watch party.
 */
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

  return (
    <div className="reveal flex min-h-[360px] flex-col items-center justify-center gap-4 border border-hairline bg-panel px-6 py-14 text-center">
      {/* O cristal respirando: o sinal que o site está sintonizando. */}
      <CrystalMotion mode="loop" size={88} />
      <p className="text-body font-medium text-snow">
        <span
          className="mr-2 inline-block h-2 w-2 animate-blink bg-ice align-middle"
          aria-hidden="true"
        />
        <TextLoop texts={LOADING_PHRASES} interval={2600} fixedHeight />
      </p>
      <p className="max-w-md text-body-sm text-mist">
        Às vezes demora de 5 a 15 segundos — vai pegando uma pipoca que o
        sinal já tá chegando!
      </p>

      {tooSlow ? (
        <div role="status" className="mt-2 flex flex-col items-center gap-3">
          <p className="max-w-md text-body-sm text-signal">
            Hmm, tá demorando mais que o esperado. O servidor de vídeo pode
            estar lento no momento — recarrega a página e tenta de novo:
          </p>
          <button
            type="button"
            className="btn-ice"
            onClick={() => window.location.reload()}
          >
            ↻ Recarregar página
          </button>
        </div>
      ) : (
        <p
          aria-hidden="true"
          className="mt-1 font-mono text-caption uppercase tracking-wider text-ice tabular-nums"
        >
          {elapsed}s / até {LIMIT_SECONDS}s
        </p>
      )}
    </div>
  );
}

export default EpisodeLoadingState;
