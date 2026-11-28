# Referência de API & CLI — `animesice-video-studio`

Importação em `meta.ts` (compartilhado entre Node CLI e Remotion Webpack):
```ts
import { defineVideo, ... } from "../../../../src/shared.ts";
```

Importação em scripts Node / CLI:
```ts
import { ... } from "../../../../src/index.ts";
```

Importação em `composition.tsx` (componentes React/Remotion):
```ts
import { ... } from "../../../../src/react.ts";
```

---

## 1. CLI (`npm run cli -- <comando>` em `remotion/` ou `npm run video:*` em `animesice/`)

| Comando em `remotion/` | Atalho em `animesice/` | Descrição | Flags principais |
|---|---|---|---|
| `npm run new -- --slug ...` | `npm run video:new -- --slug ...` | Cria bundle `meta.ts` + `composition.tsx` e sincroniza registro. | `--category`, `--collection`, `--slug`, `--format`, `--fps`, `--duration-sec`, `--frames`, `--id` |
| `npm run sync` | `npm run video:sync` | Regenera `src/registry.generated.ts` a partir de `videos/` e `examples/`. | — |
| `npm run list` | `npm run video:list` | Lista definições registradas, dimensões, variantes e destinos de publicação. | `--category`, `--collection`, `--slug`, `--include-examples` |
| `npm run render` | `npm run video:render` | Renderiza vídeo(s) + poster `.webp` em `output/` (+ auditoria `ffprobe`). | `--slug`, `--category`, `--collection`, `--variant`, `--include-examples`, `--contact-sheet`, `--publish`, `--crf`, `--root` |
| `npm run still` | `npm run video:still` | Renderiza frames PNG avulsos em `previews/`. | `--slug`, `--variant`, `--frames`, `--at`, `--out`, `--contact-sheet` |
| `npm run contact-sheet` | `npm run video:contact-sheet` | Renderiza frames de inspeção e gera `previews/contact-sheet.png`. | `--slug`, `--variant`, `--cols` |
| `npm run publish` | `npm run video:publish` | Copia vídeos/posters já auditados de `output/` para `animesice/public/`. | `--slug`, `--variant`, `--category`, `--collection` |
| `npm run catalog` | `npm run video:catalog` | Reindexa `output/catalog.json` e detecta IDs duplicados. | `--root` |
| `npm run audit` | `npm run video:audit` | Audita definições estáticas + arquivos renderizados via `ffprobe`. | `--slug`, `--root` |
| `npm run studio` | `npm run video:studio` | Sincroniza registro e abre o Remotion Studio visual. | `--port` |
| `npm run preview` | `npm run video:preview` | Sobe o **AnimesIce Video Studio** (`http://127.0.0.1:4174`). | `--dir`, `--port` |

---

## 2. Módulos Exportados

### `core/contracts.ts` & `core/paths.ts`
- `FORMAT_SPECS` (`GACHA_SQUARE`, `CARD_PORTRAIT`, `PROMO_16_9`, `PROMO_720P`, `VERTICAL_9_16`, `SOCIAL_1_1`, `BANNER_WIDE`)
- `CODEC_PROFILES` (`web-h264`, `web-h264-hq`, `web-vp9-alpha`, `web-vp8-alpha`)
- `CATEGORY_MAX_BYTES`, `REMOTION_ID_REGEX`, `DEFAULT_INSPECTION_POINTS`
- `resolveFormatSpec`, `resolveCodecProfile`, `resolvePublishStem`, `resolveVariants`
- `slugify`, `pascalIdFromSlug`, `defaultVariantCompositionId`, `resolveVideoBundlePaths`, `resolvePublishPaths`, `isSafePublicSubdir`, `findVideoBundle`

### `core/audit.ts`
- `auditVideoDefinition(def)` -> `AuditReport`
- `probeVideoFile(videoPath)` -> `VideoProbeMetrics`
- `auditRenderedVideo(videoPath, spec, opts?)` -> `{ report, metrics? }`

### `tokens/index.ts`
- `GACHA_RARITIES`, `GACHA_RARITY_COLORS`, `ANIMESICE_PALETTE`, `RARITY_THEMES`, `TYPOGRAPHY`, `SAFE_MARGINS`

### `motion/index.ts` & `timeline/index.ts`
- `hashSeed`, `createRng(seed)`
- `clamp`, `lerp`, `smoothstep`, `hexToRgb`, `rgbToHex`, `mixHex`, `polarToCartesian`
- `EASING` (`linear`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo`, `easeInOutQuart`, `animesiceSnap`, `glacialOut`, `backOut`)
- `segmentProgress`, `phaseEnvelope`, `loopProgress`, `staggerDelay`, `pulseWave`, `sampleInspectionFrames`
- `createTimeline(fps, scenes)`

### `primitives/` (via `src/react.ts`)
- `Stage`, `Backdrop`, `Starfield`, `EnergyRings`, `FoilSweep`, `CrystalGeometry`, `TitleCard`, `CardFrame`

### `export/` & `preview/` (via `src/index.ts`)
- `defineVideo`, `discoverVideoMetaFiles`, `loadVideoDefinitions`, `findDuplicateCompositionIds`, `syncRegistryFile`, `scaffoldVideoBundle`
- `scanVideoBundles`, `rebuildCatalogIndex`
- `resolveBrowserExecutable`, `ensureRemotionBundle`, `extractPosterWebp`, `buildContactSheet`, `selectRenderTargets`, `renderVideoStills`, `renderVideoBundle`, `publishVideoBundle`
- `startPreviewServer`
