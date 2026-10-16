// Garante que /admin/gacha/animacao consegue compilar e rodar o arquivo da
// animação colado: TSX -> CJS via sucrase, imports resolvidos pelo shim.
// Roda em predev junto com check:roll-anim-config.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compileComponent, pickExport } from "../src/lib/compile-component.ts";

const FILE = "src/components/gacha/RollStage.tsx";
const source = await readFile(FILE, "utf8");

// Shim mínimo: o arquivo real importa scripts, reduced-motion, GachaCard e config.
const modules = {
  react: { useEffect: () => {}, useRef: () => ({ current: null }), useState: () => [null, () => {}] },
  "react/jsx-runtime": { jsx: () => null, jsxs: () => null, Fragment: () => null },
  "@/lib/use-prefers-reduced-motion": { usePrefersReducedMotion: () => false },
  "@/lib/gsap": { gsap: {}, useGSAP: () => {}, ScrollTrigger: {} },
  "@/lib/gacha-rarity-colors": { GACHA_RARITY_COLORS: {} },
  "./GachaCard": { GachaCard: () => null, GACHA_TIERS: [], GALAXY_TEXT: "", RARITY_TEXT: {} },
  "@/components/core/CountUp": { CountUp: () => null },
  "@/lib/roll-anim-config": { DEFAULT_ROLL_ANIM_CONFIG: {}, parseRollAnimJson: () => ({ ok: true }) },
  "@/lib/roll-tease": { randomTeaseSequence: () => [], orderedTeaseSequence: () => [], climbTeaseSequence: () => [] },
  "@/lib/use-roll-audio": { useRollAudio: () => ({ sfx: {}, enabled: true, toggle: () => {} }) },
};

const exports = await compileComponent(source, modules, "RollStage.tsx");
assert.equal(typeof pickExport(exports, "RollStage"), "function", "esperava export RollStage");

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

console.log("roll-anim-source ok");
