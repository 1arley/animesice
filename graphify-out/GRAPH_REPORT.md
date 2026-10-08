# Graph Report - animesice  (2026-10-08)

## Corpus Check
- 334 files · ~329,294 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: (none) 13, .example 1, .css 1)

## Summary
- 1990 nodes · 4782 edges · 172 communities (121 shown, 51 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `02c3f7ae`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- loginAs
- safeImageSrc
- index.ts
- EmptyState
- capas/page.tsx
- usePrefersReducedMotion
- SiteNav
- blog.ts
- blog/[slug]/page.tsx
- SEO & Tráfego — Plano de Implementação
- HeroSlide.tsx
- GachaEconomyHub.tsx
- HomeSections.tsx
- Anime
- settings/page.tsx
- Baixa prioridade (acessibilidade)
- episode/[slug]/[number]/page.tsx
- NightMarket.tsx
- RollStage.tsx
- cartas/page.tsx
- package.json
- compilerOptions
- components.json
- room/[slug]/page.tsx
- Mobile Menu / Hamburger Menu Analysis
- GachaCard.tsx
- admin/usuarios/page.tsx
- devDependencies
- AdminGenerosPage
- AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)
- AdminGachaPage
- wishlist/page.tsx
- Header
- comunidade-usuarios.spec.ts
- animes/[slug]/page.tsx
- next
- pr-description.mjs
- (app)/gacha/skins/page.tsx
- mock-backend.js
- GachaPageSkeleton
- NotificationsPage
- AdminGachaSkinsPage
- error.tsx
- dependencies
- Process
- AdminWatchtowerPage
- Wordmark
- (app)/gacha/page.tsx
- scripts
- biblioteca/page.tsx
- HomeHero.tsx
- EpisodePrefetcher.tsx
- users/[userName]/page.tsx
- test-crystal/page.tsx
- CHANGELOG.md
- obras-externas/page.tsx
- User
- HeroAtmosphere.tsx
- buscar/page.tsx
- Product
- CrystalLoader
- moderacao/page.tsx
- console-debug.js
- check-gacha-foils.mjs
- Team Playbook
- 1. Directory Structure Overview
- NotificationPreferencesSection.tsx
- useToast
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04)
- dmca/page.tsx
- privacidade/page.tsx
- EpisodeLoadingState.tsx
- .eslintrc.json
- postcss.config.mjs
- 1.0.0 (2026-09-18)
- app/layout.tsx
- create/page.tsx
- admin/gacha/skins/page.tsx
- NightMarketIntro
- Repository Guidelines
- PageTitle
- ensureRefresh
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-06)
- Auditoria de UI/UX do mercado
- react
- 1.0.0 (2026-08-26)
- 1.0.0 (2026-08-18)
- GachaNav.tsx
- 1.0.0 (2026-08-12)
- 1.0.0 (2026-08-25)
- 1.0.0 (2026-08-26)
- 1.0.0 (2026-09-15)
- 1.0.0 (2026-08-31)
- 1.0.0 (2026-09-04)
- 1.0.0 (2026-09-08)
- 1.0.0 (2026-09-12)
- 1.0.0 (2026-09-15)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-09-16)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-07)
- allowScripts
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-07)
- perfil-wishlist-url.spec.ts
- 1.0.0 (2026-08-14)
- 1.0.0 (2026-08-15)
- NotificationBell
- 1.0.0 (2026-08-17)
- AdminCatalogoPage
- implementer.md
- leader.md
- 1.0.0 (2026-08-19)
- researcher.md
- reviewer.md
- 1.0.0 (2026-08-15)
- api-server.ts
- gacha-harden.spec.ts
- 1.0.0 (2026-08-21)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)
- FeedPost.tsx
- helpers.ts
- 1.0.0 (2026-08-18)
- @playwright/test
- gacha_box_reveal.py
- 1.0.0 (2026-08-18)
- gacha-trades.spec.ts
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- CardPreview.tsx
- 1.0.0 (2026-08-20)
- AdminEditAnimePage
- AdminPostsPage
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- PrivacySection.tsx
- gacha-card-back.spec.ts
- AdminUserDetail
- AdminCrystalCodesPage
- feedbacks/page.tsx
- perfil-seguidores.spec.ts
- Avatar

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
- `F17: Reduced Motion Is Comprehensive and Well-Implemented` --references--> `usePrefersReducedMotion()`  [INFERRED]
  docs/AUDIT.md → src/lib/use-prefers-reduced-motion.ts
