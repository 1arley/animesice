import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ANIMESICE_PALETTE } from "../tokens/index.ts";

export type EnergyRingsProps = {
  count?: number;
  colorA?: string;
  colorB?: string;
  speed?: number;
  opacityPulse?: number;
  cx?: number;
  cy?: number;
  baseRx?: number;
  baseRy?: number;
  stepRx?: number;
  stepRy?: number;
};

export function EnergyRings({
  count = 3,
  colorA = ANIMESICE_PALETTE.ice,
  colorB = ANIMESICE_PALETTE.motion.frost,
  speed = 1,
  opacityPulse = 0.65,
  cx,
  cy,
  baseRx = 125,
  baseRy = 56,
  stepRx = 43,
  stepRy = 21,
}: EnergyRingsProps) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const centerX = cx ?? width / 2;
  const centerY = cy ?? height / 2;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {Array.from({ length: count }, (_, ring) => {
          const isOdd = ring % 2 === 1;
          const rot = frame * (isOdd ? -2 : 1.2) * speed + ring * 42;
          return (
            <ellipse
              key={ring}
              cx={centerX}
              cy={centerY}
              rx={baseRx + ring * stepRx}
              ry={baseRy + ring * stepRy}
              fill="none"
              stroke={isOdd ? colorB : colorA}
              strokeWidth={isOdd ? 2 : 1.5}
              strokeOpacity={0.35 + opacityPulse * 0.3}
              transform={`rotate(${rot} ${centerX} ${centerY})`}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}
