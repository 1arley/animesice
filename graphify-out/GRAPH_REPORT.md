# Graph Report - animesice  (2026-10-07)

## Corpus Check
- 333 files · ~326,538 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 12, .example 1, .css 1)

## Summary
- 1970 nodes · 4749 edges · 166 communities (118 shown, 48 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a1126d43`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- loginAs
- ContinueWatchingRail.tsx
- index.ts
- EmptyState
- capas/page.tsx
- usePrefersReducedMotion
- admin/gacha/page.tsx
- api-server.ts
- CardPreview.tsx
- HIGH
- GachaCard.tsx
- GachaEconomyHub.tsx
- HomeSections.tsx
- SEO & Tráfego — Plano de Implementação
- NightMarket.tsx
- Baixa prioridade (acessibilidade)
- episode/[slug]/[number]/page.tsx
- safeImageSrc
- cartas/page.tsx
- RollStage.tsx
- package.json
- compilerOptions
- components.json
- crystals/page.tsx
- Mobile Menu / Hamburger Menu Analysis
- react
- room/[slug]/page.tsx
- devDependencies
- app/layout.tsx
- AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)
- AdminGachaPage
- wishlist/page.tsx
- Header
- INFO
- Avatar
- next
- pr-description.mjs
- HomeHero.tsx
- mock-backend.js
- GachaPageSkeleton
- useToast
- AdminGachaSkinsPage
- error.tsx
- dependencies
- Process
- AdminWatchtowerPage
- SettingsPage
- (app)/gacha/page.tsx
- scripts
- animes/[slug]/page.tsx
- Findings
- NotificationPreferencesSection.tsx
- users/[userName]/page.tsx
- test-crystal/page.tsx
- CHANGELOG.md
- obras-externas/page.tsx
- AdminGenerosPage
- AuthProvider
- buscar/page.tsx
- Product
- next.config.ts
- moderacao/page.tsx
- console-debug.js
- check-chunk-recovery-build.mjs
- Team Playbook
- 1. Directory Structure Overview
- AnimesIce Frontend Audit
- AdminImportPage
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04)
- dmca/page.tsx
- privacidade/page.tsx
- .eslintrc.json
- postcss.config.mjs
- 1.0.0 (2026-09-18)
- (app)/gacha/skins/page.tsx
- create/page.tsx
- NightMarketIntro
- Repository Guidelines
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-06)
- Auditoria de UI/UX do mercado
- 1.0.0 (2026-08-18)
- GachaNav.tsx
- 1.0.0 (2026-08-12)
- 1.0.0 (2026-08-25)
- 1.0.0 (2026-08-26)
- 1.0.0 (2026-08-31)
- 1.0.0 (2026-09-04)
- 1.0.0 (2026-09-08)
- 1.0.0 (2026-09-12)
- 1.0.0 (2026-09-15)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-09-16)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-07)
- allowScripts
- 1.0.0 (2026-08-14)
- 1.0.0 (2026-08-15)
- 1.0.0 (2026-08-26)
- 1.0.0 (2026-08-17)
- feedbacks/page.tsx
- implementer.md
- leader.md
- 1.0.0 (2026-08-19)
- researcher.md
- reviewer.md
- 1.0.0 (2026-09-15)
- opengraph-image.tsx
- gacha-harden.spec.ts
- 1.0.0 (2026-08-21)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)
- FeedPost.tsx
- helpers.ts
- @playwright/test
- gacha_box_reveal.py
- 1.0.0 (2026-08-15)
- gacha-trades.spec.ts
- encyclopedia/page.tsx
- 1.0.0 (2026-08-18)
- processBatch
- 1.0.0 (2026-08-18)
- Anime
- perfil-wishlist-url.spec.ts
- comunidade-feed.spec.ts
- gacha-card-back.spec.ts
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- NotificationBell.tsx
- comunidade-usuarios.spec.ts
- perfil-seguidores.spec.ts
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18)
- biblioteca/page.tsx
- biblioteca/layout.tsx
- admin/usuarios/page.tsx

## God Nodes (most connected - your core abstractions)
1. `react` - 144 edges
2. `useAuth()` - 126 edges
3. `next` - 124 edges
4. `api` - 82 edges
5. `ApiError` - 65 edges
6. `safeImageSrc()` - 56 edges
7. `usePrefersReducedMotion()` - 46 edges
8. `isPrivileged()` - 40 edges
9. `Anime` - 38 edges
10. `useToast()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `F15: AdminGate Has No Dedicated Layout Guard` --references--> `AdminGate()`  [INFERRED]
  docs/AUDIT.md → src/components/common/AdminGate.tsx
- `P2 (Short-term)` --references--> `AdminGate()`  [INFERRED]
  docs/AUDIT.md → src/components/common/AdminGate.tsx
- `F17: Reduced Motion Is Comprehensive and Well-Implemented` --references--> `usePrefersReducedMotion()`  [INFERRED]
  docs/AUDIT.md → src/lib/use-prefers-reduced-motion.ts
- `1a. Schema (Prisma)` --references--> `BlogPost`  [INFERRED]
  docs/seo-traffic-plan.md → src/types/index.ts
- `1b. Backend (NestJS)` --references--> `BlogPost`  [INFERRED]
  docs/seo-traffic-plan.md → src/types/index.ts

## Import Cycles
- None detected.

## Communities (166 total, 48 thin omitted)

### Community 0 - "loginAs"
Cohesion: 0.16
Nodes (9): cosmetics, svg(), card, meta, spin, card, cosmetic, loginAs() (+1 more)

### Community 1 - "ContinueWatchingRail.tsx"
Cohesion: 0.12
Nodes (19): CommentRow(), ContinueWatchingRail(), FavoriteButton(), FavoriteButtonProps, AnimeStatsDisplay(), RatingStars(), handleKeyDown(), handleRate() (+11 more)

### Community 2 - "index.ts"
Cohesion: 0.05
Nodes (55): AdminDashboardStats, AdminPostItem, AdminUserDetail, AdminUserListItem, AuditLogItem, AuthResponse, GachaPullResponse, readErrorMessage() (+47 more)

### Community 3 - "EmptyState"
Cohesion: 0.19
Nodes (13): SORT_TABS, SortKey, UsuariosPage(), EpisodeCard(), EpisodeCardProps, LatestEpisode, FollowRow(), ProfileFollowList() (+5 more)

### Community 4 - "capas/page.tsx"
Cohesion: 0.06
Nodes (60): AdminCapasPage(), addLayer(), cancelEditing(), changeType(), save(), startEditing(), sync(), updateLayer() (+52 more)

### Community 5 - "usePrefersReducedMotion"
Cohesion: 0.06
Nodes (47): Loading(), Loading(), RegrasPage(), Loading(), Loading(), Loading(), lenis, motion (+39 more)

### Community 7 - "admin/gacha/page.tsx"
Cohesion: 0.18
Nodes (9): animeLabel(), AnimeOption, TIERS, EMPTY_FORM, SkinForm, AdminGachaCard, AdminGachaSkin, GachaEngagementPilotDashboard (+1 more)

### Community 8 - "api-server.ts"
Cohesion: 0.07
Nodes (42): POST(), POST(), BlogPage(), metadata, revalidate, GET(), revalidate, BlogPostPage() (+34 more)

### Community 9 - "CardPreview.tsx"
Cohesion: 0.19
Nodes (16): ConfirmDialog(), Modal(), CardInspectionPreview(), CardPreview(), CardPreviewProps, OwnedCardPreview(), share(), GachaRowsSkeleton() (+8 more)

### Community 10 - "HIGH"
Cohesion: 0.18
Nodes (11): F02: Modal Focus Trap Not Implemented, F03: Toast Notifications Not Announced to Screen Readers, F04: `api.ts` ensureRefresh() Can Permanently Lock Refresh State, F05: CSP Uses `unsafe-inline` for `script-src`, HIGH, P0 (Immediate — Ship blockers), P1 (Next sprint), P2 (Short-term) (+3 more)

### Community 11 - "GachaCard.tsx"
Cohesion: 0.09
Nodes (24): CONDITION_ART, CONDITION_COLOR, CONDITION_GLYPH, CONDITION_SURFACE, FOIL_TEXT, GALAXY_FRAME, GALAXY_TEXT, RARITY (+16 more)

### Community 12 - "GachaEconomyHub.tsx"
Cohesion: 0.09
Nodes (35): GachaShopPage(), GachaMarketPage(), FOCUSABLE, ACCENT, BOX_LABEL, BoxReveal(), boxRewardLabel(), GachaCardInspection (+27 more)

### Community 13 - "HomeSections.tsx"
Cohesion: 0.14
Nodes (29): HomePage(), metadata, revalidate, gsap, @gsap/react, DividerSvg(), HomeBackdrop(), IceBeamDivider() (+21 more)

### Community 14 - "SEO & Tráfego — Plano de Implementação"
Cohesion: 0.18
Nodes (10): 2. Página de índice `/generos`, 3. Schema VideoObject nos episódios, 4. Gêneros no sitemap, 5. hreflang `pt-BR`, Contexto, Decisões fechadas, Ordem de execução recomendada, SEO & Tráfego — Plano de Implementação (+2 more)

### Community 15 - "NightMarket.tsx"
Cohesion: 0.21
Nodes (13): metadata, NightMarketPage(), Block(), GachaOfferGridSkeleton(), NightMarket(), offerImage(), offerKind(), offerName() (+5 more)

### Community 18 - "Baixa prioridade (acessibilidade)"
Cohesion: 0.06
Nodes (30): Alta prioridade (bugs reais), anchor-is-valid ×2, Baixa prioridade (acessibilidade), click-events-have-key-events ×3, Concluído, effect-needs-cleanup ×6, Falsos positivos documentados (não mexer), html-label-has-single-control ×1 (+22 more)

### Community 20 - "episode/[slug]/[number]/page.tsx"
Cohesion: 0.18
Nodes (11): AdminEditEpisodePage(), DeleteZone(), DeleteZoneProps, FieldLabel(), Hint(), ScrapeImportPanel(), ScrapeImportPanelProps, VideoUploadPanel() (+3 more)

### Community 21 - "safeImageSrc"
Cohesion: 0.12
Nodes (24): CalendarioPage(), metadata, PosterThumb(), revalidate, YearFilter(), PosterTileProps, ActivityRow(), CommentGlyph() (+16 more)

### Community 22 - "cartas/page.tsx"
Cohesion: 0.17
Nodes (9): GachaCollectionPage(), handleReroll(), CardsFilterBar(), ChevronDown(), FilterBadge(), buildSlots(), CardsPagination(), gachaConditionLabel() (+1 more)

### Community 23 - "RollStage.tsx"
Cohesion: 0.14
Nodes (16): Cristal do gacha (Manim), CountUp(), RARITY_TEXT, PARTICLE_GALAXY, particleCount(), revealSpeed(), ringCount(), RollStage() (+8 more)

### Community 24 - "package.json"
Cohesion: 0.11
Nodes (17): name, private, version, autoprefixer, eslint, eslint-config-next, postcss, react-dom (+9 more)

### Community 26 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 27 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 28 - "crystals/page.tsx"
Cohesion: 0.22
Nodes (6): CRYSTAL_PACKAGES, GachaCrystalsPage(), TYPE_LABEL, GachaPanelGridSkeleton(), CrystalEvent, CrystalEventType

### Community 29 - "Mobile Menu / Hamburger Menu Analysis"
Cohesion: 0.08
Nodes (25): 1. Overall Project Structure, 2. Mobile Menu / Hamburger Functionality, 3. Key Files, 4. Data Flow Summary: Main Mobile Nav Open/Close, 5. Essential Files for Understanding the Feature, 6. Architecture Insights, 7. Summary of Files Searched, A. Main Site Mobile Navigation (Bottom Sheet Drawer) (+17 more)

### Community 30 - "react"
Cohesion: 0.08
Nodes (34): AdminAuditPage(), AuditTab, RESOURCE_TYPES, AdminAnime, AdminCatalogoPage(), AdminConfigPage(), AdminCreateEpisodePage(), AdminEditAnimePage() (+26 more)

### Community 31 - "room/[slug]/page.tsx"
Cohesion: 0.05
Nodes (59): GET(), generateMetadata(), getEpisode, revalidate, toIso8601Duration(), WatchPage(), mergeMessages(), Participant (+51 more)

### Community 32 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, eslint, eslint-config-next, @playwright/test, postcss, semantic-release, @semantic-release/changelog (+7 more)

### Community 33 - "app/layout.tsx"
Cohesion: 0.19
Nodes (10): fontDisplay, fontPlexMono, fontPlexSans, metadata, RootLayout(), viewport, DeferredCrystalSplash(), MonetagVignette() (+2 more)

### Community 34 - "AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)"
Cohesion: 0.06
Nodes (29): AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript), API Routes, Code Details, Code Rules and Guidelines, Directory Structure, Eslint, Extra, Generating Icons for your Application (+21 more)

