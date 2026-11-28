import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import {
  ANIMESICE_PALETTE,
  Backdrop,
  CardFrame,
  EASING,
  FoilSweep,
  GACHA_RARITIES,
  RARITY_THEMES,
  Stage,
  Starfield,
  TitleCard,
  createTimeline,
  lerp,
  segmentProgress,
} from "../../src/react.ts";
import type { CardRevealShowcaseProps } from "./meta.ts";

export const schema = z.object({
  rarity: z.enum(GACHA_RARITIES),
  cardName: z.string(),
  animeTitle: z.string(),
});

export default function CardRevealShowcase({
  rarity,
  cardName,
  animeTitle,
}: CardRevealShowcaseProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = RARITY_THEMES[rarity] ?? RARITY_THEMES.LENDARIA;

  const plan = createTimeline(fps, [
    { id: "intro", durationInFrames: 24 },
    { id: "reveal", durationInFrames: 96, overlapFrames: 6 },
  ]);

  const glowIntensity = lerp(0.16, 0.34, segmentProgress(frame, 18, 52, EASING.easeOutCubic));

  return (
    <Stage background={ANIMESICE_PALETTE.inkDeep} format="CARD_PORTRAIT">
      <Backdrop
        baseColor={ANIMESICE_PALETTE.inkDeep}
        glowColor={theme.glow}
        secondaryGlowColor={theme.color}
        glowOpacity={glowIntensity}
        showGrid
      />
      <Starfield count={36} color={theme.particle} seed={`reveal-${rarity}`} mode="twinkle" />

      <Sequence from={plan.scenes.reveal.from} durationInFrames={plan.scenes.reveal.durationInFrames}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
            padding: 40,
            boxSizing: "border-box",
          }}
        >
          <CardFrame
            rarity={rarity}
            title={cardName}
            animeTitle={animeTitle}
            width={340}
            flipStartFrame={6}
            flipEndFrame={34}
          />
          <TitleCard
            eyebrow={`Raridade ${theme.label}`}
            title={cardName}
            subtitle={animeTitle}
            accentColor={theme.color}
            titleSize={36}
            enterFrames={16}
            exitFrames={14}
          />
        </div>
      </Sequence>

      <FoilSweep color={theme.sweep} startFrame={38} endFrame={74} bandWidth={200} />
    </Stage>
  );
}
