# Auditoria de UI/UX do mercado

Data: 2026-09-25. Escopo: `/gacha/mercado`, contratos consumidos, modal compartilhado e cenarios Playwright em desktop e mobile. Ambiente local com API simulada; sem alteracoes no backend ou deploy.

## Direcao visual

Preservar os tokens existentes: fundo `#080C12`, superficie `#0E141D`, texto `#F1F5F9`, texto secundario `#94A3B8`, acento `#38E8DA`. Usar as fontes display e sans existentes. A arte e o foco da vitrine; textos alinhados a esquerda, controles fora da imagem, uma coluna no celular e ate tres no desktop. A selecao diaria precede caixas e missoes para reduzir o caminho ate as ofertas.

## Achados tratados

| Local | Problema | Alteracao |
| --- | --- | --- |
| Selecao diaria | Miniaturas de 48 x 64, nomes cortados, raridade ausente | Arte de 256–288 px de altura, nome completo, tipo, raridade, desconto, disponibilidade e explicacao do item |
| Arte de ofertas e anuncios | Impossivel inspecionar; recorte da imagem | Imagem inteira, previa ampla, zoom 2x e rolagem com alternativa por teclado |
| Compra de ofertas e anuncios | Debito imediato sem revisao | Confirmacao com preco, saldo restante e erro dentro do dialogo |
| Anuncios | Compra habilitada mesmo sem saldo | Botao indisponivel e valor faltante explicito |
| Anuncios de cartas | Edicao e desgaste omitidos | Exibicao quando fornecidos pela API |
| Busca | Filtro local aparentava pesquisar todos os resultados | Quantidade carregada explicita e acao para limpar a busca |
| Navegacao | Selecao diaria sem atalho e abaixo das caixas | Atalho proprio e selecao antes das caixas |
| Renovacao | Rotulo BRT com calculo no fuso do navegador | Calculo em America/Sao_Paulo |
| Posicoes | Falhas de API convertidas em listas vazias | Falha apresentada como erro, sem declarar ausencia de anuncios ou ofertas |
| Acessibilidade | Arte sem controle de inspecao | Botoes semanticos, foco visivel, Escape, retorno do foco e controles de pelo menos 44 px |

## Limites e proximas prioridades

- O contrato da oferta de skin fornece nome, imagem e raridade. Nao fornece descricao editorial, personagem/anime associado ou regras de compatibilidade. Enriquecer o contrato antes de exibir essas informacoes.
- Busca e contagem filtrada cobrem apenas anuncios carregados. Busca global, ordenacao por preco e filtros completos precisam de suporte de consulta no backend.
- Caixas ainda ocupam bastante altura no celular; uma futura iteracao pode separar inventario e compras, validada com dados de uso.
- Erros do formulario de anuncio de skin ainda usam o alerta geral da pagina; vale isolar o estado do formulario e oferecer feedback local.
- O modal compartilhado conserva sua implementacao existente de foco. Nao foi feita auditoria com leitor de tela real ou isolamento `inert` do fundo.
- Probabilidades preservam as categorias da API; traducao dos codigos e apresentacao das distribuicoes de qualidade/foil merecem uma revisao de conteudo especifica.

## Verificacao

Cenario automatizado cobre ausencia de overflow horizontal, arte/zoom, Escape e retorno do foco, confirmacao antes da requisicao, saldo restante, erro de compra, preservacao de oferta com erro e cancelamento dispensado. Capturas ficam nos artefatos de Playwright. Validacoes de codigo: TypeScript, ESLint, build Next.js, recovery de chunks e diff sem erros de whitespace.
