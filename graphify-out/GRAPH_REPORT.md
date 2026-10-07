# Graph Report - animesice  (2026-10-07)

## Corpus Check
- 319 files · ~314,427 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 12, .example 1, .css 1)

## Summary
- 1874 nodes · 4585 edges · 153 communities (112 shown, 41 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05d98878`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @playwright/test
- Avatar
- Header
- SettingsPage
- capas/page.tsx
- usePrefersReducedMotion
- index.ts
- blog.ts
- login/page.tsx
- me/page.tsx
- ProfileHero.tsx
- GachaEconomyHub.tsx
- HomeSections.tsx
- PublicProfilePage
- CommentSection.tsx
- Baixa prioridade (acessibilidade)
- episode/[slug]/[number]/page.tsx
- ProfileActivity.tsx
- feedbacks/page.tsx
- safeImageSrc
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
- buscar/page.tsx
- Anime
- CrystalLoader
- (app)/gacha/page.tsx
- SEO & Tráfego — Plano de Implementação
- HomeHero.tsx
- PageTitle
- mock-backend.js
- GachaPageSkeleton
- api
- users/[userName]/page.tsx
- error.tsx
- dependencies
- BlogPost
- AdminWatchtowerPage
- HeroSlide.tsx
- skins/page.tsx
- scripts
- blog/[slug]/page.tsx
- BlogForm.tsx
- cartas/page.tsx
- EpisodeLoadingState.tsx
- test-crystal/page.tsx
- CHANGELOG.md
- GachaCard.tsx
- NotificationBell.tsx
- ensureRefresh
- comunidade/pedidos/page.tsx
- Product
- ProfileFollowList.tsx
- moderacao/page.tsx
- console-debug.js
- check-chunk-recovery-build.mjs
- 1. Directory Structure Overview
- 1.0.0 (2026-08-26)
- 1.0.0 (2026-09-15)
- dmca/page.tsx
- privacidade/page.tsx
- .eslintrc.json
- postcss.config.mjs
- 1.0.0 (2026-09-18)
- create/page.tsx
- 1.0.0 (2026-08-18)
- NightMarketIntro
- Repository Guidelines
- site.ts
- Auditoria de UI/UX do mercado
- api-server.ts
- HeroAtmosphere.tsx
- GachaNav.tsx
- 1.0.0 (2026-08-12)
- 1.0.0 (2026-08-25)
- 1.0.0 (2026-08-26)
- 1.0.0 (2026-08-18)
- 1.0.0 (2026-08-31)
- 1.0.0 (2026-09-04)
- 1.0.0 (2026-09-08)
- 1.0.0 (2026-09-12)
- 1.0.0 (2026-09-15)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-09-16)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04)
- useToast
- AnimeListButton
- 1.0.0 (2026-08-14)
- 1.0.0 (2026-08-15)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-17)
- 1.0.0 (2026-08-18)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-19)
- AdminGenerosPage
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18)
- 1.0.0 (2026-08-21)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)
- FeedPost.tsx
- allowScripts
- posts/page.tsx
- gacha_box_reveal.py
- ProfileStats.tsx
- AdminCrystalCodesPage
- blur.ts
- biblioteca/page.tsx
- next
- admin/usuarios/page.tsx
- processBatch

## God Nodes (most connected - your core abstractions)
1. `react` - 141 edges
2. `useAuth()` - 126 edges
3. `next` - 122 edges
4. `api` - 80 edges
5. `ApiError` - 64 edges
6. `safeImageSrc()` - 52 edges
7. `usePrefersReducedMotion()` - 46 edges
8. `isPrivileged()` - 40 edges
9. `Anime` - 38 edges
10. `GachaPageSkeleton()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `F15: AdminGate Has No Dedicated Layout Guard` --references--> `AdminGate()`  [INFERRED]
  docs/AUDIT.md → src/components/common/AdminGate.tsx
- `P2 (Short-term)` --references--> `AdminGate()`  [INFERRED]
  docs/AUDIT.md → src/components/common/AdminGate.tsx
- `F17: Reduced Motion Is Comprehensive and Well-Implemented` --references--> `usePrefersReducedMotion()`  [INFERRED]
  docs/AUDIT.md → src/lib/use-prefers-reduced-motion.ts
- `1a. Schema (Prisma)` --references--> `Anime`  [INFERRED]
  docs/seo-traffic-plan.md → src/types/index.ts
- `1b. Backend (NestJS)` --references--> `Anime`  [INFERRED]
  docs/seo-traffic-plan.md → src/types/index.ts

## Import Cycles
- None detected.

## Communities (153 total, 41 thin omitted)

### Community 0 - "@playwright/test"
Cohesion: 0.05
Nodes (47): API(), mockFeed(), API(), makeUsers(), mockUsersDirectory(), EBML_MAGIC, FTYP_BOX, pull (+39 more)

### Community 1 - "Avatar"
Cohesion: 0.21
Nodes (10): AVATAR_ACCEPT, AuthButtons(), Avatar(), AvatarProps, DashStat(), DashStats, ProfileDashboard(), FeedComposer() (+2 more)

### Community 2 - "Header"
Cohesion: 0.13
Nodes (15): AdminLayout(), AdminShell(), AdminSidebar(), NAV_ITEMS, NavItem, AppLayout(), AdminGate(), Header() (+7 more)

### Community 3 - "SettingsPage"
Cohesion: 0.13
Nodes (6): prepareAvatar(), SettingsPage(), handleFilePicked(), handlePasswordChange(), NotificationPreferencesSection(), PrivacySection()

### Community 4 - "capas/page.tsx"
Cohesion: 0.07
Nodes (50): AdminCapasPage(), addLayer(), cancelEditing(), changeType(), save(), startEditing(), sync(), updateLayer() (+42 more)

### Community 5 - "usePrefersReducedMotion"
Cohesion: 0.19
Nodes (13): lenis, CrystalMotion(), CrystalMotionMode, CrystalMotionProps, MoteStyle, moteValue(), VIDEO_SOURCES, CrystalSplash() (+5 more)

### Community 7 - "index.ts"
Cohesion: 0.04
Nodes (64): animeLabel(), AnimeOption, TIERS, ALL_TYPES, channels, NOTIFICATION_LABELS, FIELDS, RatingStarsProps (+56 more)

### Community 8 - "blog.ts"
Cohesion: 0.25
Nodes (15): BlogPage(), metadata, revalidate, GET(), revalidate, sitemap(), STATIC_ROUTES, serverListBlogPosts() (+7 more)

### Community 9 - "login/page.tsx"
Cohesion: 0.15
Nodes (16): LoginForm(), handleSubmit(), LoginPage(), safeNext(), RedefinirSenhaForm(), handleSubmit(), RedefinirSenhaPage(), RegisterPage() (+8 more)

### Community 10 - "me/page.tsx"
Cohesion: 0.15
Nodes (13): MyProfilePage(), NotificationsPage(), ConfirmEmailContent(), ConfirmEmailPage(), Footer(), FooterCol(), FooterLink, REFERENCIA_LINKS (+5 more)

### Community 11 - "ProfileHero.tsx"
Cohesion: 0.23
Nodes (9): FeaturedPortrait(), FeaturedPortraitSkeleton(), CalendarIcon(), ExternalIcon(), FlagIcon(), ProfileHero(), REPORT_REASONS, ShareIcon() (+1 more)

### Community 12 - "GachaEconomyHub.tsx"
Cohesion: 0.07
Nodes (44): GachaShopPage(), metadata, NightMarketPage(), GachaMarketPage(), FOCUSABLE, ACCENT, BOX_LABEL, BoxReveal() (+36 more)

### Community 13 - "HomeSections.tsx"
Cohesion: 0.14
Nodes (28): HomePage(), metadata, revalidate, gsap, DividerSvg(), HomeBackdrop(), IceBeamDivider(), DeferredPersonalizedRails() (+20 more)

### Community 14 - "PublicProfilePage"
Cohesion: 0.17
Nodes (5): OverviewSkeleton(), ProfileSkeleton(), PublicProfilePage(), ensureTab(), handleNavigate()

### Community 15 - "CommentSection.tsx"
Cohesion: 0.13
Nodes (14): CommentRow(), CommentSection(), CommentSectionProps, FavoriteButton(), FavoriteButtonProps, RatingStars(), handleKeyDown(), handleRate() (+6 more)

### Community 18 - "Baixa prioridade (acessibilidade)"
Cohesion: 0.06
Nodes (30): Alta prioridade (bugs reais), anchor-is-valid ×2, Baixa prioridade (acessibilidade), click-events-have-key-events ×3, Concluído, effect-needs-cleanup ×6, Falsos positivos documentados (não mexer), html-label-has-single-control ×1 (+22 more)

### Community 20 - "episode/[slug]/[number]/page.tsx"
Cohesion: 0.18
Nodes (11): AdminEditEpisodePage(), DeleteZone(), DeleteZoneProps, FieldLabel(), Hint(), ScrapeImportPanel(), ScrapeImportPanelProps, VideoUploadPanel() (+3 more)

### Community 21 - "ProfileActivity.tsx"
Cohesion: 0.16
Nodes (18): ActivityRow(), CommentGlyph(), CommentLike(), EventVerb(), ProfileActivity(), ProfileActivityProps, ProfileCurrentlyWatching(), ProfileRatings() (+10 more)

### Community 22 - "feedbacks/page.tsx"
Cohesion: 0.14
Nodes (12): AdminFeedbacksPage(), STATUS_BADGE, STATUS_LABELS, TYPE_LABELS, STATUS_BADGE, STATUS_LABELS, AnimeListButtonProps, STATUS_LABELS (+4 more)

### Community 23 - "safeImageSrc"
Cohesion: 0.17
Nodes (19): AnimeDetailPage(), generateMetadata(), getAnime, revalidate, Key Design Decisions, AdaptiveImage(), AdaptiveImageProps, BroadcastCard() (+11 more)

### Community 24 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, version, autoprefixer, eslint, eslint-config-next, @gsap/react, postcss (+10 more)

### Community 26 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 27 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 28 - "animes/page.tsx"
Cohesion: 0.16
Nodes (17): AnimesPage(), generateMetadata(), revalidate, dynamic, generateMetadata(), GenrePage(), generateMetadata(), LancamentosPage() (+9 more)

### Community 29 - "Mobile Menu / Hamburger Menu Analysis"
Cohesion: 0.08
Nodes (25): 1. Overall Project Structure, 2. Mobile Menu / Hamburger Functionality, 3. Key Files, 4. Data Flow Summary: Main Mobile Nav Open/Close, 5. Essential Files for Understanding the Feature, 6. Architecture Insights, 7. Summary of Files Searched, A. Main Site Mobile Navigation (Bottom Sheet Drawer) (+17 more)

### Community 30 - "react"
Cohesion: 0.11
Nodes (24): AdminAuditPage(), AuditTab, RESOURCE_TYPES, AdminAnime, AdminCatalogoPage(), AdminConfigPage(), AdminCreateEpisodePage(), AdminEditAnimePage() (+16 more)

### Community 31 - "room/[slug]/page.tsx"
Cohesion: 0.05
Nodes (59): GET(), generateMetadata(), getEpisode, revalidate, toIso8601Duration(), WatchPage(), mergeMessages(), Participant (+51 more)

### Community 32 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, eslint, eslint-config-next, @playwright/test, postcss, semantic-release, @semantic-release/changelog (+7 more)

### Community 33 - "app/layout.tsx"
Cohesion: 0.05
Nodes (41): fontDisplay, fontPlexMono, fontPlexSans, metadata, RootLayout(), viewport, 1. Silent Error Swallowing, 2. No SWR/React Query — Manual Cache Invalidation (+33 more)

### Community 34 - "AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)"
Cohesion: 0.08
Nodes (23): AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript), API Routes, Code Details, Code Rules and Guidelines, Directory Structure, Eslint, Extra, Generating Icons for your Application (+15 more)