### Community 35 - "AdminGachaPage"
Cohesion: 0.13
Nodes (8): AdminGachaPage(), cancelEdit(), clearAnime(), onAnimeFilterChange(), resetForm(), saveCard(), selectAnime(), toggleAnimeFilter()

### Community 36 - "wishlist/page.tsx"
Cohesion: 0.25
Nodes (10): GachaWishlistContent(), GachaWishlistPage(), ProfileWishlist(), pageWindow(), PaginationControls(), GACHA_WISHLIST_PAGE_SIZE, readPage(), useGachaWishlist() (+2 more)

### Community 37 - "Header"
Cohesion: 0.11
Nodes (23): AdminLayout(), AdminShell(), AdminSidebar(), NAV_ITEMS, NavItem, AppLayout(), ConfirmEmailContent(), ConfirmEmailPage() (+15 more)

### Community 38 - "INFO"
Cohesion: 0.29
Nodes (7): handleSubmit(), safeNext(), F16: Build, Typecheck, and Lint Pass Cleanly, F17: Reduced Motion Is Comprehensive and Well-Implemented, F18: Open Redirect Protection in Login Is Correct, F19: Chunk Recovery System Is Well-Designed, INFO

### Community 39 - "Avatar"
Cohesion: 0.14
Nodes (17): AVATAR_ACCEPT, AuthButtons(), Avatar(), AvatarProps, CommentSectionProps, Glyph(), MobileTabBar(), DashStat() (+9 more)

