import { defineVideo, type GachaRarity } from "../../src/shared.ts";

export type CardRevealShowcaseProps = {
  rarity: GachaRarity;
  cardName: string;
  animeTitle: string;
};

export const video = defineVideo<CardRevealShowcaseProps>({
  id: "CardRevealShowcase",
  category: "SHOWCASE",
  collection: "examples",
  slug: "card-reveal-showcase",
  title: "Showcase de Revelação de Carta",
  description: "Revelação 3:4 de carta colecionável com flip 3D, foil sweep e título animado.",
  format: "CARD_PORTRAIT",
  fps: 30,
  durationInFrames: 120,
  codecProfile: "web-h264",
  posterAtSec: 2.0,
  tags: ["example", "card", "reveal", "portrait"],
  defaultProps: {
    rarity: "LENDARIA",
    cardName: "Soberana Celestial",
    animeTitle: "AnimesIce Chronicles",
  },
});

export default video;