- `F15: AdminGate Has No Dedicated Layout Guard` --references--> `AdminGate()`  [INFERRED]
  docs/AUDIT.md → src/components/common/AdminGate.tsx
- `P2 (Short-term)` --references--> `AdminGate()`  [INFERRED]
  docs/AUDIT.md → src/components/common/AdminGate.tsx
- `1a. Schema (Prisma)` --references--> `Anime`  [INFERRED]
  docs/seo-traffic-plan.md → src/types/index.ts
- `1b. Backend (NestJS)` --references--> `Anime`  [INFERRED]
  docs/seo-traffic-plan.md → src/types/index.ts

## Import Cycles
- None detected.

## Communities (172 total, 51 thin omitted)

### Community 0 - "loginAs"
Cohesion: 0.19
Nodes (9): cosmetics, svg(), card, meta, spin, card, cosmetic, loginAs() (+1 more)

### Community 1 - "safeImageSrc"
Cohesion: 0.15
Nodes (21): CalendarioPage(), metadata, PosterThumb(), revalidate, metadata, revalidate, TopPage(), Positive Findings (+13 more)

### Community 2 - "index.ts"
Cohesion: 0.04
Nodes (75): AdminDashboardStats, AdminPostItem, AuditLogItem, AuthResponse, GachaPullResponse, SiteSettings, WatchtowerJobStats, WatchtowerSourceHealth (+67 more)

### Community 3 - "EmptyState"
Cohesion: 0.20
Nodes (11): SORT_TABS, SortKey, UsuariosPage(), MyProfilePage(), FollowRow(), FollowButton(), UserCard(), EmptyState() (+3 more)

### Community 4 - "capas/page.tsx"
Cohesion: 0.07
Nodes (58): AdminCapasPage(), addLayer(), cancelEditing(), changeType(), save(), startEditing(), sync(), updateLayer() (+50 more)

### Community 5 - "usePrefersReducedMotion"
Cohesion: 0.16
Nodes (12): CrystalMotion(), CrystalMotionMode, CrystalMotionProps, MoteStyle, moteValue(), VIDEO_SOURCES, CrystalSplash(), DeferredCrystalSplash() (+4 more)

### Community 7 - "SiteNav"
Cohesion: 0.23
Nodes (8): AppLayout(), lenis, CrystalTransition(), Glyph(), MobileTabBar(), NavIcon(), SiteNav(), SmoothScrollProvider()

### Community 8 - "blog.ts"
Cohesion: 0.21
Nodes (17): BlogPage(), metadata, revalidate, GET(), revalidate, sitemap(), STATIC_ROUTES, BlogAdminActions() (+9 more)

### Community 9 - "blog/[slug]/page.tsx"
Cohesion: 0.11
Nodes (19): BlogPostPage(), findPost(), generateMetadata(), revalidate, GenerosPage(), metadata, revalidate, metadata (+11 more)

### Community 10 - "SEO & Tráfego — Plano de Implementação"
Cohesion: 0.12
Nodes (15): 1. CMS — Conteúdo editorial nos animes + Blog, 1a. Schema (Prisma), 1b. Backend (NestJS), 1c. Frontend, 1d. Migração de dados, 2. Página de índice `/generos`, 3. Schema VideoObject nos episódios, 4. Gêneros no sitemap (+7 more)

### Community 11 - "HeroSlide.tsx"
Cohesion: 0.17
Nodes (12): motion, ParallaxValues, useHeroParallax(), HeroCharacter(), HeroCharacterProps, HeroEnvironment(), HeroEnvironmentProps, HeroParticles() (+4 more)

### Community 12 - "GachaEconomyHub.tsx"
Cohesion: 0.09
Nodes (35): GachaShopPage(), GachaMarketPage(), FOCUSABLE, ACCENT, BOX_LABEL, BoxReveal(), boxRewardLabel(), BOX_FIELD (+27 more)

