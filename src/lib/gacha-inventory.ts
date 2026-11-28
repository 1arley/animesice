import type {
  GachaEconomyInventory,
  GachaFoil,
  GachaFoilExtractResult,
  GachaItemConfig,
  GachaPull,
} from "../types";

export const FOIL_GEM_COST = 20;
export const ITEM_OP_STORAGE_PREFIX = "animesice:gacha-item-op:";
export const CONDITION_ORDER = ["POOR", "PLAYED", "EX", "NM", "MINT"] as const;

export type GemBalanceKey =
  | "holoShards"
  | "goldShards"
  | "inkShards"
  | "prismShards"
  | "holoGems"
  | "goldGems"
  | "inkGems"
  | "prismGems";

export type StoneShardKey =
  | "titanitaShards"
  | "titanitaSombriaShards"
  | "draconicaShards"
  | "sombriaDraconicaShards";

export type StoneItemKey =
  | "titanitaItems"
  | "titanitaSombriaItems"
  | "draconicaItems"
  | "sombriaDraconicaItems";

export type StoneKind =
  | "TITANITA"
  | "TITANITA_SOMBRIA"
  | "DRACONICA"
  | "SOMBRIA_DRACONICA";

export type ItemOperation = "buy" | "convert" | "craft";

export function pendingOperationRoute(
  key: string,
): "inventory" | "fragments" | null {
  const [operation, kind] = key.split(":");
  if (
    operation === "buy" &&
    (kind === "PROTECAO" || kind === "EXTRATOR_FOIL")
  ) {
    return "inventory";
  }
  if (
    (operation === "use" ||
      operation === "buy" ||
      operation === "convert" ||
      operation === "craft") &&
    isStoneKind(kind)
  ) {
    return "fragments";
  }
  if (
    operation === "gem-craft" ||
    operation === "gem-apply" ||
    operation === "foil-extract"
  ) {
    return "fragments";
  }
  return null;
}

export interface FoilFragmentMeta {
  foil: GachaFoil;
  label: string;
  shards: GemBalanceKey;
  gems: GemBalanceKey;
  image: string;
}

export interface StoneFragmentMeta {
  kind: StoneKind;
  label: string;
  shards: StoneShardKey;
  items: StoneItemKey;
  image: string;
}

export interface InventoryFragmentStats {
  totalFoilFragments: number;
  totalFoilGems: number;
  totalStoneFragments: number;
  totalReadyStones: number;
  totalFragments: number;
  craftableFoilGems: number;
  craftableStones: number;
  totalCraftable: number;
}

export const FOIL_FRAGMENTS: readonly FoilFragmentMeta[] = [
  {
    foil: "HOLO",
    label: "Holo",
    shards: "holoShards",
    gems: "holoGems",
    image: "/gacha/holo_gem.png",
  },
  {
    foil: "GOLD",
    label: "Gold",
    shards: "goldShards",
    gems: "goldGems",
    image: "/gacha/gold_gem.png",
  },
  {
    foil: "INK",
    label: "Ink",
    shards: "inkShards",
    gems: "inkGems",
    image: "/gacha/gem_ink.png",
  },
  {
    foil: "PRISM",
    label: "Prismática",
    shards: "prismShards",
    gems: "prismGems",
    image: "/gacha/gem_prism.png",
  },
];

export function getFoilDisplayMeta(foil: string): {
  foil: string;
  label: string;
  image: string | null;
} {
  const known = FOIL_FRAGMENTS.find((entry) => entry.foil === foil);
  return known
    ? { foil: known.foil, label: known.label, image: known.image }
    : { foil, label: foil, image: null };
}

export function foilExtractFragmentsForConfig(
  foil: string,
  config?: GachaItemConfig,
): number | null {
  const table = config?.foil_extract_fragments;
  if (!table || foil === "NORMAL") return null;
  const specific = table[foil];
  if (typeof specific === "number" && Number.isFinite(specific)) return specific;
  const fallback = table.default;
  return typeof fallback === "number" && Number.isFinite(fallback)
    ? fallback
    : null;
}

export function applyFoilExtractionToPull(
  pull: GachaPull,
  result: GachaFoilExtractResult,
): GachaPull {
  return {
    ...pull,
    foil: result.foil,
    value: result.value,
    rankedValue: result.rankedValue,
  };
}

// DRACONICA* são os tipos internos herdados; no gacha são exibidos como "Magnetita*".
export const STONE_FRAGMENTS: readonly StoneFragmentMeta[] = [
  {
    kind: "TITANITA",
    label: "Titanita",
    shards: "titanitaShards",
    items: "titanitaItems",
    image: "/gacha/titanita.png",
  },
  {
    kind: "TITANITA_SOMBRIA",
    label: "Titanita Sombria",
    shards: "titanitaSombriaShards",
    items: "titanitaSombriaItems",
    image: "/gacha/titanita-sombria.png",
  },
  {
    kind: "DRACONICA",
    label: "Magnetita",
    shards: "draconicaShards",
    items: "draconicaItems",
    image: "/gacha/magnetita.png",
  },
  {
    kind: "SOMBRIA_DRACONICA",
    label: "Magnetita Sombria",
    shards: "sombriaDraconicaShards",
    items: "sombriaDraconicaItems",
    image: "/gacha/magnetita-sombria.png",
  },
];

export function isStoneKind(value: string | null | undefined): value is StoneKind {
  return STONE_FRAGMENTS.some((entry) => entry.kind === value);
}

