# Animesice - Next.js Frontend Structure Analysis

## 1. Directory Structure Overview

### Root Level
- `app/` - **Next.js 15 App Router** (primary routing system)
- `src/components/` - React components organized by feature/area
- `src/lib/` - Utility functions and helpers
- `src/types/` - TypeScript type definitions
- `public/` - Static assets (icons, favicons)
- `components.json` - shadcn/ui component registry
- `next.config.ts` - Next.js configuration (CSP, headers, redirects, images)
- `middleware.ts` - Route middleware for auth/protection
- `package.json` - Dependencies (Next.js 15, React 19, TailwindCSS 3.4)

### `app/` Directory (Next.js App Router)
Main routing groups structure:

```
app/
├── layout.tsx          - Root layout with fonts, providers, CSP, AdSense
├── (app)/              - Public content group (all routes visible to unauthenticated users)
│   ├── page.tsx        - Home page (prateleira)
│   ├── (app)/animes/   - Anime detail routes
│   │   ├── [slug]/     - Anime detail page
│   │   │   └── [number]/ - Episode pages
│   │   └── opengraph-image.tsx - Dynamic OG images
│   ├── (app)/biblioteca - User library (requires auth)
│   │   ├── page.tsx    - Library management page
│   │   └── layout.tsx  - Library layout
│   ├── (app)/perfil/   - User profile routes
│   │   └── [id]/       - Legacy profile redirect
│   ├── (app)/[slug]/   - Dynamic slug routes
│   └── ...
├── (auth)/             - Authentication group
│   ├── layout.tsx      - Auth layout (centered card, no header/footer)
│   ├── login/
│   ├── register/
│   ├── recuperar-senha/
│   └── redefinir-senha/
├── admin/               - Admin panel (NOT a route group — plain directory)
│   ├── layout.tsx      - Admin layout
│   ├── page.tsx        - Admin dashboard
│   ├── auditoria/       - Audit logs
│   ├── generos/         - Genre management
│   ├── usuarios/        - User management
│   │   └── [id]/       - User detail
│   └── watchtower/      - Watchtower / monitoring
├── settings/           - User settings
│   └── confirm-email/
├── error.tsx           - Error boundary
├── loading.tsx         - Loading UI
├── not-found.tsx       - 404 page
├── robots.ts           - SEO robots
└── sitemap.ts          - Sitemap
```

### `src/components/` Organization
Components are organized by feature area:

