import { useCurrentFrame } from "remotion";
import { EASING, lerp, segmentProgress } from "../motion/index.ts";
import { ANIMESICE_PALETTE, RARITY_THEMES, TYPOGRAPHY, type GachaRarity } from "../tokens/index.ts";

export type CardFrameProps = {
  rarity?: GachaRarity;
  title: string;
  animeTitle?: string;
  badgeText?: string;
  width?: number;
  flipStartFrame?: number;
  flipEndFrame?: number;
  tiltDeg?: number;
  glowOpacity?: number;
};

export function CardFrame({
  rarity = "LENDARIA",
  title,
  animeTitle = "AnimesIce Collection",
  badgeText,
  width = 360,
  flipStartFrame = 12,
  flipEndFrame = 42,
  tiltDeg = 0,
  glowOpacity = 0.85,
}: CardFrameProps) {
  const frame = useCurrentFrame();
  const theme = RARITY_THEMES[rarity];
  const height = Math.round((width * 4) / 3);
  const flipProgress = segmentProgress(frame, flipStartFrame, flipEndFrame, EASING.animesiceSnap);
  const rotateY = lerp(-90, tiltDeg, flipProgress);
  const scale = lerp(0.86, 1, flipProgress);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        perspective: 1100,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 24,
          transform: `rotateY(${rotateY}deg) scale(${scale})`,
          boxShadow: `0 24px 64px rgba(0, 0, 0, 0.72), 0 0 42px ${theme.glow}${Math.round(glowOpacity * 90)
            .toString(16)
            .padStart(2, "0")}`,
          background: `linear-gradient(155deg, ${ANIMESICE_PALETTE.panel} 0%, ${theme.crystalDark} 55%, ${ANIMESICE_PALETTE.inkDeep} 100%)`,
          border: `2px solid ${theme.color}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: 16,
            border: `1px solid ${theme.stroke}44`,
            pointerEvents: "none",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
          <span
            style={{
              fontFamily: TYPOGRAPHY.mono,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: ANIMESICE_PALETTE.inkDeep,
              backgroundColor: theme.color,
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            {badgeText ?? theme.label}
          </span>
          <span
            style={{
              fontFamily: TYPOGRAPHY.mono,
              fontSize: 11,
              letterSpacing: "0.1em",
              color: theme.stroke,
              opacity: 0.85,
            }}
          >
            #001
          </span>
        </div>

        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="200" height="240" viewBox="240 180 240 360">
            <path
              d="M360 207 442 309 420 412 360 513 300 412 278 309Z"
              fill={theme.crystalMid}
              fillOpacity="0.45"
              stroke={theme.stroke}
              strokeWidth="2.5"
            />
            <path d="m360 207 82 102-82 51-82-51Z" fill={theme.facetA} fillOpacity="0.32" />
            <path d="m278 309 82 51-60 52Z" fill={theme.facetB} fillOpacity="0.52" />
            <path d="m442 309-82 51 60 52Z" fill={theme.facetD} fillOpacity="0.36" />
          </svg>
        </div>

        <div style={{ zIndex: 1 }}>
          <div
            style={{
              fontFamily: TYPOGRAPHY.mono,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: theme.glow,
              marginBottom: 4,
            }}
          >
            {animeTitle}
          </div>
          <div
            style={{
              fontFamily: TYPOGRAPHY.display,
              fontSize: 22,
              fontWeight: 700,
              color: ANIMESICE_PALETTE.snow,
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
        </div>
      </div>
    </div>
  );
}
