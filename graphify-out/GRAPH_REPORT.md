# Graph Report - animesice  (2026-10-07)

## Corpus Check
- 331 files · ~323,375 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 12, .example 1, .css 1)

## Summary
- 1960 nodes · 4729 edges · 166 communities (117 shown, 49 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7dfeebf6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @playwright/test
- Avatar
- me/page.tsx
- time.ts
- capas/page.tsx
- usePrefersReducedMotion
- index.ts
- blog.ts
- blur.ts
- CardPreview.tsx
- ProfileHero.tsx
- GachaEconomyHub.tsx
- HomeSections.tsx
- users/[userName]/page.tsx
- RatingStars.tsx
- Baixa prioridade (acessibilidade)
- episode/[slug]/[number]/page.tsx
- FeedActivityItem.tsx
- cartas/page.tsx
- (app)/gacha/page.tsx
- package.json
- compilerOptions
- components.json
- animes/page.tsx
- Mobile Menu / Hamburger Menu Analysis
- react
- room/[slug]/page.tsx
- devDependencies
- app/layout.tsx
- AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)
- AdminGachaPage
- wishlist/page.tsx
- next
- CrystalLoader
- EmptyState
- BlogForm.tsx
- pr-description.mjs
- PublicProfilePage
- mock-backend.js
- GachaPageSkeleton
- obras-externas/page.tsx
- RollStage.tsx
- error.tsx
- dependencies
- Process
- AdminWatchtowerPage
- HeroSlide.tsx
- SectionLabel.tsx
- scripts
- admin/gacha/page.tsx
- skins/page.tsx
- GachaCard.tsx
- motion
- test-crystal/page.tsx
- CHANGELOG.md
- buscar/page.tsx
- PageTitle
- ensureRefresh
- animes/[slug]/[number]/page.tsx
- Product
- ProfileActivity.tsx
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
- create/page.tsx
- 1.0.0 (2026-08-18)
- NightMarketIntro
- Repository Guidelines
- 1.0.0 (2026-08-18)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- Auditoria de UI/UX do mercado
- Anime
- 1.0.0 (2026-08-20)
- HeroAtmosphere.tsx
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
- biblioteca/layout.tsx
- implementer.md
- leader.md
- 1.0.0 (2026-08-19)
- researcher.md
- reviewer.md
- CompensationModal.tsx
- feedbacks/page.tsx
- CommentSection
- 1.0.0 (2026-08-21)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)
- FeedPost.tsx
- gsap.ts
- NotificationPreferencesSection.tsx
- smooth-scroll.tsx
- gacha_box_reveal.py
- api-server.ts
- next.config.ts
- User
- allowScripts
- AdminGenerosPage
- AdminBlogPage
- AdminImportPage
- safeImageSrc
- biblioteca/page.tsx
- Wordmark
- admin/usuarios/page.tsx

## God Nodes (most connected - your core abstractions)
1. `react` - 142 edges
2. `useAuth()` - 126 edges
3. `next` - 123 edges
4. `api` - 81 edges
5. `ApiError` - 64 edges
6. `safeImageSrc()` - 54 edges
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
- `Positive Findings` --references--> `safeNext()`  [INFERRED]
  docs/AUDIT.md → app/(auth)/login/page.tsx
- `Positive Findings` --references--> `DeferredCrystalSplash()`  [INFERRED]
  docs/AUDIT.md → src/components/animesice/DeferredCrystalSplash.tsx

## Import Cycles
- None detected.

## Communities (166 total, 49 thin omitted)

### Community 0 - "@playwright/test"
Cohesion: 0.05
Nodes (51): API(), mockFeed(), API(), makeUsers(), mockUsersDirectory(), EBML_MAGIC, FTYP_BOX, pull (+43 more)

### Community 1 - "Avatar"
Cohesion: 0.07
Nodes (27): AdminUserDetailPage(), MetadataRow(), AppLayout(), AVATAR_ACCEPT, prepareAvatar(), SettingsPage(), handleFilePicked(), AuthButtons() (+19 more)

### Community 2 - "me/page.tsx"
Cohesion: 0.14
Nodes (18): AdminLayout(), AdminShell(), AdminSidebar(), NAV_ITEMS, NavItem, MyProfilePage(), ConfirmEmailContent(), ConfirmEmailPage() (+10 more)

