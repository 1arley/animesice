import { defineVideo, type GachaRarity } from "../../src/shared.ts";

export type SeasonalPromoBannerProps = {
  headline: string;
  subtitle: string;
  featuredRarity: GachaRarity;
};

export const video = defineVideo<SeasonalPromoBannerProps>({
  id: "SeasonalPromoBanner",
  category: "PROMO",
  collection: "examples",
  slug: "seasonal-promo-banner",
  title: "Banner Promocional de Temporada",
  description: "Promo 16:9 multi-cena demonstrando createTimeline + Sequence + primitivos AnimesIce.",
  format: "PROMO_720P",
  fps: 30,
  durationInFrames: 150,
  codecProfile: "web-h264",
  posterAtSec: 2.2,
  tags: ["example", "promo", "16:9", "timeline"],
  defaultProps: {
    headline: "Temporada Glacial",
    subtitle: "Colecione cartas exclusivas e desbloqueie molduras raras no Gacha",
    featuredRarity: "GALACTICA",
  },
});

export default video;