### Community 13 - "HomeSections.tsx"
Cohesion: 0.13
Nodes (28): HomePage(), metadata, revalidate, gsap, DividerSvg(), HomeBackdrop(), IceBeamDivider(), DeferredPersonalizedRails() (+20 more)

### Community 14 - "Anime"
Cohesion: 0.33
Nodes (8): AnimeCardProps, HeroUI(), HeroUIProps, RevealLabel(), isConcluded(), isOnAir(), statusLabel(), Anime

### Community 15 - "settings/page.tsx"
Cohesion: 0.11
Nodes (9): AVATAR_ACCEPT, prepareAvatar(), SettingsPage(), handleFilePicked(), handlePasswordChange(), NotificationPreferencesSection(), PrivacySection(), DashStat() (+1 more)

### Community 18 - "Baixa prioridade (acessibilidade)"
Cohesion: 0.06
Nodes (30): Alta prioridade (bugs reais), anchor-is-valid ×2, Baixa prioridade (acessibilidade), click-events-have-key-events ×3, Concluído, effect-needs-cleanup ×6, Falsos positivos documentados (não mexer), html-label-has-single-control ×1 (+22 more)

### Community 20 - "episode/[slug]/[number]/page.tsx"
Cohesion: 0.18
Nodes (11): AdminEditEpisodePage(), DeleteZone(), DeleteZoneProps, FieldLabel(), Hint(), ScrapeImportPanel(), ScrapeImportPanelProps, VideoUploadPanel() (+3 more)

### Community 21 - "NightMarket.tsx"
Cohesion: 0.26
Nodes (11): metadata, NightMarketPage(), GachaOfferGridSkeleton(), NightMarket(), offerImage(), offerKind(), offerName(), offerRarity() (+3 more)

### Community 22 - "RollStage.tsx"
Cohesion: 0.23
Nodes (10): Cristal do gacha (Manim), CountUp(), RARITY_TEXT, PARTICLE_GALAXY, particleCount(), revealSpeed(), ringCount(), RollStage() (+2 more)

### Community 23 - "cartas/page.tsx"
Cohesion: 0.17
Nodes (10): GachaCollectionPage(), handleReroll(), CardsFilterBar(), ChevronDown(), FilterBadge(), foilLabel(), buildSlots(), CardsPagination() (+2 more)

### Community 24 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, version, autoprefixer, eslint, eslint-config-next, @gsap/react, postcss (+11 more)

### Community 26 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 27 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 28 - "room/[slug]/page.tsx"
Cohesion: 0.06
Nodes (50): mergeMessages(), Participant, RoomPage(), Architecture Overview, F06: SyncedVideoPlayer Exceeds 800 Lines, F07: CommentSection Missing Loading Feedback on Submit/Delete, F09: ServiceNotice Uses Hardcoded Date Key, F10: ShareButtons Hardcodes Domain Instead of Using SITE_URL (+42 more)

### Community 29 - "Mobile Menu / Hamburger Menu Analysis"
Cohesion: 0.08
Nodes (25): 1. Overall Project Structure, 2. Mobile Menu / Hamburger Functionality, 3. Key Files, 4. Data Flow Summary: Main Mobile Nav Open/Close, 5. Essential Files for Understanding the Feature, 6. Architecture Insights, 7. Summary of Files Searched, A. Main Site Mobile Navigation (Bottom Sheet Drawer) (+17 more)

### Community 30 - "GachaCard.tsx"
Cohesion: 0.08
Nodes (27): CONDITION_ART, CONDITION_COLOR, CONDITION_GLYPH, CONDITION_SURFACE, FOIL_ART, FOIL_OVERLAY, FOIL_SHEEN, FOIL_TEXT (+19 more)

### Community 31 - "admin/usuarios/page.tsx"
Cohesion: 0.18
Nodes (7): ACTION_DESC, ACTION_LABELS, AdminUsersPage(), ModerateAction, ModerateUserModal(), ROLE_BADGE, ROLE_LABELS

### Community 32 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, eslint, eslint-config-next, @playwright/test, postcss, semantic-release, @semantic-release/changelog (+7 more)

### Community 33 - "AdminGenerosPage"
Cohesion: 0.67
Nodes (3): AdminGenerosPage(), handleNameChange(), slugify()

