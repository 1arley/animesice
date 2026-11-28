import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { VideoFormatPreset } from "../core/contracts.ts";
import { ANIMESICE_PALETTE, SAFE_MARGINS, TYPOGRAPHY } from "../tokens/index.ts";

export type StageProps = {
  children: ReactNode;
  background?: string;
  format?: VideoFormatPreset;
  showSafeZones?: boolean;
  style?: CSSProperties;
};

export function Stage({
  children,
  background = ANIMESICE_PALETTE.ink,
  format,
  showSafeZones = false,
  style,
}: StageProps) {
  const { width, height } = useVideoConfig();
  const margin =
    (format ? SAFE_MARGINS[format] : undefined) ?? {
      x: Math.round(width * 0.06),
      y: Math.round(height * 0.06),
    };

  return (
    <AbsoluteFill
      style={{
        background,
        overflow: "hidden",
        fontFamily: TYPOGRAPHY.sans,
        color: ANIMESICE_PALETTE.snow,
        ...style,
      }}
    >
      {children}
      {showSafeZones ? (
        <div
          style={{
            position: "absolute",
            left: margin.x,
            top: margin.y,
            right: margin.x,
            bottom: margin.y,
            border: `1px dashed ${ANIMESICE_PALETTE.ice}`,
            opacity: 0.45,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
}
