import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import {
  ANIMESICE_PALETTE,
  Backdrop,
  CardFrame,
  CrystalGeometry,
  EnergyRings,
  FoilSweep,
  GACHA_RARITIES,
  RARITY_THEMES,
  Stage,
  Starfield,
  TitleCard,
  createTimeline,
  loopProgress,
  pulseWave,
} from "../../src/react.ts";
import type { SeasonalPromoBannerProps } from "./meta.ts";

export const schema = z.object({
  headline: z.string(),
  subtitle: z.string(),
  featuredRarity: z.enum(GACHA_RARITIES),
});

export default function SeasonalPromoBanner({
  headline,
  subtitle,
  featuredRarity,
}: SeasonalPromoBannerProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const theme = RARITY_THEMES[featuredRarity] ?? RARITY_THEMES.GALACTICA;
  const pulse = pulseWave(loopProgress(frame, durationInFrames), 3, 0.65, 0.16);

  const timeline = createTimeline(fps, [
    { id: "intro", durationInFrames: 50 },
    { id: "showcase", durationInFrames: 65, overlapFrames: 10 },
    { id: "endcard", durationInFrames: 55, overlapFrames: 10 },
  ]);

  return (
    <Stage background={ANIMESICE_PALETTE.inkDeep} format="PROMO_720P">
      <Backdrop
        baseColor={ANIMESICE_PALETTE.inkDeep}
        glowColor={theme.glow}
        secondaryGlowColor={ANIMESICE_PALETTE.ice}
        glowOpacity={0.28}
        showGrid
      />
      <Starfield count={44} color={theme.particle} seed="seasonal-promo" mode="drift" />

      <Sequence from={timeline.scenes.intro.from} durationInFrames={timeline.scenes.intro.durationInFrames}>
        <CrystalGeometry rarity={featuredRarity} theme={theme} pulse={pulse} scale={0.75} cx={320} cy={360} />
        <EnergyRings colorA={theme.ringA} colorB={theme.ringB} cx={320} cy={360} count={theme.ringCount} />
        <div
          style={{
            position: "absolute",
            left: 560,
            right: 72,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <TitleCard
            eyebrow="AnimesIce Gacha"
            title={headline}
            subtitle={subtitle}
            accentColor={theme.color}
            align="left"
            titleSize={54}
          />
        </div>
      </Sequence>

      <Sequence from={timeline.scenes.showcase.from} durationInFrames={timeline.scenes.showcase.durationInFrames}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 96px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ maxWidth: 540 }}>
            <TitleCard
              eyebrow={`Tier ${theme.label}`}
              title="Arte & Movimento"
              subtitle="Frames SVG, foil holográfico e cristais de invocação em 60fps."
              accentColor={theme.color}
              align="left"
              titleSize={46}
            />
          </div>
          <CardFrame
            rarity={featuredRarity}
            title="Prisma Galáctico"
            animeTitle="Edição Especial"
            width={280}
            flipStartFrame={4}
            flipEndFrame={26}
            tiltDeg={-4}
          />
        </div>
        <FoilSweep color={theme.sweep} startFrame={24} endFrame={52} />
      </Sequence>

      <Sequence from={timeline.scenes.endcard.from} durationInFrames={timeline.scenes.endcard.durationInFrames}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TitleCard
            eyebrow="animesice.app/gacha"
            title="Jogue Agora"
            subtitle={headline}
            accentColor={ANIMESICE_PALETTE.ice}
            titleSize={62}
            exitFrames={10}
          />
        </div>
      </Sequence>
    </Stage>
  );
}