### Community 35 - "AdminGachaPage"
Cohesion: 0.13
Nodes (8): AdminGachaPage(), cancelEdit(), clearAnime(), onAnimeFilterChange(), resetForm(), saveCard(), selectAnime(), toggleAnimeFilter()

### Community 36 - "buscar/page.tsx"
Cohesion: 0.22
Nodes (12): first(), metadata, revalidate, SearchPage(), SearchParam, YEARS, animeFormatLabel(), animeSeasonLabel() (+4 more)

### Community 37 - "Anime"
Cohesion: 0.13
Nodes (17): dynamic, contentType, revalidate, size, metadata, revalidate, TopPage(), AnimeCard() (+9 more)

### Community 38 - "CrystalLoader"
Cohesion: 0.28
Nodes (7): Loading(), Loading(), Loading(), Loading(), Loading(), CrystalLoader(), CrystalLoaderProps

### Community 39 - "(app)/gacha/page.tsx"
Cohesion: 0.17
Nodes (21): CrystalIcon(), formatCountdown(), GachaPage(), GachaPageContent(), closePreview(), handleApplyRanking(), handleBypass(), handleClaim() (+13 more)

### Community 40 - "SEO & Tráfego — Plano de Implementação"
Cohesion: 0.18
Nodes (10): 2. Página de índice `/generos`, 3. Schema VideoObject nos episódios, 4. Gêneros no sitemap, 5. hreflang `pt-BR`, Contexto, Decisões fechadas, Ordem de execução recomendada, SEO & Tráfego — Plano de Implementação (+2 more)

