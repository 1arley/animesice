# GACHA_TRADING_PLAN.md — Fase 2: Troca de cartas

Escopo mínimo viável de trading para o gacha. Ancorado no modelo atual
(`UserCard` non-unique com `condition`/`foil`/`edition`/`value`, doador é
derivado do token — nunca do body).

## Decisões travadas (defaults)

- **Troca 1:1 peer-to-peer** entre dois usuários. Sem marketplace, leilão ou
  preço monetizado.
- **Escrow de confirmação atomizada**: A oferece carta X por carta Y do B;
  B aceita e a troca é aplicada numa transação única (swap de `userId`).
  Ninguém fica sem carta se algo falhar no meio.
- **Expiração**: trade não confirmado em 48h vira `EXPIRED` (lazy: expira no
  primeiro acesso/aceite, sem job).

## Definição de "precisa"

### Banco (`prisma/schema.prisma`)

```prisma
enum GachaTradeStatus {
  PENDING   // proposta, aguardando o receptor
  ACCEPTED  // receptor aceitou, transação está aplicando (unused/transient)
  COMPLETED
  CANCELLED // iniciador desistiu
  EXPIRED
}

model GachaTrade {
  id                  String            @id @default(uuid())
  offeredUserId       String
  offeredUserCardId   String
  requestedUserId     String
  requestedUserCardId String
  status              GachaTradeStatus @default(PENDING)
  expiresAt           DateTime         @db.Timestamptz(6)
  createdAt           DateTime         @default(now()) @db.Timestamptz(6)
  completedAt         DateTime?        @db.Timestamptz(6)

  offeredUserCard     UserCard @relation("TradeOffered", fields: [offeredUserCardId], references: [id])
  requestedUserCard   UserCard @relation("TradeRequested", fields: [requestedUserCardId], references: [id])

  @@index([offeredUserId, status])
  @@index([requestedUserId, status])
}

// Cada UserCard participa de no máximo UMA trade ativa:
partial @@index([offeredUserCardId], where: "status IN ('PENDING')")
partial @@index([requestedUserCardId], where: "status IN ('PENDING')")
```

`UserCard` ganha as relations nomeadas (`TradeOffered`/`TradeRequested`).

### API (backend, `GachaController` + `gacha.service`)

Autenticados com `JwtAuthGuard`; todos os donos derivados do token, nunca do payload.

| Método | Rota | Ação |
|---|---|---|
| POST | `/gacha/trades` | `{ offeredUserCardId, requestedUserCardId }`. Valida: cartas existem, doadora é de `req.user`, alvo é de outro usuário, ambas sem trade PENDING. Cria com `expiresAt=+48h`. |
| GET | `/gacha/trades/mine` | Trades onde sou dono de um dos lados (PENDING/ACTIVE). |
| POST | `/gacha/trades/:id/accept` | Receptor confirma. Na **1 transação Prisma**: revalida donos atuais + status (`PENDING`, não expirado), limpa `featuredBy` se a carta sair da featured de algum dono, swap `userId` das duas `UserCard`, seta `COMPLETED`. |
| POST | `/gacha/trades/:id/cancel` | Iniciador desiste (status `PENDING` → `CANCELLED`). |
| POST | `/gacha/trades/:id/decline` | Receptor recusa (→ `CANCELLED`). |

Regras invariantes (aplicadas na camada que escreve, com constraint no banco
como defesa final):

1. A carta oferecida pertence ao iniciador e a pedida ao receptor — no aceite,
   revalidado dentro da transação (alvo moveu? falha com 409).
2. Uma carta não pode participar de 2 trades PENDING ativos (partial unique index).
3. Limite baixo de trades ativos por usuário (default: 3 por lado) — evita spam.
4. Troca preserva `condition/foil/edition/value` (transferência de ownership,
   não de identidade).
5. `featuredBy` do antigo dono é limpo quando a carta trocada é a destacada dele.

### Frontend (`/gacha/trades` dentro de `app/(app)/gacha/`)

- Página **Minhas trocas**: propostas enviadas (com estado + cancelar) e
  recebidas (aceitar/recusar), cada linha mostrando as 2 cartas (GachaCard).
- Badge no nav do gacha ("Trocas") com contagem de propostas PENDING recebidas.
- Sem UI de montar proposta via coleção por enquanto — a montagem fica na
  página de trocas com seletor simples (outro usuário → coleção pública →
  escolher as duas cartas). Implementado em `/gacha/trades`.

## Decisões tomadas (implementation, defaults aprovados)

1. **Restrição de valor**: livre 1:1, qualquer raridade — permite presente
   (lenda por comum). Bloquear por faixa de `value` depois, se virar moeda.
2. **Montagem da proposta**: seletor simples (duas listas `<select>`), sem
   card-picking fino. Quem recebe só aceita/recusa.
3. **Badge de pendências no nav**: NÃO implementado — exigiria poll em todo
   load de página. Ficou só o link "Trocas" no hero do gacha.

## Não-escopo (deferido, explícito)

- Leilão/ordem de livro (marketplace de ofertas).
- Troca com moeda interna (cristais/coins).
- Trade por itens vários (só cartas 1:1).
- Journals/feed de trocas na comunidade.
- Jobs de expiração (lazy é suficiente para as cartas voltarem ao status livre).

## Critério de aceite (e2e, no padrão existente)

- Fluxo feliz: A cria → B vê em "recebidas" → B aceita → ambas as cartas
  trocam de dono (coleção) e o trade some das listas ativas.
- Regressões: aceitar trade expirado → 409; iniciador tenta oferecer carta já
  em trade ativo → 409; deleção/cancelamento deixa cartas livres de novo.
- Segurança: payload com outro `userId` é ignorado (dono sai do token).