```
src/components/
├── admin/              - Admin panel components
│   ├── DeleteZone.tsx
│   ├── Field.tsx
│   ├── ScrapeImportPanel.tsx
│   └── VideoUploadPanel.tsx
├── ads/                - Ad-related components
│   ├── AdBlockNotice.tsx
│   └── AdSlot.tsx
├── animesice/          - (empty/.gitkeep)
├── common/             - Shared UI components used across the app
│   ├── AdminGate.tsx           - Auth guard for admin routes
│   ├── AnimeCard.tsx           - Anime card component
│   ├── AnimeListButton.tsx     - Favorite/list button
│   ├── AuthButtons.tsx         - Login/logout buttons
│   ├── Avatar.tsx              - User avatar
│   ├── CommentSection.tsx      - Comment component
│   ├── ContinueWatchingRail.tsx- Continue watching section
│   ├── CreateRoomButton.tsx    - Room creation
│   ├── EpisodeCard.tsx         - Episode card
│   ├── EpisodeLoadingState.tsx - Loading state for episodes
│   ├── FavoriteButton.tsx      - Favorite toggle
│   ├── Footer.tsx
│   ├── Header.tsx              - Main header with logo/nav
│   ├── HomeHero.tsx            - Hero section on home
│   ├── KoFiLink.tsx            - Ko-fi donation link
│   ├── Modal.tsx               - Generic modal
│   ├── NotificationBell.tsx    - Notification indicator
│   ├── NotificationPreferencesSection.tsx - Settings
│   ├── PrivacySection.tsx      - Privacy settings
│   ├── ProfileDashboard.tsx    - Profile dashboard
│   ├── RatingStars.tsx         - Rating stars component
│   ├── RecommendationsRail.tsx - Recommendations section
│   ├── SectionLabel.tsx        - Section label styling
│   ├── SiteNav.tsx             - Main navigation
│   ├── ThirdPartyScripts.tsx   - Third-party script injection
│   ├── ToastProvider.tsx       - Toast notification provider
│   ├── VideoPlayer.tsx         - Video player component
│   ├── WatchClient.tsx         - WebRTC/client component
│   └── Wordmark.tsx            - Brand wordmark
├── core/               - Core utility/graphics components
│   ├── Aurora.tsx
│   ├── BlurText.tsx
│   ├── ClickSpark.tsx
│   ├── CountUp.tsx
│   ├── GradientText.tsx
│   ├── ShinyText.tsx
│   ├── SpotlightCard.tsx       - Animated spotlight card
│   └── TiltedCard.tsx
├── profile/            - Profile-related components
│   ├── PosterTile.tsx
│   ├── ProfileAbout.tsx
│   ├── ProfileActivity.tsx
│   ├── ProfileCollection.tsx
│   ├── ProfileCurrentlyWatching.tsx
│   ├── ProfileFavorites.tsx
│   ├── ProfileFollowList.tsx
│   ├── ProfileHero.tsx
│   ├── ProfileNav.tsx
│   ├── ProfileRatings.tsx
│   ├── ProfileStats.tsx
│   └── ProfileTaste.tsx
├── social/             - Social feed components
│   ├── FeedActivityItem.tsx
│   ├── FeedComposer.tsx
│   ├── FeedPost.tsx
│   ├── FollowButton.tsx
│   └── UserCard.tsx
└── ui/                 - Generic UI components (shadcn-based)
    ├── EmptyState.tsx
    ├── FormField.tsx
    ├── icons.tsx
    ├── PageTitle.tsx
    ├── Pagination.tsx
    └── Panel.tsx
```

### `src/lib/` Utility Functions
```
src/lib/
├── adsense.ts          - AdSense client ID configuration
├── api-server.ts       - Server-side API fetcher (with revalidate/cache)
├── api.ts              - Client-side API client
├── auth-context.tsx    - Auth context with session management
├── displayName.ts      - Display name formatting
├── password.ts         - Password validation/utils
├── role.ts             - Role/permission utilities
├── site.ts             - Site configuration
├── slug.ts             - Slug generation/normalization
├── sources.ts          - Source/streaming source utilities
├── status.ts           - Anime status checks (isOnAir, etc.)
├── time.ts             - Time formatting/processing
├── turnstile.ts        - Cloudflare Turnstile CAPTCHA
└── url.ts              - Image URL transformation utilities
```

### `src/types/` Type Definitions
Comprehensive TypeScript types aligned with Prisma schema (554 lines in index.ts):
- Anime, Episode, Genre, Rating, UserRating interfaces
- Paginated response generic interface
- AnimeStats, ToggleFavoriteResponse, CheckFavoriteResponse
- ContinueWatchingItem, WatchHistoryItem interfaces
- NotificationItem, NotificationListResponse
- CommentItem, CommentRepliesResponse
- PublicUserProfile, PublicFavoriteItem, PublicAnimeListItem
- ActivityAnime, PublicActivityEvent (discriminated union)
- AnimeFilters, WatchStatus union type
- UserAnimeListItem, CheckListResponse
- NotificationType, NotificationChannel, NotificationPreference
- PrivacySettings interface
- ReportTargetType, ReportReason, ReportStatusType, ModerationActionType
- ReportItem, ReportListResponse, ModerationActionItem
- SocialUser, PostAnime interfaces
- SocialPost, PostCommentItem
- FeedItem (discriminated union of post/activity)
- UserSearchResult, FeedbackStatus, AnimeRequestItem
- SiteFeedbackItem

### Architectural Patterns Identified

