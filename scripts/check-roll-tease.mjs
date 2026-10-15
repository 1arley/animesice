// Garante o contrato das sequências de tier do tease. O sorteio puro (`random`)
// nunca repete a cor anterior e nunca despenca mais que maxDrop tiers — foi essa
// queda que fazia o giro parecer pior do que já tinha sido.
// A antiga (`ordered`) fica guardada em src/lib/roll-tease.ts como registro histórico,
// fora do fluxo: determinística, sem o tier real antes da trava.
// A escada (`climb`) sobe um degrau por parada e termina na raridade real.
// Roda em predev: node scripts/check-roll-tease.mjs
import assert from "node:assert/strict";
import { DEFAULT_ROLL_ANIM_CONFIG, parseRollAnimJson } from "../src/lib/roll-anim-config.ts";
import { orderedTeaseSequence, randomTeaseSequence, climbTeaseSequence } from "../src/lib/roll-tease.ts";

const TIERS = ["COMUM", "INCOMUM", "RARA", "EPICA", "LENDARIA", "MITICA", "GALACTICA"];
const MAX_DROP = 2;
const RUNS = 500;
const FLASHES = 6;

assert.deepEqual(randomTeaseSequence(0, TIERS), []);

const seen = new Set();
for (let run = 0; run < RUNS; run += 1) {
  const sequence = randomTeaseSequence(FLASHES, TIERS);
  assert.equal(sequence.length, FLASHES);
  for (const tier of sequence) {
    assert.ok(TIERS.includes(tier), `tier fora da lista: ${tier}`);
    seen.add(tier);
  }
  for (let i = 1; i < sequence.length; i += 1) {
    assert.notEqual(sequence[i], sequence[i - 1], `repetiu ${sequence[i]} em seguida`);
    const drop = TIERS.indexOf(sequence[i - 1]) - TIERS.indexOf(sequence[i]);
    assert.ok(drop <= MAX_DROP, `despencou ${drop} tiers: ${sequence[i - 1]} -> ${sequence[i]}`);
  }
}
// 3000 sorteios cobrem os 7 tiers com folga; falhar aqui é o tease travado.
assert.deepEqual([...seen].sort(), [...TIERS].sort());

// A antiga é determinística: mesmas entradas, mesma saída, e nunca entrega a cor real antes da trava.
const ordered = orderedTeaseSequence(FLASHES, TIERS, "COMUM");
assert.deepEqual(ordered, orderedTeaseSequence(FLASHES, TIERS, "COMUM"));
assert.deepEqual(ordered, ["INCOMUM", "EPICA", "MITICA", "COMUM", "RARA", "LENDARIA"]);
assert.notEqual(ordered.at(-1), "COMUM");

// O flag escolhe qual das três roda, e nada fora das opções entra: config meio
// aplicada quebraria a prévia.
assert.equal(DEFAULT_ROLL_ANIM_CONFIG.teaseMode, "climb");
assert.equal(DEFAULT_ROLL_ANIM_CONFIG.maxDrop, MAX_DROP);
for (const mode of ["random", "ordered", "climb"]) {
  const parsed = parseRollAnimJson(JSON.stringify({ teaseMode: mode }));
  assert.equal(parsed.ok, true, `teaseMode ${mode} devia entrar`);
  assert.equal(parsed.value.teaseMode, mode);
}
assert.equal(parseRollAnimJson('{ "teaseMode": "sempre" }').ok, false);
assert.equal(parseRollAnimJson('{ "teaseMode": 1 }').ok, false);
assert.equal(parseRollAnimJson('{ "maxDrop": "2" }').ok, false);

// O teto é o que tira o plunge; maxDrop 0 é o caso extremo, sem queda nenhuma.
for (let run = 0; run < 200; run += 1) {
  const flatRun = randomTeaseSequence(FLASHES, TIERS, 0);
  for (let i = 1; i < FLASHES; i += 1) {
    assert.ok(
      TIERS.indexOf(flatRun[i]) >= TIERS.indexOf(flatRun[i - 1]),
      `caiu com maxDrop 0: ${flatRun.join(" > ")}`,
    );
  }
}

// A escada é o oposto do sorteio: sempre abre em COMUM, sobe UM degrau por parada e
// crava na raridade real exatamente no fim da janela da tensão.
const WINDOW = 1.5;
for (const final of TIERS) {
  const climb = climbTeaseSequence(WINDOW, TIERS, final);
  const expected = TIERS.slice(0, TIERS.indexOf(final) + 1);
  assert.deepEqual(
    climb.map((stop) => stop.tier),
    expected,
    `escada de ${final} deveria subir ${expected.join(" > ")}`,
  );
  assert.equal(climb[0].tier, TIERS[0], `escada de ${final} deveria abrir em ${TIERS[0]}`);
  assert.equal(climb[0].at, 0, `escada de ${final} deveria abrir a janela em ${TIERS[0]}`);
  // Sem degrau para subir (o próprio COMUM) a trava é imediata; com degraus, o topo
  // encosta no fim da janela e fica travado até o impacto.
  assert.equal(
    climb.at(-1).at,
    climb.length === 1 ? 0 : WINDOW,
    `escada de ${final} deveria travar no fim da tensão`,
  );
  for (let i = 1; i < climb.length; i += 1) {
    assert.ok(climb[i].at > climb[i - 1].at, `paradas da escada de ${final} devem adiantar`);
  }
  // Desacelera: o último degrau espera mais que o primeiro intervalo.
  if (climb.length > 2) {
    const gaps = climb.slice(1).map((stop, i) => stop.at - climb[i].at);
    assert.ok(gaps.at(-1) > gaps[0], `escada de ${final} deveria desacelerar`);
  }
}
// Raro tem que demorar mais que comum: a janela é a mesma, a escada é mais longa.
assert.ok(
  climbTeaseSequence(WINDOW, TIERS, "GALACTICA").length > climbTeaseSequence(WINDOW, TIERS, "COMUM").length,
  "raridade alta deveria ter mais degraus que a comum",
);

console.log("check-roll-tease: ok");
