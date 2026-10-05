---
name: card-cover-generator
description: Design card covers and emblem artwork from descriptions or one or more visual references. Synthesize their visual language into original, editable SVGs with inspected previews and deterministic variations; use ImageGen when the requested finish is painterly, photographic, or raster-first.
---

# Card cover generator

Create original cover art whose visual language follows the user's direction and references. The floral and carmesim-glitch configs are examples only. Never assume a flower, dark palette, central emblem, 2:3 format, ornate frame, stars, or dense ornament unless the request or references call for it.

## Workflow

1. Read the references visually. For several images, separate the traits they share (palette, contrast, shape language, texture, rhythm, atmosphere) from details unique to each. Follow any role the user assigns to a reference, such as “style only” or “use this subject.” Translate the shared art direction into a new composition; do not trace or combine unrelated objects mechanically. If the direction is genuinely under-specified and no reference resolves it, ask one concise question; otherwise infer and proceed.
2. Choose the medium to match the requested deliverable. Use this generator for editable, crisp, procedural SVG artwork. If the requested look depends on painterly brushwork, photographic detail, or material rendering that procedural vectors would flatten, read and use the `imagegen` skill instead. A hybrid can keep exact lettering and simple graphic overlays as SVG when useful.
3. Set the aspect ratio, visual hierarchy, focal silhouette, palette roles, shape vocabulary, and texture from the request. Build a small JSON config. For a one-off palette, place all palette roles directly in `theme`; save a named theme under `themes/` only when it will be reused. Read [references/anatomy.md](references/anatomy.md) for coordinate spaces and layer types. Read [references/algorithms.md](references/algorithms.md) only when designing procedural geometry.
4. Generate one candidate, render its PNG, and inspect it at full size and thumbnail scale. Adjust the config and render again when the silhouette, hierarchy, palette, texture, or spacing misses the art direction. Work from large shapes to fine detail; detail should support the focal point and leave intentional negative space.
5. Run `scripts/validate.py` on the chosen SVG. When the user requests variations, use `scripts/batch.py` after the composition is settled. Seeds vary procedural details; themes vary color while keeping geometry fixed. Every output in a batch receives its own SVG ID prefix.
6. Deliver the SVG, requested previews, and contact sheet. State the files created and any meaningful choice about the references or medium.

## Commands

```sh
python3 scripts/gen_cover.py --config CONFIG.json --seed 11 --output /tmp/cover.svg
python3 scripts/preview.py /tmp/cover.svg --output /tmp/cover.png
python3 scripts/validate.py /tmp/cover.svg --config CONFIG.json
python3 scripts/batch.py --config CONFIG.json --seeds 1-20 --output-dir out/variations
```

For anything that goes on a gacha card, pass the destination slot so the canvas is checked against the size the card actually renders: `validate.py /tmp/cover.svg --config CONFIG.json --slot card` (750 × 1000). `--slot portrait` is 600 × 900 and `--slot square` is 730 × 730. Without the flag the script only validates the file; with it, a canvas in the wrong proportion fails instead of being silently stretched by the card's `object-cover`.

`batch.py` also accepts `--configs-dir DIR`, `--themes all`, or comma-separated theme names. For custom palettes, use the config's inline `theme` and omit `--themes`, or save the palette as a reusable file in `themes/`. `preview.py` uses CairoSVG, `rsvg-convert`, or Inkscape when available.

## Quality bar

- Match the reference's design logic, not merely its colors: preserve its hierarchy, edge character, contrast, material cues, density, and use of space.
- At thumbnail size, the focal shape and overall silhouette should read immediately. At full size, secondary motifs and surface detail should reward inspection without becoming visual noise.
- Keep the number and placement of frames, ornaments, highlights, and textures specific to the design. Some references call for quiet space, asymmetry, flat color, or rough edges.
- Use literal palette colors and a local `random.Random(seed)`. The same config, palette, and seed must produce byte-identical SVG. Theme changes must not move geometry.
- Give every SVG ID a config-specific prefix and keep every local `href` and `url(#...)` reference consistent. Do not depend on CSS variables, network resources, or system-specific SVG features.
- A reference guides the result; it is not evidence of exact reproduction. Never promise pixel-level fidelity from a procedural SVG.

## Acceptance checklist

- References and their assigned roles informed the art direction; no aesthetic preset was imposed.
- The rendered PNG was inspected at both full size and thumbnail scale, with a correction pass when needed.
- `validate.py` passes; IDs are unique and safe for inline use.
- Requested variations have SVGs, PNG previews, and a contact sheet at the requested destination.
