import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = path.resolve(import.meta.dirname, "..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = path.join(rootDir, "src", `${specifier.slice(2)}.ts`);
      return nextResolve(pathToFileURL(target).href, context);
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !path.extname(specifier)
    ) {
      const parentDir = path.dirname(new URL(context.parentURL).pathname);
      const target = path.resolve(parentDir, `${specifier}.ts`);
      return nextResolve(pathToFileURL(target).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { getBoxRewardVisualMeta, isValidBoxRewardPayload } = await import(
  "../src/lib/gacha-box-reward.ts"
);
const { BOX_TIMELINE, advanceCommonBoxClock } = await import(
  "../src/components/gacha/common-box/common-box-palette.ts"
);

// 1. Payload validation cases
assert.equal(isValidBoxRewardPayload(null), false);
assert.equal(isValidBoxRewardPayload(undefined), false);
assert.equal(isValidBoxRewardPayload([]), false);
assert.equal(isValidBoxRewardPayload({}), false);
assert.equal(isValidBoxRewardPayload("CRYSTAL"), false);
assert.equal(isValidBoxRewardPayload(42), false);
assert.equal(isValidBoxRewardPayload({ category: "   " }), false);

const validPayloads = [
  { category: "CRYSTAL", amount: 640 },
  { category: "KEY", amount: 2 },
  { category: "SPIN_RESET", amount: 1 },
  { category: "ESSENCE", itemId: "ESSENCE_RARE", kind: "ESSENCE_RARE", amount: 1, name: "Essência Rara" },
  { category: "ITEM", kind: "TITANITA", quantity: 3 },
  { category: "RARE_BOX", tier: "RARE", amount: 1 },
  { category: "KEY_RARE_BOX", keys: 1, rareBoxes: 1 },
  { category: "KEY_PREMIUM_BOX", keys: 1, premiumBoxes: 1 },
  { category: "CARD", name: "Aeliana", rarity: "LENDARIA", image: "/aeliana/Aeliana.png", foil: "HOLO", condition: 0.12 },
  { category: "CARD", name: "???", rarity: "EPICA", image: null, imageHidden: true },
  { category: "SKIN", name: "Manto Glacial", rarity: "RARE", imageUrl: "https://cdn.example.com/skin.png" },
  { category: "CARD_BACK", key: "night-market", name: "Mercado Noturno", rarity: "EPIC" },
  { category: "CARD_BACK", duplicate: true, crystals: 150 },
];

for (const payload of validPayloads) {
  assert.equal(isValidBoxRewardPayload(payload), true, `Expected valid payload: ${JSON.stringify(payload)}`);
}

// 2. Visual metadata mapping checks without mutating payloads
const crystalMeta = getBoxRewardVisualMeta({ category: "CRYSTAL", amount: 640 });
assert.equal(crystalMeta.artifactKind, "crystal");
assert.equal(crystalMeta.stackableAmount, 640);
assert.equal(crystalMeta.accentHex, "#9fdcf5");

const keyMeta = getBoxRewardVisualMeta({ category: "KEY", amount: 2 });
assert.equal(keyMeta.artifactKind, "key");
assert.equal(keyMeta.stackableAmount, 2);

const resetMeta = getBoxRewardVisualMeta({ category: "SPIN_RESET", amount: 1 });
assert.equal(resetMeta.artifactKind, "spin_reset");
assert.equal(resetMeta.stackableAmount, 1);

const cardPayload = {
  category: "CARD",
  name: "Aeliana",
  rarity: "LENDARIA",
  image: "/aeliana/Aeliana.png",
};
const cardSnapshot = JSON.stringify(cardPayload);
const cardMeta = getBoxRewardVisualMeta(cardPayload);
assert.equal(cardMeta.artifactKind, "card");
assert.equal(cardMeta.imageUrl, "/aeliana/Aeliana.png");
assert.equal(cardMeta.accentHex, "#f5cb7d");
assert.equal(cardMeta.rarityLabel, "Lendária");
assert.equal(JSON.stringify(cardPayload), cardSnapshot);

const hiddenCardMeta = getBoxRewardVisualMeta({
  category: "CARD",
  name: "???",
  rarity: "EPICA",
  image: "/secret.png",
  imageHidden: true,
});
assert.equal(hiddenCardMeta.artifactKind, "relic");
assert.equal(hiddenCardMeta.hiddenCard, true);
assert.equal(hiddenCardMeta.imageUrl, null);
assert.equal(hiddenCardMeta.accentHex, "#c4a1ff");

const xssCardMeta = getBoxRewardVisualMeta({
  category: "CARD",
  name: "Injected",
  image: "javascript:alert(1)",
});
assert.equal(xssCardMeta.imageUrl, null);
assert.equal(xssCardMeta.artifactKind, "relic");

const rareBoxMeta = getBoxRewardVisualMeta({ category: "KEY_RARE_BOX", keys: 1, rareBoxes: 1 });
assert.equal(rareBoxMeta.artifactKind, "tier_box");
assert.equal(rareBoxMeta.boxRewardTier, "RARE");
assert.equal(rareBoxMeta.accentHex, "#38e8da");

const premBoxMeta = getBoxRewardVisualMeta({ category: "KEY_PREMIUM_BOX", keys: 1, premiumBoxes: 1 });
assert.equal(premBoxMeta.artifactKind, "tier_box");
assert.equal(premBoxMeta.boxRewardTier, "PREMIUM");
assert.equal(premBoxMeta.accentHex, "#f5cb7d");

const dupBackMeta = getBoxRewardVisualMeta({ category: "CARD_BACK", duplicate: true, crystals: 150 });
assert.equal(dupBackMeta.artifactKind, "crystal");
assert.equal(dupBackMeta.isDuplicateComp, true);

const cardBackImgMeta = getBoxRewardVisualMeta({
  category: "CARD_BACK",
  key: "ice-back",
  name: "Capa Glacial",
  rarity: "EPIC",
  imageUrl: "/gacha/ice-back.png",
});
assert.equal(cardBackImgMeta.artifactKind, "card");
assert.equal(cardBackImgMeta.imageUrl, "/gacha/ice-back.png");

const itemMeta = getBoxRewardVisualMeta({ category: "ITEM", kind: "TITANITA", quantity: 3 });
assert.equal(itemMeta.artifactKind, "relic");

// 3. Hard business gate invariants (must NEVER overshoot authHold/unlock when !hasReward)
{
  const state = {
    t: 0.68,
    holdElapsed: 0,
    ambientTime: 0,
    isAmbient: false,
    isError: false,
    hasReward: false,
    chargeCueFired: false,
    unlockCueFired: false,
    revealCueFired: false,
  };
  const step1 = advanceCommonBoxClock(state, 0.2);
  assert.equal(state.t, BOX_TIMELINE.authHold);
  assert.ok(Math.abs(state.holdElapsed - 0.16) < 1e-9);
  assert.equal(step1.phase, "authenticating");
  assert.deepEqual(step1.cues, ["charge"]);
  assert.equal(state.unlockCueFired, false);
  assert.equal(step1.justCompleted, false);

  // Subsequent frames while still waiting remain locked at authHold
  const step2 = advanceCommonBoxClock(state, 0.2);
  assert.equal(state.t, BOX_TIMELINE.authHold);
  assert.equal(step2.phase, "authenticating");
  assert.deepEqual(step2.cues, []);

  // Error freezes timeline safely before unlock
  state.isError = true;
  const errStep = advanceCommonBoxClock(state, 0.2);
  assert.equal(state.t, BOX_TIMELINE.authHold);
  assert.equal(errStep.phase, "error");
  assert.equal(state.unlockCueFired, false);

  // Confirmed reward unlocks and completes cleanly without looping
  state.isError = false;
  state.hasReward = true;
  const unlockStep = advanceCommonBoxClock(state, 0.2);
  assert.equal(unlockStep.phase, "opening");
  assert.deepEqual(unlockStep.cues, ["unlock"]);

  let revealSeen = false;
  let doneStep = unlockStep;
  for (let i = 0; i < 20 && !doneStep.justCompleted; i += 1) {
    doneStep = advanceCommonBoxClock(state, 0.15);
    if (doneStep.cues.includes("reveal")) revealSeen = true;
  }
  assert.equal(revealSeen, true);
  assert.equal(doneStep.justCompleted, true);
  assert.equal(doneStep.phase, "ambient");
  assert.equal(state.isAmbient, true);
  assert.equal(state.t, BOX_TIMELINE.complete);
}

console.log("check-common-box-reward: all assertions passed.");