### Community 41 - "HomeHero.tsx"
Cohesion: 0.39
Nodes (6): DeferredHomeHero(), HeroProps, HeroSlide(), highlightLabelForHour(), HomeHero(), useIsMobile()

### Community 43 - "PageTitle"
Cohesion: 0.33
Nodes (6): RegrasPage(), BlurText(), BlurTextProps, BlurTextTag, PageTitle(), PageTitleProps

### Community 44 - "mock-backend.js"
Cohesion: 0.18
Nodes (8): EPISODE, http, server, CORS_HEADERS, http, json(), server, url

### Community 45 - "GachaPageSkeleton"
Cohesion: 0.09
Nodes (24): Loading(), Loading(), Loading(), Loading(), Loading(), Loading(), Encyclopedia(), EncyclopediaPage() (+16 more)

### Community 46 - "api"
Cohesion: 0.10
Nodes (9): AdminBlogPage(), blank, Code, ConfigEntry, GROUP_LABELS, AdminImportPage(), ExternalWorksPage(), api (+1 more)

### Community 47 - "users/[userName]/page.tsx"
Cohesion: 0.13
Nodes (21): TAB_ALIASES, HeadingLevel, SectionLabel(), SectionLabelProps, PosterTile(), PosterTileProps, ProfileAbout(), ProfileCollection() (+13 more)

