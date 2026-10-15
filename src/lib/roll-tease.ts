/**
 * Sequência de tiers do tease.
 *
 * `randomTeaseSequence` é a que roda: sorteio puro, todo tier pode piscar em qualquer
 * momento (inclusive lendário numa carta comum). Não repete a cor anterior e não
 * despenca mais que `maxDrop` tiers, que era o que fazia o giro parecer pior do que já
 * tinha sido.
 * `orderedTeaseSequence` é a versão antiga, determinística e fora do fluxo. Fica como
 * registro histórico; para voltar atrás é só chamar ela no lugar da outra.
 * `climbTeaseSequence` é a terceira: escada ascendente que termina na raridade real.
 * `fakeDropTeaseSequence` é a quarta: sobe até um tier falso alto (falso clímax),
 * congela brevemente, depois salta para a raridade real, criando tensão dupla.
 */

/** Queda máxima de tiers entre dois flashes seguidos. */
const MAX_DROP = 2;

export function randomTeaseSequence<T>(count: number, tiers: readonly T[], maxDrop = MAX_DROP): T[] {
  const sequence: T[] = [];
  const floor = Math.max(0, maxDrop);
  for (let i = 0; i < count; i += 1) {
    let index = Math.floor(Math.random() * tiers.length);
    const previous = sequence[i - 1];
    if (previous !== undefined) {
      index = Math.max(tiers.indexOf(previous) - floor, index);
    }
    if (tiers[index] === previous) {
      // Sobe sempre que dá; descer só é livre se o teto permitir. No topo com teto 0
      // não há saída sem repetir a cor — e repetir é melhor do que despencar.
      if (index + 1 < tiers.length) index = index + 1;
      else if (floor > 0) index = Math.max(0, index - 1);
    }
    sequence.push(tiers[index]!);
  }
  return sequence;
}

/** Versão antiga: tiers em passo de 2, sem repetição e nunca o `final` no último flash. */
export function orderedTeaseSequence<T>(count: number, tiers: readonly T[], final: T): T[] {
  const sequence: T[] = [];
  for (let i = 0; i < count; i += 1) {
    let index = (i * 2 + 1) % tiers.length;
    let tier = tiers[index]!;
    if (tier === sequence[i - 1] || (i === count - 1 && tier === final)) {
      index = (index + 1) % tiers.length;
      tier = tiers[index]!;
    }
    sequence.push(tier);
  }
  return sequence;
}

/** Peso geométrico entre degraus: o primeiro é curto e o topo longo antes do impacto. */
const CLIMB_RATIO = 1.34;

/**
 * Escada da tensão: abre em COMUM e sobe UM degrau por parada até cravar na raridade
 * real, sem descer nunca. É o oposto do sorteio — o jogador lê a subida como
 * aproximação e o topo é a própria carta.
 *
 * Devolve tier junto do instante porque aqui o número de paradas é o degrau da
 * raridade (não um `count` solto) e o topo precisa encostar no fim da janela:
 * os intervalos usam peso geométrico, então o primeiro degrau é imediato e os
 * seguintes desaceleram, deixando o topo mais tempo na tela antes do impacto.
 */
export function climbTeaseSequence<T>(
  total: number,
  tiers: readonly T[],
  final: T,
): Array<{ at: number; tier: T }> {
  const ladder = tiers.slice(0, Math.max(0, tiers.indexOf(final)) + 1);
  const gaps = Array.from({ length: Math.max(0, ladder.length - 1) }, (_, i) => CLIMB_RATIO ** i);
  const span = gaps.reduce((a, b) => a + b, 0);
  let acc = 0;
  return ladder.map((tier, i) => {
    const at = span === 0 ? 0 : (acc / span) * total;
    acc += gaps[i] ?? 0;
    return { at, tier };
  });
}

/** Peso geométrico do falso clímax: idem climb mas com curva mais agressiva. */
const FAKE_DROP_RATIO = 1.55;

/**
 * Falso clímax: sobe até um tier-isca (um degrau acima do real, ou o topo se já
 * for topo), congela nele por `freezeFraction` da janela total, depois crava na
 * raridade real. O efeito é uma dupla tensão — o jogador acha que ganhou algo
 * diferente e só descobre no impacto.
 *
 * @param total    Duração total da janela de tease (segundos).
 * @param tiers    Lista de todos os tiers em ordem crescente.
 * @param final    Tier real da carta.
 * @param freezeFraction  Fração da janela que o falso clímax fica na tela (0–0.45).
 */
export function fakeDropTeaseSequence<T>(
  total: number,
  tiers: readonly T[],
  final: T,
  freezeFraction = 0.28,
): Array<{ at: number; tier: T; freeze?: boolean }> {
  const finalIdx = tiers.indexOf(final);
  // O tier-isca é um degrau acima do real; se já for topo, usa o próprio.
  const fakeIdx = Math.min(finalIdx + 1, tiers.length - 1);
  const fakeTier = tiers[fakeIdx]!;
  const freeze = Math.max(0, Math.min(0.45, freezeFraction));

  // Fase 1: subida até o tier-isca (ocupa 1 - freeze da janela).
  const rampEnd = total * (1 - freeze);
  const ladder = tiers.slice(0, fakeIdx + 1);
  const gaps = Array.from({ length: Math.max(0, ladder.length - 1) }, (_, i) => FAKE_DROP_RATIO ** i);
  const span = gaps.reduce((a, b) => a + b, 0);
  let acc = 0;
  const result: Array<{ at: number; tier: T; freeze?: boolean }> = ladder.map((tier, i) => {
    const at = span === 0 ? 0 : (acc / span) * rampEnd;
    acc += gaps[i] ?? 0;
    return { at, tier };
  });

  // Fase 2: congelamento no topo (indicado pelo flag `freeze`).
  const freezeAt = rampEnd;
  // Só marca freeze explicitamente se o tier-isca for diferente do real
  // (para o chamador poder mostrar tremor/efeito diferenciado).
  if (fakeIdx !== finalIdx) {
    result.push({ at: freezeAt, tier: fakeTier, freeze: true });
  }

  // Fase 3: revelação da cor real — crava imediatamente antes do impacto.
  // Offset mínimo de 0.05s para a transição ser visível.
  result.push({ at: Math.min(total - 0.05, freezeAt + 0.04), tier: final });

  return result;
}
