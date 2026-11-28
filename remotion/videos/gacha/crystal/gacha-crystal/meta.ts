import { GACHA_RARITIES, defineVideo, type GachaRarity } from "../../../../src/shared.ts";

export type CrystalInvocationProps = {
  rarity: GachaRarity;
};

export const video = defineVideo<CrystalInvocationProps>({
  id: "GachaCrystal",
  category: "GACHA",
  collection: "crystal",
  slug: "gacha-crystal",
  title: "Cristal de Invocação Gacha",
  description: "Loop do cristal facetado com anéis orbitais, partículas e varredura especular por raridade.",
  format: "GACHA_SQUARE",
  fps: 30,
  durationInFrames: 120,
  codecProfile: "web-h264",
  crf: 23,
  loop: true,
  silent: true,
  posterAtSec: 0.3,
  tags: ["gacha", "crystal", "loop", "rarity"],
  defaultProps: {
    rarity: "COMUM",
  },
  variants: GACHA_RARITIES.map((rarity) => ({
    key: rarity.toLowerCase(),
    label: rarity,
    compositionId: `GachaCrystal-${rarity}`,
    publishName: `gacha-spin-${rarity.toLowerCase()}`,
    props: { rarity },
  })),
  publish: {
    dir: "gacha",
    filePattern: "gacha-spin-{variant}",
    includePoster: true,
  },
});

export default video;
