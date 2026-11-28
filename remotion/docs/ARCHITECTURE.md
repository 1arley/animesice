# Arquitetura do `animesice-video-studio` (`remotion/`)

Este documento descreve a arquitetura do estúdio programático de vídeo em `animesice/remotion/` e a separação estrita entre **ferramentas offline de vídeo** e **bundle de runtime do Next.js**.

## 1. Isolamento Runtime vs Produção de Vídeos

```
  [ PRODUÇÃO OFFLINE EM remotion/ ]                 [ RUNTIME EM animesice/ ]
  ─────────────────────────────────                 ─────────────────────────
  • remotion + @remotion/bundler/renderer     ──▶   Publica .mp4/.webm + .webp em public/
  • Zod schemas + Remotion Studio                   Servidos como mídia estática leve
  • ffprobe audit + contact sheets                  Reproduzidos via <video muted playsInline>
  0 bytes adicionados ao bundle Next.js!            tsconfig/eslint/Docker excluem remotion/.
```

## 2. Fronteira Node 24 Type-Stripping vs Webpack/Remotion

O CLI e a suíte `node:test` rodam diretamente em **Node 24** (`node src/cli.ts`, `node --test tests/framework.test.ts`) sem passo de transpilação prévia. Isso impõe duas fronteiras limpas:

1. **Barrel Shared (`src/shared.ts`)**: pure `.ts` sem JSX nem APIs `node:*` (`contracts`, `tokens`, `motion`, `timeline`, `defineVideo`). Seguro tanto para Node 24 quanto para Webpack/Remotion.
2. **Barrel Node-safe (`src/index.ts`)**: reexporta `shared.ts` e adiciona `paths`, `audit`, `define`, `catalog`, `pipeline` e `preview/server`. Nunca importa `.tsx` nem React/JSX.
3. **Barrel React/Remotion-safe (`src/react.ts`)**: reexporta `shared.ts` e os primitivos `.tsx`. Nunca importa `node:fs`, `node:child_process` ou `@remotion/renderer`.

Por isso cada vídeo é dividido em:
- `meta.ts` (`.ts` puro com `defineVideo(...)`, lido pelo CLI Node e pelo bundle Webpack);
- `composition.tsx` (React + Remotion JSX + `schema` Zod opcional, empacotado pelo `@remotion/bundler`).

## 3. Registro Estático (`src/registry.generated.ts`)

O bundler Webpack do Remotion exige imports estáticos no root (`src/root.tsx`). Para escalar para dezenas de composições sem editar o root manualmente, `syncRegistryFile()` descobre todos os pares `meta.ts` + `composition.tsx` em `videos/` e `examples/` e regenera `src/registry.generated.ts` de forma determinística.