### Community 40 - "next"
Cohesion: 0.14
Nodes (11): EditBlogPostPage(), NewBlogPostPage(), AdminBlogPage(), next, BlogForm(), changeTitle(), submit(), slugify() (+3 more)

### Community 41 - "pr-description.mjs"
Cohesion: 0.13
Nodes (11): breaking, dirs, fileLines, files, groups, isBack, LABELS, out (+3 more)

### Community 43 - "HomeHero.tsx"
Cohesion: 0.43
Nodes (5): DeferredHomeHero(), HeroProps, highlightLabelForHour(), HomeHero(), useIsMobile()

### Community 44 - "mock-backend.js"
Cohesion: 0.18
Nodes (8): EPISODE, http, server, CORS_HEADERS, http, json(), server, url

### Community 45 - "GachaPageSkeleton"
Cohesion: 0.13
Nodes (15): Loading(), Loading(), Loading(), Loading(), Loading(), Loading(), Loading(), Loading() (+7 more)

### Community 46 - "useToast"
Cohesion: 0.10
Nodes (16): AdminCrystalCodesPage(), cancelEditing(), save(), blank, Code, AdminGachaConfigPage(), ConfigEntry, GROUP_LABELS (+8 more)

### Community 47 - "AdminGachaSkinsPage"
Cohesion: 0.50
Nodes (3): AdminGachaSkinsPage(), resetForm(), save()

