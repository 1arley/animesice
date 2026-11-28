"use client";

import type { ComponentType } from "react";
import * as React from "react";
import * as THREE from "three";
import { RollStagePlayer, type RollStageEngineConstructor } from "@/components/gacha/RollStagePlayer";
import * as RollAnimConfigModule from "@/lib/roll-anim-config";
import type { GachaPull } from "@/types";
import type { RollAnimConfig } from "@/lib/roll-anim-config";
import { compileComponent, pickExport, type ModuleMap } from "@/lib/compile-component";

export type RollStageProps = {
  pull: GachaPull | null;
  onClose: () => void;
  preview?: boolean;
  config?: Partial<RollAnimConfig>;
};

export type RollStageComponent = ComponentType<RollStageProps>;

/**
 * Imports que o arquivo colado pode usar. O mesmo código que roda em produção:
 * a prévia não simula gsap, React nem GachaCard, usa os de verdade.
 */
const MODULES: ModuleMap = {
  react: React,
  three: THREE,
  "@/lib/roll-anim-config": RollAnimConfigModule,
};

/** Compila o motor e o encaixa no mesmo adaptador React usado em produção. */
export async function compileRollStage(source: string): Promise<RollStageComponent> {
  const exports = await compileComponent(source, MODULES, "roll-stage-engine.js");
  const Engine = pickExport(exports, "RollStageEngine");
  if (typeof Engine !== "function") {
    throw new Error('O export "RollStageEngine" precisa ser uma classe.');
  }
  return function CompiledRollStage(props: RollStageProps) {
    return React.createElement(RollStagePlayer, {
      ...props,
      Engine: Engine as RollStageEngineConstructor,
    });
  };
}

/** Mensagem legível para erro de compilação/execução (code frame do Sucrase). */
export function rollStageErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.message;
}