### Community 48 - "error.tsx"
Cohesion: 0.47
Nodes (8): ErrorPage(), GlobalError(), CHUNK_ERROR_EVENT, CHUNK_RECOVERY_EXHAUSTED_EVENT, isChunkLoadError(), isChunkRecoveryExhausted(), retryChunkLoad(), Window

### Community 49 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, gsap, @gsap/react, hls.js, lenis, motion, next, ogl (+3 more)

### Community 50 - "BlogPost"
Cohesion: 0.40
Nodes (6): 1. CMS — Conteúdo editorial nos animes + Blog, 1a. Schema (Prisma), 1b. Backend (NestJS), 1c. Frontend, 1d. Migração de dados, BlogPost

### Community 51 - "AdminWatchtowerPage"
Cohesion: 0.33
Nodes (11): AdminWatchtowerPage(), handleBackfillAnilist(), handleCheck(), handleDiscover(), handleRepair(), handleRetry(), handleScanAll(), handleSyncSchedules() (+3 more)

### Community 52 - "HeroSlide.tsx"
Cohesion: 0.11
Nodes (17): motion, ParallaxValues, useHeroParallax(), HeroCharacter(), HeroCharacterProps, HeroEnvironment(), HeroEnvironmentProps, HeroParticles() (+9 more)

### Community 53 - "skins/page.tsx"
Cohesion: 0.24
Nodes (6): countdown(), GachaSkinsPage(), SkinTile(), SkinReveal(), GachaSkin, GachaSkinsResponse

### Community 54 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check:chunk-recovery, dev, lint, release, release:dry, skills:install (+3 more)

### Community 55 - "blog/[slug]/page.tsx"
Cohesion: 0.21
Nodes (11): BlogPostPage(), findPost(), generateMetadata(), revalidate, BlogAdminActions(), ShareButtons(), ShareButtonsProps, serverGetBlogPost() (+3 more)

