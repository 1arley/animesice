# Graph Report - animesice  (2026-10-07)

## Corpus Check
- 329 files · ~320,795 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 12, .example 1, .css 1)

## Summary
- 1928 nodes · 4675 edges · 171 communities (121 shown, 50 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2ee4ed19`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @playwright/test
- Avatar
- me/page.tsx
- ProfileCollection.tsx
- capas/page.tsx
- CrystalMotion.tsx
- index.ts
- blog.ts
- calendario/page.tsx
- cosmetic-svg-authoring.ts
- ProfileHero.tsx
- GachaEconomyHub.tsx
- HomeSections.tsx
- users/[userName]/page.tsx
- RatingStars.tsx
- Baixa prioridade (acessibilidade)
- episode/[slug]/[number]/page.tsx
- ProfileActivity.tsx
- ContinueWatchingRail.tsx
- crystals/page.tsx
- package.json
- compilerOptions
- components.json
- url.ts
- Mobile Menu / Hamburger Menu Analysis
- react
- room/[slug]/page.tsx
- devDependencies
- app/layout.tsx
- AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)
- AdminGachaPage
- wishlist/page.tsx
- isOnAir
- CrystalLoader
- (app)/gacha/page.tsx
- BlogForm.tsx
- Anime
- PageTitle
- mock-backend.js
- GachaPageSkeleton
- ExternalWorksPage
- RollStage.tsx
- error.tsx
- dependencies
- Process
- AdminWatchtowerPage
- HeroSlide.tsx
- safeImageSrc
- scripts
- admin/gacha/page.tsx
- gacha/config/page.tsx
- cartas/page.tsx
- top/page.tsx
- test-crystal/page.tsx
- CHANGELOG.md
- buscar/page.tsx
- GachaCard.tsx
- ensureRefresh
- site.ts
- Product
- CommentSection.tsx
- moderacao/page.tsx
- console-debug.js
- check-chunk-recovery-build.mjs
- Team Playbook
- 1. Directory Structure Overview
- 1.0.0 (2026-08-26)
- 1.0.0 (2026-09-15)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04)
- dmca/page.tsx
- privacidade/page.tsx
- animes/[slug]/page.tsx
- .eslintrc.json
- postcss.config.mjs
- 1.0.0 (2026-09-18)
- 1.0.0 (2026-08-15)
- AdminCreateAnimePage
- 1.0.0 (2026-08-18)
- NightMarketIntro
- Repository Guidelines
- 1.0.0 (2026-08-18)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- Auditoria de UI/UX do mercado
- api-server.ts
- 1.0.0 (2026-08-20)
- usePrefersReducedMotion
- GachaNav.tsx
- 1.0.0 (2026-08-12)
- 1.0.0 (2026-08-25)
- 1.0.0 (2026-08-26)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-31)
- 1.0.0 (2026-09-04)
- 1.0.0 (2026-09-08)
- 1.0.0 (2026-09-12)
- 1.0.0 (2026-09-15)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-09-16)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-06)
- useToast
- 1.0.0 (2026-08-20)
- blog/[slug]/page.tsx
- 1.0.0 (2026-08-14)
- 1.0.0 (2026-08-15)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18)
- 1.0.0 (2026-08-17)
- next.config.ts
- implementer.md
- leader.md
- 1.0.0 (2026-08-19)
- researcher.md
- reviewer.md
- SEO & Tráfego — Plano de Implementação
- GachaLoadoutEditor.tsx
- AnimesIce Frontend Audit
- 1.0.0 (2026-08-21)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)
- EmptyState
- (app)/layout.tsx
- Findings
- AuthProvider
- gacha_box_reveal.py
- admin/revalidate/route.ts
- GachaMarketOfferHub.tsx
- INFO
- Recommended Action Plan
- AdminGenerosPage
- NotificationsPage
- User
- AdminBlogPage
- AdminImportPage
- allowScripts
- AdminCrystalCodesPage
- AnimeCard
- biblioteca/page.tsx
- next
- admin/usuarios/page.tsx
- EpisodePrefetcher.tsx

## God Nodes (most connected - your core abstractions)
1. `react` - 142 edges
2. `useAuth()` - 126 edges
3. `next` - 123 edges
4. `api` - 81 edges
5. `ApiError` - 64 edges
6. `safeImageSrc()` - 52 edges
7. `usePrefersReducedMotion()` - 46 edges
8. `isPrivileged()` - 40 edges
9. `Anime` - 38 edges
10. `useToast()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `F15: AdminGate Has No Dedicated Layout Guard` --references--> `AdminGate()`  [INFERRED]
  docs/AUDIT.md → src/components/common/AdminGate.tsx
- `P2 (Short-term)` --references--> `AdminGate()`  [INFERRED]
  docs/AUDIT.md → src/components/common/AdminGate.tsx
- `F04: `api.ts` ensureRefresh() Can Permanently Lock Refresh State` --references--> `ensureRefresh()`  [INFERRED]
  docs/AUDIT.md → src/lib/api.ts
- `P1 (Next sprint)` --references--> `ensureRefresh()`  [INFERRED]
  docs/AUDIT.md → src/lib/api.ts
- `F17: Reduced Motion Is Comprehensive and Well-Implemented` --references--> `usePrefersReducedMotion()`  [INFERRED]
  docs/AUDIT.md → src/lib/use-prefers-reduced-motion.ts

## Import Cycles
- None detected.

## Communities (171 total, 50 thin omitted)

### Community 0 - "@playwright/test"
Cohesion: 0.05
Nodes (51): API(), mockFeed(), API(), makeUsers(), mockUsersDirectory(), EBML_MAGIC, FTYP_BOX, pull (+43 more)

### Community 1 - "Avatar"
Cohesion: 0.09
Nodes (21): AVATAR_ACCEPT, prepareAvatar(), SettingsPage(), handleFilePicked(), handlePasswordChange(), AuthButtons(), Avatar(), AvatarProps (+13 more)

### Community 2 - "me/page.tsx"
Cohesion: 0.09
Nodes (25): AdminLayout(), AdminShell(), AdminSidebar(), NAV_ITEMS, NavItem, MyProfilePage(), ConfirmEmailContent(), ConfirmEmailPage() (+17 more)

### Community 3 - "ProfileCollection.tsx"
Cohesion: 0.25
Nodes (8): PosterTile(), PosterTileProps, ProfileCollection(), STATUS_FILTERS, STATUS_LABELS, ProfileFavorites(), PublicFavoriteItem, WatchStatus

### Community 4 - "capas/page.tsx"
Cohesion: 0.14
Nodes (26): AUDIT_STYLE, blank, CosmeticPreview(), SLOT_HINT, SLOT_LABEL, Asset, cache, CosmeticSvg (+18 more)

### Community 5 - "CrystalMotion.tsx"
Cohesion: 0.18
Nodes (12): CrystalMotion(), CrystalMotionMode, CrystalMotionProps, MoteStyle, moteValue(), VIDEO_SOURCES, CrystalSplash(), DeferredCrystalSplash() (+4 more)

### Community 7 - "index.ts"
Cohesion: 0.04
Nodes (64): ALL_TYPES, channels, NOTIFICATION_LABELS, FIELDS, AdminDashboardStats, AdminPostItem, AdminUserDetail, AdminUserListItem (+56 more)

### Community 8 - "blog.ts"
Cohesion: 0.24
Nodes (16): BlogPage(), metadata, revalidate, GET(), revalidate, sitemap(), STATIC_ROUTES, serverListBlogPosts() (+8 more)

### Community 9 - "calendario/page.tsx"
Cohesion: 0.32
Nodes (6): CalendarioPage(), metadata, PosterThumb(), revalidate, YearFilter(), CalendarResponse

### Community 10 - "cosmetic-svg-authoring.ts"
Cohesion: 0.13
Nodes (25): AdminCapasPage(), addLayer(), cancelEditing(), changeType(), save(), startEditing(), sync(), updateLayer() (+17 more)

### Community 11 - "ProfileHero.tsx"
Cohesion: 0.13
Nodes (13): FeaturedPortrait(), FeaturedPortraitSkeleton(), CalendarIcon(), ExternalIcon(), FlagIcon(), ProfileHero(), REPORT_REASONS, ShareIcon() (+5 more)

### Community 12 - "GachaEconomyHub.tsx"
Cohesion: 0.09
Nodes (32): GachaShopPage(), GachaMarketPage(), FOCUSABLE, ACCENT, BOX_LABEL, BoxReveal(), boxRewardLabel(), BOX_FIELD (+24 more)

### Community 13 - "HomeSections.tsx"
Cohesion: 0.16
Nodes (25): HomePage(), metadata, revalidate, gsap, DividerSvg(), HomeBackdrop(), IceBeamDivider(), alreadyTriggered() (+17 more)

### Community 14 - "users/[userName]/page.tsx"
Cohesion: 0.10
Nodes (19): OverviewSkeleton(), ProfileSkeleton(), PublicProfilePage(), ensureTab(), handleNavigate(), TAB_ALIASES, ProfileAbout(), ProfileGacha() (+11 more)

### Community 15 - "RatingStars.tsx"
Cohesion: 0.18
Nodes (15): F08: RatingStars Radiogroup Keyboard Navigation Broken, FavoriteButton(), FavoriteButtonProps, AnimeStatsDisplay(), RatingStars(), handleKeyDown(), handleRate(), handleRemove() (+7 more)

### Community 18 - "Baixa prioridade (acessibilidade)"
Cohesion: 0.06
Nodes (30): Alta prioridade (bugs reais), anchor-is-valid ×2, Baixa prioridade (acessibilidade), click-events-have-key-events ×3, Concluído, effect-needs-cleanup ×6, Falsos positivos documentados (não mexer), html-label-has-single-control ×1 (+22 more)

### Community 20 - "episode/[slug]/[number]/page.tsx"
Cohesion: 0.21
Nodes (10): AdminEditEpisodePage(), DeleteZone(), FieldLabel(), Hint(), ScrapeImportPanel(), ScrapeImportPanelProps, VideoUploadPanel(), VideoUploadPanelProps (+2 more)

### Community 21 - "ProfileActivity.tsx"
Cohesion: 0.19
Nodes (14): ActivityRow(), CommentGlyph(), CommentLike(), EventVerb(), ProfileActivity(), ProfileActivityProps, Star(), Stars() (+6 more)

### Community 22 - "ContinueWatchingRail.tsx"
Cohesion: 0.13
Nodes (13): AdminFeedbacksPage(), STATUS_BADGE, STATUS_LABELS, TYPE_LABELS, AdminPedidosPage(), STATUS_BADGE, STATUS_LABELS, AnimeListButtonProps (+5 more)

### Community 23 - "crystals/page.tsx"
Cohesion: 0.22
Nodes (5): CRYSTAL_PACKAGES, GachaCrystalsPage(), TYPE_LABEL, CrystalEvent, CrystalEventType

### Community 24 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, version, autoprefixer, eslint, eslint-config-next, @gsap/react, postcss (+10 more)

### Community 26 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 27 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 28 - "url.ts"
Cohesion: 0.17
Nodes (16): AnimesPage(), generateMetadata(), revalidate, dynamic, generateMetadata(), GenrePage(), generateMetadata(), LancamentosPage() (+8 more)

### Community 29 - "Mobile Menu / Hamburger Menu Analysis"
Cohesion: 0.08
Nodes (25): 1. Overall Project Structure, 2. Mobile Menu / Hamburger Functionality, 3. Key Files, 4. Data Flow Summary: Main Mobile Nav Open/Close, 5. Essential Files for Understanding the Feature, 6. Architecture Insights, 7. Summary of Files Searched, A. Main Site Mobile Navigation (Bottom Sheet Drawer) (+17 more)

### Community 30 - "react"
Cohesion: 0.09
Nodes (28): AdminAuditPage(), AuditTab, RESOURCE_TYPES, AdminAnime, AdminCatalogoPage(), AdminConfigPage(), AdminCreateEpisodePage(), AdminEditAnimePage() (+20 more)

### Community 31 - "room/[slug]/page.tsx"
Cohesion: 0.06
Nodes (48): mergeMessages(), Participant, RoomPage(), Architecture Overview, F06: SyncedVideoPlayer Exceeds 800 Lines, F07: CommentSection Missing Loading Feedback on Submit/Delete, F09: ServiceNotice Uses Hardcoded Date Key, F10: ShareButtons Hardcodes Domain Instead of Using SITE_URL (+40 more)

### Community 32 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, eslint, eslint-config-next, @playwright/test, postcss, semantic-release, @semantic-release/changelog (+7 more)

### Community 33 - "app/layout.tsx"
Cohesion: 0.21
Nodes (9): fontDisplay, fontPlexMono, fontPlexSans, metadata, RootLayout(), viewport, MonetagVignette(), ToastProvider() (+1 more)

### Community 34 - "AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)"
Cohesion: 0.08
Nodes (23): AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript), API Routes, Code Details, Code Rules and Guidelines, Directory Structure, Eslint, Extra, Generating Icons for your Application (+15 more)

