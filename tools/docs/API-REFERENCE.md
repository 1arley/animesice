# Referência de API & CLI — `animesice-art-tools`

Importação unificada para scripts e agentes:
```ts
import { ... } from "../src/index.ts";
```

---

## 1. CLI (`npm run cli -- <comando>` dentro de `tools/` ou `npm run cosmetics:*` em `animesice/`)

| Comando em `tools/` | Atalho em `animesice/` | Descrição | Flags principais |
|---|---|---|---|
| `npm run new -- --slug ...` | `npm run cosmetics:new -- --slug ...` | Cria molde `defineCosmetic` em `cosmetics/<tipo>/<colecao>/<slug>.ts`. | `--type`, `--collection`, `--slug`, `--name`, `--rarity`, `--price` |
| `npm run build` | `npm run cosmetics:build` | Compila módulos de `cosmetics/` para `output/<tipo>/<colecao>/<slug>/` e atualiza `catalog.json`. | `--type`, `--collection`, `--slug`, `--key`, `--include-examples`, `--render` |
| `npm run build:examples` | `npm run cosmetics:examples` | Compila todos os exemplos de `examples/` em estrutura escalável + `catalog.json`. | `--render`, `--type`, `--collection`, `--slug` |
| `npm run catalog` | `npm run cosmetics:catalog` | Reindexa `output/catalog.json` e detecta `key` duplicada. | `--root <dir>` |
| `npm run audit` | `npm run cosmetics:audit` | Audita um SVG, um bundle (`--slug`) ou **todo o catálogo** se sem argumentos. | `<file.svg>`, `--slug <slug\|key>`, `--type` |
| `npm run render` | `npm run cosmetics:render` | Renderiza PNGs co-localizados em `<bundle>/previews/` (`standalone.png`, `context.png`, `frames.png`, `reduced.png`) ou em diretório custom. | `<file.svg>`, `--slug <slug\|key>`, `--all`, `--context`, `--frames N`, `--duration <seg>`, `--reduced-motion`, `--video`, `--out <dir>` |
| `npm run shader -- <preset>` | `npm run cosmetics:shader -- <preset>` | Renderiza textura GLSL WebGL2 headless em `output/shaders/<preset>.png`. | `--out <png>`, `--width N`, `--height N`, `--time <seg>`, `--seed N` |
| `npm run preview` | `npm run cosmetics:preview` | Sobe o **AnimesIce Art Studio** (`http://127.0.0.1:4173`) com busca, filtros, auditoria e cópia SVG/JSON. | `--dir <pasta>`, `--port <porta>` |

---

## 2. Módulos Exportados

### `core/contracts.ts` & `core/audit.ts`
- `CARD_ART`, `BLEED`, `MAX_SVG_BYTES`, `ASSET_SPECS`, `TYPE_VIEWBOX`, `CARD_SAFE_ZONES`, `ART_PLATE`
- `parseViewBox(svg, fallback?)`, `artWindow(vb)`, `overlayScale(vb)`, `svgDataUrl(svg)`, `largestPlate(svg)`, `cosmeticTypeOf(key)`
- `auditCosmeticSvg(svg, type)` -> `{ ok, byteLength, errors, warnings, items }`

### `generative/index.ts`
- `createRng(seed)`, `hashSeed(seed)`
- `createNoise2D(seed)` -> `{ noise2D, fbm2D, curl2D }`
- `poissonDiskSample(bounds, minDist, seedOrRng, opts?)`
- `generateFlowFieldPaths(bounds, opts)`
- `phyllotaxisPoints(cx, cy, count, spread, angleDeg?)`
- `lerp`, `clamp`, `smoothstep`, `polarToCartesian`, `hexToRgb`, `rgbToHex`, `mixHex`

### `geometry/index.ts` (Paper.js `paper-jsdom` headless)
- `withGeometryScope(fn, size?)`
- `bezierPath(anchors, opts?)`, `smoothPath(points, opts?)`, `symmetricPath(halfPoints, axisX, opts?)`
- `taperedRibbon(centerline, widthOrFn, opts?)`
- `booleanOp(op, pathA, pathB, opts?)`, `booleanReduce(op, paths, opts?)` (`"unite" | "subtract" | "intersect" | "exclude"`)
- `samplePath(pathData, count)`, `pathLength(pathData)`, `pathBounds(pathData)`, `transformPath(pathData, opts)`
- `rectPath`, `chamferedRectPath`, `circlePath`, `ellipsePath`, `polygonPath`, `roundPathData`

