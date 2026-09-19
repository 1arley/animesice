# Mobile Menu / Hamburger Menu Analysis

## Project Overview
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript + React 19
- **Styling**: Tailwind CSS 3.4
- **Package Manager**: npm/yarn (see package.json)

---

## 1. Overall Project Structure

### Top-Level Directory
```
app/              - Next.js 15 App Router ((app), (auth), (admin) groups)
src/              - Source code (components, lib, types)
components/       - React components by feature area
lib/              - Utility functions and hooks
public/           - Static assets
next.config.ts    - Next.js configuration
tailwind.config.ts - Tailwind CSS configuration
package.json      - Dependencies
```

### Key Routing Groups
- `(app)` - Public content (unauthenticated routes)
- `(auth)` - Authentication pages (login, register, password reset)
- `(admin)` - Admin panel routes

---

## 2. Mobile Menu / Hamburger Functionality

The application has **three distinct mobile navigation implementations**:

### A. Main Site Mobile Navigation (Bottom Sheet Drawer)
**Location**: `src/components/common/SiteNav.tsx` (lines 207-298)

**Trigger**: 
- "Mais" button (`<button>` with `aria-label="Abrir menu"`) at line 209-219
- Only visible on mobile: `className="sm:hidden"`

**Behavior**:
1. Toggles `mobileOpen` state (`useState(false)` at line 53)
2. When open, sets `document.body.style.overflow = "hidden"` (line 110-111) to prevent scrolling
3. Renders a fixed backdrop (`nav-backdrop`) that covers the viewport
4. Renders a bottom sheet (`nav-sheet`) that slides up from the bottom
5. Closes on:
   - Backdrop click (`onClick={closeMobile}` at line 228)
   - Escape key (handled in useEffect at line 127)
   - Route change (useEffect at line 139-141)
   - Link clicks inside the drawer (all `onClick={closeMobile}` at lines 242, 255, 258, 278)

**CSS Classes** (defined in `app/globals.css` lines 691-745):
- `.nav-backdrop`: Fade animation (200ms fade-in, 150ms fade-out)
- `.nav-sheet`: Slide-up animation (280ms cubic-bezier), slides down when closing (200ms cubic-bezier)
- Keyframes: `nav-fade-in`, `nav-fade-out`, `nav-slide-up`, `nav-slide-down`
- Reduced motion support: `@media (prefers-reduced-motion: reduce)` disables animations

**Data Flow**:
- State: `mobileOpen` (boolean)
- Close function: `closeMobile` (useCallback with 200ms timeout)
- Navigation links all call `closeMobile` on click

---

### B. Mobile Search Drawer
**Location**: `src/components/common/Header.tsx` (lines 99-129)

**Trigger**: 
- Search icon button in header (lines 75-86)
- `aria-label="Buscar"`, `aria-expanded={mobileSearchOpen}`

**Behavior**:
1. Toggles `mobileSearchOpen` state
2. Renders a mobile search form that appears above the navigation
3. Submitting the form closes the drawer and navigates to `/buscar?q=...`
4. Clicking outside/outside the form resets state

**CSS**: Not separately animated - appears as a simple conditional render (`{mobileSearchOpen && (...)}`)

---

### C. Admin Panel Mobile Sidebar
**Location**: `app/admin/layout.tsx` (lines 48, 82-91, 93-149)

**Trigger**: 
- Admin tab button with hamburger icon (`<svg>` with transform based on `mobileNavOpen`)
- `aria-label="Alternar navegação"`

**Behavior**:
1. Toggles `mobileNavOpen` state
2. Shows/hides an `<aside>` sidebar element
3. Hamburger icon transforms from ☰ (M4 6h16) to ✕ (M6 18L18 6M6 6l12 12) based on state
4. Sidebar contains admin navigation links
5. Clicking any link closes the sidebar (`onClick={() => setMobileNavOpen(false)}`)

**CSS**: Inline conditional classes:
- `mobileNavOpen ? "block" : "hidden"` (line 94-95)
- `md:block md:w-52 md:flex-none` (always visible on desktop)

---

### D. Mobile Tab Bar
**Location**: `src/components/common/MobileTabBar.tsx` (lines 78-133)

**Behavior**:
- Fixed bottom navigation bar
- Only visible on mobile: `className="sm:hidden"`
- Contains 5 main tabs + profile/authoring button
- Active tab indicated by sliding indicator (`tab-active-bar`)
- Different from the drawer navigation - this is a bottom tab bar for quick navigation

---

## 3. Key Files

### Entry Points & Layout

| File | Purpose |
|------|---------|
| `app/(app)/layout.tsx` | Root layout that composes: Header + SiteNav + MobileTabBar + Footer |
| `src/components/common/Header.tsx` | Header with logo, desktop search, mobile search toggle |
| `src/components/common/SiteNav.tsx` | Main navigation - desktop + mobile drawer |
| `src/components/common/MobileTabBar.tsx` | Mobile bottom tab bar |
| `app/admin/layout.tsx` | Admin layout with its own mobile sidebar |

### CSS Animations

**File**: `app/globals.css` (lines 691-745)

