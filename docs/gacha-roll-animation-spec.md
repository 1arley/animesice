# Gacha RollStage

`src/components/gacha/roll-stage-engine.js` is the single production animation
engine. `RollStage.tsx` lazy-loads it and `RollStagePlayer.tsx` adapts it to the
existing React contract used by the Gacha page, essence rewards, and admin.

## Result and request flow

- The existing page owns spin, claim, daily roll, and recovery requests. The
  stage does not make API calls or choose a reward.
- It starts the invocation while the caller's request is pending, then receives
  the returned `GachaPull` (or server-confirmed spin preview) through `pull`.
- `toRollStagePull` maps the backend card name, rarity, visible image, foil,
  condition, and value. Hidden or unsafe image URLs use the procedural fallback.
- A “NOVA” or “REPETIDA” badge appears only when the API explicitly supplies
  the corresponding flag. Animation tease tiers are presentation only; the
  final tier and foil always come from the server result.
- `preview` remains part of the component contract so the current spin/claim
  flow and admin preview keep their callers unchanged.

## Stage lifecycle

The engine waits at the end of invocation if the result has not arrived. Once it
has, the sequence is tease, optional rarity title, impact, card reveal, and
showcase. Skip, Escape, continuation, reduced-motion presentation, WebGL
fallback, and failure cleanup are handled by the same stage. Closing the stage
stops its animation frame, removes listeners, disposes Three.js resources, and
closes its Web Audio context.

## Configuration and administration

Timing and tease settings remain in `src/lib/roll-anim-config.ts`. The admin
configuration preview and source editor compile this same engine file, with
Three.js and native roll configuration provided by the existing import shim.

The source-only checker is `npm run check:roll-anim-source`; config parsing is
covered by `npm run check:roll-anim-config`. The previous GSAP-specific tier
tables and tease helper are removed because the Three.js engine now owns those
effects.