### Community 3 - "time.ts"
Cohesion: 0.25
Nodes (9): SORT_TABS, SortKey, UsuariosPage(), FollowRow(), ProfileFollowList(), FollowButton(), UserCard(), formatDate() (+1 more)

### Community 4 - "capas/page.tsx"
Cohesion: 0.06
Nodes (61): AdminCapasPage(), addLayer(), cancelEditing(), changeType(), save(), startEditing(), sync(), updateLayer() (+53 more)

### Community 5 - "usePrefersReducedMotion"
Cohesion: 0.17
Nodes (16): CrystalMotion(), CrystalMotionMode, CrystalMotionProps, MoteStyle, moteValue(), VIDEO_SOURCES, CrystalSplash(), CrystalTransition() (+8 more)

### Community 7 - "index.ts"
Cohesion: 0.05
Nodes (53): AdminDashboardStats, AdminPostItem, AdminUserDetail, AdminUserListItem, AuditLogItem, AuthResponse, GachaPullResponse, SiteSettings (+45 more)

### Community 8 - "blog.ts"
Cohesion: 0.24
Nodes (16): BlogPage(), metadata, revalidate, GET(), revalidate, sitemap(), STATIC_ROUTES, serverListBlogPosts() (+8 more)

### Community 9 - "blur.ts"
Cohesion: 0.16
Nodes (9): CalendarioPage(), metadata, PosterThumb(), revalidate, YearFilter(), land69, post89, square (+1 more)

### Community 10 - "CardPreview.tsx"
Cohesion: 0.19
Nodes (16): ConfirmDialog(), Modal(), CardInspectionPreview(), CardPreview(), CardPreviewProps, OwnedCardPreview(), share(), GachaRowsSkeleton() (+8 more)

### Community 11 - "ProfileHero.tsx"
Cohesion: 0.23
Nodes (9): FeaturedPortrait(), FeaturedPortraitSkeleton(), CalendarIcon(), ExternalIcon(), FlagIcon(), ProfileHero(), REPORT_REASONS, ShareIcon() (+1 more)

### Community 12 - "GachaEconomyHub.tsx"
Cohesion: 0.09
Nodes (35): GachaShopPage(), GachaMarketPage(), FOCUSABLE, ACCENT, BOX_LABEL, BoxReveal(), boxRewardLabel(), GachaCardInspection (+27 more)

### Community 13 - "HomeSections.tsx"
Cohesion: 0.19
Nodes (23): HomePage(), metadata, revalidate, HomeBackdrop(), DeferredPersonalizedRails(), Rail, SectionLabel(), Reveal() (+15 more)

### Community 14 - "users/[userName]/page.tsx"
Cohesion: 0.19
Nodes (12): TAB_ALIASES, ProfileAbout(), ProfileNav(), ProfileTab, TABS, ProfileStats(), StatItem, buildTaste() (+4 more)

### Community 15 - "RatingStars.tsx"
Cohesion: 0.26
Nodes (11): AnimeStatsDisplay(), RatingStars(), handleKeyDown(), handleRate(), handleRemove(), moveFocus(), RatingStarsProps, HeartIcon() (+3 more)

### Community 18 - "Baixa prioridade (acessibilidade)"
Cohesion: 0.06
Nodes (30): Alta prioridade (bugs reais), anchor-is-valid ×2, Baixa prioridade (acessibilidade), click-events-have-key-events ×3, Concluído, effect-needs-cleanup ×6, Falsos positivos documentados (não mexer), html-label-has-single-control ×1 (+22 more)

### Community 20 - "episode/[slug]/[number]/page.tsx"
Cohesion: 0.18
Nodes (11): AdminEditEpisodePage(), DeleteZone(), DeleteZoneProps, FieldLabel(), Hint(), ScrapeImportPanel(), ScrapeImportPanelProps, VideoUploadPanel() (+3 more)

### Community 21 - "FeedActivityItem.tsx"
Cohesion: 0.23
Nodes (11): ProfileCurrentlyWatching(), ProfileRatings(), Star(), Stars(), CommentGlyph(), CommentLike(), EventVerb(), FeedActivityItem() (+3 more)

### Community 22 - "cartas/page.tsx"
Cohesion: 0.16
Nodes (10): GachaCollectionPage(), handleReroll(), CardsFilterBar(), ChevronDown(), FilterBadge(), buildSlots(), CardsPagination(), GACHA_TIERS (+2 more)

