# Cristal do gacha (Manim)

O Manim gera o cristal facetado e suas órbitas em um loop de 4 segundos,
720 × 720, 30 fps, sem áudio. O `RollStage` reproduz o MP4 durante a invocação
e usa o WebP como fallback se o vídeo falhar ou o autoplay for bloqueado.
A timeline GSAP continua responsável por esperar a API e revelar a carta.
O vídeo não determina o resultado nem bloqueia a revelação.

O loop é fechado: o cristal completa três voltas inteiras e a curva de
velocidade `breathe` tem valor e derivada iguais em 0 e 1, então a emenda
entre o último e o primeiro frame é invisível. Duas cópias defasadas do
cristal desenham o rastro.

Para regenerar os dois assets em `public/gacha/`, a partir da raiz do projeto:

```sh
uv python install 3.12
uv venv --python 3.12 /tmp/animesice-manim-venv
VIRTUAL_ENV=/tmp/animesice-manim-venv uv pip install 'manim==0.20.1'
/tmp/animesice-manim-venv/bin/python scripts/manim/gacha_crystal.py
```

O Python 3.12 é fixo: o interpretador padrão do sistema é 3.14 e o Manim ainda
não tem wheels para ele. `uv` resolve o interpretador e o venv em um passo.

Pré-requisitos locais: `uv`, FFmpeg com libx264 e Cairo, Pango e pkg-config.
Não usa LaTeX. Python e Manim não são necessários no deploy do Next.js:
os arquivos gerados são versionados como assets estáticos.

Desktop e mobile usam a mesma animação. A preferência explícita do sistema
por movimento reduzido evita carregar o vídeo. Pular encerra a reprodução
mesmo enquanto a API ainda está respondendo; falhas de vídeo preservam o
fallback estático e a revelação normal.
