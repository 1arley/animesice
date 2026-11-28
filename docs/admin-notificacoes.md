# Central de notificações (admin)

Canal oficial da administração para o sino interno dos jogadores. A tela vive em
`/admin/notificacoes`, dentro do grupo **Comunidade** do painel.

## Fluxo de envio

1. Escolha o público: **Um jogador**, **Grupo** (até 500) ou **Todos**.
2. Busque destinatários por nome, `@usuário`, e-mail ou id. A seleção é
   substituída no modo individual e acumulada no modo grupo.
3. Escolha a categoria — cada uma tem ícone, cor e descrição próprios.
4. Preencha título (3–120), mensagem (até 2.000) e um link interno opcional
   (caminho iniciado por `/`, ex.: `/gacha`).
5. Confira a prévia ao lado, que reproduz o item como aparece no sino.
6. Envie. O modo global abre uma confirmação com a contagem estimada de
   jogadores antes do disparo.

## Integração com o sistema existente

- As notificações são gravadas na tabela `Notification` com `type = SYSTEM`,
  `adminCategory` e `adminNotificationId`. Nenhum sistema paralelo de leitura é
  criado: o sino, a página `/notificacoes` e as preferências continuam sendo os
  mesmos.
- `AdminNotification` guarda a campanha (conteúdo, categoria, público,
  remetente, contagem e chave de idempotência) para o histórico.
- Comunicados oficiais **não** são filtrados pelas preferências pessoais; o
  texto na prévia deixa isso explícito. As preferências seguem valendo para
  atividade social e episódios.
- O sino e a página de notificações exibem o chip/ícone da categoria e o rótulo
  acessível (`sr-only`), sem depender apenas da cor.

## Segurança e performance

- Rotas em `/admin/notification/*` exigem JWT e `ADMIN`/`SUPERADMIN`
  (`RolesGuard`).
- Cada envio grava `AdminAuditLog` (`SEND_NOTIFICATION`) com IP, user agent,
  status e número de destinatários.
- `dedupeKey` é gerada por tentativa de envio e única por administrador; um
  duplo clique ou retry devolve a campanha original em vez de duplicar linhas.
- O envio global exige `confirmGlobal: true` no backend (não só no modal) e
  grava em lotes de 500 usuários por cursor, sem carregar a base inteira em
  memória.
- O histórico consulta as campanhas paginadas; os destinatários de uma campanha
  global são paginados por `adminNotificationId`.

## Contrato resumido

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/admin/notification/recipients` | Busca de jogadores |
| `GET` | `/admin/notification/audience` | Contagem global |
| `POST` | `/admin/notification/send` | Envio idempotente |
| `GET` | `/admin/notification/history` | Histórico filtrável |
| `GET` | `/admin/notification/:id` | Detalhe + destinatários |

Payload de envio:

```json
{
  "audience": "SELECTED",
  "userIds": ["uuid"],
  "category": "THANKS",
  "title": "Obrigado pelo feedback",
  "body": "Sua sugestão entrou no roadmap.",
  "linkUrl": "/feedbacks",
  "dedupeKey": "uuid-v4",
  "confirmGlobal": false
}
```