### Community 34 - "AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)"
Cohesion: 0.06
Nodes (29): AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript), API Routes, Code Details, Code Rules and Guidelines, Directory Structure, Eslint, Extra, Generating Icons for your Application (+21 more)

### Community 35 - "AdminGachaPage"
Cohesion: 0.12
Nodes (9): AdminGachaPage(), cancelEdit(), clearAnime(), onAnimeFilterChange(), resetForm(), saveCard(), selectAnime(), toggleAnimeFilter() (+1 more)

### Community 36 - "wishlist/page.tsx"
Cohesion: 0.27
Nodes (9): GachaWishlistContent(), GachaWishlistPage(), ProfileWishlist(), pageWindow(), PaginationControls(), GACHA_WISHLIST_PAGE_SIZE, readPage(), useGachaWishlist() (+1 more)

### Community 37 - "Header"
Cohesion: 0.15
Nodes (17): AdminLayout(), AdminShell(), AdminSidebar(), NAV_ITEMS, NavItem, ConfirmEmailContent(), ConfirmEmailPage(), AdminGate() (+9 more)

### Community 38 - "comunidade-usuarios.spec.ts"
Cohesion: 0.83
Nodes (3): API(), makeUsers(), mockUsersDirectory()

### Community 39 - "animes/[slug]/page.tsx"
Cohesion: 0.12
Nodes (24): AnimeDetailPage(), generateMetadata(), getAnime, revalidate, F08: RatingStars Radiogroup Keyboard Navigation Broken, AnimeListButton(), handleRemove(), handleSave() (+16 more)

### Community 40 - "next"
Cohesion: 0.09
Nodes (15): EditBlogPostPage(), NewBlogPostPage(), AdminBlogPage(), AdminImportPage(), metadata, cspHeader, nextConfig, next (+7 more)

### Community 41 - "pr-description.mjs"
Cohesion: 0.13
Nodes (11): breaking, dirs, fileLines, files, groups, isBack, LABELS, out (+3 more)

### Community 43 - "(app)/gacha/skins/page.tsx"
Cohesion: 0.24
Nodes (6): countdown(), GachaSkinsPage(), SkinTile(), SkinReveal(), GachaSkin, GachaSkinsResponse

### Community 44 - "mock-backend.js"
Cohesion: 0.18
Nodes (8): EPISODE, http, server, CORS_HEADERS, http, json(), server, url

### Community 45 - "GachaPageSkeleton"
Cohesion: 0.10
Nodes (22): Loading(), Loading(), Loading(), Loading(), Loading(), Loading(), CardOwners(), Encyclopedia() (+14 more)

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

### Community 52 - "Wordmark"
Cohesion: 0.10
Nodes (22): LoginForm(), handleSubmit(), LoginPage(), safeNext(), RecuperarSenhaPage(), RedefinirSenhaForm(), handleSubmit(), RedefinirSenhaPage() (+14 more)

### Community 53 - "(app)/gacha/page.tsx"
Cohesion: 0.17
Nodes (21): CrystalIcon(), formatCountdown(), GachaPage(), GachaPageContent(), closePreview(), handleApplyRanking(), handleBypass(), handleClaim() (+13 more)

### Community 54 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check:chunk-recovery, check:gacha-foils, dev, lint, predev, release (+5 more)

### Community 55 - "biblioteca/page.tsx"
Cohesion: 0.28
Nodes (7): EmptyState(), HistoryRow(), LibraryPage(), Tab, TAB_LABELS, TAB_STATUS, TABS

### Community 57 - "HomeHero.tsx"
Cohesion: 0.39
Nodes (6): DeferredHomeHero(), HeroProps, HeroSlide(), highlightLabelForHour(), HomeHero(), useIsMobile()

### Community 59 - "users/[userName]/page.tsx"
Cohesion: 0.06
Nodes (49): OverviewSkeleton(), ProfileSkeleton(), PublicProfilePage(), ensureTab(), handleNavigate(), TAB_ALIASES, DashStats, HeadingLevel (+41 more)

### Community 60 - "test-crystal/page.tsx"
Cohesion: 0.43
Nodes (5): metadata, TestCrystalPage(), CrystalVideoClean(), compileShader(), CrystalVideoPreview()

