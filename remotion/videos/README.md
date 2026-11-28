# Produção de Vídeos (`remotion/videos/`)

Workspace destinado às composições oficiais do **AnimesIce**, separadas dos exemplos demonstrativos de [`remotion/examples/`](../examples).

## Organização recomendada

```
videos/
├── gacha/<colecao>/<slug>/
│   ├── meta.ts            # defineVideo(...) — contrato, variantes e publish
│   └── composition.tsx    # Componente Remotion + schema Zod opcional
├── ui/<colecao>/<slug>/
├── promos/<colecao>/<slug>/
└── showcases/<colecao>/<slug>/
```

## Como criar, renderizar e publicar

A partir de `animesice/`:

```bash
# 1. Criar novo bundle (meta.ts + composition.tsx + sync automático)
npm run video:new -- --category PROMO --collection eventos --slug natal-2026 --format PROMO_720P

# 2. Renderizar em output/ com poster WebP + contact-sheet para inspeção visual
npm run video:render -- --slug natal-2026 --contact-sheet

# 3. Auditar com ffprobe e abrir o Video Studio local
npm run video:audit
npm run video:preview
```
