import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { createRng, loopProgress } from "../motion/index.ts";
import { ANIMESICE_PALETTE } from "../tokens/index.ts";

export type StarfieldMode = "orbital" | "drift" | "twinkle";

export type StarfieldProps = {
  count?: number;
  color?: string;
  seed?: string | number;
  mode?: StarfieldMode;
  cx?: number;
  cy?: number;
  baseRadius?: number;
  radiusSpread?: number;
  ellipticalScaleY?: number;
  loop?: boolean;
  opacity?: number;
};

export function Starfield({
  count = 32,
  color = ANIMESICE_PALETTE.motion.frost,
  seed = "animesice-starfield",
  mode = "orbital",
  cx,
  cy,
  baseRadius,
  radiusSpread = 48,
  ellipticalScaleY = 0.65,
  loop = true,
  opacity = 1,
}: StarfieldProps) {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const centerX = cx ?? width / 2;
  const centerY = cy ?? height / 2;
  const orbitR = baseRadius ?? Math.min(width, height) * 0.27;
  const progress = loop ? loopProgress(frame, durationInFrames) : frame / Math.max(1, durationInFrames);

  const items = useMemo(() => {
    const rng = createRng(seed);
    return Array.from({ length: count }, (_, i) => ({
      i,
      xFrac: rng.next(),
      yFrac: rng.next(),
      radiusOffset: (i % 4) * (radiusSpread / 4) + rng.range(-4, 4),
      size: i % 5 === 0 ? rng.range(2.6, 3.6) : rng.range(1.2, 2.2),
      speed: rng.range(0.6, 1.4),
      phase: rng.range(0, Math.PI * 2),
    }));
  }, [count, radiusSpread, seed]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {items.map((item) => {
          let x = item.xFrac * width;
          let y = item.yFrac * height;
          if (mode === "orbital") {
            const angle = (item.i * Math.PI * 2) / count + progress * Math.PI * 2;
            const r = orbitR + item.radiusOffset;
            x = centerX + Math.cos(angle) * r;
            y = centerY + Math.sin(angle) * r * ellipticalScaleY;
          } else if (mode === "drift") {
            x = ((item.xFrac * width + progress * 90 * item.speed) % width + width) % width;
            y = ((item.yFrac * height - progress * 60 * item.speed) % height + height) % height;
          }
          const twinkle =
            mode === "orbital"
              ? 0.35 + (Math.sin(frame / 8 + item.i) + 1) * 0.3
              : 0.25 + (Math.sin(progress * Math.PI * 4 * item.speed + item.phase) + 1) * 0.35;
          return <circle key={item.i} cx={x} cy={y} r={item.size} fill={color} opacity={twinkle} />;
        })}
      </svg>
    </AbsoluteFill>
  );
}
