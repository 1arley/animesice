# Frontend handoff: loot-box items and reroll protection

Implement this in `animesice/`, the main app. Do not put it in `animesice-gacha-roll-animation/`.

## Deliverables

- Add `/gacha/inventario` and link it from `src/components/gacha/GachaNav.tsx`.
- Build one reusable inventory component for balances, item actions, and card upgrades.
- Add an opt-in protection choice to the shared reroll confirmation in `src/components/gacha/CardPreview.tsx`. Both callers must pass it through: `app/(app)/gacha/page.tsx` and `app/(app)/gacha/cartas/page.tsx`.

## Backend contract already present

- `GET /gacha/economy` returns the user's inventory and crystal balances.
- `POST /gacha/economy/items/buy`: `{ operationId, kind, quantity? }`.
- `POST /gacha/economy/items/convert`: same shape; `PROTECAO` cannot be converted.
- `POST /gacha/economy/items/craft`: same shape; `PROTECAO` cannot be crafted.
- `POST /gacha/economy/items/use`: `{ operationId, kind, userCardId }`; only the four stones are valid.
- Item endpoints are idempotent by `(userId, operationId)`. Reuse the same UUID and payload after a timeout; a new UUID means a new purchase/use. Never reuse an ID with different values.
- `useItem` returns only `{ userCardId, condition, conditionLabel, value }`; refresh the inventory and affected card/collection after success.
- `POST /gacha/reroll` accepts `{ userCardId, useProtection? }`. Protection is opt-in, consumes one item whenever the request succeeds, and preserves the old card when the rolled integer `cardValue` is not greater. MINT cards must show a textual disabled reason and the API rejects protection before charging.
- Reroll currently has **no operationId/idempotency**. Prevent duplicate submits and do not blindly retry after a timeout; show an uncertain-result message and refresh state before offering another attempt.

Item counters in `GachaInventory`:

| Kind | Fragments | Crafted item / consumable |
| --- | --- | --- |
| `TITANITA` | `titanitaShards` | `titanitaItems` |
| `TITANITA_SOMBRIA` | `titanitaSombriaShards` | `titanitaSombriaItems` |
| `DRACONICA` | `draconicaShards` | `draconicaItems` |
| `SOMBRIA_DRACONICA` | `sombriaDraconicaShards` | `sombriaDraconicaItems` |
| `PROTECAO` | — | `protecao` |

## API gap to resolve before hardcoding UI rules

Item prices, conversion values, recipes, eligibility, condition anchors, and reroll settings come from the published economy snapshot and can be edited in admin. `GET /gacha/economy` currently returns inventory but does not expose those settings. Coordinate a small backend response addition (prefer an `itemConfig` object sourced from the same `currentVersion` snapshot) before implementing eligibility filters, prices, recipe counts, upgrade previews, or reroll cost. Do not duplicate defaults in frontend constants. The backend remains authoritative on every mutation.

Suggested `itemConfig` fields: `item_shop_price`, `item_convert_value`, `item_recipes`, `item_eligibility`, `item_condition_anchor`, `card_floors`, `reroll_cost_pct`, and `reroll_protection_mint_block`.

The current reroll price label in `CardPreview.tsx` is calculated from `pull.value + 15%`, while the backend charges `card_floors[rarity] * reroll_cost_pct`. Replace that estimate with a server-sourced quote/config in the shared component; keep preview and confirmation amounts identical.

## Page behavior and accessibility

- Show fragment, crafted-item, protection, and available-crystal balances.
- Let users buy, convert fragments, and craft using the configured values; disable actions that cannot succeed and explain why in text.
- Let users filter/select owned cards by stone type and current configured eligibility. Show before/after condition and value, with foil unchanged, then require confirmation before consuming the stone.
- Keep keyboard operation, visible focus, semantic labels, `aria-live` success/error feedback, text labels in addition to color, 44px touch targets, and reduced-motion support. Use existing AnimeSice components and styles.
- Handle unauthenticated/loading/error/empty states and refresh both item balances and cards after a mutation.

## Verification and current state

- Backend migration `20261023180000_gacha_item_operations_and_config` has been applied to the local test database at `localhost:5433` (`animesice-db-test`); `prisma migrate status` reports up to date. Production was not touched.
- Backend focused unit suite passed: `economy.service.spec.ts` (24 tests). This is not integration/e2e coverage.
- No frontend implementation has started. Run the frontend typecheck, lint, and build after implementation; inspect the actual page at desktop and mobile widths.
- Check the installed Next.js docs under `node_modules/next/dist/docs/` before changing App Router behavior, per `AGENTS.md`.