### Community 61 - "CHANGELOG.md"
Cohesion: 0.12
Nodes (16): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.2.0](https://github.com/1arley/animesice/compare/v1.1.0...v1.2.0) (2026-08-13), Bug Fixes, Bug Fixes (+8 more)

### Community 63 - "User"
Cohesion: 0.67
Nodes (3): RegisterResponse, User, AuthContextValue

### Community 64 - "HeroAtmosphere.tsx"
Cohesion: 0.32
Nodes (6): ogl, Aurora, HeroAtmosphere(), HeroAtmosphereProps, Aurora(), DEFAULT_COLOR_STOPS

### Community 65 - "buscar/page.tsx"
Cohesion: 0.14
Nodes (24): AnimesPage(), generateMetadata(), revalidate, first(), metadata, revalidate, SearchPage(), SearchParam (+16 more)

### Community 66 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 67 - "CrystalLoader"
Cohesion: 0.28
Nodes (7): Loading(), Loading(), Loading(), Loading(), Loading(), CrystalLoader(), CrystalLoaderProps

### Community 68 - "moderacao/page.tsx"
Cohesion: 0.18
Nodes (9): ACTION_LABELS, ModerateAction, ModerateUserInline(), ModerationPage(), REASON_LABELS, STATUS_LABELS, TARGET_LABELS, ReportItem (+1 more)

### Community 70 - "check-gacha-foils.mjs"
Cohesion: 0.15
Nodes (6): html, recoveryScript, scripts, BACKEND, FRONTEND, root

### Community 71 - "Team Playbook"
Cohesion: 0.40
Nodes (4): Execution And Handoff, Roles And Coordination, Team Formation, Team Playbook

### Community 72 - "1. Directory Structure Overview"
Cohesion: 0.17
Nodes (11): 1. Directory Structure Overview, Animesice - Next.js Frontend Structure Analysis, `app/` Directory (Next.js App Router), Architectural Patterns Identified, Code Quality Observations, Essential Files for Understanding the Feature Architecture, Pages Directory & Routing Summary, Root Level (+3 more)

### Community 73 - "NotificationPreferencesSection.tsx"
Cohesion: 0.29
Nodes (6): ALL_TYPES, channels, NOTIFICATION_LABELS, NotificationChannel, NotificationPreference, NotificationType

### Community 74 - "useToast"
Cohesion: 0.09
Nodes (23): AdminGachaConfigPage(), ConfigEntry, GROUP_LABELS, CRYSTAL_PACKAGES, GachaCrystalsPage(), TYPE_LABEL, Toast, ToastContext (+15 more)

### Community 75 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04)"
Cohesion: 0.40
Nodes (5): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04), Bug Fixes, Features, Performance Improvements, Reverts

### Community 78 - "EpisodeLoadingState.tsx"
Cohesion: 0.47
Nodes (4): EpisodeLoadingState(), PHRASES, TextLoop(), TextLoopProps

### Community 85 - "1.0.0 (2026-09-18)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-18), Bug Fixes, Features, Performance Improvements, Reverts

### Community 86 - "app/layout.tsx"
Cohesion: 0.05
Nodes (39): fontDisplay, fontPlexMono, fontPlexSans, metadata, RootLayout(), viewport, 1. Silent Error Swallowing, 2. No SWR/React Query — Manual Cache Invalidation (+31 more)

### Community 90 - "create/page.tsx"
Cohesion: 0.36
Nodes (5): AdminCreateAnimePage(), animeAudioLabelFromTitle(), isDubbedTitle(), slugify(), Genre

### Community 91 - "admin/gacha/skins/page.tsx"
Cohesion: 0.40
Nodes (4): EMPTY_FORM, SkinForm, AdminGachaCard, AdminGachaSkin

### Community 93 - "Repository Guidelines"
Cohesion: 0.25
Nodes (7): Agent Team, Code, Tests, Delivery, Commands, Project Structure, Repository Guidelines, Role and First Checks, UI, Security, Technology

### Community 94 - "PageTitle"
Cohesion: 0.33
Nodes (6): RegrasPage(), BlurText(), BlurTextProps, BlurTextTag, PageTitle(), PageTitleProps

