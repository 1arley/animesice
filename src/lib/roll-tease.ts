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