# Guia de Autoria de Cosméticos para Agentes

Este playbook orienta agentes de desenvolvimento a criar novos cosméticos (`BACK`, `FRAME`, `HIGHLIGHT`), texturas procedurais e animações no padrão visual do **AnimesIce**, sem reimplementar primitivas gráficas e validando visualmente antes da entrega.

---

## 1. Fluxo Recomendado (Pipeline Escalável em 6 Passos)

1. **Crie o arquivo a partir do scaffold oficial** em `animesice/`:
   ```bash
   npm run cosmetics:new -- --type BACK --collection natal --slug estrela-polar --rarity LEGENDARY --price 2800
   ```
   Isso gera `tools/cosmetics/backs/natal/estrela-polar.ts` já estruturado com `defineCosmetic(...)` e garante convenção única de `collection`, `slug` e `key` (`BACK_ESTRELA_POLAR`).
   Consulte as medidas por tipo:
   - `BACK`: `0 0 750 1000` (exige `<rect>` de fundo via `canvas.addBackPlate(...)`).
   - `FRAME`: `-30 -30 810 1060` (`BLEED = 30`; moldura ornamental estática dentro da face. Use `canvas.defineFrameCutoutMask(...)` para manter o centro aberto; detalhes principais ficam em `0..750 × 0..1000`, sem invadir os pills HUD).
   - `HIGHLIGHT`: `-60 -60 870 1120` (`BLEED = 60`; aura luminosa externa, distinta da borda. No runtime, a face da carta cobre o centro e a moldura fica por cima; desenhe a luz visível na sangria — fora de `0..750 × 0..1000` — e mantenha o retrato central livre).
2. **Componha em camadas explícitas dentro de `build(ctx)`**:
   - `backdrop` / `nebula` / `paper-grain`
   - `sky-particles` / `starfield`
   - `ribbons` / `arcane-halo`
   - `hero-emblem` / `ornaments`
   - `border-frame` / `corner-filigree`
   - `specular-sweep`
   - Retorne `canvas` (exportação automática para `output/<tipo>/<colecao>/<slug>/cosmetic.svg` + `meta.json` + atualização de `catalog.json`) ou chame `ctx.export(canvas, opts)` se precisar gravar texturas em `ctx.assetPath(...)` ou contact sheets em `ctx.previewPath(...)`.
3. **Compile e renderize previews co-localizados**:
   ```bash
   npm run cosmetics:build -- --slug estrela-polar --render
   # ou renderize um bundle já existente:
   npm run cosmetics:render -- --slug estrela-polar --context --frames 4 --duration 6 --reduced-motion
   ```
4. **Inspecione visualmente os PNGs gerados dentro de `tools/output/<tipo>/<colecao>/<slug>/previews/`**:
   - `standalone.png`, `context.png`, `frames.png` e `reduced.png`.
   - Confira alinhamento com a janela `ART_PLATE`, ausência de colisão com os pills `RARITY`, `FOIL` e `MINT`, contraste metálico e imobilidade em `reduced.png`.
5. **Audite o catálogo inteiro antes de entregar**:
   ```bash
   npm run cosmetics:audit
   npm run cosmetics:catalog
   ```
   Verifica todos os SVGs em `output/` e falha caso exista qualquer erro de contrato ou colisão de `key` duplicada em `catalog.json`.
6. **Refine até atingir acabamento comercial** e use o botão **"Copiar SVG"** / **"Copiar JSON Admin"** no `npm run cosmetics:preview` para publicar em `/admin/gacha/cosmeticos`.

---

## 2. Regras de Ouro do AnimesIce SVG-in-`<img>`

Como [`CosmeticSvg.tsx`](../../src/components/gacha/CosmeticSvg.tsx) monta todo cosmético via `<img src="data:image/svg+xml;charset=utf-8,...">`:

- **Nunca use JavaScript dentro do SVG**: será bloqueado pelo browser e removido por `sanitizeCardBackSvg()` no backend.
- **Nunca referencie URLs externas (`https://...`) dentro do SVG**: fontes web, imagens externas e `@import` não carregam dentro de `<img>` data-URI. Use `canvas.embedImage(layer, pngPathOrDataUri, bounds)` para embutir em base64.
- **Use `injectPresetAnimations()` ou `bakeGsapEaseToKeyframes()`**: animações CSS `@keyframes` e SMIL (`<animate>`) funcionam a 60fps dentro do `<img>`, e `CosmeticCanvas.addStyle()` injeta automaticamente `@media (prefers-reduced-motion: reduce)`.
- **Nunca ative `convertShapeToPath` no SVGO**: a função `largestPlate()` no frontend e no auditor procura especificamente por um `<rect>` de fundo fora de `<defs>`. `optimizeCosmeticSvg()` já preserva `<rect>` por padrão.
- **Evite filtros que recortem brilhos**: sempre use `defineGlowFilter()` ou defina regiões amplas (`x="-40%" y="-40%" width="180%" height="180%"`).

---

## 3. Receitas Rápidas para Agentes

### 3.1 Verso com Folha de Ouro + Poeira Estelar
- Use `defineMetallicGradient(canvas, "gold", "celestial-gold")` + `defineGoldFoilFilter(canvas, "foil")`.
- Crie silhuetas complexas com `crownCrest()`, `crescentMoon()`, `butterflyMotif()`, `taperedRibbon()`, `braidAlongPath()`.
- Aplique `addGlitterSpecks()` dentro de `defineClipPath()` do emblema para pontinhos cintilantes em folha de ouro.

### 3.2 Moldura com Recorte Chanfrado e Sem Oclusão de HUD
- Crie a máscara `const mask = canvas.defineFrameCutoutMask("aperture", { inset: 18, chamfer: 26 })`.
- Pinte a moldura + padrão `crystalline-facets` + `anim-shimmer-sweep` dentro de `canvas.layer("bezel", { maskUrl: mask })`.
- Coloque emblemas centrais em `x = 375` (topo/base) e cantoneiras compactas (`size <= 88`) para não invadir `x: 0..225, y: 0..68` nem `x: 555..750, y: 0..68`.

### 3.3 HIGHLIGHT — Aura Externa
- Use `viewBox="-60 -60 870 1120"`. O runtime mostra a sangria fora da face e cobre o miolo da carta; portanto, contornos desenhados apenas em `0..750 × 0..1000` desaparecem.
- Mantenha o centro transparente e coloque o brilho principal em `x < 0`, `y < 0`, `x > 750` ou `y > 1000`. A moldura da carta fica por cima da aura.
- Estrutura inicial gerada pelo scaffold `npm run cosmetics:new -- --type HIGHLIGHT` (fonte: `tools/src/export/define.ts`):

  ```ts
  const auraGrad = defineMetallicGradient(canvas, "aura-grad", "prism-holo", 135);
  const auraGlow = defineGlowFilter(canvas, "aura-glow", {
    stdDeviation: 6,
    wideDeviation: 18,
    color: "#38E8DA",
    floodOpacity: 0.6,
    paddingPct: 40,
  });
  canvas.addPath(canvas.layer("outer-aura"), chamferedRectPath(-48, -48, 846, 1096, 38), {
    stroke: auraGrad,
    strokeWidth: 10,
    filterUrl: auraGlow,
  });
  canvas.addPath(canvas.layer("aura-core"), chamferedRectPath(-28, -28, 806, 1056, 26), {
    stroke: "#FCD34D",
    strokeWidth: 2,
  });
  ```

### 3.4 Textura Shader WebGL2 + Vetor Híbrido
- Chame `await renderShaderToPng({ preset: "celestial-nebula", width: 750, height: 1000, time: 1.4 })`.
- Adicione `canvas.addBackPlate("#040818")` (para satisfazer `largestPlate`) e em seguida `canvas.embedImage(bgLayer, shaderRes.dataUri)`.
- Componha geometrias vetoriais nítidas (`arcaneSeal`, `fourPointStar`, `doubleBorderFrame`) por cima da textura GPU.
