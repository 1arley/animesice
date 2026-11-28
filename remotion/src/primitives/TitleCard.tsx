import { useCurrentFrame, useVideoConfig } from "remotion";
import { EASING, lerp, phaseEnvelope } from "../motion/index.ts";
import { ANIMESICE_PALETTE, TYPOGRAPHY } from "../tokens/index.ts";

export type TitleCardProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
  align?: "left" | "center";
  enterFrames?: number;
  exitFrames?: number;
  titleSize?: number;
};

export function TitleCard({
  eyebrow,
  title,
  subtitle,
  accentColor = ANIMESICE_PALETTE.ice,
  align = "center",
  enterFrames = 18,
  exitFrames = 14,
  titleSize = 48,
}: TitleCardProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const env = phaseEnvelope(frame, {
    enterStart: 0,
    enterEnd: enterFrames,
    exitStart: Math.max(enterFrames, durationInFrames - exitFrames),
    exitEnd: durationInFrames,
    enterEase: EASING.animesiceSnap,
    exitEase: EASING.easeInCubic,
  });

  const translateY = lerp(22, 0, env);
  const lineW = Math.round(lerp(0, 96, env));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
        opacity: env,
        transform: `translateY(${translateY}px)`,
        gap: 10,
      }}
    >
      {eyebrow ? (
        <span
          style={{
            fontFamily: TYPOGRAPHY.mono,
            fontSize: 13,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: accentColor,
            padding: "5px 12px",
            borderRadius: 999,
            border: `1px solid ${accentColor}55`,
            backgroundColor: "rgba(8, 12, 18, 0.72)",
          }}
        >
          {eyebrow}
        </span>
      ) : null}
      <div
        style={{
          fontFamily: TYPOGRAPHY.display,
          fontSize: titleSize,
          fontWeight: 700,
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          color: ANIMESICE_PALETTE.snow,
          textShadow: `0 6px 28px rgba(0, 0, 0, 0.7), 0 0 24px ${accentColor}33`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: lineW,
          height: 2,
          borderRadius: 999,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />
      {subtitle ? (
        <div
          style={{
            fontFamily: TYPOGRAPHY.sans,
            fontSize: Math.max(15, Math.round(titleSize * 0.36)),
            color: ANIMESICE_PALETTE.mist,
            maxWidth: 640,
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
