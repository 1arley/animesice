# AnimesIce Video Studio (`remotion/`)

Framework independente versionado dentro do repositório frontend (`animesice/remotion/`) para autoria programática, validação técnica (`ffprobe`) e renderização escalável de vídeos e motion graphics (`GACHA`, `UI`, `PROMO`, `SHOWCASE`), completamente isolado do bundle de runtime do Next.js (`package.json`, `tsconfig.json`, `eslint.config.mjs` e `.dockerignore` mantêm `remotion/` fora da aplicação em produção).

## Capacidades

- **Arquitetura em Bundles + Registro Automático**: cada vídeo vive em `videos/<categoria>/<colecao>/<slug>/` com `meta.ts` (`defineVideo`) e `composition.tsx`, sincronizados automaticamente em `src/registry.generated.ts` via `npm run video:sync`.
- **Contratos & Presets de Formato**: presets explícitos (`GACHA_SQUARE`, `CARD_PORTRAIT`, `PROMO_16_9`, `PROMO_720P`, `VERTICAL_9_16`, `SOCIAL_1_1`, `BANNER_WIDE`) e perfis de codec web (`web-h264`, `web-h264-hq`, `web-vp9-alpha`, `web-vp8-alpha`).
- **Tokens & Primitivos Reutilizáveis**: paleta oficial AnimesIce, temas por raridade sincronizados com `src/lib/gacha-rarity-colors.ts`, matemática determinística de easing/PRNG (`src/motion/`), planejador declarativo `createTimeline()` e primitivos React/SVG (`Stage`, `Backdrop`, `Starfield`, `EnergyRings`, `FoilSweep`, `CrystalGeometry`, `TitleCard`, `CardFrame`).
- **Pipeline Programático & Auditoria `ffprobe`**: renderização via `@remotion/bundler` + `@remotion/renderer`, extração automática de poster `.webp`, contact sheets em grade (`previews/contact-sheet.png`), auditoria de codec/resolução/duração/silêncio/tamanho e publicação segura em `animesice/public/`.
- **Video Studio Web & Remotion Studio**: preview web local com suporte a HTTP `Range`, métricas `ffprobe` e contact sheet (`npm run video:preview`), além do editor visual Remotion Studio (`npm run video:studio`).

## Quickstart

A partir da raiz do frontend (`animesice/`):

```bash
# 1. Instalar dependências isoladas de remotion/ (apenas autoria offline)
npm run video:install

# 2. Sincronizar registro, checar tipos e rodar suíte de testes
npm run video:sync
npm run video:typecheck
npm run video:test

# 3. Listar composições e auditar contratos
npm run video:list -- --include-examples
npm run video:audit

# 4. Criar novo vídeo em remotion/videos/<categoria>/<colecao>/<slug>/
npm run video:new -- --category PROMO --collection eventos --slug natal-2026 --format PROMO_720P

# 5. Renderizar em remotion/output/ com poster WebP + contact-sheet para inspeção visual
npm run video:render -- --slug gacha-crystal --variant comum --contact-sheet

# 6. Publicar assets auditados em public/gacha/ (ou usar atalho legado)
npm run render:gacha

# 7. Abrir Video Studio web (http://127.0.0.1:4174) ou Remotion Studio
npm run video:preview
npm run video:studio
```

## Estrutura

```
remotion/
├── index.tsx                 # Entry point Remotion (registerRoot) + re-exports de compatibilidade
├── remotion.config.ts        # Defaults H.264/yuv420p + extensionAlias para Webpack
├── videos/                   # Composições oficiais (<categoria>/<colecao>/<slug>/{meta.ts,composition.tsx})
├── examples/                 # Exemplos demonstrativos (card-reveal-showcase, seasonal-promo-banner)
├── output/                   # Renders locais, posters, contact-sheets e catalog.json (gitignored)
├── src/
│   ├── core/                 # contracts.ts, paths.ts, audit.ts (estático + ffprobe)
│   ├── tokens/               # Paleta AnimesIce, RARITY_THEMES, tipografia, safe margins
│   ├── motion/               # PRNG determinístico, easings, phaseEnvelope, loopProgress
│   ├── timeline/             # createTimeline() declarativo com suporte a overlap
│   ├── primitives/           # Stage, Backdrop, Starfield, EnergyRings, FoilSweep, CrystalGeometry, TitleCard, CardFrame
│   ├── export/               # defineVideo, syncRegistryFile, catalog.ts, pipeline.ts
│   ├── preview/              # Servidor HTTP AnimesIce Video Studio (Range 206 + path guard)
│   ├── root.tsx              # Registro hierárquico em <Folder> / <Composition>
│   ├── index.ts              # Barrel Node-safe (sem TSX/React)
│   ├── react.ts              # Barrel Browser/Remotion-safe (sem node:fs/renderer)
│   └── cli.ts                # CLI unificada
├── docs/                     # Arquitetura, guia para agentes e referência de API/CLI
└── tests/                    # Suíte automatizada (node:test)
```

## Documentação

- [Arquitetura & Isolamento](./docs/ARCHITECTURE.md)
- [Guia de Autoria para Agentes](./docs/AGENT-AUTHORING-GUIDE.md)
- [Referência de API & CLI](./docs/API-REFERENCE.md)
