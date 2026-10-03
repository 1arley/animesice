# Cristal do gacha (Manim)

O Manim gera o cristal facetado e suas órbitas em um loop de 4 segundos,
720 × 720, 30 fps, sem áudio. O `RollStage` reproduz o MP4 durante a invocação
e usa o WebP como fallback se o vídeo falhar ou o autoplay for bloqueado.
A timeline GSAP continua responsável por esperar a API e revelar a carta.
O vídeo não determina o resultado nem bloqueia a revelação.

Para regenerar os dois assets em `public/gacha/`, a partir da raiz do projeto:

```sh
python3 -m venv /tmp/animesice-manim-venv
/tmp/animesice-manim-venv/bin/pip install 'manim==0.20.1'
/tmp/animesice-manim-venv/bin/python scripts/manim/gacha_crystal.py
```

Pré-requisitos locais: Python compatível com Manim, FFmpeg com libx264 e,
para compilar dependências nativas quando necessário, Cairo, Pango e pkg-config.
Não usa LaTeX. Python e Manim não são necessários no deploy do Next.js:
os arquivos gerados são versionados como assets estáticos.

Desktop e mobile usam a mesma animação. A preferência explícita do sistema
por movimento reduzido evita carregar o vídeo. Pular encerra a reprodução
mesmo enquanto a API ainda está respondendo; falhas de vídeo preservam o
fallback estático e a revelação normal.