### Community 57 - "BlogForm.tsx"
Cohesion: 0.29
Nodes (8): EditBlogPostPage(), NewBlogPostPage(), BlogForm(), changeTitle(), submit(), slugify(), toLocalDate(), BlogPostInput

### Community 58 - "cartas/page.tsx"
Cohesion: 0.13
Nodes (13): GachaCollectionPage(), handleReroll(), ConfirmDialog(), CardPreview(), share(), CardsFilterBar(), ChevronDown(), FilterBadge() (+5 more)

### Community 59 - "EpisodeLoadingState.tsx"
Cohesion: 0.47
Nodes (4): EpisodeLoadingState(), PHRASES, TextLoop(), TextLoopProps

### Community 60 - "test-crystal/page.tsx"
Cohesion: 0.43
Nodes (5): metadata, TestCrystalPage(), CrystalVideoClean(), compileShader(), CrystalVideoPreview()

### Community 61 - "CHANGELOG.md"
Cohesion: 0.13
Nodes (14): 1.0.0 (2026-08-15), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.2.0](https://github.com/1arley/animesice/compare/v1.1.0...v1.2.0) (2026-08-13), Bug Fixes, Bug Fixes, Bug Fixes (+6 more)

### Community 62 - "GachaCard.tsx"
Cohesion: 0.12
Nodes (19): Cristal do gacha (Manim), CONDITION_ART, CONDITION_COLOR, CONDITION_GLYPH, CONDITION_SURFACE, FOIL_TEXT, GALAXY_FRAME, GALAXY_TEXT (+11 more)

### Community 63 - "NotificationBell.tsx"
Cohesion: 0.60
Nodes (3): loadApi(), NotificationBell(), markAllRead()

### Community 64 - "ensureRefresh"
Cohesion: 0.40
Nodes (5): F04: `api.ts` ensureRefresh() Can Permanently Lock Refresh State, P1 (Next sprint), ensureRefresh(), readErrorMessage(), request()

### Community 66 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 67 - "ProfileFollowList.tsx"
Cohesion: 0.25
Nodes (9): SORT_TABS, SortKey, UsuariosPage(), FollowRow(), ProfileFollowList(), FollowButton(), UserCard(), formatDate() (+1 more)

### Community 68 - "moderacao/page.tsx"
Cohesion: 0.18
Nodes (9): ACTION_LABELS, ModerateAction, ModerateUserInline(), ModerationPage(), REASON_LABELS, STATUS_LABELS, TARGET_LABELS, ReportItem (+1 more)

### Community 70 - "check-chunk-recovery-build.mjs"
Cohesion: 0.40
Nodes (3): html, recoveryScript, scripts

### Community 72 - "1. Directory Structure Overview"
Cohesion: 0.17
Nodes (11): 1. Directory Structure Overview, Animesice - Next.js Frontend Structure Analysis, `app/` Directory (Next.js App Router), Architectural Patterns Identified, Code Quality Observations, Essential Files for Understanding the Feature Architecture, Pages Directory & Routing Summary, Root Level (+3 more)

### Community 74 - "1.0.0 (2026-08-26)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-08-26), Bug Fixes, Features, Performance Improvements, Reverts

### Community 75 - "1.0.0 (2026-09-15)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-15), Bug Fixes, Features, Performance Improvements, Reverts

### Community 85 - "1.0.0 (2026-09-18)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-18), Bug Fixes, Features, Performance Improvements, Reverts

### Community 90 - "create/page.tsx"
Cohesion: 0.36
Nodes (5): AdminCreateAnimePage(), animeAudioLabelFromTitle(), isDubbedTitle(), slugify(), Genre

### Community 91 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

### Community 93 - "Repository Guidelines"
Cohesion: 0.25
Nodes (7): Agent Team, Code, Tests, Delivery, Commands, Project Structure, Repository Guidelines, Role and First Checks, UI, Security, Technology

### Community 94 - "site.ts"
Cohesion: 0.19
Nodes (7): GenerosPage(), metadata, revalidate, config, APEX_CANONICAL_HOSTS, ASSET_URL, SITE_URL

### Community 98 - "Auditoria de UI/UX do mercado"
Cohesion: 0.33
Nodes (5): Achados tratados, Auditoria de UI/UX do mercado, Direcao visual, Limites e proximas prioridades, Verificacao

### Community 99 - "api-server.ts"
Cohesion: 0.31
Nodes (6): POST(), POST(), API_URL, RETRYABLE_STATUS, sleep(), isPrivilegedRole()

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

### Community 106 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

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

### Community 114 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04)"
Cohesion: 0.40
Nodes (5): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-10-04), Bug Fixes, Features, Performance Improvements, Reverts

