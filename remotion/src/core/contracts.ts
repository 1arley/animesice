export type VideoCategory = "GACHA" | "UI" | "PROMO" | "SHOWCASE";

export type VideoFormatPreset =
  | "GACHA_SQUARE"
  | "CARD_PORTRAIT"
  | "PROMO_16_9"
  | "PROMO_720P"
  | "VERTICAL_9_16"
  | "SOCIAL_1_1"
  | "BANNER_WIDE";

export type FormatSpec = {
  preset: VideoFormatPreset;
  width: number;
  height: number;
  fps: number;
  label: string;
  aspect: string;
};

export const FORMAT_SPECS: Record<VideoFormatPreset, FormatSpec> = {
  GACHA_SQUARE: {
    preset: "GACHA_SQUARE",
    width: 720,
    height: 720,
    fps: 30,
    label: "Gacha Crystal Square",
    aspect: "1:1",
  },
  CARD_PORTRAIT: {
    preset: "CARD_PORTRAIT",
    width: 720,
    height: 960,
    fps: 30,
    label: "Card Portrait (3:4)",
    aspect: "3:4",
  },
  PROMO_16_9: {
    preset: "PROMO_16_9",
    width: 1920,
    height: 1080,
    fps: 30,
    label: "Promo Full HD",
    aspect: "16:9",
  },
  PROMO_720P: {
    preset: "PROMO_720P",
    width: 1280,
    height: 720,
    fps: 30,
    label: "Promo HD",
    aspect: "16:9",
  },
  VERTICAL_9_16: {
    preset: "VERTICAL_9_16",
    width: 1080,
    height: 1920,
    fps: 30,
    label: "Vertical Reels / Shorts",
    aspect: "9:16",
  },
  SOCIAL_1_1: {
    preset: "SOCIAL_1_1",
    width: 1080,
    height: 1080,
    fps: 30,
    label: "Social Square",
    aspect: "1:1",
  },
  BANNER_WIDE: {
    preset: "BANNER_WIDE",
    width: 1600,
    height: 500,
    fps: 30,
    label: "Wide Banner",
    aspect: "16:5",
  },
};

export type VideoCodecProfile =
  | "web-h264"
  | "web-h264-hq"
  | "web-vp9-alpha"
  | "web-vp8-alpha";

export type CodecProfileSpec = {
  profile: VideoCodecProfile;
  codec: "h264" | "vp9" | "vp8";
  ext: "mp4" | "webm";
  pixelFormat: "yuv420p" | "yuva420p";
  crf: number;
  transparent: boolean;
  imageFormat: "jpeg" | "png";
};

export const CODEC_PROFILES: Record<VideoCodecProfile, CodecProfileSpec> = {
  "web-h264": {
    profile: "web-h264",
    codec: "h264",
    ext: "mp4",
    pixelFormat: "yuv420p",
    crf: 23,
    transparent: false,
    imageFormat: "jpeg",
  },
  "web-h264-hq": {
    profile: "web-h264-hq",
    codec: "h264",
    ext: "mp4",
    pixelFormat: "yuv420p",
    crf: 18,
    transparent: false,
    imageFormat: "jpeg",
  },
  "web-vp9-alpha": {
    profile: "web-vp9-alpha",
    codec: "vp9",
    ext: "webm",
    pixelFormat: "yuva420p",
    crf: 28,
    transparent: true,
    imageFormat: "png",
  },
  "web-vp8-alpha": {
    profile: "web-vp8-alpha",
    codec: "vp8",
    ext: "webm",
    pixelFormat: "yuva420p",
    crf: 24,
    transparent: true,
    imageFormat: "png",
  },
};

export const CATEGORY_MAX_BYTES: Record<VideoCategory, number> = {
  GACHA: 3 * 1024 * 1024,
  UI: 3 * 1024 * 1024,
  PROMO: 25 * 1024 * 1024,
  SHOWCASE: 15 * 1024 * 1024,
};

export const REMOTION_ID_REGEX = /^[a-zA-Z0-9-]+$/;

