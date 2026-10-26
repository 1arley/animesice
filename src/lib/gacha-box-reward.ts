import type { GachaItemKind } from "@/types";

const BOX_REWARD_CATEGORIES = [
  "CRYSTAL",
  "KEY",
  "SPIN_RESET",
  "ITEM",
  "RARE_BOX",
  "KEY_RARE_BOX",
  "KEY_PREMIUM_BOX",
  "CARD",
  "SKIN",
  "CARD_BACK",
] as const;

export const ITEM_KIND_LABEL: Record<GachaItemKind, string> = {
  TITANITA: "Fragmentos de Titanita",
  TITANITA_SOMBRIA: "Fragmentos de Titanita Sombria",
  DRACONICA: "Fragmentos de Dracônica",
  SOMBRIA_DRACONICA: "Fragmentos de Dracônica Sombria",
  PROTECAO: "Proteção de reroll",
};

const RARITY_LABEL: Record<string, string> = {
  COMUM: "Comum",
  COMMON: "Comum",
  INCOMUM: "Incomum",
  UNCOMMON: "Incomum",
  RARA: "Rara",
  RARE: "Rara",
  EPICA: "Épica",
  EPIC: "Épica",
  LENDARIA: "Lendária",
  LEGENDARY: "Lendária",
  MITICA: "Mítica",
  MYTHIC: "Mítica",
  GALACTICA: "Galáctica",
  GALACTIC: "Galáctica",
};

const FOIL_LABEL: Record<string, string> = {
  NORMAL: "Padrão",
  HOLO: "Holográfico",
  GOLD: "Dourado",
  INK: "Tinta",
  PRISM: "Prisma",
};

export function isKnownBoxRewardCategory(category: unknown): boolean {
  return BOX_REWARD_CATEGORIES.includes(
    category as (typeof BOX_REWARD_CATEGORIES)[number],
  );
}

function count(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function quantity(value: unknown, singular: string, plural: string) {
  const amount = count(value);
  return amount === null
    ? plural
    : `${amount.toLocaleString("pt-BR")} ${amount === 1 ? singular : plural}`;
}

type BoxRewardDisplay = { title: string; details?: string[] };

export function boxRewardDisplay(
  reward: Record<string, unknown>,
): BoxRewardDisplay {
  const name = (value: unknown, fallback: string) =>
    typeof value === "string" && value.trim() ? value.trim() : fallback;

  switch (reward.category) {
    case "CRYSTAL":
      return { title: quantity(reward.amount, "cristal", "cristais") };
    case "KEY":
      return { title: quantity(reward.amount, "chave", "chaves") };
    case "SPIN_RESET":
      return { title: quantity(reward.amount, "reset de giro", "resets de giro") };
    case "ITEM": {
      const kind = String(reward.kind ?? "");
      const label =
        ITEM_KIND_LABEL[kind as GachaItemKind] ?? "Item de loot box";
      const amount = count(reward.quantity);
      return { title: amount === null ? label : `${amount.toLocaleString("pt-BR")}× ${label}` };
    }
    case "RARE_BOX":
      return { title: quantity(reward.amount, "caixa rara", "caixas raras") };
    case "KEY_RARE_BOX":
    case "KEY_PREMIUM_BOX": {
      const tier = reward.category === "KEY_RARE_BOX" ? "rara" : "premium";
      const boxField = reward.category === "KEY_RARE_BOX" ? "rareBoxes" : "premiumBoxes";
      const singularBox = `caixa ${tier}`;
      const pluralBox = tier === "rara" ? "caixas raras" : "caixas premium";
      return {
        title: `${quantity(reward[boxField], singularBox, pluralBox)} + ${quantity(reward.keys, "chave", "chaves")}`,
      };
    }
    case "CARD": {
      const hidden = reward.imageHidden === true || reward.name === "???";
      const details = [
        typeof reward.rarity === "string"
          ? `Raridade: ${RARITY_LABEL[reward.rarity] ?? reward.rarity}`
          : null,
        typeof reward.foil === "string"
          ? `Acabamento: ${FOIL_LABEL[reward.foil] ?? reward.foil}`
          : null,
        typeof reward.condition === "number" && Number.isFinite(reward.condition)
          ? `Desgaste ${reward.condition.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`
          : null,
      ].filter((value): value is string => typeof value === "string" && !!value);
      return {
        title: hidden ? "Carta misteriosa" : `Carta: ${name(reward.name, "Carta recebida")}`,
        details: details.length ? details : undefined,
      };
    }
    case "SKIN": {
      const skins = Array.isArray(reward.skins)
        ? reward.skins.filter(
            (skin): skin is Record<string, unknown> =>
              typeof skin === "object" && skin !== null,
          )
        : [];
      if (skins.length) {
        const details = skins
          .map((skin) =>
            [
              name(skin.name, "Skin recebida"),
              typeof skin.rarity === "string"
                ? `Raridade: ${RARITY_LABEL[skin.rarity] ?? skin.rarity}`
                : null,
            ]
              .filter((value): value is string => !!value)
              .join(" · "),
          );
        return { title: `${skins.length} skins recebidas`, details };
      }
      const rarity = typeof reward.rarity === "string" ? reward.rarity : undefined;
      return {
        title: `Skin: ${name(reward.name, "Skin recebida")}`,
        details: rarity
          ? [`Raridade: ${RARITY_LABEL[rarity] ?? rarity}`]
          : undefined,
      };
    }
    case "CARD_BACK": {
      if (reward.duplicate === true) {
        const crystals = count(reward.crystals);
        return {
          title: "Capa duplicada",
          details:
            crystals === null
              ? ["Valor da compensação indisponível"]
              : crystals > 0
                ? [quantity(crystals, "cristal", "cristais") + " de compensação"]
                : ["Nenhum cristal recebido como compensação"],
        };
      }
      return {
        title: `Capa: ${name(reward.name, "Nova capa")}`,
        details:
          typeof reward.rarity === "string"
            ? [`Raridade: ${RARITY_LABEL[reward.rarity] ?? reward.rarity}`]
            : undefined,
      };
    }
    default:
      return { title: name(reward.name, "Detalhes da recompensa indisponíveis") };
  }
}

export function boxRewardLabel(reward: Record<string, unknown>) {
  const { title, details } = boxRewardDisplay(reward);
  return details?.length ? `${title} · ${details.join(" · ")}` : title;
}

export function boxRewardStatus(reward: Record<string, unknown>) {
  if (!isKnownBoxRewardCategory(reward.category)) {
    return "A abertura foi confirmada, mas os detalhes dessa recompensa não estão disponíveis.";
  }
  if (reward.category === "CRYSTAL") {
    return "Cristais já entram no seu saldo disponível.";
  }
  if (reward.category === "SPIN_RESET") {
    return "Reset guardado. Use após esgotar os previews da hora.";
  }
  if (reward.category === "CARD_BACK" && reward.duplicate === true) {
    const crystals = count(reward.crystals);
    if (crystals === null) {
      return "A capa já estava na sua coleção. Confira o saldo para ver a compensação.";
    }
    return crystals > 0
      ? `A capa já estava na sua coleção. ${quantity(crystals, "cristal", "cristais")} foram creditados como compensação.`
      : "A capa já estava na sua coleção. Nenhum cristal foi creditado como compensação.";
  }
  return "Recompensa adicionada ao seu inventário.";
}