### Community 116 - "useToast"
Cohesion: 0.10
Nodes (24): AdminGachaConfigPage(), CRYSTAL_PACKAGES, GachaCrystalsPage(), TYPE_LABEL, Toast, ToastContext, ToastContextValue, useToast() (+16 more)

### Community 118 - "AnimeListButton"
Cohesion: 0.60
Nodes (4): AnimeListButton(), handleRemove(), handleSave(), refreshState()

### Community 119 - "1.0.0 (2026-08-14)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-14), Bug Fixes, Features, Performance Improvements

### Community 120 - "1.0.0 (2026-08-15)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-15), Bug Fixes, Features, Performance Improvements

### Community 121 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 122 - "1.0.0 (2026-08-17)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-17), Bug Fixes, Features, Performance Improvements

### Community 123 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

### Community 124 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 125 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 126 - "1.0.0 (2026-08-19)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-19), Bug Fixes, Features, Performance Improvements

### Community 127 - "AdminGenerosPage"
Cohesion: 0.67
Nodes (3): AdminGenerosPage(), handleNameChange(), slugify()

### Community 128 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18)"
Cohesion: 0.67
Nodes (3): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), Bug Fixes, Features

### Community 129 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 130 - "1.0.0 (2026-08-20)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-20), Bug Fixes, Features, Performance Improvements

### Community 131 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18)"
Cohesion: 0.67
Nodes (3): [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), Bug Fixes, Features

### Community 132 - "1.0.0 (2026-08-21)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-21), Bug Fixes, Features, Performance Improvements