### Community 48 - "error.tsx"
Cohesion: 0.47
Nodes (8): ErrorPage(), GlobalError(), CHUNK_ERROR_EVENT, CHUNK_RECOVERY_EXHAUSTED_EVENT, isChunkLoadError(), isChunkRecoveryExhausted(), retryChunkLoad(), Window

### Community 49 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, gsap, @gsap/react, hls.js, lenis, motion, next, ogl (+3 more)

### Community 50 - "Process"
Cohesion: 0.25
Nodes (7): 1. Pin the fixed point, 2. Identify the spec source, 3. Identify the standards sources, 4. Spawn both sub-agents in parallel, 5. Aggregate, Process, Why two axes

### Community 51 - "AdminWatchtowerPage"
Cohesion: 0.33
Nodes (11): AdminWatchtowerPage(), handleBackfillAnilist(), handleCheck(), handleDiscover(), handleRepair(), handleRetry(), handleScanAll(), handleSyncSchedules() (+3 more)

### Community 52 - "SettingsPage"
Cohesion: 0.07
Nodes (25): LoginForm(), LoginPage(), RecuperarSenhaPage(), RedefinirSenhaForm(), handleSubmit(), RedefinirSenhaPage(), RegisterPage(), handleSubmit() (+17 more)

### Community 53 - "(app)/gacha/page.tsx"
Cohesion: 0.15
Nodes (23): CrystalIcon(), formatCountdown(), GachaPage(), GachaPageContent(), closePreview(), handleApplyRanking(), handleBypass(), handleClaim() (+15 more)

