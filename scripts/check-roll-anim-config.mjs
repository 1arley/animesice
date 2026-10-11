// Garante que o tester de /admin/gacha/animacao aceita o bloco de config
// colado direto do código (TS), e rejeita entrada ruim em vez de aplicar meio config.
// Roda em predev: node scripts/check-roll-anim-config.mjs
import assert from "node:assert/strict";
import { parseRollAnimJson } from "../src/lib/roll-anim-config.ts";

// Bloco como o dev copia do RollStage: comentário, `as const`, vírgula final.
const TS_BLOCK = `
// Controles do giro. Todos os tempos são segundos na linha do tempo a 1x;
const ROLL = {
  enterDuration: 0.15,
  crystalSpinAt: 0.2,
  crystalSpinDuration: 1.2,
  revealAt: 1.8,
  crystalOutDuration: 0.25,
  ringSlots: 3,
  ringDuration: 0.55,
  ringStagger: 0.12,
  particleSlots: 24,
  particleDuration: 0.65,
  particleReach: { x: 180, y: 230 },
  particleGalaxy: ["#a78bfa", "#f472b6", "#38bdf8"],
  effectsGap: 0.05,
  flipDuration: 0.48,
  sweepDuration: 0.6,
  badgeDuration: 0.3,
} as const;
`;

const parsed = parseRollAnimJson(TS_BLOCK);
assert.equal(parsed.ok, true, `bloco TS devia entrar: ${parsed.error ?? ""}`);
assert.equal(parsed.value.enterDuration, 0.15);
assert.deepEqual(parsed.value.particleReach, { x: 180, y: 230 });
assert.deepEqual(parsed.value.particleGalaxy, ["#a78bfa", "#f472b6", "#38bdf8"]);

// JSON puro e objeto parcial continuam valendo.
const partial = parseRollAnimJson('{ "flipDuration": 0.8 }');
assert.equal(partial.ok, true);
assert.deepEqual(partial.value, { flipDuration: 0.8 });

// Vírgula final é vício de código, entra.
assert.deepEqual(parseRollAnimJson('{ "flipDuration": 0.8, }').value, { flipDuration: 0.8 });

// Chave sem aspas também entra — é o que aparece no bloco TS.
assert.deepEqual(parseRollAnimJson("{ flipDuration: 0.8 }").value, { flipDuration: 0.8 });

// Entrada que não pode virar config: aplica nada e explica o motivo.
for (const bad of [
  '{ "naoExiste": 1 }',
  '{ "flipDuration": "0.8" }',
  '{ "particleGalaxy": "#fff" }',
  '{ "particleReach": 180 }',
  '[1, 2]',
  "sem objeto aqui",
]) {
  const result = parseRollAnimJson(bad);
  assert.equal(result.ok, false, `devia rejeitar: ${bad}`);
  assert.ok(result.error.length > 0, `falta motivo do erro: ${bad}`);
}

console.log("check-roll-anim-config: ok");