### Community 95 - "ensureRefresh"
Cohesion: 0.40
Nodes (5): F04: `api.ts` ensureRefresh() Can Permanently Lock Refresh State, P1 (Next sprint), ensureRefresh(), readErrorMessage(), request()

### Community 96 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-06)"
Cohesion: 0.40
Nodes (5): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-06), Bug Fixes, Features, Performance Improvements, Reverts

### Community 98 - "Auditoria de UI/UX do mercado"
Cohesion: 0.33
Nodes (5): Achados tratados, Auditoria de UI/UX do mercado, Direcao visual, Limites e proximas prioridades, Verificacao

### Community 99 - "react"
Cohesion: 0.10
Nodes (31): AdminAuditPage(), AuditTab, RESOURCE_TYPES, AdminAnime, AdminConfigPage(), AdminCreateEpisodePage(), blank, Code (+23 more)

### Community 100 - "1.0.0 (2026-08-26)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-08-26), Bug Fixes, Features, Performance Improvements, Reverts

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

### Community 106 - "1.0.0 (2026-09-15)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-15), Bug Fixes, Features, Performance Improvements, Reverts

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

### Community 117 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-07)"
Cohesion: 0.40
Nodes (5): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-07), Bug Fixes, Features, Performance Improvements, Reverts

### Community 118 - "perfil-wishlist-url.spec.ts"
Cohesion: 0.50
Nodes (4): API(), mockProfileAndWishlist(), PROFILE, WISHLIST

### Community 119 - "1.0.0 (2026-08-14)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-14), Bug Fixes, Features, Performance Improvements

### Community 120 - "1.0.0 (2026-08-15)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-15), Bug Fixes, Features, Performance Improvements

### Community 121 - "NotificationBell"
Cohesion: 0.67
Nodes (3): loadApi(), NotificationBell(), markAllRead()

### Community 122 - "1.0.0 (2026-08-17)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-17), Bug Fixes, Features, Performance Improvements

### Community 126 - "1.0.0 (2026-08-19)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-19), Bug Fixes, Features, Performance Improvements

### Community 129 - "1.0.0 (2026-08-15)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-15), Bug Fixes, Features, Performance Improvements

### Community 130 - "api-server.ts"
Cohesion: 0.11
Nodes (21): POST(), POST(), GET(), dynamic, generateMetadata(), getEpisode, revalidate, toIso8601Duration() (+13 more)

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
Cohesion: 0.12
Nodes (11): FeedPage(), revalidate, CommentGlyph(), FeedPost(), HeartGlyph(), ShareGlyph(), FeedView(), FeedViewProps (+3 more)

### Community 136 - "helpers.ts"
Cohesion: 0.24
Nodes (8): API(), mockFeed(), openEditor(), VIEWER, AD_PATTERNS, blockAds(), clickCentered(), mockGeneric()

### Community 137 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

### Community 139 - "@playwright/test"
Cohesion: 0.17
Nodes (3): EBML_MAGIC, FTYP_BOX, @playwright/test

### Community 142 - "gacha_box_reveal.py"
Cohesion: 0.10
Nodes (9): CommonBox, GachaBoxReveal, PremiumBox, RareBox, render_assets(), diamond(), NightMarketCardReveal, render_asset() (+1 more)

### Community 148 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

### Community 155 - "gacha-trades.spec.ts"
Cohesion: 0.24
Nodes (8): MY_A, MY_B, nowIso(), pull(), trade(), ZOE, ZOE_BERU, ZOE_GOJO

### Community 156 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 157 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 158 - "CardPreview.tsx"
Cohesion: 0.23
Nodes (10): CompensationModal(), ConfirmDialog(), Modal(), CardInspectionPreview(), CardPreview(), CardPreviewProps, GachaCardInspection, OwnedCardPreview() (+2 more)

### Community 159 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 162 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 163 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 165 - "gacha-card-back.spec.ts"
Cohesion: 0.40
Nodes (4): pull, showBack(), SLOT, stage()

### Community 168 - "AdminCrystalCodesPage"
Cohesion: 0.40
Nodes (3): AdminCrystalCodesPage(), cancelEditing(), save()

