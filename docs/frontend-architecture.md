# Frontend architecture

This architecture applies to the entire frontend. Migrate by domain so routes and user-facing behavior stay stable while ownership becomes clearer; one pilot does not complete the work.

## Ownership

- `app/` owns Next.js route entrypoints and route-specific configuration such as `metadata`, `revalidate`, `generateMetadata`, and HTTP handlers.
- `src/features/<domain>/` owns code used by one product domain: page content, UI, domain behavior, and contracts. Blog, Profile, and Social are the first migrated areas; Gacha and other existing groups can move without changing their product behavior.
- `src/components/ui/` owns low-level presentation primitives. `src/components/common/` owns components only when multiple features use them.
- `src/lib/` owns cross-feature infrastructure and pure helpers. Shared API transport stays here; domain endpoint methods move beside their feature only after the transport boundary is explicit.
- `src/types/` keeps generic contracts. Feature-owned contracts live with their feature and may be re-exported temporarily to preserve existing imports.

## Module boundaries

- Keep `app/` route files thin; delegate domain UI and behavior to a feature.
- Expose pure types and helpers from the feature's `index.ts`. Keep server code behind a server-only entrypoint and client components behind focused entrypoints by flow (for example, `public-page.ts`, `settings.ts`, `identity.ts`, and `feed.ts`). Do not combine server and client dependencies in one barrel or make a small import pull unrelated flows into a client bundle.
- A feature may import shared infrastructure and its own internal modules. Cross-feature imports use public entrypoints, never another feature's internal file paths.
- Keep compatibility facades while callers migrate. Preserve route paths, API method signatures, payloads, auth refresh, caching, retries, and revalidation behavior.
- Use a service class when it encapsulates cohesive domain I/O or repeated domain rules. Keep stateless transformations as functions; do not add classes around React components or one-line helpers.

## UI identity and reuse

- Reuse the existing AnimeSice design tokens, `src/components/ui/` primitives, and shared components before creating another button, field, dialog, card, or loading pattern.
- Keep feature-specific compositions inside their feature. Promote a component to `common` when more than one feature needs the same behavior and presentation.
- Replace existing UI only when it removes real duplication or brings an inconsistent interaction back to the shared visual and accessibility patterns. Preserve keyboard behavior, visible focus, reduced motion, and touch target sizes.

## Migration sequence

1. Blog establishes route adapters, feature-owned types, server/client entrypoints, and domain-owned server queries.
2. Profile and Social use feature folders and focused entrypoints. Generic presentation such as rating stars belongs in `src/components/ui/`; `common` contains only genuinely shared UI.
3. Move Gacha, Home, catalog, and admin code by cohesive responsibilities while keeping routes and API contracts stable. File size alone is not a reason to move or split code.
4. Modularize the client API in domain slices after extracting its shared transport once. Keep `@/lib/api` as the compatibility facade during that migration.
5. Add automated import rules only after the feature boundaries have proved useful across real frontend changes.

The current pass organizes Blog, Profile, and Social. It does not restyle the site. Gacha and API transport remain existing areas for later domain-focused passes.