### Community 23 - "(app)/gacha/page.tsx"
Cohesion: 0.20
Nodes (18): CrystalIcon(), formatCountdown(), GachaPage(), GachaPageContent(), closePreview(), handleApplyRanking(), handleBypass(), handleClaim() (+10 more)

### Community 24 - "package.json"
Cohesion: 0.11
Nodes (17): name, private, version, autoprefixer, eslint, eslint-config-next, postcss, react-dom (+9 more)

### Community 26 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 27 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 28 - "animes/page.tsx"
Cohesion: 0.20
Nodes (13): AnimesPage(), generateMetadata(), revalidate, dynamic, generateMetadata(), GenrePage(), generateMetadata(), LancamentosPage() (+5 more)

### Community 29 - "Mobile Menu / Hamburger Menu Analysis"
Cohesion: 0.08
Nodes (25): 1. Overall Project Structure, 2. Mobile Menu / Hamburger Functionality, 3. Key Files, 4. Data Flow Summary: Main Mobile Nav Open/Close, 5. Essential Files for Understanding the Feature, 6. Architecture Insights, 7. Summary of Files Searched, A. Main Site Mobile Navigation (Bottom Sheet Drawer) (+17 more)

### Community 30 - "react"
Cohesion: 0.07
Nodes (33): AdminAuditPage(), AuditTab, RESOURCE_TYPES, AdminAnime, AdminCatalogoPage(), AdminConfigPage(), AdminCreateEpisodePage(), AdminEditAnimePage() (+25 more)

### Community 31 - "room/[slug]/page.tsx"
Cohesion: 0.06
Nodes (52): mergeMessages(), Participant, RoomPage(), Architecture Overview, F06: SyncedVideoPlayer Exceeds 800 Lines, F07: CommentSection Missing Loading Feedback on Submit/Delete, F08: RatingStars Radiogroup Keyboard Navigation Broken, F09: ServiceNotice Uses Hardcoded Date Key (+44 more)

### Community 32 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, eslint, eslint-config-next, @playwright/test, postcss, semantic-release, @semantic-release/changelog (+7 more)

### Community 33 - "app/layout.tsx"
Cohesion: 0.05
Nodes (42): handleSubmit(), safeNext(), fontDisplay, fontPlexMono, fontPlexSans, metadata, RootLayout(), viewport (+34 more)

### Community 34 - "AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)"
Cohesion: 0.06
Nodes (29): AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript), API Routes, Code Details, Code Rules and Guidelines, Directory Structure, Eslint, Extra, Generating Icons for your Application (+21 more)

### Community 35 - "AdminGachaPage"
Cohesion: 0.13
Nodes (8): AdminGachaPage(), cancelEdit(), clearAnime(), onAnimeFilterChange(), resetForm(), saveCard(), selectAnime(), toggleAnimeFilter()

### Community 36 - "wishlist/page.tsx"
Cohesion: 0.25
Nodes (10): GachaWishlistContent(), GachaWishlistPage(), ProfileWishlist(), pageWindow(), PaginationControls(), GACHA_WISHLIST_PAGE_SIZE, readPage(), useGachaWishlist() (+2 more)

### Community 37 - "next"
Cohesion: 0.20
Nodes (4): ConfigEntry, GROUP_LABELS, next, YEARS

### Community 38 - "CrystalLoader"
Cohesion: 0.28
Nodes (7): Loading(), Loading(), Loading(), Loading(), Loading(), CrystalLoader(), CrystalLoaderProps

### Community 39 - "EmptyState"
Cohesion: 0.17
Nodes (9): CRYSTAL_PACKAGES, GachaCrystalsPage(), TYPE_LABEL, GenerosPage(), metadata, revalidate, EmptyState(), CrystalEvent (+1 more)

### Community 40 - "BlogForm.tsx"
Cohesion: 0.09
Nodes (24): EditBlogPostPage(), NewBlogPostPage(), 1. CMS — Conteúdo editorial nos animes + Blog, 1a. Schema (Prisma), 1b. Backend (NestJS), 1c. Frontend, 1d. Migração de dados, 2. Página de índice `/generos` (+16 more)