### Community 35 - "AdminGachaPage"
Cohesion: 0.13
Nodes (8): AdminGachaPage(), cancelEdit(), clearAnime(), onAnimeFilterChange(), resetForm(), saveCard(), selectAnime(), toggleAnimeFilter()

### Community 36 - "wishlist/page.tsx"
Cohesion: 0.25
Nodes (10): GachaWishlistContent(), GachaWishlistPage(), ProfileWishlist(), pageWindow(), PaginationControls(), GACHA_WISHLIST_PAGE_SIZE, readPage(), useGachaWishlist() (+2 more)

### Community 37 - "isOnAir"
Cohesion: 0.52
Nodes (5): HeroUI(), RevealLabel(), isConcluded(), isOnAir(), statusLabel()

### Community 38 - "CrystalLoader"
Cohesion: 0.28
Nodes (7): Loading(), Loading(), Loading(), Loading(), Loading(), CrystalLoader(), CrystalLoaderProps

### Community 39 - "(app)/gacha/page.tsx"
Cohesion: 0.20
Nodes (19): CrystalIcon(), formatCountdown(), GachaPage(), GachaPageContent(), closePreview(), handleApplyRanking(), handleBypass(), handleClaim() (+11 more)

### Community 40 - "BlogForm.tsx"
Cohesion: 0.18
Nodes (14): EditBlogPostPage(), NewBlogPostPage(), 1. CMS — Conteúdo editorial nos animes + Blog, 1a. Schema (Prisma), 1b. Backend (NestJS), 1c. Frontend, 1d. Migração de dados, BlogForm() (+6 more)

