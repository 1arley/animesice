import assert from "node:assert/strict";
import {
  FOIL_FRAGMENTS,
  STONE_FRAGMENTS,
  applyFoilExtractionToPull,
  foilExtractFragmentsForConfig,
  getFoilDisplayMeta,
  getOwnedStoneSelection,
  getInventoryFragmentStats,
  isCardEligibleForStone,
  isStoneKind,
  nextConditionLabel,
  pendingOperationRoute,
  upgradedValue,
} from "../src/lib/gacha-inventory.ts";

console.log("Checking Gacha inventory & fragment domain logic...");

const baseConfig = {
  item_shop_price: {
    TITANITA: 25,
    TITANITA_SOMBRIA: 60,
    DRACONICA: 40,
    SOMBRIA_DRACONICA: 90,
    PROTECAO: 150,
    EXTRATOR_FOIL: 2000,
  },
  item_convert_value: {
    TITANITA: 5,
    TITANITA_SOMBRIA: 12,
    DRACONICA: 8,
    SOMBRIA_DRACONICA: 18,
    PROTECAO: 0,
    EXTRATOR_FOIL: 0,
  },
  item_recipes: {
    TITANITA: 10,
    TITANITA_SOMBRIA: 15,
    DRACONICA: 12,
  },
  item_eligibility: {
    TITANITA: {
      foils: ["NORMAL", "HOLO"],
      sourceConditions: ["POOR", "PLAYED", "EX"],
      maxCondition: "NM",
    },
  },
  item_condition_anchor: {
    PLAYED: 0.45,
    EX: 0.25,
    NM: 0.1,
    MINT: 0.03,
  },
  card_floors: { COMUM: 10, RARA: 100 },
  base_value: { COMUM: 10, RARA: 100 },
  foil_mult: { NORMAL: 1, HOLO: 2 },
  reroll_cost_pct: 0.15,
  reroll_protection_mint_block: true,
  foil_extract_fragments: { default: 10, GOLD: 12 },
  gem_fragment_recipe: 20,
};

function makeInventory(overrides = {}) {
  return {
    commonBoxes: 0,
    rareBoxes: 0,
    premiumBoxes: 0,
    keys: 0,
    spinResets: 0,
    ampulhetaEter: 0,
    weeklyRewardReady: false,
    loyaltyDays: 0,
    loyaltyRarePlusReady: false,
    balance: 0,
    reserved: 0,
    available: 0,
    titanitaShards: 0,
    titanitaItems: 0,
    titanitaSombriaShards: 0,
    titanitaSombriaItems: 0,
    draconicaShards: 0,
    draconicaItems: 0,
    sombriaDraconicaShards: 0,
    sombriaDraconicaItems: 0,
    holoShards: 0,
    goldShards: 0,
    inkShards: 0,
    prismShards: 0,
    holoGems: 0,
    goldGems: 0,
    inkGems: 0,
    prismGems: 0,
    protecao: 0,
    foilExtractors: 0,
    dailyClaimedToday: false,
    watchEarnedToday: 0,
    itemConfig: baseConfig,
    ...overrides,
  };
}

// 1. Metadata integrity
assert.equal(FOIL_FRAGMENTS.length, 4);
assert.equal(STONE_FRAGMENTS.length, 4);
assert.equal(isStoneKind("TITANITA"), true);
assert.equal(isStoneKind("DRACONICA"), true);
assert.equal(isStoneKind("PROTECAO"), false);
assert.equal(isStoneKind("EXTRATOR_FOIL"), false);
assert.equal(isStoneKind(null), false);
assert.equal(pendingOperationRoute("craft:TITANITA:2"), "fragments");
assert.equal(pendingOperationRoute("gem-apply:HOLO:card-1"), "fragments");
assert.equal(pendingOperationRoute("foil-extract:uc-1"), "fragments");
assert.equal(pendingOperationRoute("buy:PROTECAO:1"), "inventory");
assert.equal(pendingOperationRoute("buy:EXTRATOR_FOIL:2"), "inventory");
assert.equal(pendingOperationRoute("use:TITANITA:card-1"), "fragments");
assert.equal(pendingOperationRoute("unknown:1"), null);
assert.equal(
  getOwnedStoneSelection(
    "TITANITA",
    makeInventory({ titanitaShards: 0, draconicaShards: 1 }),
  ),
  "DRACONICA",
);
assert.equal(
  getOwnedStoneSelection("TITANITA", makeInventory()),
  "TITANITA",
);

// 2. Zero inventory stats
const zeroStats = getInventoryFragmentStats(makeInventory());
assert.deepEqual(zeroStats, {
  totalFoilFragments: 0,
  totalFoilGems: 0,
  totalStoneFragments: 0,
  totalReadyStones: 0,
  totalFragments: 0,
  craftableFoilGems: 0,
  craftableStones: 0,
  totalCraftable: 0,
});

