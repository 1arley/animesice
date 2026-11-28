import { spawnSync } from "node:child_process";
import fs from "node:fs";
import {
  REMOTION_ID_REGEX,
  resolveCodecProfile,
  type ResolvedVideoSpec,
} from "./contracts.ts";
import { isSafePublicSubdir } from "./paths.ts";

export type AuditLevel = "ok" | "aviso" | "erro";

export type AuditIssue = {
  level: AuditLevel;
  rule: string;
  why: string;
  got?: string;
};

export type AuditReport = {
  ok: boolean;
  target: string;
  errors: AuditIssue[];
  warnings: AuditIssue[];
  items: AuditIssue[];
};

export type VideoProbeMetrics = {
  codec: string;
  pixFmt: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  bitRate: number;
  byteLength: number;
  hasAudio: boolean;
};

export function auditVideoDefinition(def: ResolvedVideoSpec): AuditReport {
  const items: AuditIssue[] = [];

  // 1. Valid base Remotion composition ID
  const baseIdValid = REMOTION_ID_REGEX.test(def.id);
  items.push({
    level: baseIdValid ? "ok" : "erro",
    rule: "ID Remotion válido",
    why: baseIdValid
      ? `ID "${def.id}" segue o padrão [a-zA-Z0-9-]+.`
      : `ID "${def.id}" inválido: o Remotion aceita apenas letras, números e hífens.`,
    got: def.id,
  });

  // 2. Even integer dimensions & positive frame rate / duration
  const dimsEven =
    Number.isInteger(def.width) &&
    Number.isInteger(def.height) &&
    def.width > 0 &&
    def.height > 0 &&
    def.width % 2 === 0 &&
    def.height % 2 === 0;
  items.push({
    level: dimsEven ? "ok" : "erro",
    rule: "Dimensões pares e positivas (yuv420p)",
    why: dimsEven
      ? `${def.width}x${def.height} compatível com yuv420p/H.264.`
      : `Dimensões ${def.width}x${def.height} inválidas: H.264 yuv420p exige inteiros positivos e pares.`,
    got: `${def.width}x${def.height}`,
  });

  const fpsOk = Number.isInteger(def.fps) && def.fps > 0;
  const standardFps = def.fps === 24 || def.fps === 30 || def.fps === 60;
  items.push({
    level: !fpsOk ? "erro" : standardFps ? "ok" : "aviso",
    rule: "Taxa de quadros (fps)",
    why: !fpsOk
      ? "fps precisa ser um inteiro positivo."
      : standardFps
        ? `${def.fps} fps padrão web.`
        : `${def.fps} fps não-padrão; prefira 24, 30 ou 60 fps.`,
    got: `${def.fps}`,
  });

  const durOk = Number.isInteger(def.durationInFrames) && def.durationInFrames > 0;
  items.push({
    level: durOk ? "ok" : "erro",
    rule: "Duração positiva",
    why: durOk
      ? `${def.durationInFrames} frames (${def.durationSec.toFixed(2)}s).`
      : "durationInFrames precisa ser maior que zero.",
    got: `${def.durationInFrames}`,
  });

  // 3. Poster timestamp bounds
  const posterOk = def.posterAtSec >= 0 && def.posterAtSec <= def.durationSec;
  items.push({
    level: posterOk ? "ok" : "erro",
    rule: "Timestamp do poster dentro da duração",
    why: posterOk
      ? `Poster extraído em ${def.posterAtSec.toFixed(2)}s.`
      : `posterAtSec (${def.posterAtSec}s) excede a duração total (${def.durationSec.toFixed(2)}s).`,
    got: `${def.posterAtSec}s`,
  });

  // 4. Variant keys and composition IDs uniqueness
  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();
  if (def.registerBaseComposition) seenIds.add(def.id);
  let variantErr: string | undefined;

  for (const v of def.variants) {
    if (!REMOTION_ID_REGEX.test(v.compositionId)) {
      variantErr = `Variante "${v.key}" possui ID inválido: "${v.compositionId}"`;
      break;
    }
    if (seenKeys.has(v.key)) {
      variantErr = `Chave de variante duplicada: "${v.key}"`;
      break;
    }
    if (seenIds.has(v.compositionId)) {
      variantErr = `Composition ID duplicado: "${v.compositionId}"`;
      break;
    }
    seenKeys.add(v.key);
    seenIds.add(v.compositionId);
  }
  items.push({
    level: variantErr ? "erro" : "ok",
    rule: "Variantes e IDs únicos",
    why: variantErr ?? `${def.variants.length} variante(s) válidas sem colisões.`,
    got: variantErr,
  });

  // 5. Publish directory safety
  if (def.publish) {
    const safePub = isSafePublicSubdir(def.publish.dir);
    items.push({
      level: safePub ? "ok" : "erro",
      rule: "Destino publish seguro dentro de public/",
      why: safePub
        ? `Publica em public/${def.publish.dir}.`
        : `Diretório publish "${def.publish.dir}" escapa de public/ ou é absoluto.`,
      got: def.publish.dir,
    });
  }

  const errors = items.filter((i) => i.level === "erro");
  const warnings = items.filter((i) => i.level === "aviso");
  return {
    ok: errors.length === 0,
    target: def.id,
    errors,
    warnings,
    items,
  };
}