### Community 41 - "Anime"
Cohesion: 0.19
Nodes (12): AnimeCardProps, DeferredHomeHero(), HeroProps, HeroSlideProps, HeroUIProps, highlightLabelForHour(), HomeHero(), WatchClientProps (+4 more)

### Community 43 - "PageTitle"
Cohesion: 0.33
Nodes (6): RegrasPage(), BlurText(), BlurTextProps, BlurTextTag, PageTitle(), PageTitleProps

### Community 44 - "mock-backend.js"
Cohesion: 0.18
Nodes (8): EPISODE, http, server, CORS_HEADERS, http, json(), server, url

### Community 45 - "GachaPageSkeleton"
Cohesion: 0.06
Nodes (41): Loading(), Loading(), Loading(), Loading(), Loading(), Loading(), Encyclopedia(), EncyclopediaPage() (+33 more)

### Community 47 - "RollStage.tsx"
Cohesion: 0.24
Nodes (9): Cristal do gacha (Manim), CountUp(), PARTICLE_GALAXY, particleCount(), revealSpeed(), ringCount(), RollStage(), shakeAmp() (+1 more)

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

### Community 52 - "HeroSlide.tsx"
Cohesion: 0.19
Nodes (13): motion, ParallaxValues, useHeroParallax(), HeroCharacter(), HeroCharacterProps, HeroEnvironment(), HeroEnvironmentProps, HeroParticles() (+5 more)

