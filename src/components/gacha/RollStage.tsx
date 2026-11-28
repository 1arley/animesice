"use client";

import { useEffect, useRef, useState } from "react";
import { GachaCard } from "./GachaCard";
import type { RollAnimConfig } from "@/lib/roll-anim-config";
import { RollStagePlayer } from "./RollStagePlayer";
import type { RollStageEngineConstructor } from "./RollStagePlayer";
import type { GachaPull } from "@/types";
import { safeImageSrc } from "@/lib/url";

export { DEFAULT_ROLL_ANIM_CONFIG, parseRollAnimJson } from "@/lib/roll-anim-config";
export type { ParsedRollJson, RollAnimConfig } from "@/lib/roll-anim-config";

export function RollStage({
  pull,
  preview = false,
  onClose,
  config,
}: {
  pull: GachaPull | null;
  onClose: () => void;
  preview?: boolean;
  config?: Partial<RollAnimConfig>;
}) {
  const [Engine, setEngine] = useState<RollStageEngineConstructor | null>(null);
  const [failed, setFailed] = useState(false);
  const fallbackRef = useRef<HTMLDialogElement>(null);
  const fallbackPull = pull && {
    ...pull,
    card: {
      ...pull.card,
      image: pull.card.imageHidden ? null : safeImageSrc(pull.card.image) ?? null,
    },
  };

  useEffect(() => {
    if (!failed || !fallbackRef.current) return;
    const dialog = fallbackRef.current;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [failed]);

  useEffect(() => {
    let mounted = true;
    void import("./roll-stage-engine.js").then(({ RollStageEngine }) => {
      if (mounted) setEngine(() => RollStageEngine);
    }).catch(() => {
      if (mounted) setFailed(true);
    });
    return () => { mounted = false; };
  }, []);

  return failed ? (
    <dialog ref={fallbackRef} aria-label="Resultado da rolagem" onCancel={(event) => event.preventDefault()} className="fixed inset-0 m-0 h-dvh w-screen max-w-none border-0 bg-[#02050a] p-4 text-snow backdrop:bg-black/90">
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-5 text-center">
        <h2 className="font-display text-display-lg font-semibold">{pull ? (preview ? "Prévia revelada" : "Carta revelada") : "Invocando sua carta…"}</h2>
        {fallbackPull ? <GachaCard pull={fallbackPull} preview={preview} linkAnime={false} /> : <p role="status">Aguardando o resultado confirmado pelo servidor.</p>}
        <button autoFocus type="button" onClick={onClose} className="min-h-11 min-w-32 border border-ice/70 bg-ink px-7 py-3 font-display font-semibold text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">{pull ? "Continuar" : "Fechar"}</button>
      </div>
    </dialog>
  ) : Engine ? (
    <RollStagePlayer Engine={Engine} pull={pull} preview={preview} onClose={onClose} onError={() => setFailed(true)} config={config} />
  ) : (
    <p role="status" className="sr-only">Carregando animação da rolagem…</p>
  );
}
