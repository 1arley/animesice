import assert from "node:assert/strict";
import {
  ampulhetaUseSummary,
  canUseAmpulheta,
} from "../src/lib/gacha-inventory.ts";

console.log("Checking Ampulheta do Éter frontend domain logic...");

// Eligibility rules mirror backend: active lock + not in claim event + count > 0
assert.equal(
  canUseAmpulheta({ locked: true, claimEventActive: false, ampulhetaEter: 1 }),
  true,
);
assert.equal(
  canUseAmpulheta({ locked: false, claimEventActive: false, ampulhetaEter: 3 }),
  false,
);
assert.equal(
  canUseAmpulheta({ locked: true, claimEventActive: true, ampulhetaEter: 2 }),
  false,
);
assert.equal(
  canUseAmpulheta({ locked: true, claimEventActive: false, ampulhetaEter: 0 }),
  false,
);

// Confirmation summary formatting
assert.deepEqual(
  ampulhetaUseSummary({ ampulhetaEter: 3, remainingLabel: "5h 12m" }),
  {
    remainingText: "5h 12m",
    availableCount: 3,
    consumedCount: 1,
    nextCount: 2,
  },
);
assert.deepEqual(
  ampulhetaUseSummary({ ampulhetaEter: 1, remainingLabel: null }),
  {
    remainingText: "menos de 1s",
    availableCount: 1,
    consumedCount: 1,
    nextCount: 0,
  },
);

console.log("All Ampulheta do Éter checks passed!");