### Community 53 - "safeImageSrc"
Cohesion: 0.31
Nodes (10): HeadingLevel, SectionLabel(), SectionLabelProps, ProfileCurrentlyWatching(), FollowRow(), ProfileFollowList(), ProfileRatings(), formatDate() (+2 more)

### Community 54 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check:chunk-recovery, dev, lint, release, release:dry, skills:install (+3 more)

### Community 55 - "admin/gacha/page.tsx"
Cohesion: 0.33
Nodes (5): animeLabel(), AnimeOption, TIERS, AdminGachaCard, GachaEngagementPilotDashboard

### Community 58 - "cartas/page.tsx"
Cohesion: 0.13
Nodes (14): GachaCollectionPage(), handleReroll(), CompensationModal(), ConfirmDialog(), CardPreview(), share(), CardsFilterBar(), ChevronDown() (+6 more)

### Community 59 - "top/page.tsx"
Cohesion: 0.32
Nodes (5): metadata, revalidate, TopPage(), TiltedCard(), TiltedCardProps

### Community 60 - "test-crystal/page.tsx"
Cohesion: 0.43
Nodes (5): metadata, TestCrystalPage(), CrystalVideoClean(), compileShader(), CrystalVideoPreview()

### Community 61 - "CHANGELOG.md"
Cohesion: 0.11
Nodes (17): 1.0.0 (2026-08-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.2.0](https://github.com/1arley/animesice/compare/v1.1.0...v1.2.0) (2026-08-13), Bug Fixes, Bug Fixes (+9 more)

### Community 62 - "buscar/page.tsx"
Cohesion: 0.22
Nodes (12): first(), metadata, revalidate, SearchPage(), SearchParam, YEARS, animeFormatLabel(), animeSeasonLabel() (+4 more)

### Community 63 - "GachaCard.tsx"
Cohesion: 0.19
Nodes (12): CONDITION_ART, CONDITION_COLOR, CONDITION_GLYPH, CONDITION_SURFACE, FOIL_TEXT, GALAXY_FRAME, GALAXY_TEXT, RARITY (+4 more)

### Community 64 - "ensureRefresh"
Cohesion: 0.67
Nodes (3): ensureRefresh(), readErrorMessage(), request()

### Community 65 - "site.ts"
Cohesion: 0.23
Nodes (5): config, ShareButtonsProps, APEX_CANONICAL_HOSTS, ASSET_URL, SITE_URL

### Community 66 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 67 - "CommentSection.tsx"
Cohesion: 0.22
Nodes (4): CommentRow(), CommentSection(), CommentSectionProps, CommentItem

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

### Community 73 - "1.0.0 (2026-08-26)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-08-26), Bug Fixes, Features, Performance Improvements, Reverts

### Community 74 - "1.0.0 (2026-09-15)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-15), Bug Fixes, Features, Performance Improvements, Reverts

### Community 75 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04)"
Cohesion: 0.40
Nodes (5): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04), Bug Fixes, Features, Performance Improvements, Reverts