### Community 41 - "pr-description.mjs"
Cohesion: 0.13
Nodes (11): breaking, dirs, fileLines, files, groups, isBack, LABELS, out (+3 more)

### Community 43 - "PublicProfilePage"
Cohesion: 0.17
Nodes (5): OverviewSkeleton(), ProfileSkeleton(), PublicProfilePage(), ensureTab(), handleNavigate()

### Community 44 - "mock-backend.js"
Cohesion: 0.18
Nodes (8): EPISODE, http, server, CORS_HEADERS, http, json(), server, url

### Community 45 - "GachaPageSkeleton"
Cohesion: 0.07
Nodes (33): Loading(), Loading(), Loading(), Loading(), Loading(), Loading(), CardOwners(), Encyclopedia() (+25 more)

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
Cohesion: 0.13
Nodes (17): DeferredHomeHero(), HeroProps, ParallaxValues, useHeroParallax(), HeroCharacter(), HeroCharacterProps, HeroEnvironment(), HeroEnvironmentProps (+9 more)

### Community 53 - "SectionLabel.tsx"
Cohesion: 0.22
Nodes (9): HeadingLevel, SectionLabelProps, PosterTile(), PosterTileProps, ProfileCollection(), STATUS_FILTERS, STATUS_LABELS, ProfileFavorites() (+1 more)

### Community 54 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check:chunk-recovery, dev, lint, release, release:dry, skills:install (+3 more)

### Community 55 - "admin/gacha/page.tsx"
Cohesion: 0.33
Nodes (5): animeLabel(), AnimeOption, TIERS, AdminGachaCard, GachaEngagementPilotDashboard

### Community 57 - "skins/page.tsx"
Cohesion: 0.24
Nodes (6): countdown(), GachaSkinsPage(), SkinTile(), SkinReveal(), GachaSkin, GachaSkinsResponse

### Community 58 - "GachaCard.tsx"
Cohesion: 0.14
Nodes (17): CONDITION_ART, CONDITION_COLOR, CONDITION_GLYPH, CONDITION_SURFACE, FOIL_TEXT, GachaCard, GALAXY_FRAME, GALAXY_TEXT (+9 more)

### Community 59 - "motion"
Cohesion: 0.25
Nodes (4): motion, HoloTilt(), TiltedCard(), TiltedCardProps

### Community 60 - "test-crystal/page.tsx"
Cohesion: 0.43
Nodes (5): metadata, TestCrystalPage(), CrystalVideoClean(), compileShader(), CrystalVideoPreview()