function parseFrameRate(raw: string | undefined): number {
  if (!raw) return 0;
  const parts = raw.split("/");
  if (parts.length === 2) {
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
      return Number((num / den).toFixed(3));
    }
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function probeVideoFile(videoPath: string): VideoProbeMetrics {
  const stat = fs.statSync(videoPath);
  const res = spawnSync(
    "ffprobe",
    [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      videoPath,
    ],
    { encoding: "utf8" },
  );

  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`ffprobe failed for ${videoPath}: ${res.stderr || `exit ${res.status}`}`);
  }

  const parsed = JSON.parse(res.stdout) as {
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      pix_fmt?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      r_frame_rate?: string;
    }>;
    format?: {
      duration?: string;
      bit_rate?: string;
    };
  };

  const streams = parsed.streams ?? [];
  const videoStream = streams.find((s) => s.codec_type === "video");
  if (!videoStream) {
    throw new Error(`No video stream found in ${videoPath}`);
  }
  const hasAudio = streams.some((s) => s.codec_type === "audio");

  return {
    codec: videoStream.codec_name ?? "unknown",
    pixFmt: videoStream.pix_fmt ?? "unknown",
    width: Number(videoStream.width ?? 0),
    height: Number(videoStream.height ?? 0),
    fps: parseFrameRate(videoStream.avg_frame_rate ?? videoStream.r_frame_rate),
    durationSec: Number(parsed.format?.duration ?? 0),
    bitRate: Number(parsed.format?.bit_rate ?? 0),
    byteLength: stat.size,
    hasAudio,
  };
}