### Community 54 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check:chunk-recovery, dev, lint, release, release:dry, skills:install (+3 more)

### Community 55 - "animes/[slug]/page.tsx"
Cohesion: 0.12
Nodes (19): AnimeDetailPage(), generateMetadata(), getAnime, revalidate, Positive Findings, AdaptiveImage(), AdaptiveImageProps, AnimeListButton() (+11 more)

### Community 57 - "Findings"
Cohesion: 0.29
Nodes (7): CRITICAL, F01: Cross-Project Brand Contamination in hentaisice Fork, F12: FavoriteButton Has No Visual Loading Feedback, F13: FeedPost Silently Swallows Share Error, F15: AdminGate Has No Dedicated Layout Guard, Findings, LOW

### Community 58 - "NotificationPreferencesSection.tsx"
Cohesion: 0.29
Nodes (6): ALL_TYPES, channels, NOTIFICATION_LABELS, NotificationChannel, NotificationPreference, NotificationType

### Community 59 - "users/[userName]/page.tsx"
Cohesion: 0.10
Nodes (21): OverviewSkeleton(), ProfileSkeleton(), PublicProfilePage(), ensureTab(), handleNavigate(), TAB_ALIASES, HeadingLevel, SectionLabel() (+13 more)

### Community 60 - "test-crystal/page.tsx"
Cohesion: 0.43
Nodes (5): metadata, TestCrystalPage(), CrystalVideoClean(), compileShader(), CrystalVideoPreview()

### Community 61 - "CHANGELOG.md"
Cohesion: 0.11
Nodes (17): 1.0.0 (2026-08-20), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.2.0](https://github.com/1arley/animesice/compare/v1.1.0...v1.2.0) (2026-08-13), Bug Fixes, Bug Fixes (+9 more)

### Community 63 - "AdminGenerosPage"
Cohesion: 0.67
Nodes (3): AdminGenerosPage(), handleNameChange(), slugify()

### Community 64 - "AuthProvider"
Cohesion: 0.50
Nodes (4): F14: Auth Context Shows Loading Flash on First Render, Key Design Decisions, AuthProvider(), loadApi()

### Community 65 - "buscar/page.tsx"
Cohesion: 0.12
Nodes (27): AnimesPage(), generateMetadata(), revalidate, first(), metadata, revalidate, SearchPage(), SearchParam (+19 more)

### Community 66 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 68 - "moderacao/page.tsx"
Cohesion: 0.18
Nodes (9): ACTION_LABELS, ModerateAction, ModerateUserInline(), ModerationPage(), REASON_LABELS, STATUS_LABELS, TARGET_LABELS, ReportItem (+1 more)

### Community 70 - "check-chunk-recovery-build.mjs"
Cohesion: 0.40
Nodes (3): html, recoveryScript, scripts

### Community 71 - "Team Playbook"
Cohesion: 0.40
Nodes (4): Execution And Handoff, Roles And Coordination, Team Formation, Team Playbook

### Community 72 - "1. Directory Structure Overview"
Cohesion: 0.17
Nodes (11): 1. Directory Structure Overview, Animesice - Next.js Frontend Structure Analysis, `app/` Directory (Next.js App Router), Architectural Patterns Identified, Code Quality Observations, Essential Files for Understanding the Feature Architecture, Pages Directory & Routing Summary, Root Level (+3 more)

### Community 73 - "AnimesIce Frontend Audit"
Cohesion: 0.22
Nodes (8): 1. Silent Error Swallowing, 2. No SWR/React Query — Manual Cache Invalidation, 3. Large Client Components, AnimesIce Frontend Audit, Cross-cutting Problems, Executive Summary, Skills Used, Test Coverage Gaps

### Community 75 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04)"
Cohesion: 0.40
Nodes (5): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04), Bug Fixes, Features, Performance Improvements, Reverts

