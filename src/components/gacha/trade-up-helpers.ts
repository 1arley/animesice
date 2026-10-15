export const GACHA_TIERS = [
  "COMUM",
  "INCOMUM",
  "RARA",
  "EPICA",
  "LENDARIA",
  "MITICA",
  "GALACTICA",
] as const;

export type GachaTier = (typeof GACHA_TIERS)[number];

export const CARD_TRADE_UP_COUNT = 4;
export const SKIN_TRADE_UP_COUNT = 3;

/**
 * Retorna a raridade imediatamente superior para trade-up de cartas,
 * ou null se a raridade já for a máxima ou desconhecida.
 */
export function getTradeUpNextRarity(currentRarity: string): string | null {
  const index = (GACHA_TIERS as readonly string[]).indexOf(currentRarity);
  if (index < 0 || index >= GACHA_TIERS.length - 1) {
    return null;
  }
  return GACHA_TIERS[index + 1] ?? null;
}

export function isMaxCardRarity(rarity: string): boolean {
  return getTradeUpNextRarity(rarity) === null;
}

export interface CardSelectionCandidate {
  id: string;
  rarity?: string;
  card?: { rarity: string };
  status?: string;
}

export interface SkinSelectionCandidate {
  id: string;
  rarity: string;
  status?: string;
}

export interface CardTradeUpValidationResult {
  valid: boolean;
  error?: string;
  rarity?: string;
  nextRarity?: string;
}

export function validateCardTradeUpSelection(
  cards: CardSelectionCandidate[],
): CardTradeUpValidationResult {
  if (cards.length !== CARD_TRADE_UP_COUNT) {
    return {
      valid: false,
      error: `Selecione exatamente ${CARD_TRADE_UP_COUNT} cartas (atualmente ${cards.length}).`,
    };
  }

  const ids = new Set(cards.map((c) => c.id));
  if (ids.size !== CARD_TRADE_UP_COUNT) {
    return {
      valid: false,
      error: "Não é permitido selecionar a mesma carta mais de uma vez.",
    };
  }

  if (cards.some((c) => c.status && c.status !== "ACTIVE")) {
    return {
      valid: false,
      error: "Apenas cartas ativas no inventário podem ser usadas no Trade-up.",
    };
  }

  const getRarity = (c: CardSelectionCandidate) => c.rarity ?? c.card?.rarity;
  const firstRarity = cards[0] ? getRarity(cards[0]) : undefined;
  if (!firstRarity) {
    return { valid: false, error: "Raridade indefinida." };
  }

  if (cards.some((c) => getRarity(c) !== firstRarity)) {
    return {
      valid: false,
      error: "As quatro cartas precisam ter a mesma raridade.",
    };
  }

  const nextRarity = getTradeUpNextRarity(firstRarity);
  if (!nextRarity) {
    return {
      valid: false,
      error: `Não existe trade-up para a raridade ${firstRarity} (raridade máxima).`,
      rarity: firstRarity,
    };
  }

  return {
    valid: true,
    rarity: firstRarity,
    nextRarity,
  };
}

export interface SkinTradeUpValidationResult {
  valid: boolean;
  error?: string;
  rarity?: string;
}

export function validateSkinTradeUpSelection(
  skins: SkinSelectionCandidate[],
): SkinTradeUpValidationResult {
  if (skins.length !== SKIN_TRADE_UP_COUNT) {
    return {
      valid: false,
      error: `Selecione exatamente ${SKIN_TRADE_UP_COUNT} skins (atualmente ${skins.length}).`,
    };
  }

  const ids = new Set(skins.map((s) => s.id));
  if (ids.size !== SKIN_TRADE_UP_COUNT) {
    return {
      valid: false,
      error: "Não é permitido selecionar a mesma skin mais de uma vez.",
    };
  }

  if (skins.some((s) => s.status && s.status !== "ACTIVE")) {
    return {
      valid: false,
      error: "Apenas skins ativas no inventário podem ser usadas no Trade-up.",
    };
  }

  const firstRarity = skins[0]?.rarity;
  if (!firstRarity) {
    return { valid: false, error: "Raridade indefinida." };
  }

  if (skins.some((s) => s.rarity !== firstRarity)) {
    return {
      valid: false,
      error: "As três skins precisam ter a mesma raridade.",
    };
  }

  return {
    valid: true,
    rarity: firstRarity,
  };
}

/**
 * Mapeia erros do backend (mensagens de conflito, validação e
 * bloqueio de economia) para mensagens claras e compreensíveis ao usuário.
 */
export function formatTradeUpError(
  error: unknown,
  type: "CARD" | "SKIN",
): string {
  const isHttpError =
    typeof error === "object" && error !== null && "statusCode" in error;
  const statusCode = isHttpError ? (error as { statusCode: number }).statusCode : 0;
  const raw =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : "";

  if (raw) {
    // Erros de inventário / disponibilidade
    if (
      raw.includes("não está disponível") ||
      raw.includes("não está mais disponível")
    ) {
      return type === "CARD"
        ? "Uma ou mais cartas selecionadas não estão mais disponíveis no seu inventário (podem ter sido negociadas ou consumidas)."
        : "Uma ou mais skins selecionadas não estão mais disponíveis no seu inventário.";
    }

    // Erros de raridades divergentes
    if (raw.includes("mesma raridade")) {
      return type === "CARD"
        ? "As quatro cartas selecionadas precisam ter exatamente a mesma raridade."
        : "As três skins selecionadas precisam ter exatamente a mesma raridade.";
    }

    // Erros de pool vazio ou raridade máxima
    if (raw.includes("Não existe trade-up para essa raridade")) {
      return "Não existe trade-up para essa raridade (nível máximo alcançado).";
    }

    if (raw.includes("Não há cartas disponíveis na raridade seguinte")) {
      return "Não há cartas ativas disponíveis na raridade seguinte para receber como resultado.";
    }

    if (raw.includes("Pool de skins vazio")) {
      return "O catálogo de skins para esta raridade está temporariamente vazio.";
    }

    // Erros de bloqueio da economia
    if (
      raw.includes("saldo negativo") ||
      raw.includes("revisão") ||
      raw.includes("Economia bloqueada")
    ) {
      return "Economia bloqueada: sua conta está em revisão ou possui saldo negativo.";
    }

    if (raw.includes("ainda não liberada")) {
      return "A economia do gacha ainda não foi liberada para esta conta.";
    }

    if (raw.includes("Verifique o e-mail")) {
      return "Confirme seu e-mail para desbloquear as funções de economia.";
    }

    if (raw.includes("sete dias")) {
      return "Sua conta precisa ter pelo menos 7 dias de criação para utilizar a economia.";
    }

    // Fallbacks por status HTTP
    if (statusCode === 403) {
      return raw || "Economia bloqueada: você não tem permissão para realizar operações de troca.";
    }

    if (statusCode === 409) {
      return raw || "Conflito ao realizar o Trade-up. Atualize o inventário e tente novamente.";
    }

    if (statusCode === 400) {
      return raw || "Seleção inválida para Trade-up.";
    }

    return raw;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Não foi possível realizar o Trade-up. Tente novamente mais tarde.";
}
