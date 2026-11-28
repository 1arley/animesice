// Garante que /admin/gacha/animacao consegue compilar e rodar o arquivo da
// animação colado: TSX -> CJS via sucrase, imports resolvidos pelo shim.
// Roda em predev junto com check:roll-anim-config.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as React from "react";
import * as ReactJSXRuntime from "react/jsx-runtime";
import * as THREE from "three";
import { compileComponent, pickExport } from "../src/lib/compile-component.ts";
import { validateRollStageSource } from "../src/lib/validate-roll-stage-source.ts";
import * as RollAnimConfigModule from "../src/lib/roll-anim-config.ts";

const FILE = "src/components/gacha/roll-stage-engine.js";
const source = await readFile(FILE, "utf8");

// O motor compilado pelo painel usa o Three.js e a configuração nativa.
const modules = {
  react: React,
  "react/jsx-runtime": ReactJSXRuntime,
  three: THREE,
  "@/lib/roll-anim-config": RollAnimConfigModule,
};

const exports = await compileComponent(source, modules, "roll-stage-engine.js");
await validateRollStageSource(source);
assert.equal(typeof pickExport(exports, "RollStageEngine"), "function", "esperava export RollStageEngine");
const buildSteps = pickExport(exports, "buildSteps");
for (const mode of ["random", "ordered", "climb", "fake-drop"]) {
  const steps = buildSteps(mode, 4, 1.15, RollAnimConfigModule.DEFAULT_ROLL_ANIM_CONFIG, () => 0.5);
  assert.equal(steps.at(-1).tier, 4, `${mode} deve terminar na raridade confirmada`);
}
const noDrop = buildSteps("random", 5, 1.45, { ...RollAnimConfigModule.DEFAULT_ROLL_ANIM_CONFIG, maxDrop: 0 }, () => 0.999);
assert.ok(noDrop.every(({ tier, peak }) => Number.isInteger(tier) && Number.isFinite(peak)));
const fakeDrop = buildSteps("fake-drop", 4, 1.15, RollAnimConfigModule.DEFAULT_ROLL_ANIM_CONFIG, () => 0.5);
assert.ok(fakeDrop.some((step) => step.tier === 5), "fake-drop deve criar o clímax acima da raridade real");
const pullSource = await readFile("src/lib/gacha-roll-stage-pull.ts", "utf8");
const pullModule = await compileComponent(pullSource, {
  "@/lib/gacha-inventory": { gachaConditionLabel: () => "MINT" },
  "@/lib/url": { safeImageSrc: (url) => url || undefined },
}, "gacha-roll-stage-pull.ts");
const toRollStagePull = pickExport(pullModule, "toRollStagePull");
const pull = {
  id: "pull-1", condition: 4, conditionLabel: "Excelente", foil: "PRISM", value: 180, bonusShard: "TITANITA",
  card: { id: "card-1", name: "Rin", image: "https://cdn.example/rin.webp", imageHidden: false, rarity: "GALACTICA" },
};
assert.deepEqual(toRollStagePull(pull, true), {
  id: "pull-1", rarity: "GALACTICA", name: "Rin", points: 180,
  image: "https://cdn.example/rin.webp", foil: "PRISM", condition: "Excelente",
  bonusShard: "TITANITA", preview: true,
  isNew: false, isDuplicate: false,
});
assert.equal(toRollStagePull({ ...pull, card: { ...pull.card, imageHidden: true } }).image, null);
assert.equal(toRollStagePull(pull, true).bonusShard, "TITANITA");
assert.equal(toRollStagePull(pull).bonusShard, null);
assert.equal(toRollStagePull({ ...pull, conditionLabel: undefined }).condition, "MINT");
assert.equal(toRollStagePull({ ...pull, isNew: true }).isNew, true);
assert.equal(toRollStagePull({ ...pull, isDuplicate: true }).isDuplicate, true);

// Export ausente e import fora do mapa falham com erro legível, não TypeScript cru.
const noExport = await compileComponent("export const X = 1;", modules);
assert.throws(() => pickExport(noExport, "RollStage"), /não exporta "RollStage"/);

await assert.rejects(
  () => compileComponent('import nope from "mod-inexistente"; export const RollStage = () => nope;', modules),
  /Import não disponível no preview: "mod-inexistente"/,
);

// TSX real compila: tipagem, JSX e re-export do config saem limpos.
const typed = await compileComponent(
  `import { useRef } from "react";
   type P = { x: number };
   export function Box({ x }: P) {
     const ref = useRef<HTMLDivElement>(null);
     return <div ref={ref}>{x}</div>;
   }`,
  modules,
);
assert.equal(typeof pickExport(typed, "Box"), "function");

// Erro de sintaxe tem que rebocar com o code frame do Sucrase.
await assert.rejects(() => compileComponent("export function () {", modules), /SyntaxError|Unexpected/);
assert.throws(() => validateRollStageSource("export const RollStageEngine = {};"), /exportar a classe/);
assert.throws(() => validateRollStageSource("export class RollStageEngine { play() {} }"), /play\(\) e destroy\(\)/);
assert.throws(() => validateRollStageSource("export class RollStageEngine { play() {} destroy() {}"), /expected|SyntaxError|Unexpected/i);
assert.throws(() => validateRollStageSource("import nope from 'mod-inexistente'; export class RollStageEngine { play() { nope(); } destroy() {} }"), /Import não disponível/);
assert.throws(() => validateRollStageSource("export class RollStageEngine { play() { void import('fs'); } destroy() {} }"), /Import não disponível/);

console.log("roll-anim-source ok");
