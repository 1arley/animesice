# AnimesIce 2D Art & Cosmetic Toolkit (`tools/`)

Framework independente versionado dentro do repositório frontend (`animesice/tools/`) para criação programática e escalável de versos (`BACK`), molduras (`FRAME`), destaques (`HIGHLIGHT`), skins (`SKIN`), banners (`BANNER`) e texturas 2D, completamente isolado do bundle de runtime do Next.js (`package.json`, `tsconfig.json`, `eslint.config.mjs` e `.dockerignore` mantêm `tools/` fora da aplicação em produção) e compatível com `CosmeticSvg`, `GachaCard` e `animesice-back`.

## Capacidades

- **Arquitetura Escalável por Bundle & Catálogo**: cada cosmético é compilado em `output/<tipo>/<colecao>/<slug>/` com `cosmetic.svg`, `meta.json`, `assets/` e `previews/` co-localizados, indexados automaticamente em `output/catalog.json` com detecção de colisões de `key`.
- **Workspace de Produção (`cosmetics/`) + API `defineCosmetic`**: autores e agentes criam novos itens com `npm run cosmetics:new`, compilam seletivamente por `--type`, `--collection` ou `--slug` e gerenciam centenas de peças sem arquivos soltos.
- **Geometria Vetorial & Booleanas (Paper.js `paper-jsdom`)**: curvas Bézier cúbicas, espelhamento simétrico, fitas com espessura variável, booleanas 2D (`unite`/`subtract`/`intersect`/`exclude`) e amostragem por tangente/normal.
- **Compositor em Camadas (SVG.js + `svgdom`)**: camadas ordenadas, `<defs>`, `<clipPath>`, `<mask>`, `<symbol>/<use>`, incorporação de imagens base64 e verificação automática de contratos.
- **Ornamentos Comerciais**: estrelas de 4 pontas côncavas, crescentes lunares, coroas com vazados, borboletas detalhadas, tranças ao longo de curvas, cantoneiras (`baroque`, `crystal`, `celestial`, `gothic`, `art-deco`) e selos arcanos.
- **Materiais, Texturas & Partículas**: gradientes metálicos multi-stop, filtro granular de folha de ouro (`feTurbulence` + `feSpecularLighting`), filtros de brilho/papel, padrões procedurais, campos estelares Poisson-disk, meteoros e glitter recortado.
- **Animações Vetoriais & GSAP**: presets CSS `@keyframes` seguros para `<img>`, helpers SMIL, baking de curvas de easing GSAP para CSS e contact sheets GSAP frame-a-frame.
- **Shaders WebGL2 & Art Studio Web**: renderer GLSL ES 3.00 headless + renderização de comparação `GachaCard` + servidor web com busca, filtros por tipo/coleção e cópia de SVG/JSON admin.

## Quickstart

A partir da raiz do frontend (`animesice/`):

```bash
# 1. Instalar dependências isoladas de tools/ (apenas autoria offline)
npm run cosmetics:install

# 2. Verificar tipos e suíte de testes
npm run cosmetics:typecheck
npm run cosmetics:test

# 3. Gerar e renderizar os 4 exemplos em output/<tipo>/<colecao>/<slug>/
npm run cosmetics:examples -- --render

# 4. Criar novo cosmético em tools/cosmetics/<tipo>/<colecao>/<slug>.ts
npm run cosmetics:new -- --type BACK --collection natal --slug aurora-boreal --rarity LEGENDARY

# 5. Compilar produção (com filtro opcional) e renderizar previews co-localizados
npm run cosmetics:build -- --slug aurora-boreal --render

# 6. Auditar todo o catálogo e conferir duplicidades de key
npm run cosmetics:audit
npm run cosmetics:catalog

# 7. Abrir Art Studio interativo em http://127.0.0.1:4173
npm run cosmetics:preview
```

> Nota: `npm --prefix tools` executa com diretório corrente em `tools/`, então caminhos relativos como `--root` ou `--dir` resolvem dentro de `tools/`.

## Estrutura

```
tools/
├── cosmetics/         # Cosméticos oficiais de produção (<tipo>/<colecao>/<slug>.ts)
├── examples/          # 4 exemplos demonstrativos usando defineCosmetic()
├── output/            # Artefatos gerados (gitignored)
│   ├── catalog.json   # Inventário mestre (contagens, auditoria, chaves duplicadas)
│   ├── backs/<colecao>/<slug>/
│   │   ├── cosmetic.svg
│   │   ├── meta.json
│   │   ├── assets/    # Texturas intermediárias (shaders WebP/PNG)
│   │   └── previews/  # standalone.png, context.png, frames.png, reduced.png
│   ├── frames/<colecao>/<slug>/...
│   ├── highlights/<colecao>/<slug>/...
│   └── shaders/       # Renders WebGL2 avulsos
├── src/
│   ├── core/          # Contratos AnimesIce (viewBox, bleed, zonas HUD) & auditor
│   ├── generative/    # PRNG determinístico, Simplex/fBm/curl noise, Poisson-disk, flow fields
│   ├── geometry/      # Wrapper Paper.js (Bézier, fitas, booleanas, amostragem)
│   ├── ornaments/     # Estrelas, coroas, crescentes, borboletas, cantoneiras, tranças, selos
│   ├── materials/     # Paleta AnimesIce + presets metálicos multi-stop
│   ├── textures/      # Filtros SVG (folha de ouro, grão, bloom) & <pattern> procedurais
│   ├── particles/     # Starfields, meteoros, glitter, fitas de partículas, faíscas orbitais
│   ├── compositor/    # CosmeticCanvas (SVG.js + svgdom isolado)
│   ├── animation/     # CSS/SMIL presets + GSAP ease-to-keyframes & harness de captura
│   ├── shaders/       # WebGL2 GLSL presets & runner headless + ponte opcional PixiJS v8
│   ├── export/        # paths.ts, catalog.ts, define.ts, SVGO seguro & exportCosmetic
│   └── preview/       # Captura headless Chromium & servidor AnimesIce Art Studio
├── docs/              # Avaliação técnica, guia de autoria para agentes e API reference
├── tests/             # Suíte automatizada (node:test)
├── svg_embed.py       # Utilitário legado preservado para embutir raster em SVG
├── card-template.svg
└── test_svg_embed.py
```

## Documentação

- [Avaliação Técnica & Arquitetura](./docs/ARCHITECTURE-EVALUATION.md)
- [Guia de Autoria para Agentes](./docs/AGENT-AUTHORING-GUIDE.md)
- [Referência de API & CLI](./docs/API-REFERENCE.md)
