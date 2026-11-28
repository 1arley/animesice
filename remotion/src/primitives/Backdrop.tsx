import { useId } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ANIMESICE_PALETTE } from "../tokens/index.ts";

export type BackdropProps = {
  baseColor?: string;
  glowColor?: string;
  secondaryGlowColor?: string;
  glowOpacity?: number;
  showGrid?: boolean;
  gridOpacity?: number;
  vignetteOpacity?: number;
};

export function Backdrop({
  baseColor = ANIMESICE_PALETTE.inkDeep,
  glowColor = ANIMESICE_PALETTE.ice,
  secondaryGlowColor = ANIMESICE_PALETTE.motion.azure,
  glowOpacity = 0.24,
  showGrid = false,
  gridOpacity = 0.08,
  vignetteOpacity = 0.65,
}: BackdropProps) {
  const { width, height } = useVideoConfig();
  const uid = useId().replace(/:/g, "");
  const gradPrimary = `bg-p-${uid}`;
  const gradSecondary = `bg-s-${uid}`;
  const gridId = `bg-g-${uid}`;

  return (
    <AbsoluteFill style={{ backgroundColor: baseColor, pointerEvents: "none" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id={gradPrimary} cx="50%" cy="44%" r="55%">
            <stop offset="0%" stopColor={glowColor} stopOpacity={glowOpacity} />
            <stop offset="65%" stopColor={secondaryGlowColor} stopOpacity={glowOpacity * 0.35} />
            <stop offset="100%" stopColor={baseColor} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={gradSecondary} cx="78%" cy="22%" r="48%">
            <stop offset="0%" stopColor={secondaryGlowColor} stopOpacity={glowOpacity * 0.55} />
            <stop offset="100%" stopColor={baseColor} stopOpacity={0} />
          </radialGradient>
          {showGrid ? (
            <pattern id={gridId} width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke={glowColor} strokeWidth="1" strokeOpacity={gridOpacity} />
            </pattern>
          ) : null}
        </defs>
        <rect width={width} height={height} fill={`url(#${gradPrimary})`} />
        <rect width={width} height={height} fill={`url(#${gradSecondary})`} />
        {showGrid ? <rect width={width} height={height} fill={`url(#${gridId})`} /> : null}
      </svg>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 45%, rgba(5, 7, 11, ${vignetteOpacity}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
}
