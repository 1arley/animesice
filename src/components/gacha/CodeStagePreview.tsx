"use client";

import { useEffect, useState } from "react";
import { compileRollStage, rollStageErrorMessage, type RollStageComponent } from "@/lib/roll-anim-source";
import type { GachaPull } from "@/types";

export type CompileStatus =
  | { state: "idle" }
  | { state: "compiling" }
  | { state: "ok" }
  | { state: "error"; message: string };

/**
 * Monta a animação a partir do ARQUIVO INTEIRO colado pelo dev.
 * Compila com debounce (erro de TSX aparece enquanto digita) e só remonta o
 * <dialog> quando o runId muda, para a timeline do GSAP recomeçar do zero.
 */
export function CodeStagePreview({
  source,
  pull,
  runId,
  onStatus,
}: {
  source: string;
  pull: GachaPull | null;
  runId: number;
  onStatus: (status: CompileStatus) => void;
}) {
  const [Component, setComponent] = useState<RollStageComponent | null>(null);
  const [mounted, setMounted] = useState(0);

  useEffect(() => {
    let alive = true;
    onStatus({ state: "compiling" });
    const timer = setTimeout(() => {
      compileRollStage(source)
        .then((compiled) => {
          if (!alive) return;
          setComponent(() => compiled);
          onStatus({ state: "ok" });
        })
        .catch((error: unknown) => {
          if (!alive) return;
          setComponent(null);
          onStatus({ state: "error", message: rollStageErrorMessage(error) });
        });
    }, 400);
    return () => { alive = false; clearTimeout(timer); };
  }, [source, onStatus]);

  useEffect(() => { setMounted(runId); }, [runId]);

  if (!Component) return null;
  return <Component key={mounted} pull={pull} onClose={() => undefined} preview />;
}