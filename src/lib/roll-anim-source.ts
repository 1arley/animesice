"use client";

import type { ComponentType } from "react";
import * as React from "react";
import * as ReactJSXRuntime from "react/jsx-runtime";
import * as ReactJSXDevRuntime from "react/jsx-dev-runtime";
import * as ReducedMotionModule from "@/lib/use-prefers-reduced-motion";
import * as GsapModule from "@/lib/gsap";
import * as GachaRarityColorsModule from "@/lib/gacha-rarity-colors";
import * as GachaCardModule from "@/components/gacha/GachaCard";
import * as CountUpModule from "@/components/core/CountUp";
import * as RollAnimConfigModule from "@/lib/roll-anim-config";
import * as RollTeaseModule from "@/lib/roll-tease";
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
  "react/jsx-runtime": ReactJSXRuntime,
  "react/jsx-dev-runtime": ReactJSXDevRuntime,
  "@/lib/use-prefers-reduced-motion": ReducedMotionModule,
  "@/lib/gsap": GsapModule,
  "@/lib/gacha-rarity-colors": GachaRarityColorsModule,
  "./GachaCard": GachaCardModule,
  "@/components/gacha/GachaCard": GachaCardModule,
  "@/components/core/CountUp": CountUpModule,
  "@/lib/roll-anim-config": RollAnimConfigModule,
  "@/lib/roll-tease": RollTeaseModule,
  "@/types": {},
};

/** Compila a fonte colada e devolve o componente `RollStage` pronto pra render. */
export async function compileRollStage(source: string): Promise<RollStageComponent> {
  const exports = await compileComponent(source, MODULES, "RollStage.tsx");
  const component = exports.RollStage ?? exports.default ?? pickExport(exports, "RollStage");
  if (typeof component !== "function") {
    throw new Error('O export "RollStage" precisa ser um componente React.');
  }
  return component as RollStageComponent;
}

/** Mensagem legível para erro de compilação/execução (code frame do Sucrase). */
export function rollStageErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.message;
}