// 3. Craftable counts & partial itemConfig safety
const mixedStats = getInventoryFragmentStats(
  makeInventory({
    holoShards: 45, // 2 craftable gems
    goldShards: 19, // 0 craftable gems
    prismGems: 3,
    titanitaShards: 25, // recipe 10 -> 2 craftable stones
    draconicaShards: 12, // recipe 12 -> 1 craftable stone
    sombriaDraconicaShards: 99, // missing recipe -> 0 craftable stones
    titanitaItems: 2,
    draconicaItems: 1,
  }),
);
assert.equal(mixedStats.totalFoilFragments, 64);
assert.equal(mixedStats.totalFoilGems, 3);
assert.equal(mixedStats.totalStoneFragments, 136);
assert.equal(mixedStats.totalReadyStones, 3);
assert.equal(mixedStats.totalFragments, 200);
assert.equal(mixedStats.craftableFoilGems, 2);
assert.equal(mixedStats.craftableStones, 3);
assert.equal(mixedStats.totalCraftable, 5);

const emptyConfigStats = getInventoryFragmentStats(
  makeInventory({
    holoShards: 20,
    titanitaShards: 50,
    itemConfig: {
      ...baseConfig,
      item_recipes: {},
    },
  }),
);
assert.equal(emptyConfigStats.craftableFoilGems, 1);
assert.equal(emptyConfigStats.craftableStones, 0);

// 4. Condition progression & eligibility
assert.equal(nextConditionLabel(0.8), "PLAYED");
assert.equal(nextConditionLabel(0.45), "EX");
assert.equal(nextConditionLabel(0.25), "NM");
assert.equal(nextConditionLabel(0.1), "MINT");
assert.equal(nextConditionLabel(0.03), null);

const eligibleCard = {
  id: "uc-1",
  condition: 0.25,
  conditionLabel: "EX",
  foil: "HOLO",
  edition: 1,
  value: 300,
  obtainedAt: "2026-10-01",
  user: { id: "u1" },
  card: {
    id: "c1",
    name: "Carta Teste",
    rarity: "RARA",
    image: null,
    favourites: 0,
    animeId: "a1",
    animeTitle: "Anime",
    anime: { slug: "anime" },
  },
};

assert.equal(isCardEligibleForStone(eligibleCard, "TITANITA", baseConfig), true);
assert.equal(
  isCardEligibleForStone({ ...eligibleCard, condition: 0.1, conditionLabel: "NM" }, "TITANITA", baseConfig),
  false,
);
assert.equal(
  isCardEligibleForStone({ ...eligibleCard, foil: "GOLD" }, "TITANITA", baseConfig),
  false,
);
assert.equal(isCardEligibleForStone(eligibleCard, "DRACONICA", baseConfig), false);

// 5. Upgraded value preview calculation
const previewEconomy = makeInventory();
// edition 1 -> editionBonus = (amount * (11 - 1)) / 10 = amount -> 2x
// RARA (100) * NM multiplier (0.1 -> 2) * HOLO (2) = 400 + 400 = 800
assert.equal(upgradedValue(eligibleCard, 0.1, previewEconomy), 800);
assert.equal(
  upgradedValue({ ...eligibleCard, value: 999, valueOverride: 999 }, 0.1, previewEconomy),
  999,
);

// 6. Foil extractor helpers & future-foil fallback
assert.equal(foilExtractFragmentsForConfig("HOLO", baseConfig), 10);
assert.equal(foilExtractFragmentsForConfig("GOLD", baseConfig), 12);
assert.equal(foilExtractFragmentsForConfig("FUTURE_FOIL", baseConfig), 10);
assert.equal(foilExtractFragmentsForConfig("NORMAL", baseConfig), null);
assert.deepEqual(getFoilDisplayMeta("HOLO"), {
  foil: "HOLO",
  label: "Holo",
  image: "/gacha/holo_gem.png",
});
assert.deepEqual(getFoilDisplayMeta("FUTURE_FOIL"), {
  foil: "FUTURE_FOIL",
  label: "FUTURE_FOIL",
  image: null,
});
const extractedPull = applyFoilExtractionToPull(
  { ...eligibleCard, rankedValue: 300 },
  {
    userCardId: "uc-1",
    extractedFoil: "HOLO",
    foil: "NORMAL",
    value: 150,
    rankedValue: 150,
    extractorsRemaining: 1,
    fragments: {
      foil: "HOLO",
      itemId: "FRAG_HOLO",
      itemName: "Fragmento Holo",
      quantity: 10,
    },
  },
);
assert.equal(extractedPull.foil, "NORMAL");
assert.equal(extractedPull.value, 150);
assert.equal(extractedPull.rankedValue, 150);
assert.equal(extractedPull.edition, 1);
assert.equal(extractedPull.condition, 0.25);

console.log("All Gacha inventory & fragment logic checks passed!");
