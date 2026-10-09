---
name: animesice-motion-design
description: Design, implement, and refine animation for AnimesIce interfaces and media, including card reveals, transitions, CSS/GSAP, ModernGL, and Remotion.
---

# AnimesIce Motion Design

Create a polished first pass whose motion belongs to the component it animates.

## Before implementing

- Read the host component, styles, trigger, aspect ratio, and existing motion timeline. Inspect the supplied visual or video references.
- Choose one clear visual idea from the host or reference. Reuse its geometry, palette, and visual rhythm; do not add generic rings, particles, or floating shapes just to make the result feel more active.
- Plan the opening, focal moment, and exit before writing the shader or timeline. The animation should still make sense when composited over the real component, not only on black.

## Implementing

- Keep artwork and animation in the component's coordinate system and bounds. If SVG and ModernGL draw the same motif, map one viewBox to the other exactly.
- Nest motion layers under the component they follow so resizing, clipping, perspective, and transforms stay aligned.
- Start related media and UI motion from the same playback event. Make their durations agree; update both when the clip duration changes.
- Use the project's installed tools and existing rendering path. Keep new dependencies out when the current stack can do the job.
- Preserve keyboard behavior, visible focus, content contrast, and `prefers-reduced-motion` behavior.

## Review before handoff

- Render and inspect the animation composited in its real component at the real aspect ratio. Check its opening, focal moment, and finish; a standalone shader preview is not enough.
- Compare the result to the supplied reference and the surrounding UI. Refine any shape, color, scale, or timing that feels detached before presenting the work as finished.
- Prefer one coherent movement with deliberate timing over layers of decoration. When the reference and host make the direction clear, implement that direction in the first pass instead of asking the user to art-direct avoidable mismatches.

For the Night Market card, the back art uses a 300×400 SVG viewBox and the ModernGL clip maps that same geometry into its 3:4 frame. Keep `DURATION` in the renderer aligned with `REVEAL_CLIP_SECONDS` and the GSAP timeline.
