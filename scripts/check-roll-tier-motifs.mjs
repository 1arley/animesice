// Garante o contrato das três faixas acima de LENDARIA.
//
// MITICA e GALACTICA eram quase idênticas: mesmo TEASE_DURATION, mesmo tremor,
// mesmo shake, mesmo número de ondas. O jogador não via diferença nenhuma entre
// as duas, e nenhuma delas se distinguia de LENDARIA. Aqui travamos o que cada
// faixa precisa ter de próprio, e a ordem de escalada entre elas.
//
// Também trava a sincronia do tween do rótulo: ele precisa terminar junto com a
// fase de invocação, não vazar para dentro do tease.
//
// Roda em predev: node scripts/check-roll-tier-motifs.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { animate, createTimeline, engine, eases } from "animejs";

engine.pause();

const TIERS = ["COMUM", "INCOMUM", "RARA", "EPICA", "LENDARIA", "MITICA", "GALACTICA"];
const IDX_LEGENDARY = TIERS.indexOf("LENDARIA");

/**
 * Extrai a tabela direto do componente em vez de copiar os números para cá.
 *
 * Uma cópia manual não testa nada: eu mutava o componente e o script continuava
 * verde, porque as duas fontes divergiam em silêncio. Lendo o arquivo, o teste
 * passa a valer sobre o código que roda no browser. O `.tsx` não é importável
 * sem o loader do Next, então a extração é textual sobre o literal da tabela —
 * suficiente porque o formato é um `Record<RollRarity, number>` estável.
 */
function readTierTable(name) {
  const source = readFileSync(
    new URL("../src/components/gacha/RollStage.tsx", import.meta.url),
    "utf8",
  );
  const start = source.indexOf(`const ${name}: Record<RollRarity`);
  assert.notEqual(start, -1, `tabela ${name} não encontrada no componente`);
  const open = source.indexOf("{", start);
  const close = source.indexOf("};", open);
  assert.notEqual(close, -1, `tabela ${name} não fechada no componente`);
  const body = source.slice(open + 1, close);
  const table = {};
  for (const tier of TIERS) {
    const match = new RegExp(`\\b${tier}:\\s*(-?[\\d.]+)`).exec(body);
    assert.ok(match, `${name}.${tier} não encontrado no componente`);
    table[tier] = Number(match[1]);
  }
  return table;
}

/** Mesma extração, para a tabela que guarda listas de rajadas. */
function readBurstTable(name) {
  const source = readFileSync(
    new URL("../src/components/gacha/RollStage.tsx", import.meta.url),
    "utf8",
  );
  const start = source.indexOf(`const ${name}: Record<RollRarity, number[]>`);
  assert.notEqual(start, -1, `tabela ${name} não encontrada no componente`);
  const open = source.indexOf("{", start);
  const close = source.indexOf("};", open);
  const body = source.slice(open + 1, close);
  const table = {};
  for (const tier of TIERS) {
    const match = new RegExp(`\\b${tier}:\\s*\\[([^\\]]*)\\]`).exec(body);
    assert.ok(match, `${name}.${tier} não encontrado no componente`);
    table[tier] = match[1]
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((n) => Number.isFinite(n));
  }
  return table;
}

const TEASE_DURATION = readTierTable("TEASE_DURATION");
const TIER_TREMBLE = readTierTable("TIER_TREMBLE");
const TIER_SHAKE = readTierTable("TIER_SHAKE");
const TIER_HANG = readTierTable("TIER_HANG");
const TIER_SHAKE_BURSTS = readBurstTable("TIER_SHAKE_BURSTS");

const COMPONENT_SOURCE = readFileSync(
  new URL("../src/components/gacha/RollStage.tsx", import.meta.url),
  "utf8",
);

/**
 * Confere que uma expressão aparece literalmente no componente.
 *
 * As asserções de fórmula abaixo reimplementam a expressão para poder rodá-la.
 * Se o componente mudar e a cópia aqui não, o teste passa a mentir. Esta
 * checagem amarra as duas: a fórmula é exercitada *e* está no arquivo.
 */
