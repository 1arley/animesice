import { useId } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ANIMESICE_PALETTE } from "../tokens/index.ts";

export type FoilSweepProps = {
  color?: string;
  startFrame?: number;
  endFrame?: number;
  bandWidth?: number;
  angleDeg?: number;
  opacity?: number;
};

export function FoilSweep({
  color = ANIMESICE_PALETTE.iceBright,
  startFrame = 28,
  endFrame = 78,
  bandWidth = 180,
  angleDeg = 20,
  opacity = 1,
}: FoilSweepProps) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const uid = useId().replace(/:/g, "");
  const gradId = `foil-sweep-${uid}`;
  const travel = Math.max(width, height) * 1.25;
  const sweepX = interpolate(frame, [startFrame, endFrame], [-travel, travel], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const active = frame >= startFrame && frame <= endFrame;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradId}>
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="48%" stopColor={color} stopOpacity="0.55" />
            <stop offset="52%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect
          x={sweepX - bandWidth / 2}
          y={-height * 0.25}
          width={bandWidth}
          height={height * 1.5}
          fill={`url(#${gradId})`}
          transform={`rotate(${angleDeg} ${width / 2} ${height / 2})`}
          opacity={active ? opacity : 0}
        />
      </svg>
    </AbsoluteFill>
  );
}