export function auditRenderedVideo(
  videoPath: string,
  spec: Pick<
    ResolvedVideoSpec,
    "id" | "width" | "height" | "fps" | "durationSec" | "codecProfile" | "silent" | "maxBytes"
  >,
  opts?: { posterPath?: string },
): { report: AuditReport; metrics?: VideoProbeMetrics } {
  const items: AuditIssue[] = [];

  if (!fs.existsSync(videoPath)) {
    items.push({
      level: "erro",
      rule: "Arquivo de vídeo gerado",
      why: `Arquivo não encontrado: ${videoPath}`,
    });
    return {
      report: {
        ok: false,
        target: videoPath,
        errors: items,
        warnings: [],
        items,
      },
    };
  }

  const metrics = probeVideoFile(videoPath);
  const codecSpec = resolveCodecProfile(spec.codecProfile);

  // 1. Codec & pixel format
  const codecOk = metrics.codec === codecSpec.codec;
  items.push({
    level: codecOk ? "ok" : "erro",
    rule: `Codec ${codecSpec.codec}`,
    why: codecOk
      ? `Codec ${metrics.codec} conforme perfil ${spec.codecProfile}.`
      : `Esperado codec ${codecSpec.codec}, obtido ${metrics.codec}.`,
    got: metrics.codec,
  });

  const pixOk =
    metrics.pixFmt === codecSpec.pixelFormat ||
    (codecSpec.pixelFormat === "yuv420p" && metrics.pixFmt === "yuvj420p");
  items.push({
    level: pixOk ? "ok" : "erro",
    rule: `Pixel format ${codecSpec.pixelFormat}`,
    why: pixOk
      ? `Formato ${metrics.pixFmt} compatível com navegadores.`
      : `Esperado ${codecSpec.pixelFormat}, obtido ${metrics.pixFmt}.`,
    got: metrics.pixFmt,
  });

  // 2. Exact resolution & FPS
  const resOk = metrics.width === spec.width && metrics.height === spec.height;
  items.push({
    level: resOk ? "ok" : "erro",
    rule: `Resolução ${spec.width}x${spec.height}`,
    why: resOk
      ? `Resolução exata ${metrics.width}x${metrics.height}.`
      : `Esperado ${spec.width}x${spec.height}, obtido ${metrics.width}x${metrics.height}.`,
    got: `${metrics.width}x${metrics.height}`,
  });

  const fpsOk = Math.abs(metrics.fps - spec.fps) <= 0.5;
  items.push({
    level: fpsOk ? "ok" : "aviso",
    rule: `FPS ${spec.fps}`,
    why: fpsOk ? `${metrics.fps} fps.` : `FPS divergente (${metrics.fps} vs ${spec.fps}).`,
    got: `${metrics.fps}`,
  });

  // 3. Duration tolerance (0.12s)
  const durDiff = Math.abs(metrics.durationSec - spec.durationSec);
  const durOk = durDiff <= 0.12;
  items.push({
    level: durOk ? "ok" : "erro",
    rule: `Duração ~${spec.durationSec.toFixed(2)}s`,
    why: durOk
      ? `Duração real ${metrics.durationSec.toFixed(2)}s.`
      : `Duração real ${metrics.durationSec.toFixed(2)}s diverge de ${spec.durationSec.toFixed(2)}s.`,
    got: `${metrics.durationSec.toFixed(2)}s`,
  });

  // 4. Size budget
  const sizeOk = metrics.byteLength > 0 && metrics.byteLength <= spec.maxBytes;
  items.push({
    level: sizeOk ? "ok" : "aviso",
    rule: `Tamanho <= ${(spec.maxBytes / (1024 * 1024)).toFixed(1)} MB`,
    why: sizeOk
      ? `${(metrics.byteLength / 1024).toFixed(1)} KB dentro do orçamento web.`
      : `${(metrics.byteLength / 1024).toFixed(1)} KB excede o orçamento recomendado.`,
    got: `${(metrics.byteLength / 1024).toFixed(1)} KB`,
  });

  // 5. Silent constraint
  if (spec.silent) {
    items.push({
      level: !metrics.hasAudio ? "ok" : "erro",
      rule: "Sem faixa de áudio",
      why: !metrics.hasAudio
        ? "Vídeo silencioso ideal para autoplay em <video muted>."
        : "Faixa de áudio inesperada em clip silencioso de UI/Gacha.",
    });
  }

  // 6. Optional WebP poster check
  if (opts?.posterPath) {
    const posterOk = fs.existsSync(opts.posterPath) && fs.statSync(opts.posterPath).size > 0;
    items.push({
      level: posterOk ? "ok" : "erro",
      rule: "Poster WebP de fallback",
      why: posterOk
        ? `Poster válido (${(fs.statSync(opts.posterPath).size / 1024).toFixed(1)} KB).`
        : `Poster ausente ou vazio em ${opts.posterPath}.`,
    });
  }

  const errors = items.filter((i) => i.level === "erro");
  const warnings = items.filter((i) => i.level === "aviso");
  return {
    metrics,
    report: {
      ok: errors.length === 0,
      target: videoPath,
      errors,
      warnings,
      items,
    },
  };
}