### Community 170 - "feedbacks/page.tsx"
Cohesion: 0.17
Nodes (8): AdminFeedbacksPage(), STATUS_BADGE, STATUS_LABELS, TYPE_LABELS, AdminPedidosPage(), STATUS_BADGE, STATUS_LABELS, Paginated

### Community 172 - "perfil-seguidores.spec.ts"
Cohesion: 0.83
Nodes (3): API(), mockFollowLists(), mockProfile()

### Community 173 - "Avatar"
Cohesion: 0.15
Nodes (9): AuthButtons(), Avatar(), AvatarProps, CommentRow(), CommentSection(), CommentSectionProps, FeedComposer(), displayName() (+1 more)

## Knowledge Gaps
- **617 isolated node(s):** `name`, `version`, `private`, `dev`, `build` (+612 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 869 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `safeImageSrc`, `api-server.ts`, `EmptyState`, `capas/page.tsx`, `usePrefersReducedMotion`, `FeedPost.tsx`, `SiteNav`, `blog/[slug]/page.tsx`, `HeroSlide.tsx`, `GachaEconomyHub.tsx`, `HomeSections.tsx`, `settings/page.tsx`, `episode/[slug]/[number]/page.tsx`, `NightMarket.tsx`, `RollStage.tsx`, `cartas/page.tsx`, `package.json`, `room/[slug]/page.tsx`, `CardPreview.tsx`, `admin/usuarios/page.tsx`, `GachaCard.tsx`, `wishlist/page.tsx`, `Header`, `PrivacySection.tsx`, `animes/[slug]/page.tsx`, `next`, `feedbacks/page.tsx`, `(app)/gacha/skins/page.tsx`, `GachaPageSkeleton`, `Avatar`, `error.tsx`, `Wordmark`, `(app)/gacha/page.tsx`, `biblioteca/page.tsx`, `HomeHero.tsx`, `EpisodePrefetcher.tsx`, `users/[userName]/page.tsx`, `test-crystal/page.tsx`, `obras-externas/page.tsx`, `HeroAtmosphere.tsx`, `moderacao/page.tsx`, `NotificationPreferencesSection.tsx`, `useToast`, `EpisodeLoadingState.tsx`, `app/layout.tsx`, `create/page.tsx`, `admin/gacha/skins/page.tsx`, `PageTitle`, `GachaNav.tsx`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _617 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `safeImageSrc` be split into smaller, more focused modules?**
  _Cohesion score 0.14838709677419354 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `safeImageSrc`, `api-server.ts`, `EmptyState`, `capas/page.tsx`, `usePrefersReducedMotion`, `FeedPost.tsx`, `blog.ts`, `blog/[slug]/page.tsx`, `SiteNav`, `HeroSlide.tsx`, `GachaEconomyHub.tsx`, `HomeSections.tsx`, `Anime`, `settings/page.tsx`, `episode/[slug]/[number]/page.tsx`, `NightMarket.tsx`, `cartas/page.tsx`, `package.json`, `room/[slug]/page.tsx`, `CardPreview.tsx`, `admin/usuarios/page.tsx`, `GachaCard.tsx`, `wishlist/page.tsx`, `Header`, `animes/[slug]/page.tsx`, `(app)/gacha/skins/page.tsx`, `GachaPageSkeleton`, `Avatar`, `error.tsx`, `Wordmark`, `(app)/gacha/page.tsx`, `biblioteca/page.tsx`, `HomeHero.tsx`, `users/[userName]/page.tsx`, `HeroAtmosphere.tsx`, `buscar/page.tsx`, `useToast`, `app/layout.tsx`, `create/page.tsx`, `admin/gacha/skins/page.tsx`, `react`, `GachaNav.tsx`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04050632911392405 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `@playwright/test` to `loginAs`, `gacha-harden.spec.ts`, `gacha-card-back.spec.ts`, `comunidade-usuarios.spec.ts`, `check-gacha-foils.mjs`, `helpers.ts`, `perfil-seguidores.spec.ts`, `perfil-wishlist-url.spec.ts`, `package.json`, `gacha-trades.spec.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `capas/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06790890269151138 - nodes in this community are weakly interconnected._