export function getOwnedStoneSelection(
  selectedKind: StoneKind,
  inventory: GachaEconomyInventory,
): StoneKind {
  const owns = (entry: StoneFragmentMeta) =>
    inventory[entry.shards] > 0 || inventory[entry.items] > 0;
  if (
    STONE_FRAGMENTS.some(
      (entry) => entry.kind === selectedKind && owns(entry),
    )
  ) {
    return selectedKind;
  }
  return STONE_FRAGMENTS.find(owns)?.kind ?? selectedKind;
}

export function gachaConditionLabel(condition: number): string {
  if (condition <= 0.07) return "MINT";
  if (condition <= 0.15) return "NM";
  if (condition <= 0.38) return "EX";
  if (condition <= 0.55) return "PLAYED";
  return "POOR";
}

export function conditionMultiplier(condition: number): number {
  if (condition <= 0.07) return 3;
  if (condition <= 0.15) return 2;
  if (condition <= 0.38) return 1.5;
  if (condition <= 0.55) return 1.2;
  return 1;
}

export function nextConditionLabel(condition: number): string | null {
  const current = gachaConditionLabel(condition);
  return CONDITION_ORDER[CONDITION_ORDER.indexOf(current as (typeof CONDITION_ORDER)[number]) + 1] ?? null;
}

export function upgradedValue(
  card: GachaPull,
  nextCondition: number,
  economy: GachaEconomyInventory,
): number | null {
  if (card.valueOverride != null) return card.value;
  const base = economy.itemConfig?.base_value;
  const foil = economy.itemConfig?.foil_mult;
  if (!base || !foil) return null;
  if (base[card.card.rarity] == null || foil[card.foil] == null) return null;
  const amount =
    base[card.card.rarity]! *
    conditionMultiplier(nextCondition) *
    foil[card.foil]!;
  const editionBonus =
    card.edition <= 10 ? (amount * (11 - card.edition)) / 10 : 0;
  return Math.round(amount + editionBonus);
}

export function isCardEligibleForStone(
  card: GachaPull,
  kind: StoneKind,
  config: GachaItemConfig,
): boolean {
  const eligibility = config.item_eligibility?.[kind];
  if (!eligibility) return false;
  const label = card.conditionLabel ?? gachaConditionLabel(card.condition);
  const next = nextConditionLabel(card.condition);
  return (
    eligibility.foils.includes(card.foil) &&
    eligibility.sourceConditions.includes(label) &&
    !!next &&
    CONDITION_ORDER.indexOf(next as (typeof CONDITION_ORDER)[number]) <=
      CONDITION_ORDER.indexOf(
        eligibility.maxCondition as (typeof CONDITION_ORDER)[number],
      ) &&
    config.item_condition_anchor?.[
      next as keyof typeof config.item_condition_anchor
    ] != null
  );
}

export function getInventoryFragmentStats(
  inventory: GachaEconomyInventory,
): InventoryFragmentStats {
  const totalFoilFragments = FOIL_FRAGMENTS.reduce(
    (sum, entry) => sum + (inventory[entry.shards] ?? 0),
    0,
  );
  const totalFoilGems = FOIL_FRAGMENTS.reduce(
    (sum, entry) => sum + (inventory[entry.gems] ?? 0),
    0,
  );
  const totalStoneFragments = STONE_FRAGMENTS.reduce(
    (sum, entry) => sum + (inventory[entry.shards] ?? 0),
    0,
  );
  const totalReadyStones = STONE_FRAGMENTS.reduce(
    (sum, entry) => sum + (inventory[entry.items] ?? 0),
    0,
  );
  const craftableFoilGems = FOIL_FRAGMENTS.reduce(
    (sum, entry) => sum + Math.floor((inventory[entry.shards] ?? 0) / FOIL_GEM_COST),
    0,
  );
  const craftableStones = STONE_FRAGMENTS.reduce((sum, entry) => {
    const recipe = inventory.itemConfig?.item_recipes?.[entry.kind] ?? 0;
    return (
      sum +
      (recipe > 0 ? Math.floor((inventory[entry.shards] ?? 0) / recipe) : 0)
    );
  }, 0);

  return {
    totalFoilFragments,
    totalFoilGems,
    totalStoneFragments,
    totalReadyStones,
    totalFragments: totalFoilFragments + totalStoneFragments,
    craftableFoilGems,
    craftableStones,
    totalCraftable: craftableFoilGems + craftableStones,
  };
}

export function getOrCreateOperationId(
  pendingMap: Map<string, string>,
  userId: string,
  key: string,
): { operationId: string; storageKey: string } {
  const storageKey = `${ITEM_OP_STORAGE_PREFIX}${userId}:${key}`;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    /* Storage can be disabled. */
  }
  const operationId =
    pendingMap.get(key) ?? stored ?? crypto.randomUUID();
  pendingMap.set(key, operationId);
  try {
    localStorage.setItem(storageKey, operationId);
  } catch {
    /* Keep the in-memory retry. */
  }
  return { operationId, storageKey };
}

export function clearOperationId(
  pendingMap: Map<string, string>,
  userId: string,
  key: string,
  storageKey = `${ITEM_OP_STORAGE_PREFIX}${userId}:${key}`,
): void {
  pendingMap.delete(key);
  try {
    localStorage.removeItem(storageKey);
  } catch {
    /* No persistent entry to clear. */
  }
}

export function readPendingOperationKeys(userId: string): string[] {
  try {
    const prefix = `${ITEM_OP_STORAGE_PREFIX}${userId}:`;
    return Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    )
      .filter((key): key is string => !!key && key.startsWith(prefix))
      .map((key) => key.slice(prefix.length));
  } catch {
    return [];
  }
}