### Community 61 - "CHANGELOG.md"
Cohesion: 0.11
Nodes (17): 1.0.0 (2026-08-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.2.0](https://github.com/1arley/animesice/compare/v1.1.0...v1.2.0) (2026-08-13), Bug Fixes, Bug Fixes (+9 more)

### Community 62 - "buscar/page.tsx"
Cohesion: 0.22
Nodes (12): first(), metadata, revalidate, SearchPage(), SearchParam, YEARS, animeFormatLabel(), animeSeasonLabel() (+4 more)

### Community 63 - "PageTitle"
Cohesion: 0.33
Nodes (6): RegrasPage(), BlurText(), BlurTextProps, BlurTextTag, PageTitle(), PageTitleProps

### Community 64 - "ensureRefresh"
Cohesion: 0.40
Nodes (5): F04: `api.ts` ensureRefresh() Can Permanently Lock Refresh State, P1 (Next sprint), ensureRefresh(), readErrorMessage(), request()

### Community 65 - "animes/[slug]/[number]/page.tsx"
Cohesion: 0.16
Nodes (12): generateMetadata(), getEpisode, revalidate, toIso8601Duration(), WatchPage(), metadata, SobrePage(), config (+4 more)

### Community 66 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 67 - "ProfileActivity.tsx"
Cohesion: 0.36
Nodes (7): ActivityRow(), CommentGlyph(), CommentLike(), EventVerb(), ProfileActivity(), ProfileActivityProps, PublicActivityEvent

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
Cohesion: 0.14
Nodes (17): AnimeDetailPage(), generateMetadata(), getAnime, revalidate, AnimeListButton(), handleRemove(), handleSave(), refreshState() (+9 more)

### Community 85 - "1.0.0 (2026-09-18)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-18), Bug Fixes, Features, Performance Improvements, Reverts

### Community 86 - "1.0.0 (2026-08-15)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-15), Bug Fixes, Features, Performance Improvements

### Community 90 - "create/page.tsx"
Cohesion: 0.36
Nodes (5): AdminCreateAnimePage(), animeAudioLabelFromTitle(), isDubbedTitle(), slugify(), Genre

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

### Community 99 - "Anime"
Cohesion: 0.16
Nodes (9): dynamic, contentType, revalidate, size, AnimeCardProps, HeroUI(), HeroUIProps, RevealLabel() (+1 more)

### Community 100 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 101 - "HeroAtmosphere.tsx"
Cohesion: 0.32
Nodes (6): ogl, Aurora, HeroAtmosphere(), HeroAtmosphereProps, Aurora(), DEFAULT_COLOR_STOPS

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
Cohesion: 0.11
Nodes (14): AdminCrystalCodesPage(), cancelEditing(), save(), blank, Code, AdminGachaConfigPage(), Toast, ToastContext (+6 more)

### Community 117 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 118 - "blog/[slug]/page.tsx"
Cohesion: 0.21
Nodes (11): BlogPostPage(), findPost(), generateMetadata(), revalidate, BlogAdminActions(), ShareButtons(), ShareButtonsProps, serverGetBlogPost() (+3 more)

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

### Community 123 - "biblioteca/layout.tsx"
Cohesion: 0.30
Nodes (3): metadata, EpisodePrefetcher(), processBatch()

### Community 126 - "1.0.0 (2026-08-19)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-19), Bug Fixes, Features, Performance Improvements

### Community 129 - "CompensationModal.tsx"
Cohesion: 0.32
Nodes (5): CompensationModal(), loadApi(), NotificationBell(), markAllRead(), NotificationItem

### Community 130 - "feedbacks/page.tsx"
Cohesion: 0.29
Nodes (6): STATUS_BADGE, STATUS_LABELS, TYPE_LABELS, FeedbackStatus, FeedbackType, SiteFeedbackItem

### Community 132 - "1.0.0 (2026-08-21)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-21), Bug Fixes, Features, Performance Improvements

### Community 133 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)"
Cohesion: 0.50
Nodes (4): [1.0.1](https://github.com/1arley/animesice/compare/v1.0.0...v1.0.1) (2026-08-12), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12), Bug Fixes, Features

### Community 135 - "FeedPost.tsx"
Cohesion: 0.11
Nodes (13): FeedPage(), revalidate, CommentGlyph(), FeedPost(), HeartGlyph(), ShareGlyph(), FeedView(), FeedViewProps (+5 more)

### Community 136 - "gsap.ts"
Cohesion: 0.35
Nodes (7): gsap, @gsap/react, DividerSvg(), IceBeamDivider(), alreadyTriggered(), RevealStagger(), useFinePointer()

### Community 137 - "NotificationPreferencesSection.tsx"
Cohesion: 0.29
Nodes (6): ALL_TYPES, channels, NOTIFICATION_LABELS, NotificationChannel, NotificationPreference, NotificationType

### Community 142 - "gacha_box_reveal.py"
Cohesion: 0.10
Nodes (9): CommonBox, GachaBoxReveal, PremiumBox, RareBox, render_assets(), diamond(), NightMarketCardReveal, render_asset() (+1 more)

### Community 148 - "api-server.ts"
Cohesion: 0.26
Nodes (8): POST(), POST(), GET(), API_URL, RETRYABLE_STATUS, serverStreamSourceAsync(), sleep(), isPrivilegedRole()

### Community 156 - "User"
Cohesion: 0.67
Nodes (3): RegisterResponse, User, AuthContextValue

### Community 158 - "AdminGenerosPage"
Cohesion: 0.67
Nodes (3): AdminGenerosPage(), handleNameChange(), slugify()

### Community 221 - "safeImageSrc"
Cohesion: 0.21
Nodes (17): metadata, revalidate, TopPage(), Positive Findings, Key Design Decisions, AdaptiveImage(), AdaptiveImageProps, AnimeCard() (+9 more)

### Community 232 - "biblioteca/page.tsx"
Cohesion: 0.20
Nodes (10): EmptyState(), HistoryRow(), LibraryPage(), Tab, TAB_LABELS, TAB_STATUS, TABS, UserAnimeListItem (+2 more)

### Community 238 - "Wordmark"
Cohesion: 0.11
Nodes (20): LoginForm(), LoginPage(), RecuperarSenhaPage(), RedefinirSenhaForm(), handleSubmit(), RedefinirSenhaPage(), RegisterPage(), handleSubmit() (+12 more)

### Community 239 - "admin/usuarios/page.tsx"
Cohesion: 0.14
Nodes (9): ACTION_DESC, ACTION_LABELS, AdminUsersPage(), ModerateAction, ModerateUserModal(), ROLE_BADGE, ROLE_LABELS, NotificationsPage() (+1 more)

## Knowledge Gaps
- **600 isolated node(s):** `extends`, `next/core-web-vitals`, `dynamic`, `revalidate`, `size` (+595 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 851 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Avatar`, `feedbacks/page.tsx`, `me/page.tsx`, `capas/page.tsx`, `time.ts`, `usePrefersReducedMotion`, `CompensationModal.tsx`, `gsap.ts`, `NotificationPreferencesSection.tsx`, `CardPreview.tsx`, `ProfileHero.tsx`, `GachaEconomyHub.tsx`, `HomeSections.tsx`, `users/[userName]/page.tsx`, `RatingStars.tsx`, `FeedPost.tsx`, `smooth-scroll.tsx`, `episode/[slug]/[number]/page.tsx`, `FeedActivityItem.tsx`, `cartas/page.tsx`, `(app)/gacha/page.tsx`, `package.json`, `room/[slug]/page.tsx`, `app/layout.tsx`, `wishlist/page.tsx`, `next`, `EmptyState`, `BlogForm.tsx`, `GachaPageSkeleton`, `obras-externas/page.tsx`, `RollStage.tsx`, `error.tsx`, `HeroSlide.tsx`, `admin/gacha/page.tsx`, `skins/page.tsx`, `GachaCard.tsx`, `motion`, `test-crystal/page.tsx`, `PageTitle`, `animes/[slug]/[number]/page.tsx`, `ProfileActivity.tsx`, `moderacao/page.tsx`, `animes/[slug]/page.tsx`, `create/page.tsx`, `safeImageSrc`, `HeroAtmosphere.tsx`, `GachaNav.tsx`, `biblioteca/page.tsx`, `Wordmark`, `admin/usuarios/page.tsx`, `useToast`, `blog/[slug]/page.tsx`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `dynamic` to the rest of the system?**
  _600 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `@playwright/test` be split into smaller, more focused modules?**
  _Cohesion score 0.050774526678141134 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `Avatar`, `me/page.tsx`, `CompensationModal.tsx`, `capas/page.tsx`, `usePrefersReducedMotion`, `time.ts`, `FeedPost.tsx`, `blog.ts`, `blur.ts`, `CardPreview.tsx`, `ProfileHero.tsx`, `GachaEconomyHub.tsx`, `HomeSections.tsx`, `users/[userName]/page.tsx`, `RatingStars.tsx`, `smooth-scroll.tsx`, `episode/[slug]/[number]/page.tsx`, `api-server.ts`, `cartas/page.tsx`, `(app)/gacha/page.tsx`, `package.json`, `FeedActivityItem.tsx`, `next.config.ts`, `animes/page.tsx`, `react`, `room/[slug]/page.tsx`, `app/layout.tsx`, `wishlist/page.tsx`, `EmptyState`, `BlogForm.tsx`, `GachaPageSkeleton`, `error.tsx`, `HeroSlide.tsx`, `SectionLabel.tsx`, `admin/gacha/page.tsx`, `skins/page.tsx`, `GachaCard.tsx`, `buscar/page.tsx`, `animes/[slug]/[number]/page.tsx`, `ProfileActivity.tsx`, `animes/[slug]/page.tsx`, `create/page.tsx`, `safeImageSrc`, `Anime`, `HeroAtmosphere.tsx`, `GachaNav.tsx`, `biblioteca/page.tsx`, `Wordmark`, `admin/usuarios/page.tsx`, `blog/[slug]/page.tsx`, `biblioteca/layout.tsx`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Should `Avatar` be split into smaller, more focused modules?**
  _Cohesion score 0.07058001397624039 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `@playwright/test` to `package.json`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `me/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14039408866995073 - nodes in this community are weakly interconnected._