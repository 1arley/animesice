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
const { BOX_TIMELINE } = await import(
  "../src/components/gacha/common-box/common-box-palette.ts"
);
const {
  PREMIUM_TIMELINE,
  RARE_TIMELINE,
  TIER_PALETTE_HEX,
  advanceTierBoxClock,
  createInitialTierClockState,
} = await import("../src/components/gacha/tier-boxes/tier-box-config.ts");

// 1. Timeline hierarchy & monotonicity: COMMON < RARE < PREMIUM
for (const tl of [RARE_TIMELINE, PREMIUM_TIMELINE]) {
  assert.ok(tl.curtainIn < tl.matEnd);
  assert.ok(tl.matEnd <= tl.authStart);
  assert.ok(tl.authStart < tl.authHold);
  assert.ok(tl.authHold < tl.unlock);
  assert.ok(tl.unlock < tl.revealStart);
  assert.ok(tl.revealStart < tl.revealPeak);
  assert.ok(tl.revealPeak < tl.handoffStart);
  assert.ok(tl.handoffStart < tl.complete);
}
assert.ok(BOX_TIMELINE.complete < RARE_TIMELINE.complete);
assert.ok(RARE_TIMELINE.complete < PREMIUM_TIMELINE.complete);
assert.notEqual(TIER_PALETTE_HEX.RARE.primary, TIER_PALETTE_HEX.PREMIUM.primary);

// 2. Hard business gate invariants on RARE and PREMIUM
for (const [tier, tl] of [
  ["RARE", RARE_TIMELINE],
  ["PREMIUM", PREMIUM_TIMELINE],
]) {
  const state = createInitialTierClockState(tier, false, false);
  const stepWait = advanceTierBoxClock(tier, state, 2.5);
  assert.equal(state.t, tl.authHold, `${tier} must clamp t at authHold without reward`);
  assert.ok(state.holdElapsed > 1.0);
  assert.equal(stepWait.phase, "authenticating");
  assert.equal(state.unlockCueFired, false);
  assert.equal(state.revealCueFired, false);
  assert.equal(stepWait.justCompleted, false);

  // Subsequent frames stay locked before unlock
  const stepHold = advanceTierBoxClock(tier, state, 0.3);
  assert.equal(state.t, tl.authHold);
  assert.equal(stepHold.phase, "authenticating");

  // Error freezes timeline strictly before unlock
  state.isError = true;
  const errStep = advanceTierBoxClock(tier, state, 0.5);
  assert.equal(errStep.phase, "error");
  assert.equal(state.unlockCueFired, false);

  // Reward granted unlocks and completes deterministically without looping
  state.isError = false;
  state.hasReward = true;
  const seenCues = new Set(stepWait.cues);
  let lastStep = errStep;
  for (let i = 0; i < 40 && !lastStep.justCompleted; i += 1) {
    lastStep = advanceTierBoxClock(tier, state, 0.16);
    lastStep.cues.forEach((c) => seenCues.add(c));
  }
  assert.equal(seenCues.has("charge"), true);
  assert.equal(seenCues.has("lockTick1"), true);
  if (tier === "PREMIUM") {
    assert.equal(seenCues.has("lockTick2"), true);
  } else {
    assert.equal(seenCues.has("lockTick2"), false);
  }
  assert.equal(seenCues.has("unlock"), true);
  assert.equal(seenCues.has("reveal"), true);
  assert.equal(lastStep.justCompleted, true);
  assert.equal(lastStep.phase, "ambient");
  assert.equal(state.isAmbient, true);
  assert.equal(state.t, tl.complete);

  // Subsequent ticks remain ambient and do not restart opening
  const ambientStep = advanceTierBoxClock(tier, state, 0.25);
  assert.equal(ambientStep.phase, "ambient");
  assert.equal(ambientStep.justCompleted, false);
  assert.equal(ambientStep.cues.length, 0);
}

// 3. Rare & Premium real reward payload checks
const multiSkin = {
  category: "SKIN",
  skins: [
    { name: "Aura Solar", rarity: "LEGENDARY" },
    { name: "Velo Obsidian", rarity: "EPIC" },
  ],
};
assert.equal(isValidBoxRewardPayload(multiSkin), true);
const multiSkinMeta = getBoxRewardVisualMeta(multiSkin);
assert.equal(multiSkinMeta.rarityKey, "LEGENDARY");
assert.equal(multiSkinMeta.rarityLabel, "Lendária");
assert.equal(multiSkinMeta.artifactKind, "relic");

const galacticCard = getBoxRewardVisualMeta({
  category: "CARD",
  name: "Aeliana Eclipse",
  rarity: "GALACTICA",
  image: "/aeliana/Aeliana.png",
});
assert.equal(galacticCard.artifactKind, "card");
assert.equal(galacticCard.accentHex, "#67e8f9");
assert.equal(galacticCard.rarityLabel, "Galáctica");

const draconicaItem = getBoxRewardVisualMeta({
  category: "ITEM",
  kind: "DRACONICA",
  quantity: 5,
});
assert.equal(draconicaItem.artifactKind, "relic");
assert.equal(draconicaItem.rarityKey, "");

console.log("check-tier-boxes: all assertions passed.");