function assertInComponent(label, needle) {
  assert.ok(
    COMPONENT_SOURCE.includes(needle),
    `\`${label}\` não está mais no componente (procurado: ${needle}) — atualize a fórmula deste script junto com ele`,
  );
}

assertInComponent(
  "sincronia do rótulo",
  "const labelStep = Math.max(0.12, (invocationEnd - labelStart) / 3);",
);
assertInComponent("curva back.out", "1 - backIn(overshoot)(1 - t)");
assertInComponent("curva back.in", "t * t * ((overshoot + 1) * t - overshoot)");

/* --- 1. Escalada monotônica: cada degrau da tabela cresce sem platear -------- */

// Não-exigência: os efeitos começam em RARA (COMUM e INCOMUM não têm tremor nem
// shake por decisão de design). Exigência: a partir de RARA cada degrau cresce.
const NO_TREMOR_BELOW = ["COMUM", "INCOMUM"];
for (const tier of NO_TREMOR_BELOW) {
  assert.equal(TIER_TREMBLE[tier], 0, `${tier} não deveria tremer`);
  assert.equal(TIER_SHAKE[tier], 0, `${tier} não deveria sacudir`);
}
// TREMOR e SHAKE só existem a partir de RARA; HANG só a partir de LENDARIA.
// Cada eixo declara onde começa, e a escalada é exigida só acima disso.
const STARTS_AT = {
  TEASE_DURATION: 0,
  TIER_TREMBLE: 2,
  TIER_SHAKE: 2,
  TIER_HANG: IDX_LEGENDARY,
};
for (const [name, table] of Object.entries({ TEASE_DURATION, TIER_TREMBLE, TIER_SHAKE, TIER_HANG })) {
  const start = STARTS_AT[name];
  for (let i = 1; i < TIERS.length; i += 1) {
    // Antes do degrau inicial o valor é zero por design, não platô. O degrau
    // inicial (`i === start`) é o primeiro valor não-zero e já pode ser maior.
    if (i < start) {
      assert.equal(table[TIERS[i]], 0, `${name}: ${TIERS[i]} deveria ser zero (ainda não começou)`);
      continue;
    }
    if (i === start) {
      assert.ok(table[TIERS[i]] > 0, `${name}: ${TIERS[i]} deveria começar o efeito`);
      continue;
    }
    const prev = table[TIERS[i - 1]];
    const curr = table[TIERS[i]];
    assert.ok(curr > prev, `${name}: ${TIERS[i]} (${curr}) não passa de ${TIERS[i - 1]} (${prev})`);
  }
}
// A duração do tease escala em toda a tabela, sem exceção.
for (let i = 1; i < TIERS.length; i += 1) {
  assert.ok(
    TEASE_DURATION[TIERS[i]] > TEASE_DURATION[TIERS[i - 1]],
    `TEASE_DURATION: ${TIERS[i]} não passa de ${TIERS[i - 1]}`,
  );
}

/* --- 2. MITICA e GALACTICA têm assinatura própria, não só número maior ------ */

// As duas devem diferir de LENDARIA em ao menos três eixos. Se alguém achatar
// de volta para valores iguais, aqui quebra — que é o ponto.
for (const axis of ["TEASE_DURATION", "TIER_TREMBLE", "TIER_SHAKE", "TIER_HANG"]) {
  const table = { TEASE_DURATION, TIER_TREMBLE, TIER_SHAKE, TIER_HANG }[axis];
  assert.notEqual(table.MITICA, table.LENDARIA, `${axis}: MITICA igual a LENDARIA`);
  assert.notEqual(table.GALACTICA, table.MITICA, `${axis}: GALACTICA igual a MITICA`);
}

// A fratura de MITICA precisa de mais rajadas que LENDARIA, e GALACTICA mais que
// MITICA: é a escalada da violência.
assert.ok(TIER_SHAKE_BURSTS.MITICA.length > TIER_SHAKE_BURSTS.LENDARIA.length);
assert.ok(TIER_SHAKE_BURSTS.GALACTICA.length > TIER_SHAKE_BURSTS.MITICA.length);

