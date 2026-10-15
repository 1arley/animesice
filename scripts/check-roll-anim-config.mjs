// Garante que o tester de /admin/gacha/animacao aceita o bloco de config
// colado direto do código (TS), e rejeita entrada ruim em vez de aplicar meio config.
// Roda em predev: node scripts/check-roll-anim-config.mjs
import assert from "node:assert/strict";
import { DEFAULT_ROLL_ANIM_CONFIG, parseRollAnimJson, readRollAnimConfig } from "../src/lib/roll-anim-config.ts";

// Bloco como o dev copia do RollStage: comentário, `as const`, vírgula final.
const TS_BLOCK = `
// Controles do giro. Todos os tempos são segundos na linha do tempo a 1x;
const ROLL = {
  enterDuration: 0.15,
  crystalSpinAt: 0.2,
  crystalSpinDuration: 0.9,
  revealAt: 1.2,
  crystalOutDuration: 0.25,
  ringSlots: 3,
  ringDuration: 0.55,
  ringStagger: 0.12,
  particleSlots: 24,
  particleDuration: 0.55,
  particleReach: { x: 180, y: 230 },
  particleGalaxy: ["#a78bfa", "#f472b6", "#38bdf8"],
  effectsGap: 0.18,
  flipDuration: 0.42,
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
  '{ "particleReach": { "x": 180 } }',
  '{ "particleReach": { "x": -1, "y": 230 } }',
  '{ "particleGalaxy": [] }',
  '{ "particleGalaxy": ["red"] }',
  '{ "particleSlots": 1.5 }',
  '{ "flipDuration": -1 }',
  '{ "glowAt": 1 }',
  '[1, 2]',
  "sem objeto aqui",
]) {
  const result = parseRollAnimJson(bad);
  assert.equal(result.ok, false, `devia rejeitar: ${bad}`);
  assert.ok(result.error.length > 0, `falta motivo do erro: ${bad}`);
}

assert.equal(readRollAnimConfig({ glowAt: 2, flipDuration: 0.8 }).flipDuration, 0.8);
assert.deepEqual(readRollAnimConfig({ particleReach: { x: 1 } }), DEFAULT_ROLL_ANIM_CONFIG);
assert.equal(readRollAnimConfig({ particleReach: { x: 1 }, flipDuration: 0.8 }).flipDuration, 0.8);

console.log("check-roll-anim-config: ok");
