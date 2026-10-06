# Graph Report - animesice  (2026-10-06)

## Corpus Check
- 305 files · ~312,819 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 12, .example 1, .css 1)

## Summary
- 1832 nodes · 4486 edges · 146 communities (120 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `83207d3e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @playwright/test
- night_market_card_reveal.py
- useAuth
- moderacao/page.tsx
- capas/page.tsx
- CrystalMotion.tsx
- Anime
- index.ts
- ContinueWatchingRail.tsx
- Wordmark
- GachaLoadoutEditor.tsx
- blog/[slug]/page.tsx
- GachaEconomyHub.tsx
- HomeSections.tsx
- GachaCard.tsx
- blog.ts
- BlogPost
- Baixa prioridade (acessibilidade)
- validate.py
- api
- AdminCapasPage
- buscar/page.tsx
- ProfileActivity.tsx
- package.json
- compilerOptions
- components.json
- animes/page.tsx
- HomeHero.tsx
- next
- room/[slug]/page.tsx
- devDependencies
- app/layout.tsx
- AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)
- AdminGachaPage
- PageTitle
- ProfileDashboard.tsx
- CrystalLoader
- (app)/gacha/page.tsx
- NotificationPreferencesSection.tsx
- encyclopedia/page.tsx
- FeedPost.tsx
- NightMarket.tsx
- mock-backend.js
- skins/page.tsx
- react
- users/[userName]/page.tsx
- error.tsx
- dependencies
- admin/usuarios/page.tsx
- AdminWatchtowerPage
- usePrefersReducedMotion
- RollStage.tsx
- scripts
- EmptyState
- gacha_box_reveal.py
- SEO & Tráfego — Plano de Implementação
- gsap.ts
- settings/page.tsx
- test-crystal/page.tsx
- CHANGELOG.md
- Code Rules and Guidelines
- BlogForm.tsx
- Avatar
- AnimesIce Frontend Audit
- Product
- biblioteca/page.tsx
- Learn More
- console-debug.js
- check-chunk-recovery-build.mjs
- CosmeticSvg.tsx
- Findings
- GachaMarketOfferHub.tsx
- 1.0.0 (2026-08-26)
- 1.0.0 (2026-09-15)
- dmca/page.tsx
- privacidade/page.tsx
- 1. Directory Structure Overview
- .eslintrc.json
- postcss.config.mjs
- 1.0.0 (2026-09-18)
- opengraph-image.tsx
- ensureRefresh
- 1.0.0 (2026-08-18)
- NightMarketIntro
- Repository Guidelines
- escapeJsonLd
- GachaCrystal
- CompensationModal.tsx
- Auditoria de UI/UX do mercado
- Recommended Action Plan
- User
- allowScripts
- gacha/layout.tsx
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
- admin/gacha/page.tsx
- create/page.tsx
- 1.0.0 (2026-08-14)
- 1.0.0 (2026-08-15)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-17)
- 1.0.0 (2026-08-18)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-19)
- AuthProvider
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18)
- 1.0.0 (2026-08-20)
- 1.0.0 (2026-08-20)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18)
- 1.0.0 (2026-08-21)
- [1.1.0](https://github.com/1arley/animesice/compare/v1.0.1...v1.1.0) (2026-08-12)
- FeedView.tsx
- blur.ts
- api-server.ts
- INFO
- crystals/page.tsx
- safeImageSrc

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

## Communities (146 total, 26 thin omitted)

### Community 0 - "@playwright/test"
Cohesion: 0.05
Nodes (47): API(), mockFeed(), API(), makeUsers(), mockUsersDirectory(), EBML_MAGIC, FTYP_BOX, pull (+39 more)

### Community 1 - "night_market_card_reveal.py"
Cohesion: 0.21
Nodes (4): render_assets(), diamond(), NightMarketCardReveal, render_asset()

### Community 2 - "useAuth"
Cohesion: 0.08
Nodes (26): AdminAuditPage(), AuditTab, RESOURCE_TYPES, AdminAnime, AdminCatalogoPage(), AdminConfigPage(), AdminCreateEpisodePage(), AdminEditAnimePage() (+18 more)

### Community 3 - "moderacao/page.tsx"
Cohesion: 0.18
Nodes (9): ACTION_LABELS, ModerateAction, ModerateUserInline(), ModerationPage(), REASON_LABELS, STATUS_LABELS, TARGET_LABELS, ReportItem (+1 more)

### Community 4 - "capas/page.tsx"
Cohesion: 0.19
Nodes (16): AUDIT_STYLE, blank, DEFAULT_LAYERS, Layer, ART_PLATE, auditCosmetic(), AuditItem, AuditLevel (+8 more)

### Community 5 - "CrystalMotion.tsx"
Cohesion: 0.14
Nodes (15): AppLayout(), lenis, CrystalMotion(), CrystalMotionMode, CrystalMotionProps, MoteStyle, moteValue(), VIDEO_SOURCES (+7 more)

### Community 6 - "Anime"
Cohesion: 0.13
Nodes (19): dynamic, metadata, revalidate, TopPage(), AnimeCard(), AnimeCardProps, HeroSlideProps, HeroUI() (+11 more)

### Community 7 - "index.ts"
Cohesion: 0.05
Nodes (57): FIELDS, AdminDashboardStats, AdminPostItem, AdminUserDetail, AdminUserListItem, AuditLogItem, AuthResponse, GachaPullResponse (+49 more)

### Community 8 - "ContinueWatchingRail.tsx"
Cohesion: 0.17
Nodes (16): ContinueWatchingRail(), FavoriteButton(), FavoriteButtonProps, Modal(), AnimeStatsDisplay(), RatingStars(), handleKeyDown(), handleRate() (+8 more)

### Community 9 - "Wordmark"
Cohesion: 0.11
Nodes (20): LoginForm(), LoginPage(), RecuperarSenhaPage(), RedefinirSenhaForm(), handleSubmit(), RedefinirSenhaPage(), RegisterPage(), handleSubmit() (+12 more)

### Community 10 - "GachaLoadoutEditor.tsx"
Cohesion: 0.18
Nodes (14): GachaColecaoPage(), metadata, CosmeticSlotPicker(), SLOT_HINT, SLOT_LABEL, CosmeticThumb(), GachaCosmeticShop(), EMPTY (+6 more)

### Community 11 - "blog/[slug]/page.tsx"
Cohesion: 0.27
Nodes (10): BlogPostPage(), findPost(), generateMetadata(), revalidate, ShareButtons(), ShareButtonsProps, serverGetBlogPost(), blogPostDate() (+2 more)

### Community 12 - "GachaEconomyHub.tsx"
Cohesion: 0.09
Nodes (32): GachaShopPage(), GachaMarketPage(), FOCUSABLE, ACCENT, BOX_LABEL, BoxReveal(), boxRewardLabel(), BOX_FIELD (+24 more)

### Community 13 - "HomeSections.tsx"
Cohesion: 0.17
Nodes (26): HomePage(), metadata, revalidate, HomeBackdrop(), DeferredPersonalizedRails(), Rail, SectionLabel(), alreadyTriggered() (+18 more)

### Community 14 - "GachaCard.tsx"
Cohesion: 0.11
Nodes (24): GachaCollectionPage(), handleReroll(), ConfirmDialog(), CardPreview(), share(), CONDITION_ART, CONDITION_COLOR, CONDITION_GLYPH (+16 more)

### Community 15 - "blog.ts"
Cohesion: 0.22
Nodes (15): BlogPage(), metadata, revalidate, GET(), revalidate, sitemap(), STATIC_ROUTES, serverListBlogPosts() (+7 more)

### Community 16 - "BlogPost"
Cohesion: 0.40
Nodes (6): 1. CMS — Conteúdo editorial nos animes + Blog, 1a. Schema (Prisma), 1b. Backend (NestJS), 1c. Frontend, 1d. Migração de dados, BlogPost

### Community 18 - "Baixa prioridade (acessibilidade)"
Cohesion: 0.06
Nodes (30): Alta prioridade (bugs reais), anchor-is-valid ×2, Baixa prioridade (acessibilidade), click-events-have-key-events ×3, Concluído, effect-needs-cleanup ×6, Falsos positivos documentados (não mexer), html-label-has-single-control ×1 (+22 more)

### Community 19 - "validate.py"
Cohesion: 0.18
Nodes (6): largest_plate(), _length(), local_name(), main(), validate(), On commits, branches, and PRs

### Community 20 - "api"
Cohesion: 0.15
Nodes (14): AdminEditEpisodePage(), DeleteZone(), DeleteZoneProps, FieldLabel(), Hint(), ScrapeImportPanel(), ScrapeImportPanelProps, VideoUploadPanel() (+6 more)

### Community 21 - "AdminCapasPage"
Cohesion: 0.18
Nodes (15): AdminCapasPage(), addLayer(), cancelEditing(), changeType(), save(), startEditing(), sync(), updateLayer() (+7 more)

### Community 22 - "buscar/page.tsx"
Cohesion: 0.22
Nodes (12): first(), metadata, revalidate, SearchPage(), SearchParam, YEARS, animeFormatLabel(), animeSeasonLabel() (+4 more)

### Community 23 - "ProfileActivity.tsx"
Cohesion: 0.15
Nodes (18): ActivityRow(), CommentGlyph(), CommentLike(), EventVerb(), ProfileActivity(), ProfileActivityProps, ProfileCurrentlyWatching(), ProfileRatings() (+10 more)

### Community 24 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, version, autoprefixer, eslint, eslint-config-next, @gsap/react, ogl (+11 more)

### Community 26 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 27 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 28 - "animes/page.tsx"
Cohesion: 0.20
Nodes (13): AnimesPage(), generateMetadata(), revalidate, dynamic, generateMetadata(), GenrePage(), generateMetadata(), LancamentosPage() (+5 more)

### Community 29 - "HomeHero.tsx"
Cohesion: 0.07
Nodes (30): 1. Overall Project Structure, 2. Mobile Menu / Hamburger Functionality, 3. Key Files, 4. Data Flow Summary: Main Mobile Nav Open/Close, 5. Essential Files for Understanding the Feature, 6. Architecture Insights, 7. Summary of Files Searched, A. Main Site Mobile Navigation (Bottom Sheet Drawer) (+22 more)

### Community 30 - "next"
Cohesion: 0.07
Nodes (31): AdminLayout(), AdminShell(), AdminSidebar(), NAV_ITEMS, NavItem, metadata, ConfirmEmailContent(), ConfirmEmailPage() (+23 more)

### Community 31 - "room/[slug]/page.tsx"
Cohesion: 0.06
Nodes (52): mergeMessages(), Participant, RoomPage(), Architecture Overview, F06: SyncedVideoPlayer Exceeds 800 Lines, F07: CommentSection Missing Loading Feedback on Submit/Delete, F08: RatingStars Radiogroup Keyboard Navigation Broken, F09: ServiceNotice Uses Hardcoded Date Key (+44 more)

### Community 32 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, eslint, eslint-config-next, @playwright/test, postcss, semantic-release, @semantic-release/changelog (+7 more)

### Community 33 - "app/layout.tsx"
Cohesion: 0.18
Nodes (11): fontDisplay, fontPlexMono, fontPlexSans, metadata, RootLayout(), viewport, DeferredCrystalSplash(), CompensationModal() (+3 more)

### Community 34 - "AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript)"
Cohesion: 0.20
Nodes (9): AnimesIce - Frontend (Next.js + React + Tailwind CSS + TypeScript), API Routes, Getting Started, Index, Library Recommendations, License, On Deploying, TechStack (+1 more)

### Community 35 - "AdminGachaPage"
Cohesion: 0.13
Nodes (8): AdminGachaPage(), cancelEdit(), clearAnime(), onAnimeFilterChange(), resetForm(), saveCard(), selectAnime(), toggleAnimeFilter()

### Community 36 - "PageTitle"
Cohesion: 0.19
Nodes (10): RegrasPage(), SORT_TABS, SortKey, UsuariosPage(), BlurText(), BlurTextProps, BlurTextTag, PageTitle() (+2 more)

### Community 37 - "ProfileDashboard.tsx"
Cohesion: 0.26
Nodes (8): Glyph(), MobileTabBar(), DashStat(), DashStats, ProfileDashboard(), displayName(), DisplayNameUser, CommentItem

### Community 38 - "CrystalLoader"
Cohesion: 0.28
Nodes (7): Loading(), Loading(), Loading(), Loading(), Loading(), CrystalLoader(), CrystalLoaderProps

### Community 39 - "(app)/gacha/page.tsx"
Cohesion: 0.17
Nodes (20): CrystalIcon(), formatCountdown(), GachaPage(), GachaPageContent(), closePreview(), handleApplyRanking(), handleBypass(), handleClaim() (+12 more)

### Community 40 - "NotificationPreferencesSection.tsx"
Cohesion: 0.29
Nodes (6): ALL_TYPES, channels, NOTIFICATION_LABELS, NotificationChannel, NotificationPreference, NotificationType

### Community 41 - "encyclopedia/page.tsx"
Cohesion: 0.24
Nodes (6): Encyclopedia(), EncyclopediaPage(), GACHA_TIERS, WishlistButton(), WishlistButtonProps, GachaEncyclopedia

### Community 42 - "FeedPost.tsx"
Cohesion: 0.21
Nodes (5): CommentGlyph(), FeedPost(), HeartGlyph(), ShareGlyph(), PostCommentItem

### Community 43 - "NightMarket.tsx"
Cohesion: 0.24
Nodes (11): metadata, NightMarketPage(), NightMarket(), offerImage(), offerKind(), offerName(), offerRarity(), RARITY_LABEL (+3 more)

### Community 44 - "mock-backend.js"
Cohesion: 0.18
Nodes (8): EPISODE, http, server, CORS_HEADERS, http, json(), server, url

### Community 45 - "skins/page.tsx"
Cohesion: 0.24
Nodes (6): countdown(), GachaSkinsPage(), SkinTile(), SkinReveal(), GachaSkin, GachaSkinsResponse

### Community 46 - "react"
Cohesion: 0.07
Nodes (19): AdminBlogPage(), STATUS_BADGE, STATUS_LABELS, TYPE_LABELS, ConfigEntry, GROUP_LABELS, AdminImportPage(), ExternalWorksPage() (+11 more)

### Community 47 - "users/[userName]/page.tsx"
Cohesion: 0.05
Nodes (43): OverviewSkeleton(), ProfileSkeleton(), PublicProfilePage(), ensureTab(), handleNavigate(), TAB_ALIASES, HeadingLevel, SectionLabelProps (+35 more)

### Community 48 - "error.tsx"
Cohesion: 0.47
Nodes (8): ErrorPage(), GlobalError(), CHUNK_ERROR_EVENT, CHUNK_RECOVERY_EXHAUSTED_EVENT, isChunkLoadError(), isChunkRecoveryExhausted(), retryChunkLoad(), Window

### Community 49 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, gsap, @gsap/react, hls.js, lenis, motion, next, ogl (+3 more)

### Community 50 - "admin/usuarios/page.tsx"
Cohesion: 0.18
Nodes (7): ACTION_DESC, ACTION_LABELS, AdminUsersPage(), ModerateAction, ModerateUserModal(), ROLE_BADGE, ROLE_LABELS

### Community 51 - "AdminWatchtowerPage"
Cohesion: 0.33
Nodes (11): AdminWatchtowerPage(), handleBackfillAnilist(), handleCheck(), handleDiscover(), handleRepair(), handleRetry(), handleScanAll(), handleSyncSchedules() (+3 more)

### Community 52 - "usePrefersReducedMotion"
Cohesion: 0.14
Nodes (20): motion, ParallaxValues, useHeroParallax(), Aurora, HeroAtmosphere(), HeroAtmosphereProps, HeroCharacter(), HeroCharacterProps (+12 more)

### Community 53 - "RollStage.tsx"
Cohesion: 0.27
Nodes (8): Cristal do gacha (Manim), PARTICLE_GALAXY, particleCount(), revealSpeed(), ringCount(), RollStage(), shakeAmp(), tierOf()

### Community 54 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check:chunk-recovery, dev, lint, release, release:dry, start (+2 more)

### Community 55 - "EmptyState"
Cohesion: 0.24
Nodes (4): CommentRow(), CommentSection(), CommentSectionProps, EmptyState()

### Community 56 - "gacha_box_reveal.py"
Cohesion: 0.27
Nodes (4): CommonBox, GachaBoxReveal, PremiumBox, RareBox

### Community 57 - "SEO & Tráfego — Plano de Implementação"
Cohesion: 0.18
Nodes (10): 2. Página de índice `/generos`, 3. Schema VideoObject nos episódios, 4. Gêneros no sitemap, 5. hreflang `pt-BR`, Contexto, Decisões fechadas, Ordem de execução recomendada, SEO & Tráfego — Plano de Implementação (+2 more)

### Community 58 - "gsap.ts"
Cohesion: 0.47
Nodes (4): gsap, DividerSvg(), IceBeamDivider(), useFinePointer()

### Community 59 - "settings/page.tsx"
Cohesion: 0.14
Nodes (6): AVATAR_ACCEPT, prepareAvatar(), SettingsPage(), handleFilePicked(), NotificationPreferencesSection(), PrivacySection()

### Community 60 - "test-crystal/page.tsx"
Cohesion: 0.43
Nodes (5): metadata, TestCrystalPage(), CrystalVideoClean(), compileShader(), CrystalVideoPreview()

### Community 61 - "CHANGELOG.md"
Cohesion: 0.13
Nodes (14): 1.0.0 (2026-08-15), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.1.0](https://github.com/1arley/animesice/compare/v1.0.0...v1.1.0) (2026-09-18), [1.2.0](https://github.com/1arley/animesice/compare/v1.1.0...v1.2.0) (2026-08-13), Bug Fixes, Bug Fixes, Bug Fixes (+6 more)

### Community 62 - "Code Rules and Guidelines"
Cohesion: 0.29
Nodes (7): Code Details, Code Rules and Guidelines, Directory Structure, Extra, Generating Icons for your Application, Naming Conventions, Styling Conventions

### Community 63 - "BlogForm.tsx"
Cohesion: 0.29
Nodes (8): EditBlogPostPage(), NewBlogPostPage(), BlogForm(), changeTitle(), submit(), slugify(), toLocalDate(), BlogPostInput

### Community 64 - "Avatar"
Cohesion: 0.28
Nodes (9): MyProfilePage(), Avatar(), AvatarProps, FollowRow(), ProfileFollowList(), FollowButton(), UserCard(), formatDate() (+1 more)

### Community 65 - "AnimesIce Frontend Audit"
Cohesion: 0.22
Nodes (8): 1. Silent Error Swallowing, 2. No SWR/React Query — Manual Cache Invalidation, 3. Large Client Components, AnimesIce Frontend Audit, Cross-cutting Problems, Executive Summary, Skills Used, Test Coverage Gaps

### Community 66 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 67 - "biblioteca/page.tsx"
Cohesion: 0.20
Nodes (10): EmptyState(), HistoryRow(), LibraryPage(), Tab, TAB_LABELS, TAB_STATUS, TABS, UserAnimeListItem (+2 more)

### Community 68 - "Learn More"
Cohesion: 0.33
Nodes (6): Eslint, Husky, Learn More, Next.js, React, TailwindCSS

### Community 70 - "check-chunk-recovery-build.mjs"
Cohesion: 0.40
Nodes (3): html, recoveryScript, scripts

### Community 71 - "CosmeticSvg.tsx"
Cohesion: 0.47
Nodes (5): Asset, cache, CosmeticSvg, overlayScale(), svgDataUrl()

### Community 72 - "Findings"
Cohesion: 0.29
Nodes (7): CRITICAL, F01: Cross-Project Brand Contamination in hentaisice Fork, F02: Modal Focus Trap Not Implemented, F03: Toast Notifications Not Announced to Screen Readers, F05: CSP Uses `unsafe-inline` for `script-src`, Findings, HIGH

### Community 73 - "GachaMarketOfferHub.tsx"
Cohesion: 0.47
Nodes (4): GachaMarketOfferHub(), OfferCard(), personName(), GachaMarketOffer

### Community 74 - "1.0.0 (2026-08-26)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-08-26), Bug Fixes, Features, Performance Improvements, Reverts

### Community 75 - "1.0.0 (2026-09-15)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-15), Bug Fixes, Features, Performance Improvements, Reverts

### Community 78 - "1. Directory Structure Overview"
Cohesion: 0.17
Nodes (11): 1. Directory Structure Overview, Animesice - Next.js Frontend Structure Analysis, `app/` Directory (Next.js App Router), Architectural Patterns Identified, Code Quality Observations, Essential Files for Understanding the Feature Architecture, Pages Directory & Routing Summary, Root Level (+3 more)

### Community 85 - "1.0.0 (2026-09-18)"
Cohesion: 0.40
Nodes (5): 1.0.0 (2026-09-18), Bug Fixes, Features, Performance Improvements, Reverts

### Community 86 - "opengraph-image.tsx"
Cohesion: 0.40
Nodes (3): contentType, revalidate, size

### Community 90 - "ensureRefresh"
Cohesion: 0.40
Nodes (5): F04: `api.ts` ensureRefresh() Can Permanently Lock Refresh State, P1 (Next sprint), ensureRefresh(), readErrorMessage(), request()

### Community 91 - "1.0.0 (2026-08-18)"
Cohesion: 0.50
Nodes (4): 1.0.0 (2026-08-18), Bug Fixes, Features, Performance Improvements

### Community 93 - "Repository Guidelines"
Cohesion: 0.25
Nodes (7): Agent Team, Code, Tests, Delivery, Commands, Project Structure, Repository Guidelines, Role and First Checks, UI, Security, Technology

### Community 94 - "escapeJsonLd"
Cohesion: 0.16
Nodes (10): GenerosPage(), metadata, revalidate, metadata, SobrePage(), config, APEX_CANONICAL_HOSTS, ASSET_URL (+2 more)

### Community 98 - "Auditoria de UI/UX do mercado"
Cohesion: 0.33
Nodes (5): Achados tratados, Auditoria de UI/UX do mercado, Direcao visual, Limites e proximas prioridades, Verificacao

### Community 99 - "Recommended Action Plan"
Cohesion: 0.50
Nodes (4): P0 (Immediate — Ship blockers), P2 (Short-term), P3 (Medium-term), Recommended Action Plan

### Community 100 - "User"
Cohesion: 0.67
Nodes (3): RegisterResponse, User, AuthContextValue

### Community 102 - "gacha/layout.tsx"
Cohesion: 0.60
Nodes (3): GachaLayout(), GachaNav(), items

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
Cohesion: 0.11
Nodes (11): AdminCrystalCodesPage(), cancelEditing(), save(), blank, Code, AdminGachaConfigPage(), GachaCrystalsPage(), Toast (+3 more)

### Community 117 - "admin/gacha/page.tsx"
Cohesion: 0.33
Nodes (5): animeLabel(), AnimeOption, TIERS, AdminGachaCard, GachaEngagementPilotDashboard

### Community 118 - "create/page.tsx"
Cohesion: 0.43
Nodes (4): AdminCreateAnimePage(), animeAudioLabelFromTitle(), isDubbedTitle(), slugify()

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

### Community 127 - "AuthProvider"
Cohesion: 0.29
Nodes (7): F12: FavoriteButton Has No Visual Loading Feedback, F13: FeedPost Silently Swallows Share Error, F14: Auth Context Shows Loading Flash on First Render, F15: AdminGate Has No Dedicated Layout Guard, LOW, AuthProvider(), loadApi()

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

### Community 135 - "FeedView.tsx"
Cohesion: 0.15
Nodes (9): FeedPage(), revalidate, FeedComposer(), FeedView(), FeedViewProps, Scope, SCOPE_TABS, FeedItem (+1 more)

### Community 136 - "blur.ts"
Cohesion: 0.15
Nodes (11): CalendarioPage(), metadata, PosterThumb(), revalidate, YearFilter(), blur, land69, post89 (+3 more)

### Community 139 - "api-server.ts"
Cohesion: 0.20
Nodes (12): POST(), POST(), GET(), generateMetadata(), getEpisode, revalidate, toIso8601Duration(), WatchPage() (+4 more)

### Community 141 - "INFO"
Cohesion: 0.29
Nodes (7): handleSubmit(), safeNext(), F16: Build, Typecheck, and Lint Pass Cleanly, F17: Reduced Motion Is Comprehensive and Well-Implemented, F18: Open Redirect Protection in Login Is Correct, F19: Chunk Recovery System Is Well-Designed, INFO

### Community 147 - "crystals/page.tsx"
Cohesion: 0.33
Nodes (4): CRYSTAL_PACKAGES, TYPE_LABEL, CrystalEvent, CrystalEventType

### Community 148 - "safeImageSrc"
Cohesion: 0.15
Nodes (20): AnimeDetailPage(), generateMetadata(), getAnime, revalidate, Positive Findings, Key Design Decisions, AdaptiveImage(), AdaptiveImageProps (+12 more)

## Knowledge Gaps
- **555 isolated node(s):** `extends`, `next/core-web-vitals`, `dynamic`, `revalidate`, `size` (+550 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 787 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `useAuth`, `capas/page.tsx`, `CrystalMotion.tsx`, `Anime`, `FeedView.tsx`, `blur.ts`, `Wordmark`, `GachaLoadoutEditor.tsx`, `api-server.ts`, `blog/[slug]/page.tsx`, `HomeSections.tsx`, `GachaCard.tsx`, `blog.ts`, `ContinueWatchingRail.tsx`, `GachaEconomyHub.tsx`, `crystals/page.tsx`, `api`, `safeImageSrc`, `buscar/page.tsx`, `ProfileActivity.tsx`, `package.json`, `animes/page.tsx`, `HomeHero.tsx`, `room/[slug]/page.tsx`, `app/layout.tsx`, `ProfileDashboard.tsx`, `(app)/gacha/page.tsx`, `encyclopedia/page.tsx`, `FeedPost.tsx`, `NightMarket.tsx`, `skins/page.tsx`, `react`, `users/[userName]/page.tsx`, `error.tsx`, `admin/usuarios/page.tsx`, `usePrefersReducedMotion`, `EmptyState`, `settings/page.tsx`, `BlogForm.tsx`, `Avatar`, `biblioteca/page.tsx`, `opengraph-image.tsx`, `escapeJsonLd`, `CompensationModal.tsx`, `gacha/layout.tsx`, `admin/gacha/page.tsx`, `create/page.tsx`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `dynamic` to the rest of the system?**
  _555 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `@playwright/test` be split into smaller, more focused modules?**
  _Cohesion score 0.05387861084063616 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `useAuth`, `moderacao/page.tsx`, `capas/page.tsx`, `CrystalMotion.tsx`, `Anime`, `index.ts`, `ContinueWatchingRail.tsx`, `Wordmark`, `GachaLoadoutEditor.tsx`, `api-server.ts`, `blog/[slug]/page.tsx`, `HomeSections.tsx`, `GachaCard.tsx`, `GachaEconomyHub.tsx`, `FeedView.tsx`, `crystals/page.tsx`, `api`, `safeImageSrc`, `ProfileActivity.tsx`, `package.json`, `HomeHero.tsx`, `next`, `room/[slug]/page.tsx`, `app/layout.tsx`, `PageTitle`, `ProfileDashboard.tsx`, `(app)/gacha/page.tsx`, `NotificationPreferencesSection.tsx`, `encyclopedia/page.tsx`, `FeedPost.tsx`, `NightMarket.tsx`, `skins/page.tsx`, `users/[userName]/page.tsx`, `error.tsx`, `admin/usuarios/page.tsx`, `usePrefersReducedMotion`, `RollStage.tsx`, `EmptyState`, `gsap.ts`, `settings/page.tsx`, `test-crystal/page.tsx`, `BlogForm.tsx`, `Avatar`, `biblioteca/page.tsx`, `CosmeticSvg.tsx`, `GachaMarketOfferHub.tsx`, `CompensationModal.tsx`, `gacha/layout.tsx`, `useToast`, `admin/gacha/page.tsx`, `create/page.tsx`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.08127721335268505 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `useAuth` to `moderacao/page.tsx`, `Anime`, `FeedView.tsx`, `ContinueWatchingRail.tsx`, `Wordmark`, `GachaLoadoutEditor.tsx`, `GachaEconomyHub.tsx`, `GachaCard.tsx`, `crystals/page.tsx`, `api`, `safeImageSrc`, `ProfileActivity.tsx`, `next`, `room/[slug]/page.tsx`, `app/layout.tsx`, `AdminGachaPage`, `ProfileDashboard.tsx`, `(app)/gacha/page.tsx`, `encyclopedia/page.tsx`, `FeedPost.tsx`, `NightMarket.tsx`, `react`, `users/[userName]/page.tsx`, `admin/usuarios/page.tsx`, `AdminWatchtowerPage`, `EmptyState`, `settings/page.tsx`, `Avatar`, `biblioteca/page.tsx`, `GachaMarketOfferHub.tsx`, `CompensationModal.tsx`, `useToast`, `admin/gacha/page.tsx`, `create/page.tsx`, `AuthProvider`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `CrystalMotion.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1422924901185771 - nodes in this community are weakly interconnected._