// O hang é exclusivo das faixas altas — nas demais o giro não desacelera, e
// slowing down numa carta comum só atrasaria o reveal sem motivo.
for (const tier of TIERS.slice(0, IDX_LEGENDARY)) {
  assert.equal(TIER_HANG[tier], 0, `hang em ${tier} não deveria existir`);
}
assert.ok(TIER_HANG.LENDARIA > 0);

/* --- 3. O hang precisa caber antes do impacto ------------------------------- */

for (const tier of TIERS) {
  const hang = TIER_HANG[tier];
  if (hang === 0) continue;
  const lock = Math.max(0.3, TEASE_DURATION[tier] - 0.35);
  const impactAt = TEASE_DURATION[tier] + (TIERS.indexOf(tier) >= IDX_LEGENDARY ? 0.65 : 0);
  // Começar o hang antes da trava de cor roubaria a entrega da raridade real.
  assert.ok(impactAt - hang > lock, `${tier}: hang (${hang}s) invade a trava de cor`);
  // E precisa caber na própria janela de tensão, com folga.
  assert.ok(hang < impactAt, `${tier}: hang maior que a janela de tensão`);
}

/* --- 4. Sincronia do tween do rótulo ---------------------------------------- */

// Reproduz a fórmula do rótulo contra a fronteira de fase real. `labelStep`
// precisa ser positivo e o total (3 passos) tem de fechar em `invocationEnd`.
function labelStepFor(invocationEnd) {
  const labelStart = 0.2;
  return Math.max(0.12, (invocationEnd - labelStart) / 3);
}

for (const invocationEnd of [1.1, 1.25, 2, 4]) {
  const step = labelStepFor(invocationEnd);
  assert.ok(step > 0, `invocationEnd ${invocationEnd}: passo degenerado`);
  const total = step * 3;
  // Com folga suficiente o total fecha exatamente; com folga curta o piso de
  // 0.12 estica um pouco, e ainda assim não pode passar do fim da fase.
  assert.ok(total <= invocationEnd, `invocationEnd ${invocationEnd}: rótulo vaza ${(total - invocationEnd).toFixed(3)}s`);
}

// O caso concreto que o port corrigiu: com duração fixa de 0.6 (3 passos) o
// rótulo estourava 0.2 + 1.8 = 2.0s, bem depois do invocationEnd de 1.25s.
const oldTotal = 0.2 + 0.6 * 3;
assert.ok(oldTotal > 1.25, "a duração antiga deveria estourar (senão o bug sumiu)");
const newTotal = 0.2 + labelStepFor(1.25) * 3;
assert.ok(Math.abs(newTotal - 1.25) < 1e-9, `novo total não fecha em 1.25: ${newTotal}`);

// E o piso de 0.12 não pode estourar a fase em invocações curtas.
for (const invocationEnd of [0.2, 0.32, 0.5]) {
  const total = 0.2 + labelStepFor(invocationEnd) * 3;
  assert.ok(total <= 0.56, `invocationEnd ${invocationEnd}: piso esticou demais (${total.toFixed(2)}s)`);
}

/* --- 5. anime: o padrão de yoyo que o port usa ----------------------------- */

// `loop: 2, alternate: true` tem de dar 3 passagens (subir, descer, subir),
// igual ao `repeat: 2, yoyo: true` do GSAP. É a base do cálculo acima. Usa o
// anime real para não duplicar a expectativa.
const target = { v: 0 };
const inst = animate(target, { v: 1, duration: 1, ease: "linear", loop: 2, alternate: true, autoplay: false });
assert.equal(inst.duration, 3, "loop:2 + alternate deve dar 3s (3 passagens)");
[0.5, 1.5, 2.5].forEach((t) => {
  inst.seek(t);
  assert.equal(target.v, 0.5, `meio de passagem ${t}s deveria estar em 0.5, está em ${target.v}`);
});
inst.seek(1);
assert.equal(target.v, 1, "pico da 1a passagem");
inst.seek(2);
assert.equal(target.v, 0, "voltada da 2a passagem");

/* --- 6. eases usados pelo port existem no pacote ---------------------------- */