### Community 85 - "1.0.0 (2026-09-18)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-18), Bug Fixes, Features, Performance Improvements, Reverts

### Community 86 - "(app)/gacha/skins/page.tsx"
Cohesion: 0.24
Nodes (6): countdown(), GachaSkinsPage(), SkinTile(), SkinReveal(), GachaSkin, GachaSkinsResponse

### Community 90 - "create/page.tsx"
Cohesion: 0.36
Nodes (5): AdminCreateAnimePage(), animeAudioLabelFromTitle(), isDubbedTitle(), slugify(), Genre

### Community 93 - "Repository Guidelines"
Cohesion: 0.25
Nodes (7): Agent Team, Code, Tests, Delivery, Commands, Project Structure, Repository Guidelines, Role and First Checks, UI, Security, Technology

### Community 96 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-06)"
Cohesion: 0.40
Nodes (5): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-06), Bug Fixes, Features, Performance Improvements, Reverts

### Community 98 - "Auditoria de UI/UX do mercado"
Cohesion: 0.33
Nodes (5): Achados tratados, Auditoria de UI/UX do mercado, Direcao visual, Limites e proximas prioridades, Verificacao

### Community 101 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

### Community 102 - "GachaNav.tsx"
Cohesion: 0.38
Nodes (5): GachaLayout(), GachaNav(), GachaNavGroup, GachaNavItem, groups

### Community 103 - "1.0.0 (2026-08-12)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-08-12), Bug Fixes, Features, Performance Improvements, Reverts

### Community 104 - "1.0.0 (2026-08-25)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-08-25), Bug Fixes, Features, Performance Improvements, Reverts

### Community 105 - "1.0.0 (2026-08-26)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-08-26), Bug Fixes, Features, Performance Improvements, Reverts

### Community 107 - "1.0.0 (2026-08-31)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-08-31), Bug Fixes, Features, Performance Improvements, Reverts

### Community 108 - "1.0.0 (2026-09-04)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-04), Bug Fixes, Features, Performance Improvements, Reverts

### Community 109 - "1.0.0 (2026-09-08)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-08), Bug Fixes, Features, Performance Improvements, Reverts

### Community 110 - "1.0.0 (2026-09-12)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-12), Bug Fixes, Features, Performance Improvements, Reverts

### Community 111 - "1.0.0 (2026-09-15)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-15), Bug Fixes, Features, Performance Improvements, Reverts

### Community 112 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 113 - "1.0.0 (2026-09-16)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-16), Bug Fixes, Features, Performance Improvements, Reverts

### Community 114 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-07)"
Cohesion: 0.40
Nodes (5): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-07), Bug Fixes, Features, Performance Improvements, Reverts

### Community 119 - "1.0.0 (2026-08-14)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-14), Bug Fixes, Features, Performance Improvements

### Community 120 - "1.0.0 (2026-08-15)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-15), Bug Fixes, Features, Performance Improvements

### Community 121 - "1.0.0 (2026-08-26)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-08-26), Bug Fixes, Features, Performance Improvements, Reverts

### Community 122 - "1.0.0 (2026-08-17)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-17), Bug Fixes, Features, Performance Improvements

### Community 123 - "feedbacks/page.tsx"
Cohesion: 0.29
Nodes (6): STATUS_BADGE, STATUS_LABELS, TYPE_LABELS, FeedbackStatus, FeedbackType, SiteFeedbackItem

### Community 126 - "1.0.0 (2026-08-19)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-19), Bug Fixes, Features, Performance Improvements

### Community 129 - "1.0.0 (2026-09-15)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-15), Bug Fixes, Features, Performance Improvements, Reverts