```css
/* Nav Backdrop - fade animations */
.nav-backdrop { animation: nav-fade-in 200ms ease both; }
.nav-backdrop.closing { animation: nav-fade-out 150ms ease both; }

/* Nav Sheet - slide animations */
.nav-sheet { animation: nav-slide-up 280ms cubic-bezier(0.2, 0.8, 0.25, 1) both; }
.nav-sheet.closing { animation: nav-slide-down 200ms cubic-bezier(0.4, 0, 0.8, 0.4) both; }

@keyframes nav-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes nav-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes nav-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes nav-slide-down { from { transform: translateY(0); } to { transform: translateY(100%); } }
```

### State Management Hooks

| File | Hook | Purpose |
|------|------|---------|
| `src/lib/use-is-mobile.ts` | `useIsMobile()` | Detects if viewport is `<= 639px` via `matchMedia` |
| `src/components/common/SiteNav.tsx` | `useState(mobileOpen)` | Mobile nav open/close state |
| `src/components/common/Header.tsx` | `useState(mobileSearchOpen)` | Mobile search open state |
| `app/admin/layout.tsx` | `useState(mobileNavOpen)` | Admin sidebar open state |

---

## 4. Data Flow Summary: Main Mobile Nav Open/Close

```
User clicks "Mais" button
  ↓
setMobileOpen(true) in SiteNav.tsx line 211
  ↓
useEffect locks body overflow: hidden (line 110-111)
  ↓
DOM renders: nav-backdrop + nav-sheet with enter animations
  ↓
User interacts:
  - Click backdrop → closeMobile() → setMobileOpen(false) after 200ms timeout
  - Press Escape → closeMobile() → setMobileOpen(false) after 200ms timeout
  - Click nav link → closeMobile() immediately → setMobileOpen(false)
  - Navigate to new route → useEffect closes drawer (setMobileOpen false)
  ↓
setMobileOpen(false) after timeout
  ↓
useEffect restores body.style.overflow = ""
  ↓
nav-sheet animates out (slide-down), nav-backdrop fades out
```

---

## 5. Essential Files for Understanding the Feature

### Must-Read Files (in order of importance):

1. **`src/components/common/SiteNav.tsx`** (lines 50-301) - Core mobile navigation logic
   - State management (`mobileOpen`, `closing`)
   - Event listeners (mousedown, keydown)
   - Bottom sheet drawer implementation
   - Close strategies (backdrop, escape, route change, link clicks)

2. **`app/globals.css`** (lines 691-745) - CSS animations for the drawer
   - `.nav-backdrop`, `.nav-sheet` animations
   - Keyframes for fade and slide effects
   - Reduced motion media query

3. **`app/(app)/layout.tsx`** (lines 15-35) - Layout composition
   - How Header, SiteNav, MobileTabBar are combined
   - Understanding the overall page structure

4. **`src/components/common/Header.tsx`** (lines 1-132) - Header with mobile search
   - Mobile search toggle pattern (reusable model)

5. **`app/admin/layout.tsx`** (lines 45-152) - Admin mobile sidebar
   - Different mobile nav implementation for admin panel
   - Hamburger icon state-based transformation

### Secondary Files:

6. **`src/components/common/MobileTabBar.tsx`** - Mobile bottom tab bar
7. **`src/lib/use-is-mobile.ts`** - Mobile detection hook
8. **`src/components/common/SiteNav.tsx`** lines 100-106 - `closeMobile` function with timeout pattern

---

## 6. Architecture Insights

### Design Patterns Used

1. **Controlled Component with State**: Mobile nav open/close is managed via React `useState`
2. **Modal/Dialog Pattern**: The bottom sheet drawer follows a modal pattern with backdrop click-to-close
3. **Progressive Enhancement**: Desktop nav (`sm:flex`) vs mobile nav (`sm:hidden`) switch based on breakpoint
4. **Accessibility**: 
   - `aria-label` on toggle buttons
   - `aria-expanded` on the main nav button
   - Escape key handling
   - Focus management implicit via form elements

### Strengths

- **Clear separation** between desktop and mobile navigation via Tailwind breakpoints
- **Accessible** with proper ARIA labels and escape key handling
- **Smooth animations** using CSS transitions with reduced motion support
- **Multiple close strategies** (backdrop, escape, links, route change) prevent user lock-in
- **Body scroll locking** prevents background content scrolling when drawer is open

### Potential Improvements

- The 200ms timeout in `closeMobile` could be adjusted for better UX
- Consider adding swipe gesture support for closing the drawer
- The mobile search and main nav use similar patterns - could extract common logic into a hook
- Consider using Next.js `useSearchParams` for better search integration in the mobile drawer

---

## 7. Summary of Files Searched

### Filenames containing relevant terms:
- `SiteNav.tsx` - Main navigation with mobile drawer ✓
- `Header.tsx` - Header with mobile search toggle ✓
- `MobileTabBar.tsx` - Mobile bottom tab bar ✓
- `layout.tsx` (app and admin) - Layout with mobile state ✓
- `globals.css` - Nav animations ✓
- `use-is-mobile.ts` - Mobile detection ✓

### Content searches for "hamburger", "menu", "mobile", "nav", "toggle":
- Found 100+ matches across the codebase
- Main mobile nav: `SiteNav.tsx` "Mais" button, `mobileOpen` state
- Admin sidebar: `app/admin/layout.tsx` hamburger icon transformation
- Mobile search: `Header.tsx` `mobileSearchOpen` state
- CSS animations: `globals.css` nav-fade/nav-slide keyframes
- Tab bar: `MobileTabBar.tsx` fixed bottom navigation