export const DEFAULT_INSPECTION_POINTS = [0.05, 0.25, 0.5, 0.75, 0.92] as const;

export type VideoVariantSpec<TProps extends Record<string, unknown> = Record<string, unknown>> = {
  key: string;
  label?: string;
  compositionId?: string;
  publishName?: string;
  props: TProps;
};

export type ResolvedVariant<TProps extends Record<string, unknown> = Record<string, unknown>> = {
  key: string;
  label: string;
  compositionId: string;
  publishName: string;
  props: TProps;
};

export type VideoPublishSpec = {
  dir: string;
  filePattern?: string;
  includePoster?: boolean;
};

export type VideoDefinitionInput<TProps extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  category: VideoCategory;
  collection?: string;
  slug: string;
  title: string;
  description: string;
  format?: VideoFormatPreset;
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames?: number;
  durationSec?: number;
  codecProfile?: VideoCodecProfile;
  crf?: number;
  loop?: boolean;
  silent?: boolean;
  maxBytes?: number;
  posterAtSec?: number;
  inspectionPoints?: readonly number[];
  tags?: readonly string[];
  defaultProps: TProps;
  variants?: readonly VideoVariantSpec<TProps>[];
  registerBaseComposition?: boolean;
  publish?: VideoPublishSpec;
};

export type ResolvedVideoSpec<TProps extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  category: VideoCategory;
  collection: string;
  slug: string;
  title: string;
  description: string;
  format: VideoFormatPreset;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  durationSec: number;
  codecProfile: VideoCodecProfile;
  crf: number;
  loop: boolean;
  silent: boolean;
  maxBytes: number;
  posterAtSec: number;
  inspectionPoints: readonly number[];
  tags: readonly string[];
  defaultProps: TProps;
  variants: readonly ResolvedVariant<TProps>[];
  registerBaseComposition: boolean;
  publish?: VideoPublishSpec;
};

export function resolveFormatSpec(
  format: VideoFormatPreset = "GACHA_SQUARE",
  overrides?: { width?: number; height?: number; fps?: number },
): { format: VideoFormatPreset; width: number; height: number; fps: number } {
  const base = FORMAT_SPECS[format];
  return {
    format,
    width: overrides?.width ?? base.width,
    height: overrides?.height ?? base.height,
    fps: overrides?.fps ?? base.fps,
  };
}

export function resolveCodecProfile(
  profile: VideoCodecProfile = "web-h264",
  crfOverride?: number,
): CodecProfileSpec {
  const base = CODEC_PROFILES[profile];
  return {
    ...base,
    crf: crfOverride ?? base.crf,
  };
}

export function normalizeSlugToken(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolvePublishStem(
  def: Pick<ResolvedVideoSpec, "slug" | "publish">,
  variantKey?: string,
): string {
  const slug = def.slug;
  const pattern = def.publish?.filePattern;
  const cleanVariant = variantKey ? normalizeSlugToken(variantKey) : undefined;
  if (pattern) {
    return pattern
      .replace(/\{slug\}/g, slug)
      .replace(/\{variant\}/g, cleanVariant ?? "default")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  return cleanVariant ? `${slug}-${cleanVariant}` : slug;
}

export function resolveVariants<TProps extends Record<string, unknown>>(
  baseId: string,
  slug: string,
  variants?: readonly VideoVariantSpec<TProps>[],
  publish?: VideoPublishSpec,
): ResolvedVariant<TProps>[] {
  if (!variants || variants.length === 0) return [];
  return variants.map((v) => {
    const cleanKey = normalizeSlugToken(v.key) || v.key.toLowerCase();
    const idToken = v.key
      .trim()
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const compositionId = v.compositionId ?? `${baseId}-${idToken}`;
    const publishName =
      v.publishName ??
      resolvePublishStem({ slug, publish }, cleanKey);
    return {
      key: cleanKey,
      label: v.label ?? v.key,
      compositionId,
      publishName,
      props: v.props,
    };
  });
}
