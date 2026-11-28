# Arquitetura Atual do AnimesIce & Avaliação Técnica de Bibliotecas 2D

Este documento registra o estudo técnico da arquitetura gráfica e de cosméticos do **AnimesIce** e justifica a seleção das bibliotecas integradas na pasta [`tools/`](../README.md), mantendo separação estrita entre **ferramentas de autoria/produção offline** e **dependências de runtime do frontend**.

---

## 1. Arquitetura Atual de Cosméticos e Gráficos

### 1.1 Sistema de Cosméticos (`animesice-back` + `animesice`)

Os cosméticos de cartas vivem no modelo Prisma `GachaCardBack` ([schema.prisma](../../../animesice-back/prisma/schema.prisma)) com três tipos (`GachaCosmeticType`):

| Tipo | Prefixo | `viewBox` obrigatório | `overlayScale` em `GachaCard` | Regras críticas de contrato |
|---|---|---|---|---|
| `BACK` (Capa / Verso) | `BACK_` | `0 0 750 1000` | `100% × 100%` (`object-cover`) | Exige um `<rect>` pintado fora de `<defs>` cobrindo todo o canvas (folga ≤ `0.2%`, proporção `3:4`), auditado por `largestPlate()` e `auditCosmetic()` em [cosmetic-svg.ts](../../src/lib/cosmetic-svg.ts). |
| `FRAME` (Moldura) | `FRAME_` | `-30 -30 810 1060` (`BLEED = 30`) | `108% × 106%` centralizado | `GachaCard` aplica `overflow-hidden`: a faixa de sangria externa é cortada na carta real. Detalhes principais devem morar na borda interna de `0..750 × 0..1000`, preservando o centro aberto e respeitando as zonas dos badges HUD. |
| `HIGHLIGHT` (Destaque) | `DESTAQUE_` | `-60 -60 870 1120` (`BLEED * 2 = 60`) | `116% × 112%` centralizado | Aura externa fora do recorte da face; a face cobre o centro e mantém a moldura visível por cima. Desenhe o brilho na sangria do SVG. `DESTAQUE_CARTA` é legado sem SVG e usa halo dourado de fallback no runtime. |

Outros ativos visuais:
- `GachaSkin`: artes raster 3:4 (`imageUrl` HTTPS) vinculadas a cartas.
- `ProfileBackground`: capas de perfil.

### 1.2 Pipeline de Segurança e Renderização em Runtime

1. **Sanitização no backend** (`sanitizeCardBackSvg` em [gacha.service.ts](../../../animesice-back/src/gacha/gacha.service.ts)):
   - Remove `<script>...</script>`, atributos `on*=`, e protocolos `javascript:`.
   - Exige raiz `<svg...>` e tamanho máximo **`MAX_CARD_BACK_SVG_BYTES = 2 * 1024 * 1024` (2 MB)**.
2. **Isolamento no frontend** ([CosmeticSvg.tsx](../../src/components/gacha/CosmeticSvg.tsx)):
   - Todo SVG cosmético é renderizado dentro de `<img src="data:image/svg+xml;charset=utf-8,...">` — **nunca** injetado diretamente no DOM da página.
   - **Consequência prática 1**: Bibliotecas JavaScript não executam dentro dos SVGs cosméticos em runtime.
   - **Consequência prática 2**: URLs externas (`http://`/`https://` em `<image>`, `@import`, fontes web) não carregam dentro de `<img>` data-URI. Texturas raster/shader precisam ser embarcadas como `data:image/png;base64,...` ou `data:image/webp;base64,...`.
   - **Consequência prática 3**: Animações CSS (`@keyframes` em `<style>`, como já ocorre em [bg-drift-loop.svg](../../public/assets/bg-drift-loop.svg)) e animações SVG SMIL (`<animate>`, `<animateTransform>`) **executam nativamente** dentro do `<img>`, e devem incluir `@media (prefers-reduced-motion: reduce)`.
3. **Zonas HUD de `GachaCard.tsx`** (em coordenadas `750×1000`):
   - Pill de raridade (topo esquerdo): `x: 0..225, y: 0..68`
   - Pill de foil (topo direito): `x: 555..750, y: 0..68`
   - Pill de condição (base direita): `x: 495..750, y: 932..1000`
   - Fragmento bônus (centro esquerdo, prévia de giro): `x: 0..60, y: 465..535`

### 1.3 Stack Gráfico Existente (`animesice/package.json`)

- **3D WebGL**: `three` (`^0.186.1`) para caixas/forja (`common-box`, `tier-boxes`, `forja.js`) e `ogl` (`^1.0.11`) para shaders leves (`Aurora.tsx`) — **100% preservado**.
- **Animação UI / Timelines**: `gsap` (`^3.15.0`) + `@gsap/react`, `motion` (`^13.1.0`), `lenis`, `remotion` (`^4.0.534`), e `animejs` (`^4.5.0` em `devDependencies` usado no script de verificação `check-roll-tier-motifs.mjs`).
- **GPU 2D**: `pixi.js` (`^8.22.0`) já está listado em `animesice/package.json`, porém possui **0 imports ativos** no código atual do frontend (provável preparação para camadas futuras de partículas/revelação).

---

