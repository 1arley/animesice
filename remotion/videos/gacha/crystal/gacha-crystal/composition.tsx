import { useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import {
  CrystalGeometry,
  EnergyRings,
  FoilSweep,
  GACHA_RARITIES,
  RARITY_THEMES,
  Stage,
  Starfield,
  loopProgress,
  pulseWave,
  type GachaRarity,
} from "../../../../src/react.ts";
import type { CrystalInvocationProps } from "./meta.ts";

export type { CrystalInvocationProps };

export const schema = z.object({
  rarity: z.enum(GACHA_RARITIES),
});

export function CrystalInvocation({ rarity }: CrystalInvocationProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const resolvedRarity: GachaRarity = rarity in RARITY_THEMES ? rarity : "COMUM";
  const theme = RARITY_THEMES[resolvedRarity];
  const progress = loopProgress(frame, durationInFrames);
  const pulse = pulseWave(progress, 3, 0.65, theme.pulseAmp);

  return (
    <Stage background="#000000" format="GACHA_SQUARE">
      <CrystalGeometry rarity={resolvedRarity} theme={theme} pulse={pulse} haloRadius={280} />
      <EnergyRings
        count={theme.ringCount}
        colorA={theme.ringA}
        colorB={theme.ringB}
        speed={theme.ringSpeed}
        opacityPulse={pulse}
      />
      <Starfield
        count={theme.particleCount}
        color={theme.particle}
        seed={`crystal-${resolvedRarity}`}
        mode="orbital"
        baseRadius={194}
        radiusSpread={48}
        ellipticalScaleY={0.65}
      />
      <FoilSweep color={theme.sweep} startFrame={28} endFrame={78} bandWidth={180} angleDeg={20} />
    </Stage>
  );
}

export default CrystalInvocation;