### `ornaments/index.ts`
- `fourPointStar(cx, cy, outerR, innerR?, opts?)`, `multiPointStar(cx, cy, points, outerR, innerR, opts?)`
- `crescentMoon(cx, cy, outerR, opts?)`
- `doubleBorderFrame(bounds, opts?)`
- `cornerFiligree(size, style)` (`"baroque" | "crystal" | "celestial" | "gothic" | "art-deco"`) + `stampFourCorners(bounds, corner, inset?)`
- `crownCrest(cx, cy, width, height, opts?)`
- `butterflyMotif(cx, cy, scale?, opts?)` (`variant: "profile" | "symmetric"`)
- `shootingStar(x1, y1, x2, y2, opts?)`
- `braidAlongPath(pathData, opts)`
- `arcaneSeal(cx, cy, radius, opts?)`

### `materials/index.ts`
- `ANIMESICE_PALETTE`, `THEME_PALETTES`, `METALLIC_PRESETS`
- `defineLinearGradient(target, id, stops, angleDeg?, opts?)`
- `defineMetallicGradient(target, id, preset, angleDeg?, opts?)`
- `defineRadialGlow(target, id, color, opts?)`
- `defineSheenGradient(target, id, color?, opts?)`

### `textures/index.ts`
- Filtros SVG: `definePaperGrainFilter`, `defineGoldFoilFilter`, `defineGlowFilter`, `defineSoftShadowFilter`
- Padrões SVG: `definePattern(target, id, preset, opts?)` (`"stardust" | "hex-grid" | "art-deco-fan" | "crystalline-facets" | "diagonal-foil-hatch" | "halftone-dots"`)

### `particles/index.ts`
- `addStarfield(canvas, layer, bounds, opts)`
- `addShootingStars(layer, bounds, opts)`
- `addGlitterSpecks(layer, bounds, opts)`
- `addParticleRibbon(layer, pathData, opts)`
- `addOrbitalSparks(layer, cx, cy, rx, ry, opts)`

### `compositor/index.ts`
- `createCosmeticCanvas({ type, title, desc? })` -> `CosmeticCanvas`:
  - `.layer(name, opts?)`, `.defs()`, `.addStyle(css)`
  - `.addBackPlate(fill, opts?)`, `.defineArtWindowClip(id?, opts?)`, `.defineFrameCutoutMask(id?, opts?)`
  - `.defineClipPath`, `.defineMask`, `.defineSymbol`, `.useSymbol`, `.embedImage`
  - `.addPath`, `.addPolygon`, `.addText`, `.toSvg()`

### `animation/`
- `injectPresetAnimations(canvas, presets)` (`"twinkle" | "twinkle-alt" | "float" | "shimmer-sweep" | "pulse-glow" | "orbit-spin" | "meteor-streak" | "dash-flow" | "hue-prism"`)
- `addCssKeyframes(...)`, `addSmilAnimate(el, attrs)`, `addSmilTransform(el, attrs)`
- `bakeGsapEaseToKeyframes(...)`, `buildGsapPreviewHtml(...)`

### `shaders/`
- `SHADER_PRESETS` (`"celestial-nebula" | "holo-foil" | "ice-crystal-caustics" | "gold-dust-swirl"`)
- `renderShaderToPng(opts)`, `renderShaderLoop(opts)`, `renderPixiSceneToPng(opts)`

### `export/` & `preview/`
- `paths.ts`: `TYPE_DIR_MAP`, `slugify`, `defaultKeyFor`, `resolveCosmeticPaths`, `resolveShaderOutputPath`, `findCosmeticBundle`
- `catalog.ts`: `scanCosmeticBundles`, `rebuildCatalogIndex`
- `define.ts`: `defineCosmetic`, `runCosmeticDefinition`, `discoverCosmeticFiles`, `loadCosmeticDefinitions`, `scaffoldCosmeticFile`
- `optimizeCosmeticSvg(svg, opts?)`, `exportCosmetic(opts)`
- `renderSvgInspection(opts)`, `renderGsapContactSheet(opts)`, `startPreviewServer(opts?)`
