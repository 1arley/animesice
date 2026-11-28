import { useId } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { RARITY_THEMES, type GachaRarity, type RarityVisualTheme } from "../tokens/index.ts";

export type CrystalGeometryProps = {
  rarity?: GachaRarity;
  theme?: RarityVisualTheme;
  pulse?: number;
  scale?: number;
  haloRadius?: number;
  cx?: number;
  cy?: number;
};

export function CrystalGeometry({
  rarity = "COMUM",
  theme: themeOverride,
  pulse = 0.72,
  scale = 1,
  haloRadius = 280,
  cx,
  cy,
}: CrystalGeometryProps) {
  const { width, height } = useVideoConfig();
  const theme = themeOverride ?? RARITY_THEMES[rarity];
  const uid = useId().replace(/:/g, "");
  const haloId = `crystal-halo-${uid}`;
  const crystalId = `crystal-body-${uid}`;
  const centerX = cx ?? width / 2;
  const centerY = cy ?? height / 2;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <radialGradient id={haloId}>
            <stop offset="0%" stopColor={theme.glow} stopOpacity="0.38" />
            <stop offset="72%" stopColor={theme.glowSoft} stopOpacity="0.14" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={crystalId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.facetA} stopOpacity="0.85" />
            <stop offset="52%" stopColor={theme.crystalMid} stopOpacity="0.42" />
            <stop offset="100%" stopColor={theme.crystalDark} stopOpacity="0.68" />
          </linearGradient>
        </defs>
        <circle cx={centerX} cy={centerY} r={haloRadius * scale} fill={`url(#${haloId})`} opacity={pulse} />
        <g transform={`translate(${centerX} ${centerY}) scale(${scale}) translate(-360 -360)`}>
          <path
            d="M360 207 442 309 420 412 360 513 300 412 278 309Z"
            fill={`url(#${crystalId})`}
            stroke={theme.stroke}
            strokeOpacity="0.85"
            strokeWidth="2"
          />
          <path
            d="m360 207 82 102-82 51-82-51Z"
            fill={theme.facetA}
            fillOpacity="0.27"
            stroke={theme.stroke}
            strokeOpacity="0.5"
          />
          <path d="m278 309 82 51-60 52Z" fill={theme.facetB} fillOpacity="0.46" />
          <path d="m442 309-82 51 60 52Z" fill={theme.facetD} fillOpacity="0.3" />
          <path d="m300 412 60-52v153Z" fill={theme.crystalDark} fillOpacity="0.45" />
          <path d="m420 412-60-52v153Z" fill={theme.facetD} fillOpacity="0.42" />
        </g>
      </svg>
    </AbsoluteFill>
  );
}
