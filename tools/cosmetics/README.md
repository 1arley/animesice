# Produção de Cosméticos (`tools/cosmetics/`)

Workspace destinado aos cosméticos oficiais do **AnimesIce**, separados dos exemplos demonstrativos de [`tools/examples/`](../examples).

## Organização recomendada

```
cosmetics/
├── backs/<colecao>/<slug>.ts        # Versos de cartas (BACK)
├── frames/<colecao>/<slug>.ts       # Molduras (FRAME)
├── highlights/<colecao>/<slug>.ts   # Destaques (HIGHLIGHT)
├── skins/<colecao>/<slug>.ts        # Skins vetoriais/híbridas (SKIN)
└── banners/<colecao>/<slug>.ts      # Capas de perfil (BANNER)
```

## Como criar e compilar

A partir de `animesice/`:

```bash
# 1. Criar novo molde a partir de template
npm run cosmetics:new -- --type BACK --collection natal --slug estrela-polar --rarity LEGENDARY --price 2500

# 2. Compilar tudo (ou filtrar por tipo/coleção/slug) e renderizar previews co-localizados
npm run cosmetics:build -- --slug estrela-polar --render

# 3. Auditar catálogo e abrir Art Studio
npm run cosmetics:audit
npm run cosmetics:preview
```