1. **Next.js 15 App Router** - File-based routing with groups `(app)`, `(auth)`, `(admin)`
2. **Server Components + Client Components** - Mixed rendering strategy
   - Server Components: Data fetching, revalidation, metadata generation
   - Client Components: Interactive UI, auth state, forms
3. **Feature-Based Component Organization** - Components grouped by feature area, not by type
4. **API Abstraction Layer** - `lib/api.ts` (client) and `lib/api-server.ts` (server) abstract API calls
5. **Type Safety** - All types derived from Prisma schema, comprehensive typing
6. **CSP & Security Headers** - Configurable in `next.config.ts`
7. **shadcn/ui Integration** - UI component library for consistent design
8. **Performance Optimization** - `revalidate` tags, `cache` directives, image optimization
9. **Route Groups** - `(auth)` and `(admin)` groups for routing without affecting URL path
10. **SEO-First** - Dynamic metadata, OG images, structured data (JSON-LD)

### Key Design Decisions

- **Authentication**: Context-based via `AuthProvider` in root layout; protected routes use `AdminGate` client component
- **Admin Protection**: Dual-layer - middleware + `AdminGate` component + backend API validation
- **Image Handling**: `next/image` with remotePatterns for various CDNs; `safeImageSrc` and `upgradeImageUrl` utilities
- **Navigation**: Next.js internal routing (`useRouter()`) instead of react-router
- **State Management**: React Query/SWR patterns via custom API fetcher; local state with hooks for UI
- **Styling**: TailwindCSS utility-first; custom design tokens (colors like ice, mist, hairline, signal, ink, snow, panel, body)
- **Accessibility**: Semantic HTML, aria labels, focus-visible styles, skip links

### Pages Directory & Routing Summary

| Route Pattern | Component/Page | Notes |
|---|---|---|
| `/` | `app/(app)/page.tsx` | Home page - prateleira |
| `/animes/:slug` | `app/(app)/animes/[slug]/page.tsx` | Anime detail page |
| `/animes/:slug/:number` | `app/(app)/animes/[slug]/[number]/page.tsx` | Episode page |
| `/biblioteca` | `app/(app)/biblioteca/page.tsx` | User library (requires auth) |
| `/perfil/:id` | `app/(app)/perfil/[id]/page.tsx` | Legacy redirect to `/users/:id` |
| `/users/:identifier` | (not in app dir - likely handled elsewhere) | User profile |
| `/login` | `app/(auth)/login/page.tsx` | Auth pages |
| `/register` | `app/(auth)/register/page.tsx` | |
| `/admin/*` | `app/admin/...` | Admin panel (protected, NOT a route group) |
| `/settings/*` | `app/settings/` | User settings |

### Essential Files for Understanding the Feature Architecture

1. **`app/layout.tsx`** - Root layout, providers, metadata, CSP, AdSense
2. **`app/(app)/page.tsx`** - Home page, main data fetching pattern
3. **`app/(app)/animes/[slug]/page.tsx`** - Anime detail with server-side caching
4. **`app/(auth)/layout.tsx`** - Auth layout pattern
5. **`src/lib/api-server.ts`** and **`src/lib/api.ts`** - API abstraction layer
6. **`src/lib/auth-context.tsx`** - Authentication context
7. **`src/components/common/AdminGate.tsx`** - Route protection
8. **`src/types/index.ts`** - Type definitions
9. **`next.config.ts`** - CSP, headers, redirects, image config
10. **`middleware.ts`** - Route-level protection logic

### Code Quality Observations

- **Strong Type Safety**: Types cover almost all backend domains (anime, ratings, comments, social, reports)
- **Performance-Centric**: Revalidation strategies, caching, image optimization
- **Security-Conscious**: CSP, httpOnly cookies, dual-layer auth protection, sanitized inputs
- **Accessibility**: ARIA labels, semantic HTML, focus styles
- **Maintainable**: Feature-based organization, clear separation of concerns
- **Production-Ready**: Error boundaries, loading states, SEO metadata