### Community 130 - "opengraph-image.tsx"
Cohesion: 0.40
Nodes (3): contentType, revalidate, size

### Community 131 - "gacha-harden.spec.ts"
Cohesion: 0.30
Nodes (9): A(), CARDS, ceremonyFixture(), collectionFixture(), ENC, nowIso(), profileFixture(), pull() (+1 more)

### Community 132 - "1.0.0 (2026-08-21)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-21), Bug Fixes, Features, Performance Improvements

### Community 133 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)"
Cohesion: 0.50
Nodes (4): [1.0.1](https://github.com/1arley/animesice/compare/v1.0.0...v1.0.1) (2026-08-12), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12), Bug Fixes, Features

### Community 135 - "FeedPost.tsx"
Cohesion: 0.11
Nodes (12): FeedPage(), revalidate, CommentGlyph(), FeedPost(), HeartGlyph(), ShareGlyph(), FeedView(), FeedViewProps (+4 more)

### Community 136 - "helpers.ts"
Cohesion: 0.27
Nodes (5): openEditor(), VIEWER, AD_PATTERNS, blockAds(), clickCentered()

### Community 139 - "@playwright/test"
Cohesion: 0.20
Nodes (3): EBML_MAGIC, FTYP_BOX, @playwright/test

### Community 142 - "gacha_box_reveal.py"
Cohesion: 0.10
Nodes (9): CommonBox, GachaBoxReveal, PremiumBox, RareBox, render_assets(), diamond(), NightMarketCardReveal, render_asset() (+1 more)

### Community 148 - "1.0.0 (2026-08-15)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-15), Bug Fixes, Features, Performance Improvements

### Community 155 - "gacha-trades.spec.ts"
Cohesion: 0.24
Nodes (8): MY_A, MY_B, nowIso(), pull(), trade(), ZOE, ZOE_BERU, ZOE_GOJO

### Community 156 - "encyclopedia/page.tsx"
Cohesion: 0.21
Nodes (8): CardOwners(), Encyclopedia(), EncyclopediaPage(), GACHA_TIERS, CardGrid(), GachaCardGridSkeleton(), GachaEncyclopedia, GachaEncyclopediaOwner

### Community 157 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

### Community 159 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

### Community 160 - "Anime"
Cohesion: 0.10
Nodes (21): dynamic, metadata, revalidate, TopPage(), 1. CMS — Conteúdo editorial nos animes + Blog, 1a. Schema (Prisma), 1b. Backend (NestJS), 1c. Frontend (+13 more)

### Community 161 - "perfil-wishlist-url.spec.ts"
Cohesion: 0.50
Nodes (4): API(), mockProfileAndWishlist(), PROFILE, WISHLIST

### Community 164 - "comunidade-feed.spec.ts"
Cohesion: 0.50
Nodes (3): API(), mockFeed(), mockGeneric()

### Community 165 - "gacha-card-back.spec.ts"
Cohesion: 0.40
Nodes (4): pull, showBack(), SLOT, stage()

### Community 166 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 167 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 168 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 169 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 170 - "NotificationBell.tsx"
Cohesion: 0.47
Nodes (4): loadApi(), NotificationBell(), markAllRead(), NotificationItem

### Community 171 - "comunidade-usuarios.spec.ts"
Cohesion: 0.83
Nodes (3): API(), makeUsers(), mockUsersDirectory()

### Community 172 - "perfil-seguidores.spec.ts"
Cohesion: 0.83
Nodes (3): API(), mockFollowLists(), mockProfile()

### Community 173 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18)"
Cohesion: 0.67
Nodes (3): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), Bug Fixes, Features

### Community 232 - "biblioteca/page.tsx"
Cohesion: 0.22
Nodes (9): EmptyState(), HistoryRow(), LibraryPage(), Tab, TAB_LABELS, TAB_STATUS, TABS, UserAnimeListItem (+1 more)

### Community 239 - "admin/usuarios/page.tsx"
Cohesion: 0.12
Nodes (10): ACTION_DESC, ACTION_LABELS, AdminUsersPage(), ModerateAction, ModerateUserModal(), ROLE_BADGE, ROLE_LABELS, MyProfilePage() (+2 more)

