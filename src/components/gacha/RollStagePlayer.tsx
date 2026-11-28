"use client";

import { useEffect, useRef } from "react";
import type { RollAnimConfig } from "@/lib/roll-anim-config";
import { toRollStagePull } from "@/lib/gacha-roll-stage-pull";
import type { GachaPull } from "@/types";

export type RollStageEngineConstructor = new (options: {
  config?: Partial<RollAnimConfig>;
}) => {
  play(input: Promise<ReturnType<typeof toRollStagePull>>): Promise<unknown>;
  destroy(): void;
};

export function RollStagePlayer({
  Engine,
  pull,
  onClose,
  config,
}: {
  Engine: RollStageEngineConstructor;
  pull: GachaPull | null;
  onClose: () => void;
  config?: Partial<RollAnimConfig>;
}) {
  const resolvePull = useRef<((value: ReturnType<typeof toRollStagePull>) => void) | null>(null);
  const onCloseRef = useRef(onClose);
  const configRef = useRef(config);
  onCloseRef.current = onClose;
  configRef.current = config;

  useEffect(() => {
    let mounted = true;
    const engine = new Engine({ config: configRef.current });
    const pendingPull = new Promise<ReturnType<typeof toRollStagePull>>((resolve) => {
      resolvePull.current = resolve;
    });
    void engine.play(pendingPull).then(
      () => { if (mounted) onCloseRef.current(); },
      () => { if (mounted) onCloseRef.current(); },
    );
    return () => {
      mounted = false;
      resolvePull.current = null;
      engine.destroy();
    };
  }, [Engine]);

  useEffect(() => {
    if (pull) resolvePull.current?.(toRollStagePull(pull));
  }, [pull]);

  return null;
}
