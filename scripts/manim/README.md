# Animações do gacha

O cristal de invocação é renderizado pelo Remotion. O comando gera o MP4
720 × 720, 30 fps, sem áudio, e extrai o poster WebP usado no fallback.
Three.js anima o cristal no navegador e PixiJS desenha as partículas em um
canvas independente. A timeline GSAP continua responsável por esperar a API
e revelar a carta; o burst aplica a saturação depois de conhecer a raridade.

Para regenerar os assets a partir da raiz do projeto:

```bash
npm run render:gacha
```

O script usa a CLI Remotion 4.0.534 via `npx` e FFmpeg local. Esses utilitários
são necessários só para regenerar os assets, não para servir o app.

`scripts/manim/night_market_intro.py` continua usando Manim para o vídeo de
abertura do Mercado Noturno e não participa do giro do cristal.

Movimento reduzido evita baixar vídeo e bundles WebGL. Pular encerra o giro
mesmo enquanto a API ainda está respondendo; falhas de vídeo preservam o
poster e a revelação normal.
