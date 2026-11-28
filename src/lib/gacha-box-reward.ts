import type { GachaItemKind } from "@/types";
import { safeImageSrc } from "@/lib/url";

const BOX_REWARD_CATEGORIES = [
  "CRYSTAL",
  "KEY",
  "SPIN_RESET",
  "ITEM",
  "ESSENCE",
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
  // DRACONICA* são os tipos internos herdados; no gacha são exibidos como "Magnetita*".
  DRACONICA: "Fragmentos de Magnetita",
  SOMBRIA_DRACONICA: "Fragmentos de Magnetita Sombria",
  PROTECAO: "Proteção de reroll",
  EXTRATOR_FOIL: "Extrator de Foil",
};

/** Rótulos pt-BR das raridades — reutilizado pelo banner de evento e pelo admin. */
export const RARITY_LABEL: Record<string, string> = {
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
      return {
        title: quantity(reward.amount, "reset de giro", "resets de giro"),
      };
    case "ESSENCE":
      return {
        title: name(reward.name, "Essência"),
        details: ["Guardada no inventário. Use para revelar uma carta."],
      };
    case "ITEM": {
      const kind = String(reward.kind ?? "");
      const label =
        ITEM_KIND_LABEL[kind as GachaItemKind] ?? "Item de loot box";
      const amount = count(reward.quantity);
      return {
        title:
          amount === null
            ? label
            : `${amount.toLocaleString("pt-BR")}× ${label}`,
      };
    }
    case "RARE_BOX":
      return { title: quantity(reward.amount, "caixa rara", "caixas raras") };
    case "KEY_RARE_BOX":
    case "KEY_PREMIUM_BOX": {
      const tier = reward.category === "KEY_RARE_BOX" ? "rara" : "premium";
      const boxField =
        reward.category === "KEY_RARE_BOX" ? "rareBoxes" : "premiumBoxes";
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
        typeof reward.condition === "number" &&
        Number.isFinite(reward.condition)
          ? `Desgaste ${reward.condition.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`
          : null,
      ].filter(
        (value): value is string => typeof value === "string" && !!value,
      );
      return {
        title: hidden
          ? "Carta misteriosa"
          : `Carta: ${name(reward.name, "Carta recebida")}`,
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
        const details = skins.map((skin) =>
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
      const rarity =
        typeof reward.rarity === "string" ? reward.rarity : undefined;
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
                ? [
                    quantity(crystals, "cristal", "cristais") +
                      " de compensação",
                  ]
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
      return {
        title: name(reward.name, "Detalhes da recompensa indisponíveis"),
      };
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

export type BoxRewardArtifactKind =
  | "crystal"
  | "key"
  | "spin_reset"
  | "card"
  | "tier_box"
  | "relic";

export interface BoxRewardVisualMeta {
  category: string;
  artifactKind: BoxRewardArtifactKind;
  rarityKey: string;
  rarityLabel?: string;
  accentHex: string;
  secondaryHex: string;
  imageUrl: string | null;
  hiddenCard: boolean;
  stackableAmount: number | null;
  isDuplicateComp: boolean;
  boxRewardTier?: "RARE" | "PREMIUM";
}

const VISUAL_RARITY_PALETTE: Record<
  string,
  { accentHex: string; secondaryHex: string }
> = {
  COMMON: { accentHex: "#9fdcf5", secondaryHex: "#e6faff" },
  COMUM: { accentHex: "#9fdcf5", secondaryHex: "#e6faff" },
  UNCOMMON: { accentHex: "#7ee8c8", secondaryHex: "#d8fff4" },
  INCOMUM: { accentHex: "#7ee8c8", secondaryHex: "#d8fff4" },
  RARE: { accentHex: "#38e8da", secondaryHex: "#c8fffb" },
  RARA: { accentHex: "#38e8da", secondaryHex: "#c8fffb" },
  EPIC: { accentHex: "#c4a1ff", secondaryHex: "#ece0ff" },
  EPICA: { accentHex: "#c4a1ff", secondaryHex: "#ece0ff" },
  MYTHIC: { accentHex: "#e879f9", secondaryHex: "#fae2ff" },
  MITICA: { accentHex: "#e879f9", secondaryHex: "#fae2ff" },
  LEGENDARY: { accentHex: "#f5cb7d", secondaryHex: "#fff2d6" },
  LENDARIA: { accentHex: "#f5cb7d", secondaryHex: "#fff2d6" },
  GALACTIC: { accentHex: "#67e8f9", secondaryHex: "#e0d4ff" },
  GALACTICA: { accentHex: "#67e8f9", secondaryHex: "#e0d4ff" },
};

export function isValidBoxRewardPayload(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const hasCategory =
    typeof record.category === "string" && record.category.trim().length > 0;
  const hasName =
    typeof record.name === "string" && record.name.trim().length > 0;
  return hasCategory || hasName;
}

export function getBoxRewardVisualMeta(
  reward: Record<string, unknown>,
): BoxRewardVisualMeta {
  const category =
    typeof reward.category === "string" ? reward.category.trim().toUpperCase() : "";
  const knownReward = isKnownBoxRewardCategory(category);
  const hiddenCard =
    category === "CARD" &&
    (reward.imageHidden === true || reward.name === "???");
  const isDuplicateComp = category === "CARD_BACK" && reward.duplicate === true;

  let rawImage = "";
  if (typeof reward.imageUrl === "string" && reward.imageUrl.trim()) {
    rawImage = reward.imageUrl;
  } else if (typeof reward.image === "string" && reward.image.trim()) {
    rawImage = reward.image;
  } else if (Array.isArray(reward.skins)) {
    const firstSkin = reward.skins.find(
      (skin): skin is Record<string, unknown> =>
        typeof skin === "object" && skin !== null,
    );
    if (firstSkin) {
      if (typeof firstSkin.imageUrl === "string") rawImage = firstSkin.imageUrl;
      else if (typeof firstSkin.image === "string") rawImage = firstSkin.image;
    }
  }

  const imageUrl =
    knownReward && !hiddenCard ? (safeImageSrc(rawImage) ?? null) : null;

  const amount = count(reward.amount);
  const stackableAmount =
    amount !== null &&
    amount > 0 &&
    (category === "CRYSTAL" || category === "KEY" || category === "SPIN_RESET")
      ? amount
      : null;

  let raritySource = typeof reward.rarity === "string" ? reward.rarity : "";
  if (!raritySource && Array.isArray(reward.skins)) {
    const firstSkin = reward.skins.find(
      (skin): skin is Record<string, unknown> =>
        typeof skin === "object" && skin !== null,
    );
    if (firstSkin && typeof firstSkin.rarity === "string") {
      raritySource = firstSkin.rarity;
    }
  }
  const rarityKey = raritySource.trim().toUpperCase();
  const rarityLabel = RARITY_LABEL[rarityKey];

  let boxRewardTier: "RARE" | "PREMIUM" | undefined;
  let artifactKind: BoxRewardArtifactKind = "relic";
  if (category === "CRYSTAL" || isDuplicateComp) {
    artifactKind = "crystal";
  } else if (category === "KEY") {
    artifactKind = "key";
  } else if (category === "SPIN_RESET") {
    artifactKind = "spin_reset";
  } else if (
    (category === "CARD" ||
      category === "SKIN" ||
      (category === "CARD_BACK" && !isDuplicateComp)) &&
    imageUrl !== null &&
    !hiddenCard
  ) {
    artifactKind = "card";
  } else if (
    category === "RARE_BOX" ||
    category === "KEY_RARE_BOX" ||
    category === "KEY_PREMIUM_BOX"
  ) {
    artifactKind = "tier_box";
    boxRewardTier = category === "KEY_PREMIUM_BOX" ? "PREMIUM" : "RARE";
  }

  const palette =
    boxRewardTier === "PREMIUM"
      ? VISUAL_RARITY_PALETTE.LEGENDARY
      : boxRewardTier === "RARE"
        ? VISUAL_RARITY_PALETTE.RARE
        : (VISUAL_RARITY_PALETTE[rarityKey] ?? VISUAL_RARITY_PALETTE.COMMON);

  return {
    category,
    artifactKind,
    rarityKey,
    rarityLabel,
    accentHex: palette.accentHex,
    secondaryHex: palette.secondaryHex,
    imageUrl,
    hiddenCard,
    stackableAmount,
    isDuplicateComp,
    boxRewardTier,
  };
}