## Knowledge Gaps
- **606 isolated node(s):** `RarityStyle`, `CONDITION_COLOR`, `CONDITION_GLYPH`, `CONDITION_ART`, `CONDITION_SURFACE` (+601 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 858 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `ContinueWatchingRail.tsx`, `EmptyState`, `capas/page.tsx`, `usePrefersReducedMotion`, `admin/gacha/page.tsx`, `api-server.ts`, `CardPreview.tsx`, `FeedPost.tsx`, `GachaCard.tsx`, `GachaEconomyHub.tsx`, `HomeSections.tsx`, `NightMarket.tsx`, `episode/[slug]/[number]/page.tsx`, `safeImageSrc`, `cartas/page.tsx`, `RollStage.tsx`, `package.json`, `encyclopedia/page.tsx`, `crystals/page.tsx`, `room/[slug]/page.tsx`, `Anime`, `app/layout.tsx`, `wishlist/page.tsx`, `Header`, `Avatar`, `next`, `NotificationBell.tsx`, `HomeHero.tsx`, `useToast`, `error.tsx`, `SettingsPage`, `(app)/gacha/page.tsx`, `animes/[slug]/page.tsx`, `NotificationPreferencesSection.tsx`, `users/[userName]/page.tsx`, `test-crystal/page.tsx`, `obras-externas/page.tsx`, `moderacao/page.tsx`, `(app)/gacha/skins/page.tsx`, `create/page.tsx`, `GachaNav.tsx`, `biblioteca/page.tsx`, `admin/usuarios/page.tsx`, `feedbacks/page.tsx`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **What connects `RarityStyle`, `CONDITION_COLOR`, `CONDITION_GLYPH` to the rest of the system?**
  _606 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ContinueWatchingRail.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `ContinueWatchingRail.tsx`, `opengraph-image.tsx`, `EmptyState`, `capas/page.tsx`, `usePrefersReducedMotion`, `admin/gacha/page.tsx`, `api-server.ts`, `CardPreview.tsx`, `FeedPost.tsx`, `GachaCard.tsx`, `GachaEconomyHub.tsx`, `HomeSections.tsx`, `NightMarket.tsx`, `episode/[slug]/[number]/page.tsx`, `safeImageSrc`, `cartas/page.tsx`, `package.json`, `crystals/page.tsx`, `encyclopedia/page.tsx`, `react`, `room/[slug]/page.tsx`, `Anime`, `app/layout.tsx`, `wishlist/page.tsx`, `Header`, `Avatar`, `NotificationBell.tsx`, `HomeHero.tsx`, `useToast`, `error.tsx`, `SettingsPage`, `(app)/gacha/page.tsx`, `animes/[slug]/page.tsx`, `users/[userName]/page.tsx`, `buscar/page.tsx`, `next.config.ts`, `(app)/gacha/skins/page.tsx`, `create/page.tsx`, `GachaNav.tsx`, `biblioteca/page.tsx`, `biblioteca/layout.tsx`, `admin/usuarios/page.tsx`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04858757062146893 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `react` to `ContinueWatchingRail.tsx`, `EmptyState`, `capas/page.tsx`, `admin/gacha/page.tsx`, `api-server.ts`, `CardPreview.tsx`, `FeedPost.tsx`, `GachaCard.tsx`, `GachaEconomyHub.tsx`, `NightMarket.tsx`, `episode/[slug]/[number]/page.tsx`, `safeImageSrc`, `cartas/page.tsx`, `encyclopedia/page.tsx`, `crystals/page.tsx`, `room/[slug]/page.tsx`, `Anime`, `AdminGachaPage`, `wishlist/page.tsx`, `Header`, `Avatar`, `NotificationBell.tsx`, `useToast`, `AdminWatchtowerPage`, `SettingsPage`, `(app)/gacha/page.tsx`, `animes/[slug]/page.tsx`, `AdminGenerosPage`, `AuthProvider`, `moderacao/page.tsx`, `create/page.tsx`, `biblioteca/page.tsx`, `admin/usuarios/page.tsx`, `feedbacks/page.tsx`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Should `capas/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0649452269170579 - nodes in this community are weakly interconnected._