## 2. Avaliação Técnica das Bibliotecas Candidatas

| Biblioteca | Versão / Licença / Tamanho (`dist.unpackedSize`) | Veredito | Papel Arquitetural e Justificativa |
|---|---|---|---|
| **Paper.js** (`paper-jsdom` `0.17.0`) | `0.17.0` · **MIT** · ~9,4 MB | **ADOTAR (apenas `tools/`)** | Melhor motor vetorial 2D em JS para curvas Bézier cúbicas, operações booleanas exatas (`unite`, `subtract`, `intersect`, `exclude`), cálculo de tangentes/normais e fitas com largura variável (`taperedRibbon`). `paper-jsdom` roda headless em Node sem compilação C++ nativa (`canvas`). **0 bytes no bundle do frontend.** |
| **SVG.js** (`@svgdotjs/svg.js` `3.2.8` + `svgdom` `0.1.29`) | `3.2.8` / `0.1.29` · **MIT** · ~2,2 MB + ~0,5 MB | **ADOTAR (apenas `tools/`)** | API fluente e headless para montar a árvore SVG final: `<defs>`, gradientes metálicos, `<filter>`, `<mask>`, `<clipPath>`, `<pattern>`, `<symbol>/<use>`, `<style>` e SMIL. Complementa o Paper.js sem sobreposição: Paper.js resolve geometria matemática -> SVG.js compõe o documento SVG. **0 bytes no bundle do frontend.** |
| **PixiJS** (`pixi.js` `8.23.0` / `^8.22.0` no app) | `8.23.0` · **MIT** · ~80,4 MB | **MANTER no frontend; NÃO duplicar em `tools/`** | Excelente renderizador 2D WebGL2/WebGPU para efeitos interativos em runtime via `import("pixi.js")` lazy-loaded, mas **não gera SVG vetorial** e pesa ~80 MB em `node_modules`. Em `tools/`, implementamos um runner WebGL2 GLSL ES 3.00 sem dependências extras (compatível com PixiJS/Three/OGL) e uma ponte opcional `renderPixiSceneToPng()` que resolve `../node_modules/pixi.js` do frontend quando disponível. |
| **GSAP** (`gsap` `3.15.1` / `^3.15.0` no app) | `3.15.1` · **GSAP Standard "No Charge"** (licença proprietária gratuita para sites/jogos, não-OSI) · ~6,3 MB | **REUTILIZAR / ADOTAR em `tools/`** | Já é o padrão oficial do runtime de `animesice/`. Em `tools/`, é usada para: (1) amostrar curvas de easing reais (`gsap.parseEase`) e "assar" em CSS `@keyframes` puros compatíveis com `<img src="data:image/svg+xml,...">`, e (2) capturar contact sheets determinísticas frame-a-frame via `tl.progress(p)`. Nota de licença: gratuita para uso nos sites/cosméticos do AnimesIce; não redistribuir como ferramenta standalone de terceiros paga. |
| **Two.js** (`two.js` `0.8.24`) | `0.8.24` · **MIT** · ~2,1 MB | **REJEITAR** | Sobreposição total sem vantagem competitiva: não tem booleanas 2D robustas como Paper.js, é mais limitado que SVG.js para `<filter>`/`<mask>`/`<pattern>`/`<style>`/SMIL, e muito inferior a PixiJS/WebGL2 para shaders e milhares de partículas GPU. |
| **p5.js** (`p5` `2.4.0`) | `2.4.0` · **LGPL-2.1** · ~16,4 MB + 13 deps | **REJEITAR** | Atrito de licença copyleft (**LGPL-2.1**), acoplamento pesado a DOM/Canvas global de sketch, e ausência de exportação vetorial SVG nativa. Toda a matemática generativa útil (PRNG determinístico, ruído 2D/fBm, curl flow fields, Poisson-disk sampling, filotaxia) foi implementada de forma pura, tipada e sem dependências em `src/generative/index.ts`. |
| **SVGO** (`svgo` `4.1.0`) *(adicional)* | `4.1.0` · **MIT** · ~1,5 MB | **ADOTAR (apenas `tools/`)** | Otimiza e compacta os SVGs gerados para manter payloads bem abaixo do teto de 2 MB do backend, configurado com preset seguro que desativa `convertShapeToPath` (preservando `<rect>` para `largestPlate()`), IDs, `<title>`, `<defs>`, `<filter>` e `<style>`. |

---

## 3. Separação Runtime vs Produção de Assets (`tools/`)

```
  [ PRODUÇÃO OFFLINE EM tools/ ]                  [ RUNTIME EM animesice/ ]
  ───────────────────────────────                  ───────────────────────
  • paper-jsdom + @svgdotjs/svg.js + svgdom   ──▶  Exporta .svg autocontido (< 2MB)
  • svgo (preset seguro AnimesIce)                 Renderizado inerte em <CosmeticSvg />
  • gsap (ease baking + frame capture)             (<img src="data:image/svg+xml,...">)
  • WebGL2 GLSL shaders (Chromium headless)   ──▶  Embarcado como data:image/png no SVG
                                                   ou .webp/.mp4 em public/gacha/
  0 bytes adicionados ao bundle Next.js!           Three.js, GSAP, OGL e PixiJS intactos.
```