### Community 78 - "animes/[slug]/page.tsx"
Cohesion: 0.16
Nodes (14): AnimeDetailPage(), generateMetadata(), getAnime, revalidate, AnimeListButton(), handleRemove(), handleSave(), refreshState() (+6 more)

### Community 85 - "1.0.0 (2026-09-18)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-18), Bug Fixes, Features, Performance Improvements, Reverts

### Community 86 - "1.0.0 (2026-08-15)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-15), Bug Fixes, Features, Performance Improvements

### Community 90 - "AdminCreateAnimePage"
Cohesion: 0.33
Nodes (4): AdminCreateAnimePage(), animeAudioLabelFromTitle(), isDubbedTitle(), slugify()

### Community 91 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

### Community 93 - "Repository Guidelines"
Cohesion: 0.25
Nodes (7): Agent Team, Code, Tests, Delivery, Commands, Project Structure, Repository Guidelines, Role and First Checks, UI, Security, Technology

### Community 94 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

### Community 95 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 96 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 98 - "Auditoria de UI/UX do mercado"
Cohesion: 0.33
Nodes (5): Achados tratados, Auditoria de UI/UX do mercado, Direcao visual, Limites e proximas prioridades, Verificacao

### Community 99 - "api-server.ts"
Cohesion: 0.13
Nodes (15): GET(), dynamic, generateMetadata(), getEpisode, revalidate, toIso8601Duration(), WatchPage(), contentType (+7 more)

