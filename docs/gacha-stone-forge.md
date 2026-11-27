# Forja de pedras do Gacha

`forja/forja.js` mantém a timeline, shaders, geometria e ciclo de recursos comuns. `forja/stone-forge-variants.mjs` registra os recursos e ajustes visuais de cada pedra; o motor recebe o `kind` confirmado pelo endpoint de craft.

Os perfis ajustam imagem, energia, atmosfera, luzes, materiais, quantidade e trajetória das partículas, aura, runas e força do impacto. As imagens finais vêm de `public/gacha/` e também alimentam a fragmentação da cena.

## Adicionar uma pedra

1. Disponibilize a imagem final em `public/gacha/`.
2. Registre uma entrada em `STONE_FORGE_VARIANTS` com o asset e os ajustes necessários. O motor aceita `motionStyle` de 0 (espiral), 1 (órbita), 2 (arcos) ou 3 (vórtice); estilos existentes podem ser reutilizados.
3. Acrescente o tipo e seu rótulo ao domínio do inventário e ao tipo `GachaItemKind`; atualize o mapa `expectedImages` no check para fixar a relação entre tipo e asset.
4. Rode `npm run check:stone-forge`; esse check garante os perfis, os emissores, os assets e o fallback para tipos sem cadastro.

O fallback usa a silhueta neutra da Magnetita, iluminação fria e partículas de arco. A animação permanece sob demanda; o backend continua responsável por validar e entregar as pedras.
