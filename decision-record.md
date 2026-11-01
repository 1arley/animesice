# Decision Record: Frontend Architecture

- Session: `frontend-architecture-2026-11-01`
- Project: AnimesIce frontend
- Decision status: confirmed by the user; whole frontend is in scope
- Decision source: JEV sub-agent fallback for all ten decisions
- Direct JEV provider: TypeSafe returned `provider-error`; no direct JEV answers were received.
- Scope: modularization, duplication reduction, and consistent use of the existing visual system across the full frontend. Blog, Profile, and Social are the first migration slice, not the final scope.

## Decisions

1. Adopt gradual feature-first organization under `src/features/<domain>/`. Keep `app/` as the Next.js route layer. Add internal folders only where they separate existing responsibilities.
2. Use Blog as the first pilot, selected for cohesion and manageable scope before Gacha.
3. Move Blog-owned components, pure helpers, server queries, and contracts into the Blog feature. Keep `app/` route files as Next.js adapters for route params, metadata, and route behavior.
4. Use separate public entrypoints for server-side queries and client-safe components, with pure types/helpers kept safe to import across runtimes. Avoid a barrel that combines server and client dependencies.
5. Move `BlogPost` and `BlogPostInput` into feature-owned types. Keep generic `Paginated<T>` in `@/types`, and re-export the Blog types from `@/types` to preserve existing imports during migration.
6. Preserve `src/lib/api.ts` and its `@/lib/api` import surface for now. Keep its private `request()` transport unchanged during the Blog pilot.
7. In a later API-modularization step, extract the shared transport once, then move endpoint methods by domain while preserving session refresh, retry, error, and cache-revalidation behavior. Do not create duplicate clients.
8. Document public feature imports and avoid cross-feature imports through internal paths. Defer automated lint enforcement until the convention has been used and validated.
9. Preserve Blog content behavior and HTML sanitization during moves. Keep generic server fetch behavior shared; Blog-specific server queries may use it through the feature's server entrypoint.
10. Organize Profile and Social under `src/features/`; move `ProfileDashboard` and `CommentSection` out of `common` because they belong to those domains.
11. Keep feature imports focused by route flow. Move the stateless Stars display into shared UI so Profile and Social do not depend on each other for presentation.

## Evidence and rationale

- `src/lib/api.ts` is about 2,334 lines and a graph hub. Its private `request()` handles credentials, 401 refresh, retries for idempotent requests, and error parsing.
- Blog methods in `api.ts` also trigger cache revalidation after mutations; they stay there during the first pilot.
- Blog has dedicated components, helpers, public/admin routes, and server queries. `BlogPost` and `BlogPostInput` are only used by Blog-related code; `Paginated<T>` is generic.
- The App Router Blog surface combines server pages/queries with client-side admin components, so runtime-specific entrypoints reduce accidental server/client dependency mixing.
- The project Graphify snapshot was refreshed during diagnosis. It identified `useAuth` and `api` as broad hubs and large Gacha files, but size alone was not treated as a reason to move code.

## Provenance

Every decision below was accepted by the JEV sub-agent fallback after the configured TypeSafe provider call failed. These are not direct JEV provider responses.

- Q1–Q3: feature-first direction, compatible API facade, and pilot selection principle — `jev-subagent`.
- Q4–Q6: feature folder shape, Blog as pilot, and gradual boundary enforcement — `jev-subagent`.
- Q7–Q8: Blog pilot scope and later transport extraction — `jev-subagent`.
- Q9: feature ownership of Blog types with compatibility re-exports — `jev-subagent`.
- Q10: runtime-specific public entrypoints — `jev-subagent`.
- Q11–Q12 and expanded execution scope to the whole frontend: user correction — `user`.

## Assumptions and open risks

- The move can preserve the current sanitizer call site and behavior exactly.
- The Blog server queries can use the existing generic server fetch helper without changing cache tags, revalidation, or error behavior.
- Compatibility re-exports can be arranged without import cycles.
- Before implementation, inspect the installed Next.js 16 docs for the relevant server/client import and module conventions, as required by the repository instructions. The source checkout's `node_modules/next` lacks `dist/docs`; matching Next 16.4.3 docs were read from the existing upgrade worktree.
- The API transport extraction is intentionally outside the first Blog pilot; its later shape must be checked against all callers and existing auth/retry behavior.

