# Guia de Autoria de Vídeos para Agentes

Este guia orienta agentes e desenvolvedores a criar novas composições (`GACHA`, `UI`, `PROMO`, `SHOWCASE`) no padrão visual e técnico do **AnimesIce**, sem hardcode frágil de frames nem desvios de codec.

---

## 1. Fluxo Recomendado (Pipeline em 5 Passos)

1. **Crie o bundle oficial pelo scaffold**:
   ```bash
   npm run video:new -- --category PROMO --collection eventos --slug natal-2026 --format PROMO_720P --duration-sec 5
   ```
   Gera `remotion/videos/promos/eventos/natal-2026/{meta.ts,composition.tsx}` e atualiza `src/registry.generated.ts` automaticamente.

2. **Defina contrato e variantes em `meta.ts`**:
   - Escolha um `format` de `FORMAT_SPECS` (`GACHA_SQUARE`, `CARD_PORTRAIT`, `PROMO_16_9`, `PROMO_720P`, `VERTICAL_9_16`, `SOCIAL_1_1`, `BANNER_WIDE`).
   - Use `codecProfile: "web-h264"` para vídeos opacos web (`yuv420p`, `+faststart`) ou `"web-vp9-alpha"` quando precisar de transparência real.
   - Se o vídeo for publicado em `animesice/public/`, configure `publish: { dir: "...", filePattern: "...", includePoster: true }`.

3. **Componha usando `createTimeline()`, `motion/` e `primitives/`**:
   - Nunca use `Math.random()` em componentes Remotion — use `createRng(seed)` de `src/react.ts` (determinístico entre workers).
   - Nunca hardcode offsets de cena soltos — use `createTimeline(fps, [...])` e `<Sequence from={...} durationInFrames={...}>`.
   - Use `loopProgress(frame, durationInFrames)` e `pulseWave(...)` em animações de loop contínuo.
   - Exporte `schema = z.object(...)` em `composition.tsx` para permitir edição visual no `npm run video:studio`.

4. **Renderize e inspecione visualmente**:
   ```bash
   npm run video:render -- --slug natal-2026 --contact-sheet
   ```
   Abra `remotion/output/<categoria>/<colecao>/<slug>/previews/contact-sheet.png` (ou rode `npm run video:preview`) para validar abertura, momento focal e encerramento.

5. **Audite antes de publicar ou entregar**:
   ```bash
   npm run video:typecheck
   npm run video:test
   npm run video:audit
   ```
   Só publique em `public/` (`--publish` ou `npm run video:publish`) após aprovação na auditoria (`ffprobe`).

---

## 2. Regras de Ouro Remotion + AnimesIce

- **Dimensões pares obrigatórias**: codecs `yuv420p` exigem largura e altura múltiplas de 2.
- **Clipes de UI/Gacha silenciosos**: `category: "GACHA" | "UI"` ativa `silent: true` por padrão, garantindo compatibilidade com autoplay (`<video autoPlay loop muted playsInline>`).
- **Fronteira de imports**:
  - Em `meta.ts`, importe **somente** de `src/shared.ts` (módulo puro sem JSX nem APIs `node:*`).
  - Em `composition.tsx`, importe **somente** de `src/react.ts` (ou `remotion` / `zod` / `react`). Nunca importe `node:fs` ou `pipeline.ts` dentro de `composition.tsx`.
- **Sincronia de cores**: mantenha raridades via `RARITY_THEMES` / `GACHA_RARITY_COLORS`, testadas contra `src/lib/gacha-rarity-colors.ts`.
