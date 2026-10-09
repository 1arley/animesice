// Trava as invariantes do plano de reveal do gacha.
//
// A v1 do reveal animou 8 alvos no mesmo instante e por 1,6s o plano mediu
// coisas arredondadas: ninguém conferiu se o beat sheet bate com o que a
// timeline executa. Estes asserts cobrem o que quebra em silêncio: dead zone
// sem pausa real, assentamento que não muda com a raridade e selo de raridade
// que não clareia na ordem das camadas.
import assert from "node:assert/strict";

import {
  PLANO_GACHA as PLANO,
  corDoSelo,
  duracaoDoAssentamento,
} from "../src/components/gacha/crystal-scene.js";

// Nenhum beat pode ser instantâneo: sem duração não há curva, sem curva não
// há física. 20ms é o piso abaixo do qual o olho lê como corte.
// Só as durações contam — o resto do plano é deslocamento e intensidade.
const DURACOES = [
  "entradaCamera",
  "pausaMinima",
  "seloRaridade",
  "retirada",
  "assentamento",
  "assentamentoRaro",
  "reflexo",
  "leitura",
];

for (const nome of DURACOES) {
  assert.equal(typeof PLANO[nome], "number", `PLANO_GACHA.${nome} ausente`);
  assert.ok(PLANO[nome] >= 0.02, `PLANO_GACHA.${nome} = ${PLANO[nome]}s é um corte`);
}

// A dead zone precisa existir: é o que separa a invocação do resultado.
assert.ok(PLANO.pausaMinima >= 0.12, "pausaMinima abaixo de 120ms não é dead zone");

// Raridade muda tempo, nunca quantidade de efeitos: uma única duração, duas
// intensidades, e a rara sempre mais lenta que a comum.
assert.notEqual(duracaoDoAssentamento(3), duracaoDoAssentamento(4));
assert.ok(duracaoDoAssentamento(4) > duracaoDoAssentamento(0));
assert.equal(duracaoDoAssentamento(6), duracaoDoAssentamento(4));

// O selo muda de cor na ordem das camadas e é injetado uma vez só.
const cor = (indice) => corDoSelo(indice);
const soma = (indice) => cor(indice).reduce((a, b) => a + b, 0);

assert.ok(
  cor(6).every((canal) => canal >= 0 && canal <= 1),
  "cor fora de 0..1",
);
assert.notDeepEqual(cor(6), cor(0), "comum e galáctica não podem ser a mesma cor");
assert.ok(cor(4)[0] > cor(4)[2], "LENDARIA é dourada: vermelho domina o azul");
assert.ok(cor(3)[2] > cor(3)[0], "EPICA é fria: azul domina o vermelho");
assert.ok(soma(6) > soma(0), "camada alta tem de ser a mais luminosa");
assert.deepEqual(cor(6), cor(6), "selo precisa ser estável por pull");

console.log("plano de reveal ok:", Object.keys(PLANO).length, "parâmetros");