### Community 100 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 101 - "usePrefersReducedMotion"
Cohesion: 0.23
Nodes (9): ogl, Aurora, HeroAtmosphere(), HeroAtmosphereProps, Aurora(), DEFAULT_COLOR_STOPS, Spark, HoloTilt() (+1 more)

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

### Community 106 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

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

### Community 114 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-06)"
Cohesion: 0.40
Nodes (5): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-06), Bug Fixes, Features, Performance Improvements, Reverts

### Community 116 - "useToast"
Cohesion: 0.16
Nodes (14): AdminGachaConfigPage(), Toast, ToastContext, ToastContextValue, useToast(), GachaRowsSkeleton(), ACTIVE, CardChoiceList() (+6 more)

### Community 117 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 118 - "blog/[slug]/page.tsx"
Cohesion: 0.29
Nodes (9): BlogPostPage(), findPost(), generateMetadata(), revalidate, BlogAdminActions(), serverGetBlogPost(), isLegacyBlogPost(), legacyBlogPost() (+1 more)

### Community 119 - "1.0.0 (2026-08-14)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-14), Bug Fixes, Features, Performance Improvements

### Community 120 - "1.0.0 (2026-08-15)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-15), Bug Fixes, Features, Performance Improvements

### Community 121 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18)"
Cohesion: 0.67
Nodes (3): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), Bug Fixes, Features

### Community 122 - "1.0.0 (2026-08-17)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-17), Bug Fixes, Features, Performance Improvements

### Community 126 - "1.0.0 (2026-08-19)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-19), Bug Fixes, Features, Performance Improvements

### Community 129 - "SEO & Tráfego — Plano de Implementação"
Cohesion: 0.18
Nodes (10): 2. Página de índice `/generos`, 3. Schema VideoObject nos episódios, 4. Gêneros no sitemap, 5. hreflang `pt-BR`, Contexto, Decisões fechadas, Ordem de execução recomendada, SEO & Tráfego — Plano de Implementação (+2 more)

### Community 130 - "GachaLoadoutEditor.tsx"
Cohesion: 0.36
Nodes (7): GachaColecaoPage(), metadata, CosmeticSlotPicker(), EMPTY, GachaLoadoutEditor(), owned(), cosmeticTypeOf()

### Community 131 - "AnimesIce Frontend Audit"
Cohesion: 0.22
Nodes (8): 1. Silent Error Swallowing, 2. No SWR/React Query — Manual Cache Invalidation, 3. Large Client Components, AnimesIce Frontend Audit, Cross-cutting Problems, Executive Summary, Skills Used, Test Coverage Gaps

### Community 132 - "1.0.0 (2026-08-21)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-21), Bug Fixes, Features, Performance Improvements

