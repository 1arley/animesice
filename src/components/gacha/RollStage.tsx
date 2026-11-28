"use client";

import { useEffect, useRef, useState } from "react";
import type { RollAnimConfig } from "@/lib/roll-anim-config";
import { RollStagePlayer } from "./RollStagePlayer";
import type { RollStageEngineConstructor } from "./RollStagePlayer";
import type { GachaPull } from "@/types";

export { DEFAULT_ROLL_ANIM_CONFIG, parseRollAnimJson } from "@/lib/roll-anim-config";
export type { ParsedRollJson, RollAnimConfig } from "@/lib/roll-anim-config";

export function RollStage({
  pull,
  onClose,
  config,
}: {
  pull: GachaPull | null;
  onClose: () => void;
  preview?: boolean;
  config?: Partial<RollAnimConfig>;
}) {
  const [Engine, setEngine] = useState<RollStageEngineConstructor | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    let mounted = true;
    void import("./roll-stage-engine.js").then(({ RollStageEngine }) => {
      if (mounted) setEngine(() => RollStageEngine);
    }).catch(() => {
      if (mounted) onCloseRef.current();
    });
    return () => { mounted = false; };
  }, [onCloseRef]);

  return Engine ? (
    <RollStagePlayer Engine={Engine} pull={pull} onClose={onClose} config={config} />
  ) : (
    <p role="status" className="sr-only">Carregando animação da rolagem…</p>
  );
}
