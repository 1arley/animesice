/**
 * Sequência de tiers do tease.
 *
 * `randomTeaseSequence` é a que roda: sorteio puro, todo tier pode piscar em qualquer
 * momento (inclusive lendário numa carta comum). Não repete a cor anterior e não
 * despenca mais que `maxDrop` tiers, que era o que fazia o giro parecer pior do que já
 * tinha sido.
 * `orderedTeaseSequence` é a versão antiga, determinística e fora do fluxo. Fica como
 * registro histórico; para voltar atrás é só chamar ela no lugar da outra.
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