### Community 133 - "[1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)"
Cohesion: 0.50
Nodes (4): [1.0.1](https://github.com/1arley/animesice/compare/v1.0.0...v1.0.1) (2026-08-12), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12), Bug Fixes, Features

### Community 135 - "FeedPost.tsx"
Cohesion: 0.11
Nodes (13): FeedPage(), revalidate, CommentGlyph(), FeedPost(), HeartGlyph(), ShareGlyph(), FeedView(), FeedViewProps (+5 more)

### Community 139 - "posts/page.tsx"
Cohesion: 0.29
Nodes (4): AdminPostsPage(), STATUS_FILTERS, AdminPostItem, Paginated

### Community 142 - "gacha_box_reveal.py"
Cohesion: 0.10
Nodes (9): CommonBox, GachaBoxReveal, PremiumBox, RareBox, render_assets(), diamond(), NightMarketCardReveal, render_asset() (+1 more)

### Community 166 - "ProfileStats.tsx"
Cohesion: 0.29
Nodes (7): CountUp(), ProfileNav(), ProfileTab, TABS, ProfileStats(), StatItem, PublicUserProfile

### Community 212 - "AdminCrystalCodesPage"
Cohesion: 0.40
Nodes (3): AdminCrystalCodesPage(), cancelEditing(), save()

### Community 221 - "blur.ts"
Cohesion: 0.15
Nodes (11): CalendarioPage(), metadata, PosterThumb(), revalidate, YearFilter(), YEARS, blur, land69 (+3 more)

### Community 232 - "biblioteca/page.tsx"
Cohesion: 0.22
Nodes (9): EmptyState(), HistoryRow(), LibraryPage(), Tab, TAB_LABELS, TAB_STATUS, TABS, UserAnimeListItem (+1 more)

### Community 238 - "next"
Cohesion: 0.11
Nodes (10): metadata, RecuperarSenhaPage(), VerifyEmailForm(), VerifyEmailPage(), cspHeader, nextConfig, next, Wordmark() (+2 more)

### Community 239 - "admin/usuarios/page.tsx"
Cohesion: 0.15
Nodes (9): ACTION_DESC, ACTION_LABELS, AdminUsersPage(), ModerateAction, ModerateUserModal(), ROLE_BADGE, ROLE_LABELS, AdminUserDetail (+1 more)

## Knowledge Gaps
- **561 isolated node(s):** `name`, `version`, `private`, `dev`, `build` (+556 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 803 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Avatar`, `Header`, `capas/page.tsx`, `usePrefersReducedMotion`, `index.ts`, `FeedPost.tsx`, `login/page.tsx`, `me/page.tsx`, `posts/page.tsx`, `GachaEconomyHub.tsx`, `HomeSections.tsx`, `ProfileHero.tsx`, `CommentSection.tsx`, `episode/[slug]/[number]/page.tsx`, `ProfileActivity.tsx`, `feedbacks/page.tsx`, `safeImageSrc`, `package.json`, `room/[slug]/page.tsx`, `app/layout.tsx`, `Anime`, `ProfileStats.tsx`, `(app)/gacha/page.tsx`, `HomeHero.tsx`, `PageTitle`, `GachaPageSkeleton`, `api`, `users/[userName]/page.tsx`, `error.tsx`, `HeroSlide.tsx`, `skins/page.tsx`, `blog/[slug]/page.tsx`, `BlogForm.tsx`, `cartas/page.tsx`, `EpisodeLoadingState.tsx`, `test-crystal/page.tsx`, `GachaCard.tsx`, `NotificationBell.tsx`, `comunidade/pedidos/page.tsx`, `ProfileFollowList.tsx`, `moderacao/page.tsx`, `create/page.tsx`, `blur.ts`, `HeroAtmosphere.tsx`, `GachaNav.tsx`, `biblioteca/page.tsx`, `next`, `admin/usuarios/page.tsx`, `useToast`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _561 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `@playwright/test` be split into smaller, more focused modules?**
  _Cohesion score 0.053613053613053616 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `Avatar`, `Header`, `capas/page.tsx`, `usePrefersReducedMotion`, `index.ts`, `blog.ts`, `login/page.tsx`, `me/page.tsx`, `ProfileHero.tsx`, `GachaEconomyHub.tsx`, `HomeSections.tsx`, `FeedPost.tsx`, `CommentSection.tsx`, `episode/[slug]/[number]/page.tsx`, `ProfileActivity.tsx`, `feedbacks/page.tsx`, `safeImageSrc`, `package.json`, `animes/page.tsx`, `react`, `room/[slug]/page.tsx`, `app/layout.tsx`, `buscar/page.tsx`, `Anime`, `(app)/gacha/page.tsx`, `HomeHero.tsx`, `GachaPageSkeleton`, `api`, `users/[userName]/page.tsx`, `error.tsx`, `HeroSlide.tsx`, `skins/page.tsx`, `blog/[slug]/page.tsx`, `BlogForm.tsx`, `cartas/page.tsx`, `GachaCard.tsx`, `NotificationBell.tsx`, `comunidade/pedidos/page.tsx`, `ProfileFollowList.tsx`, `create/page.tsx`, `blur.ts`, `site.ts`, `api-server.ts`, `HeroAtmosphere.tsx`, `GachaNav.tsx`, `biblioteca/page.tsx`, `admin/usuarios/page.tsx`, `useToast`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Should `Header` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `react` to `Avatar`, `Header`, `SettingsPage`, `capas/page.tsx`, `index.ts`, `FeedPost.tsx`, `login/page.tsx`, `me/page.tsx`, `posts/page.tsx`, `GachaEconomyHub.tsx`, `ProfileHero.tsx`, `CommentSection.tsx`, `episode/[slug]/[number]/page.tsx`, `ProfileActivity.tsx`, `feedbacks/page.tsx`, `safeImageSrc`, `room/[slug]/page.tsx`, `app/layout.tsx`, `AdminGachaPage`, `Anime`, `(app)/gacha/page.tsx`, `GachaPageSkeleton`, `api`, `AdminWatchtowerPage`, `blog/[slug]/page.tsx`, `cartas/page.tsx`, `NotificationBell.tsx`, `comunidade/pedidos/page.tsx`, `ProfileFollowList.tsx`, `moderacao/page.tsx`, `create/page.tsx`, `biblioteca/page.tsx`, `admin/usuarios/page.tsx`, `useToast`, `AnimeListButton`, `AdminGenerosPage`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `SettingsPage` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._