### Community 133 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)"
Cohesion: 0.50
Nodes (4): [1.0.1](https://github.com/1arley/animesice/compare/v1.0.0...v1.0.1) (2026-08-12), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12), Bug Fixes, Features

### Community 135 - "EmptyState"
Cohesion: 0.10
Nodes (16): FeedPage(), GenerosPage(), metadata, revalidate, CommentGlyph(), FeedPost(), HeartGlyph(), ShareGlyph() (+8 more)

### Community 136 - "(app)/layout.tsx"
Cohesion: 0.43
Nodes (4): AppLayout(), lenis, CrystalTransition(), SmoothScrollProvider()

### Community 137 - "Findings"
Cohesion: 0.25
Nodes (8): CRITICAL, F01: Cross-Project Brand Contamination in hentaisice Fork, F02: Modal Focus Trap Not Implemented, F03: Toast Notifications Not Announced to Screen Readers, F04: `api.ts` ensureRefresh() Can Permanently Lock Refresh State, F05: CSP Uses `unsafe-inline` for `script-src`, Findings, HIGH

### Community 139 - "AuthProvider"
Cohesion: 0.25
Nodes (8): F12: FavoriteButton Has No Visual Loading Feedback, F13: FeedPost Silently Swallows Share Error, F14: Auth Context Shows Loading Flash on First Render, F15: AdminGate Has No Dedicated Layout Guard, LOW, Key Design Decisions, AuthProvider(), loadApi()

### Community 142 - "gacha_box_reveal.py"
Cohesion: 0.10
Nodes (9): CommonBox, GachaBoxReveal, PremiumBox, RareBox, render_assets(), diamond(), NightMarketCardReveal, render_asset() (+1 more)

### Community 148 - "admin/revalidate/route.ts"
Cohesion: 0.53
Nodes (4): POST(), POST(), API_URL, isPrivilegedRole()

### Community 155 - "GachaMarketOfferHub.tsx"
Cohesion: 0.47
Nodes (4): GachaMarketOfferHub(), OfferCard(), personName(), GachaMarketOffer

### Community 156 - "INFO"
Cohesion: 0.40
Nodes (5): F16: Build, Typecheck, and Lint Pass Cleanly, F17: Reduced Motion Is Comprehensive and Well-Implemented, F18: Open Redirect Protection in Login Is Correct, F19: Chunk Recovery System Is Well-Designed, INFO

### Community 157 - "Recommended Action Plan"
Cohesion: 0.40
Nodes (5): P0 (Immediate — Ship blockers), P1 (Next sprint), P2 (Short-term), P3 (Medium-term), Recommended Action Plan

### Community 158 - "AdminGenerosPage"
Cohesion: 0.67
Nodes (3): AdminGenerosPage(), handleNameChange(), slugify()

### Community 160 - "User"
Cohesion: 0.67
Nodes (3): RegisterResponse, User, AuthContextValue

### Community 212 - "AdminCrystalCodesPage"
Cohesion: 0.40
Nodes (3): AdminCrystalCodesPage(), cancelEditing(), save()

### Community 221 - "AnimeCard"
Cohesion: 0.12
Nodes (21): SORT_TABS, SortKey, UsuariosPage(), handleSubmit(), safeNext(), Positive Findings, AdaptiveImage(), AdaptiveImageProps (+13 more)

### Community 232 - "biblioteca/page.tsx"
Cohesion: 0.22
Nodes (9): EmptyState(), HistoryRow(), LibraryPage(), Tab, TAB_LABELS, TAB_STATUS, TABS, UserAnimeListItem (+1 more)

### Community 238 - "next"
Cohesion: 0.08
Nodes (22): metadata, LoginForm(), LoginPage(), RecuperarSenhaPage(), RedefinirSenhaForm(), handleSubmit(), RedefinirSenhaPage(), RegisterPage() (+14 more)

### Community 239 - "admin/usuarios/page.tsx"
Cohesion: 0.18
Nodes (7): ACTION_DESC, ACTION_LABELS, AdminUsersPage(), ModerateAction, ModerateUserModal(), ROLE_BADGE, ROLE_LABELS

## Knowledge Gaps
- **583 isolated node(s):** `extends`, `next/core-web-vitals`, `dynamic`, `revalidate`, `size` (+578 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 831 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Avatar`, `me/page.tsx`, `GachaLoadoutEditor.tsx`, `capas/page.tsx`, `CrystalMotion.tsx`, `index.ts`, `(app)/layout.tsx`, `EmptyState`, `ProfileHero.tsx`, `GachaEconomyHub.tsx`, `HomeSections.tsx`, `users/[userName]/page.tsx`, `RatingStars.tsx`, `episode/[slug]/[number]/page.tsx`, `ProfileActivity.tsx`, `ContinueWatchingRail.tsx`, `crystals/page.tsx`, `package.json`, `GachaMarketOfferHub.tsx`, `room/[slug]/page.tsx`, `app/layout.tsx`, `wishlist/page.tsx`, `(app)/gacha/page.tsx`, `BlogForm.tsx`, `Anime`, `PageTitle`, `GachaPageSkeleton`, `RollStage.tsx`, `error.tsx`, `HeroSlide.tsx`, `admin/gacha/page.tsx`, `gacha/config/page.tsx`, `cartas/page.tsx`, `top/page.tsx`, `test-crystal/page.tsx`, `GachaCard.tsx`, `site.ts`, `CommentSection.tsx`, `moderacao/page.tsx`, `animes/[slug]/page.tsx`, `AnimeCard`, `api-server.ts`, `usePrefersReducedMotion`, `GachaNav.tsx`, `biblioteca/page.tsx`, `next`, `admin/usuarios/page.tsx`, `EpisodePrefetcher.tsx`, `useToast`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `dynamic` to the rest of the system?**
  _583 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `@playwright/test` be split into smaller, more focused modules?**
  _Cohesion score 0.050774526678141134 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `Avatar`, `me/page.tsx`, `GachaLoadoutEditor.tsx`, `capas/page.tsx`, `CrystalMotion.tsx`, `ProfileCollection.tsx`, `EmptyState`, `blog.ts`, `calendario/page.tsx`, `(app)/layout.tsx`, `ProfileHero.tsx`, `GachaEconomyHub.tsx`, `HomeSections.tsx`, `users/[userName]/page.tsx`, `RatingStars.tsx`, `episode/[slug]/[number]/page.tsx`, `admin/revalidate/route.ts`, `ContinueWatchingRail.tsx`, `crystals/page.tsx`, `package.json`, `ProfileActivity.tsx`, `url.ts`, `react`, `room/[slug]/page.tsx`, `app/layout.tsx`, `wishlist/page.tsx`, `isOnAir`, `(app)/gacha/page.tsx`, `BlogForm.tsx`, `Anime`, `GachaPageSkeleton`, `error.tsx`, `HeroSlide.tsx`, `safeImageSrc`, `admin/gacha/page.tsx`, `gacha/config/page.tsx`, `cartas/page.tsx`, `top/page.tsx`, `buscar/page.tsx`, `GachaCard.tsx`, `site.ts`, `CommentSection.tsx`, `animes/[slug]/page.tsx`, `AnimeCard`, `api-server.ts`, `usePrefersReducedMotion`, `GachaNav.tsx`, `biblioteca/page.tsx`, `admin/usuarios/page.tsx`, `blog/[slug]/page.tsx`, `next.config.ts`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Should `Avatar` be split into smaller, more focused modules?**
  _Cohesion score 0.08826945412311266 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `react` to `Avatar`, `me/page.tsx`, `GachaLoadoutEditor.tsx`, `EmptyState`, `AuthProvider`, `GachaEconomyHub.tsx`, `ProfileHero.tsx`, `RatingStars.tsx`, `episode/[slug]/[number]/page.tsx`, `ProfileActivity.tsx`, `ContinueWatchingRail.tsx`, `crystals/page.tsx`, `GachaMarketOfferHub.tsx`, `AdminGenerosPage`, `room/[slug]/page.tsx`, `NotificationsPage`, `AdminGachaPage`, `wishlist/page.tsx`, `(app)/gacha/page.tsx`, `GachaPageSkeleton`, `AdminWatchtowerPage`, `admin/gacha/page.tsx`, `cartas/page.tsx`, `CommentSection.tsx`, `moderacao/page.tsx`, `animes/[slug]/page.tsx`, `AdminCreateAnimePage`, `AnimeCard`, `biblioteca/page.tsx`, `next`, `admin/usuarios/page.tsx`, `useToast`, `blog/[slug]/page.tsx`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `me/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09390243902439024 - nodes in this community are weakly interconnected._