# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Brazilian anime viewers. They come to discover titles, stream
episodes (dubbed or subtitled), and rate what they watch. The core loop is
discover → watch → rate. Secondary audiences (community members who feed,
follow, and comment; staff who curate shelves and moderate) orbit the same
viewer job.

## Product Purpose

AnimesIce exists to make watching anime online feel like tuning into a
broadcast schedule rather than hunting a pirate portal. Success means a
viewer lands, sees what is on air and what is coming, and starts watching
with low friction — then stays to rate and discuss.

## Positioning

The aggregator that feels like a transmission/EPG shelf ("prateleira de
transmissão"). Neighbors copy catalogs; they do not copy the broadcast
feel: the live "No ar" signal, the calendar/agenda, editorial shelves
("Escolhas da semana"), and the time-of-day hero ("Destaque da madrugada").
That schedule-first posture is the claim a neighboring product could not
truthfully copy.

## Operating Context

- Locale is Portuguese (pt-BR); all copy, dates, and UX stay pt-BR.
- Dark, cinematic, studio-grade interface meant for evening/night viewing
  ("sinal da madrugada"). The product reads best in low light.
- Funding is ads (Monetag) + donations (Ko-fi). No paywall, no subscriptions.
  The ad loader is gated to post-load + first interaction to protect LCP/CLS.
- Backend is a separate service (see AUTH_BACKEND_CONTRACT.md); the frontend
  talks to it over a typed API and a `role` cookie for sessions.
- Deploy target is Vercel (Vercel project + Speed Insights present).

## Capabilities and Constraints

- Catalog with anime detail pages, episode pages, and a sync video player
  (HLS.js) supporting watch-together rooms.
- Home: trending hero, personalized rails, "No ar agora", ranked shelves,
  broadcast/editorial shelves, latest episodes, recent additions.
- Calendar/agenda, search, blog/CMS, profile + library, notifications.
- Community: social feed, comments, ratings (stars), following.
- Admin panel: moderation, users, catalog CRUD, episodes, feedback, orders,
  watchtower, notifications, audit log.
- Hard constraint: aggregator model — never host video, only embed/link
  third-party, non-affiliated sources. DMCA posture depends on this.
- Accessibility: focus-visible rings, sr-only skip link, reduced-motion
  guards on every animated layer (CSS + JS/WebGL). No product-specific
  compliance standard confirmed yet.

## Brand Commitments

- Name "AnimesIce" is fixed.
- The crystal/ice mascot is a fixed brand asset (the visual treatment may
  evolve — e.g. the current palette retarget — but the mascot and name stay).
- Voice is editorial/broadcast: "prateleira", "sinal", "no ar", "destaque".
  Mono type (IBM Plex Mono) carries telemetry/data; display (Barlow
  Condensed) carries the editorial voice; Plex Sans carries reading.

## Evidence on Hand

- Incumbent visual implementation in app/ and src/components/ (authority for
  refinement; not yet recorded in a DESIGN.md).
- tailwind.config.ts holds the token system (colors, type ramp, shadows,
  radii, motion keyframes).
- app/globals.css holds the component layer (.btn-ice, .edge-tag, .shelf-label,
  crystal motion, cinema mode, mobile nav sheet).
- Real assets: mascot SVG (/images/animesice-mascot.svg), background shards
  (/assets/bg-drift-loop.svg, background.svg), favicon set (/icons/).
- No fabricated testimonials, customers, benchmarks, or pricing — none exist.
  Future work must not invent them.

## Product Principles

1. Schedule first. Every surface should reinforce the broadcast/EPG feel,
   not a generic grid of posters.
2. Aggregator honesty. Never imply we host video; the "provido de terceiros
   não afiliados" line is product truth, not fine print.
3. Earn the night. The dark cinematic identity is for low-light viewing;
   performance and legibility on cheap phones at night outrank daylight demos.
4. Motion is signal, not decoration. The crystal/wipe motion identity carries
   brand meaning; generic AI tells (neon glows, gradient text, hover zooms)
   are anti-reference.
5. pt-BR throughout. The product is for Brazilian viewers; do not silently
   internationalize copy or date formats.

## Accessibility & Inclusion

No product-specific compliance standard confirmed. Baseline practiced today:
keyboard focus rings, skip link, reduced-motion guards, legible type floor
(being raised to 11px in current work). Future work should keep and extend
these rather than treat accessibility as optional.
