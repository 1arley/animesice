import assert from "node:assert/strict";
import {
  computeNightMarketStats,
  formatNightMarketWindow,
  offerImage,
  offerInspection,
  offerKind,
  offerName,
  offerPull,
  offerRarity,
  offerSlotCode,
  rarityLabel,
} from "../src/components/gacha/night-market-helpers.ts";

console.log("Checking Night Market helpers...");

const cardOffer = {
  id: "nm-card-1",
  slot: 7,
  itemType: "CARD",
  price: 1200,
  discount: 25,
  purchasedAt: null,
  revealed: false,
  payload: { foil: "HOLO", condition: 0.03 },
  card: {
    id: "card-1",
    name: "Frieren, Viajante do Norte",
    image: "https://cdn.myanimelist.net/images/characters/1.jpg",
    rarity: "LENDARIA",
    imageHidden: false,
    animeTitle: "Sousou no Frieren",
  },
};

const hiddenCardOffer = {
  ...cardOffer,
  id: "nm-card-hidden",
  slot: 8,
  revealed: true,
  card: {
    ...cardOffer.card,
    imageHidden: true,
  },
};

const skinOffer = {
  id: "nm-skin-1",
  slot: 10,
  itemType: "SKIN",
  price: 900,
  discount: 28,
  purchasedAt: "2026-11-28T12:00:00.000Z",
  revealed: true,
  skin: {
    id: "skin-1",
    name: "Manto Boreal",
    imageUrl: "https://cdn.myanimelist.net/images/skins/1.jpg",
    rarity: "EPIC",
  },
};

const keyOffer = {
  id: "nm-key-1",
  slot: 11,
  itemType: "KEY",
  price: 75,
  discount: 15,
  purchasedAt: null,
  revealed: false,
};

const boxOffer = {
  id: "nm-box-1",
  slot: 12,
  itemType: "COMMON_BOX",
  price: 420,
  discount: 16,
  purchasedAt: null,
  revealed: false,
};

// 1. Names, kinds, images, rarities, slot codes
assert.equal(offerName(cardOffer), "Frieren, Viajante do Norte");
assert.equal(offerName(hiddenCardOffer), "Carta misteriosa");
assert.equal(offerName(skinOffer), "Manto Boreal");
assert.equal(offerName(keyOffer), "Chave de caixa");
assert.equal(offerName(boxOffer), "Caixa comum");

assert.equal(offerKind(cardOffer), "Carta");
assert.equal(offerKind(skinOffer), "Skin");
assert.equal(offerKind(keyOffer), "Chave");
assert.equal(offerKind(boxOffer), "Caixa");

assert.equal(
  offerImage(cardOffer),
  "https://cdn.myanimelist.net/images/characters/1.jpg",
);
assert.equal(offerImage(hiddenCardOffer), undefined);
assert.equal(offerImage(boxOffer), "/gacha/box-common.webp");
assert.equal(offerImage(keyOffer), undefined);

assert.equal(offerRarity(skinOffer), "EPICA");
assert.equal(rarityLabel(offerRarity(skinOffer)), "Épica");
assert.equal(offerRarity(keyOffer), "COMUM");
assert.equal(offerSlotCode(7, 0), "01");
assert.equal(offerSlotCode(12, 5), "06");

// 2. Pull & inspection payload mapping
const pull = offerPull(cardOffer);
assert.ok(pull);
assert.equal(pull.foil, "HOLO");
assert.equal(pull.conditionLabel, "MINT");
assert.equal(pull.card.name, "Frieren, Viajante do Norte");

const invalidPayloadOffer = {
  ...cardOffer,
  payload: { foil: "INVALID", condition: 0.25 },
};
const pullFallback = offerPull(invalidPayloadOffer);
assert.ok(pullFallback);
assert.equal(pullFallback.foil, "NORMAL");
assert.equal(pullFallback.conditionLabel, "EX");

const hiddenPull = offerPull(hiddenCardOffer);
assert.ok(hiddenPull);
assert.equal(hiddenPull.card.image, null);
assert.equal(hiddenPull.card.name, "Carta misteriosa");

const inspection = offerInspection(cardOffer);
assert.ok(inspection);
assert.equal(inspection.foil, "HOLO");
assert.equal(inspection.price, 1200);
assert.equal(offerInspection(keyOffer), null);

// 3. Stats aggregation
const stats = computeNightMarketStats(
  [cardOffer, hiddenCardOffer, skinOffer, keyOffer, boxOffer],
  new Set(["nm-card-1"]),
);
assert.deepEqual(stats, {
  total: 5,
  revealedCount: 3, // cardOffer (Set), hiddenCardOffer (revealed), skinOffer (revealed)
  purchasedCount: 1,
  maxDiscount: 28,
});

// 4. Timezone-aware window formatting (America/Sao_Paulo = UTC-3)
assert.equal(formatNightMarketWindow(null, null, new Date()), "Sábados e domingos");
// Saturday 2026-11-28 12:00 BRT (15:00Z) -> closes Monday 2026-11-30 00:00 BRT (36h = 1d 12h)
assert.equal(
  formatNightMarketWindow(
    true,
    "2026-11-28",
    new Date("2026-11-28T15:00:00.000Z"),
  ),
  "Fecha em 1d 12h",
);
// Sunday 2026-11-29 22:30 BRT (2026-11-30T01:30Z) -> 1h30min remaining
assert.equal(
  formatNightMarketWindow(
    true,
    "2026-11-28",
    new Date("2026-11-30T01:30:00.000Z"),
  ),
  "Fecha em 1h 30min",
);
// Closed Friday 2026-11-27 15:00 BRT (18:00Z) -> opens Saturday 2026-11-28 00:00 BRT (9h)
assert.equal(
  formatNightMarketWindow(
    false,
    null,
    new Date("2026-11-27T18:00:00.000Z"),
  ),
  "Abre em 9h 00min",
);

console.log("All Night Market helper checks passed!");
