import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  DEFAULT_STONE_FORGE_VARIANT,
  resolveStoneForgeVariant,
  STONE_FORGE_VARIANTS,
} from "../forja/stone-forge-variants.mjs";

const expectedImages = {
  TITANITA: "/gacha/titanita.png",
  TITANITA_SOMBRIA: "/gacha/titanita-sombria.png",
  DRACONICA: "/gacha/magnetita.png",
  SOMBRIA_DRACONICA: "/gacha/magnetita-sombria.png",
};
const kinds = Object.keys(STONE_FORGE_VARIANTS);
const images = new Set();

for (const kind of Object.keys(expectedImages))
  assert.ok(Object.prototype.hasOwnProperty.call(STONE_FORGE_VARIANTS, kind), `${kind}: perfil ausente`);

for (const kind of kinds) {
  const variant = resolveStoneForgeVariant(kind);
  assert.ok(variant, `${kind} precisa de um perfil`);
  assert.match(variant.energy, /^#[\da-f]{6}$/i, `${kind}: energia inválida`);
  assert.equal(variant.particleCounts.length, 3, `${kind}: três emissores`);
  assert.ok(variant.particleCounts.every((count) => count > 0), `${kind}: partículas`);
  assert.ok(variant.particleCounts.reduce((total, count) => total + count, 0) <= 870, `${kind}: teto de partículas móveis`);
  assert.ok([0, 1, 2, 3].includes(variant.motionStyle), `${kind}: trajetória inválida`);
  assert.ok(existsSync(new URL(`../public${variant.image}`, import.meta.url)), `${kind}: asset ausente`);
  if (Object.prototype.hasOwnProperty.call(expectedImages, kind))
    assert.equal(variant.image, expectedImages[kind], `${kind}: imagem incorreta`);
  images.add(variant.image);
}

assert.equal(images.size, kinds.length, "Cada pedra deve revelar seu próprio asset");
assert.equal(resolveStoneForgeVariant("FUTURE_STONE"), DEFAULT_STONE_FORGE_VARIANT);
assert.equal(resolveStoneForgeVariant("constructor"), DEFAULT_STONE_FORGE_VARIANT);
assert.equal(resolveStoneForgeVariant("__proto__"), DEFAULT_STONE_FORGE_VARIANT);
assert.ok(existsSync(new URL(`../public${DEFAULT_STONE_FORGE_VARIANT.image}`, import.meta.url)));
console.log(`Forja validada: ${kinds.join(", ")} e perfil padrão.`);
