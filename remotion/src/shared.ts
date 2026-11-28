import {
  CATEGORY_MAX_BYTES,
  CODEC_PROFILES,
  DEFAULT_INSPECTION_POINTS,
  normalizeSlugToken,
  resolveFormatSpec,
  resolveVariants,
  type ResolvedVideoSpec,
  type VideoDefinitionInput,
} from "./core/contracts.ts";

export * from "./core/contracts.ts";
export * from "./tokens/index.ts";
export * from "./motion/index.ts";
export * from "./timeline/index.ts";

function requireSlug(input: string): string {
  const clean = normalizeSlugToken(input);
  if (!clean) {
    throw new Error(`Invalid slug or collection name: "${input}"`);
  }
  return clean;
}

export function defineVideo<TProps extends Record<string, unknown>>(
  input: VideoDefinitionInput<TProps>,
): ResolvedVideoSpec<TProps> {
  const slug = requireSlug(input.slug);
  const collection = requireSlug(input.collection || "default");
  const formatSpec = resolveFormatSpec(input.format, {
    width: input.width,
    height: input.height,
    fps: input.fps,
  });
  const durationInFrames =
    input.durationInFrames ?? Math.max(1, Math.round((input.durationSec ?? 4) * formatSpec.fps));
  const durationSec = Number((durationInFrames / formatSpec.fps).toFixed(4));
  const codecProfile = input.codecProfile ?? "web-h264";
  const crf = input.crf ?? CODEC_PROFILES[codecProfile].crf;
  const loop = input.loop ?? (input.category === "GACHA" || input.category === "UI");
  const silent = input.silent ?? (input.category === "GACHA" || input.category === "UI");
  const maxBytes = input.maxBytes ?? CATEGORY_MAX_BYTES[input.category];
  const posterAtSec = input.posterAtSec ?? Math.min(0.3, Math.max(0, durationSec / 2));

  return {
    id: input.id,
    category: input.category,
    collection,
    slug,
    title: input.title,
    description: input.description,
    format: formatSpec.format,
    width: formatSpec.width,
    height: formatSpec.height,
    fps: formatSpec.fps,
    durationInFrames,
    durationSec,
    codecProfile,
    crf,
    loop,
    silent,
    maxBytes,
    posterAtSec,
    inspectionPoints: input.inspectionPoints ?? DEFAULT_INSPECTION_POINTS,
    tags: input.tags ?? [],
    defaultProps: input.defaultProps,
    variants: resolveVariants(input.id, slug, input.variants, input.publish),
    registerBaseComposition: input.registerBaseComposition ?? true,
    publish: input.publish,
  };
}
