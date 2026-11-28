# Extrator de Foil (`EXTRATOR_FOIL`) — Frontend

## Visão geral

O **Extrator de Foil** permite ao jogador adquirir extratores no inventário, selecionar qualquer carta com foil da sua coleção e remover o foil preservando a carta inteira (raridade, condition, edição e skin aplicada), recebendo fragmentos da gema correspondente ao foil extraído.

## Fluxo e pontos de integração

1. **Compra e saldo no Inventário (`/gacha/inventario`)**:
   - `GachaInventory` exibe o saldo `Extratores de foil` (`inventory.foilExtractors`) no resumo do topo e uma seção dedicada (`#extrator-foil`) espelhando o padrão da `Proteção de reroll`.
   - Utiliza `api.gachaEconomyBuyItem` com `kind: "EXTRATOR_FOIL"` e `operationId` persistido via `getOrCreateOperationId` (`buy:EXTRATOR_FOIL:<qty>`), permitindo retentativa segura em caso de falha transitória.
   - Quando o usuário possui ao menos 1 extrator, exibe atalho direto para `/gacha/inventario/fragmentos#extrair-foil`.

2. **Oficina na página de Fragmentos (`/gacha/inventario/fragmentos#extrair-foil`)**:
   - `GachaFragments` renderiza o componente irmão `GachaFoilExtractor` abaixo da seção `#foil`, mantendo `#foil` exclusivo para fragmentos/gemas de foil e evitando conflito com cartas `NORMAL`.
   - `GachaFoilExtractor` consulta `api.gachaCollection(..., "EXTRATOR_FOIL")` (filtrando `card.foil !== "NORMAL"`), permite busca e paginação por botões acessíveis (`aria-pressed`), busca a prévia autoritativa via `api.gachaEconomyFoilExtractPreview(cardId)` após seleção e abre `FoilExtractDialog`.
   - Após a extração, `FoilExtractFeedback` exibe a carta intacta já em `NORMAL` com a animação `.foil-extract-visual` (respeitando `@media (prefers-reduced-motion: reduce)` em `app/globals.css`), a arte da gema correspondente (`getFoilDisplayMeta`), a quantidade creditada (`+N <itemName>`) e o saldo restante de extratores, sincronizando inventário e coleção em seguida.

3. **Ação direta no Preview da Carta (`/gacha/cartas` e `/gacha`)**:
   - `CardPreview` exibe o botão `"Extrair foil"` exclusivamente quando `onExtractFoil` está disponível e `pull.foil !== "NORMAL"`.
   - Em `app/(app)/gacha/cartas/page.tsx`, confirmar no `FoilExtractDialog` atualiza a carta in-place na grade via `applyFoilExtractionToPull` (preservando edição, condition e skin na coleção), mostra `FoilExtractFeedback` com link para `/gacha/inventario/fragmentos` e recarrega `api.gachaEconomyInventory()`.
   - Em `app/(app)/gacha/page.tsx`, a extração atualiza o card em `recent`, `result` e `claimResult`, recarrega inventário e sincroniza o estado da sala.

## Regras de UI e segurança implementadas

- Todos os cálculos de valor projetado, bloqueios patrimoniais (`blockedReason`) e fragmentos obtidos vêm exclusivamente do endpoint de prévia autoritativa do backend (`GET /gacha/economy/gems/extract/preview/:userCardId`), nunca estimados localmente para confirmação.
- Quando `preview.canExtract` é falso (sem extratores, troca pendente, mercado ou destaque), `FoilExtractDialog` exibe o motivo devolvido pelo backend e mantém o botão de confirmação desabilitado.
- Chaves `foil-extract:<userCardId>` e `buy:EXTRATOR_FOIL:<qty>` são reconhecidas em `pendingOperationRoute` (`src/lib/gacha-inventory.ts`) para bloquear operações cruzadas entre `/gacha/inventario` e `/gacha/inventario/fragmentos` enquanto houver tentativa incerta pendente.