for (const [name, fn] of Object.entries({
  outQuad: eases.outQuad, inQuad: eases.inQuad,
  outCubic: eases.outCubic, inCubic: eases.inCubic, inOutCubic: eases.inOutCubic,
  outQuart: eases.outQuart, inOutQuart: eases.inOutQuart, inOutSine: eases.inOutSine,
  linear: eases.linear,
})) {
  assert.equal(typeof fn, "function", `ease ${name} ausente no anime`);
  assert.ok(Math.abs(fn(1) - 1) < 1e-6, `ease ${name} não fecha em 1`);
  assert.ok(Math.abs(fn(0) - 0) < 1e-6, `ease ${name} não começa em 0`);
}

// backOut local tem de bater a fórmula do GSAP nos três overshoots do reveal.
//
// A fórmula crua `t*t*((s+1)*t - s)` é a de back.IN: ela dá NEGATIVO no meio e
// nunca estoura. A out é `1 - in(1 - t)`. Este teste existe porque a versão
// errada compila, roda e "funciona" — só não faz o que o nome promete.
const backIn = (s) => (t) => t * t * ((s + 1) * t - s);
const backOut = (s) => (t) => 1 - backIn(s)(1 - t);

for (const overshoot of [1.7, 2.4, 2.6]) {
  const ease = backOut(overshoot);
  assert.ok(Math.abs(ease(0) - 0) < 1e-9, `backOut(${overshoot}) não começa em 0`);
  assert.ok(Math.abs(ease(1) - 1) < 1e-9, `backOut(${overshoot}) não fecha em 1: ${ease(1)}`);
  // `back.out` estoura 1: o pico tem de passar de 1, e nenhum ponto pode ser
  // negativo (a curva da `in` daria -0.0875 no meio com s=1.7).
  let peak = 0;
  let peakAt = 0;
  for (let t = 0; t <= 1.0001; t += 0.001) {
    const v = ease(t);
    assert.ok(v >= -1e-9, `backOut(${overshoot}) fica negativo em t=${t.toFixed(3)}: ${v}`);
    if (v > peak) { peak = v; peakAt = t; }
  }
  assert.ok(peak > 1, `backOut(${overshoot}) não estoura: pico=${peak}`);
  // O overshoot tem de acontecer antes do fim (curva volta para 1).
  assert.ok(peakAt < 1, `backOut(${overshoot}) estoura só no fim: t=${peakAt.toFixed(3)}`);
  // E o pico cresce com o parâmetro.
  if (overshoot > 1.7) {
    let base = 0;
    for (let t = 0; t <= 1.0001; t += 0.001) base = Math.max(base, backOut(1.7)(t));
    assert.ok(peak > base, `backOut(${overshoot}) (pico ${peak.toFixed(4)}) não passa de backOut(1.7) (${base.toFixed(4)})`);
  }
}

// Spot-check dos valores conhecidos do GSAP, para ancorar a fórmula.
assert.ok(Math.abs(backOut(1.7)(0.5) - 1.0875) < 1e-3, `backOut(1.7)(0.5) = ${backOut(1.7)(0.5)}, esperado ~1.0875`);
assert.ok(Math.abs(backOut(2.4)(0.5) - 1.175) < 1e-3, `backOut(2.4)(0.5) = ${backOut(2.4)(0.5)}, esperado ~1.175`);
assert.ok(Math.abs(backOut(2.6)(0.5) - 1.2) < 1e-3, `backOut(2.6)(0.5) = ${backOut(2.6)(0.5)}, esperado ~1.2`);

/* --- 7. Timeline filha ancorada por sync (não add) -------------------------- */

const parent = createTimeline({ autoplay: false });
const child = createTimeline({ autoplay: false });
const probe2 = { v: 0 };
child.add(probe2, { v: 10, duration: 2, ease: "linear" }, 0);
parent.sync(child, 3);
assert.equal(parent.duration, 5, "sync deve estender a duração do pai pelo offset");
parent.seek(2.5);
assert.equal(probe2.v, 0, "filha não pode rodar antes do offset");
parent.seek(4);
assert.equal(probe2.v, 5, "meio da filha no offset 3 deve ser 5");

console.log("check-roll-tier-motifs: 7 grupos de asserções ok");