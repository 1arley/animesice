import assert from "node:assert/strict";
import {
  CARD_TRADE_UP_COUNT,
  SKIN_TRADE_UP_COUNT,
  getTradeUpNextRarity,
  isMaxCardRarity,
  validateCardTradeUpSelection,
  validateSkinTradeUpSelection,
  formatTradeUpError,
} from "../src/components/gacha/trade-up-helpers.ts";

console.log("Checking Trade-up domain logic...");

// 1. Next rarity progression
assert.equal(getTradeUpNextRarity("COMUM"), "INCOMUM");
assert.equal(getTradeUpNextRarity("INCOMUM"), "RARA");
assert.equal(getTradeUpNextRarity("RARA"), "EPICA");
assert.equal(getTradeUpNextRarity("EPICA"), "LENDARIA");
assert.equal(getTradeUpNextRarity("LENDARIA"), "MITICA");
assert.equal(getTradeUpNextRarity("MITICA"), "GALACTICA");
assert.equal(getTradeUpNextRarity("GALACTICA"), null);
assert.equal(isMaxCardRarity("GALACTICA"), true);
assert.equal(isMaxCardRarity("RARA"), false);

// 2. Card trade-up validation
const validCards = [
  { id: "c1", rarity: "RARA", status: "ACTIVE" },
  { id: "c2", rarity: "RARA", status: "ACTIVE" },
  { id: "c3", rarity: "RARA", status: "ACTIVE" },
  { id: "c4", rarity: "RARA", status: "ACTIVE" },
];

const res1 = validateCardTradeUpSelection(validCards);
assert.equal(res1.valid, true);
assert.equal(res1.rarity, "RARA");
assert.equal(res1.nextRarity, "EPICA");

// Under count
const resUnder = validateCardTradeUpSelection(validCards.slice(0, 3));
assert.equal(resUnder.valid, false);

// Duplicate IDs
const resDup = validateCardTradeUpSelection([
  validCards[0],
  validCards[0],
  validCards[2],
  validCards[3],
]);
assert.equal(resDup.valid, false);

// Mixed rarities
const resMixed = validateCardTradeUpSelection([
  validCards[0],
  validCards[1],
  validCards[2],
  { id: "c4", rarity: "EPICA", status: "ACTIVE" },
]);
assert.equal(resMixed.valid, false);

// Max rarity cards (GALACTICA cannot be upgraded)
const resMax = validateCardTradeUpSelection([
  { id: "g1", rarity: "GALACTICA", status: "ACTIVE" },
  { id: "g2", rarity: "GALACTICA", status: "ACTIVE" },
  { id: "g3", rarity: "GALACTICA", status: "ACTIVE" },
  { id: "g4", rarity: "GALACTICA", status: "ACTIVE" },
]);
assert.equal(resMax.valid, false);

// Non-active status
const resInactive = validateCardTradeUpSelection([
  validCards[0],
  validCards[1],
  validCards[2],
  { id: "c4", rarity: "RARA", status: "BURNED" },
]);
assert.equal(resInactive.valid, false);

// 3. Skin trade-up validation
const validSkins = [
  { id: "s1", rarity: "EPICA", status: "ACTIVE" },
  { id: "s2", rarity: "EPICA", status: "ACTIVE" },
  { id: "s3", rarity: "EPICA", status: "ACTIVE" },
];

const resSkin = validateSkinTradeUpSelection(validSkins);
assert.equal(resSkin.valid, true);
assert.equal(resSkin.rarity, "EPICA");

// Incomplete skins
const resSkin2 = validateSkinTradeUpSelection(validSkins.slice(0, 2));
assert.equal(resSkin2.valid, false);

// Mixed skins
const resSkinMixed = validateSkinTradeUpSelection([
  validSkins[0],
  validSkins[1],
  { id: "s3", rarity: "RARA", status: "ACTIVE" },
]);
assert.equal(resSkinMixed.valid, false);

// Duplicate skins
const resSkinDup = validateSkinTradeUpSelection([
  validSkins[0],
  validSkins[0],
  validSkins[2],
]);
assert.equal(resSkinDup.valid, false);

// 4. Error formatting
const errConflict = { statusCode: 409, message: "Uma carta não está mais disponível." };
assert.match(formatTradeUpError(errConflict, "CARD"), /não estão mais disponíveis/i);

const errRarity = { statusCode: 400, message: "As quatro cartas precisam ter a mesma raridade." };
assert.match(formatTradeUpError(errRarity, "CARD"), /mesma raridade/i);

const errEmptyPool = { statusCode: 409, message: "Não há cartas disponíveis na raridade seguinte." };
assert.match(formatTradeUpError(errEmptyPool, "CARD"), /não há cartas ativas disponíveis/i);

const errSkinPool = { statusCode: 409, message: "Pool de skins vazio." };
assert.match(formatTradeUpError(errSkinPool, "SKIN"), /catálogo de skins/i);

const errEconomy = { statusCode: 403, message: "Economia bloqueada por saldo negativo ou revisão." };
assert.match(formatTradeUpError(errEconomy, "CARD"), /Economia bloqueada/i);

console.log("All Trade-up logic checks passed successfully!");
