# Composition and config reference

Use this when translating art direction into the generator's JSON. Nothing here is a required visual template: canvas ratio, focal placement, frame, glow, and texture are all configurable or optional.

## Build the composition

1. Choose the canvas dimensions to fit the use (card, portrait poster, square emblem, landscape cover). The script uses the configured `viewBox`; it does not force a ratio. For an AnimeSice gacha card back use `"canvas": {"w": 750, "h": 1000}` — that is the 3/4 slot the card renders into. You do not draw the background plate yourself: the generator emits it at `canvas.w` × `canvas.h`, clipped to the same box, so it bleeds to all four edges as long as the canvas is the slot. `background.layers` are *extra* decorative layers painted on top of that plate, not the plate. Set `"corner_radius": 0` in `background` for a card: the card clips square, so the default rounded 28 leaves the page background showing through the four corners.
2. Changing `canvas.w`/`canvas.h` does **not** move anything already written in `space: "canvas"`. Those coordinates are literal, so a layer composed at 600 × 900 stays at 600 × 900 and ends up stranded in one corner of the new canvas. When you resize, rescale every canvas-space coordinate with it, or generate from a config authored at the target size.
3. Rescale **uniformly**, on the axis that binds, then re-center on the new canvas center. Going 600 × 900 → 750 × 1000 is not a similarity (1.25 vs 1.111), so no config-only edit reproduces what a stretched render looked like: rotated content (`chain`, `rays`, petals) comes out reshaped because a non-uniform scale is not a similarity transform. Uniform ×1.25 about the old center keeps every ring circular and lets ~6% more of the top and bottom bleed off the card, which is the intended compromise for a cover. Isotropic sizes (radii, stroke widths, font sizes, spacings) take the same ×1.25; unitless multipliers (`emblem_scale`, `opacity`, `count`, `seed`, `scale` on a symbol) do not.
4. The generator re-derives the plate, frame rects, vignette, glow, stars and clip path from `canvas.w/h` on its own — but only their *positions*. Their literal tunables stay absolute: `frame.insets`/`frame.widths`, `background.glow_radius`, `ring_radii`, `star_min_radius`/`star_max_radius`, and the `halftone_*`/`scanline_*` pitches. Scale those with the canvas or the texture silently reweights.
5. Place the main silhouette and focal point. Use `space: "canvas"` for coordinates measured directly in the output viewBox. The default `space: "emblem"` maps a 730 × 730 work area to the canvas using `canvas.emblem_scale` and centers it; this is useful for a self-contained motif.
6. Arrange supporting forms behind and in front of the focal point. The order in `layers` is the paint order. Use asymmetry, overlap, scale changes, opacity, and gaps to match the reference's visual rhythm.
7. Add texture and framing only if they belong to the direction. Fine marks should stay legible at the final display size.

## Root config

| Key | Purpose |
|---|---|
| `id_prefix` | Valid SVG ID prefix; use a distinct value for each inline SVG. |
| `seed` | Integer seed for procedural details. |
| `title`, `description` | Accessible SVG title and description. |
| `canvas.w`, `canvas.h` | Output viewBox dimensions. |
| `canvas.emblem_scale` | Scale for layers in emblem space. |
| `theme` | Theme name in `themes/` or an inline palette object. |
| `background` | `glow`, `stars`, `dashed_rings`, `halftone`, `scanlines`, optional `layers`, and their parameters. All effects are optional. |
| `frame` | Optional frame layers, insets, widths, tones, corners, and top/bottom ornament. Set `enabled: false` for no frame. |
| `effects.back`, `effects.front` | Generic layers painted before or after the main composition. `effects.vignette` optionally adds a dark edge. |
| `layers` | Ordered main composition. Omit `space` for emblem coordinates; set `space: "canvas"` for output coordinates. |
| `overlays` | Layers painted last, in canvas coordinates; useful for exact text or finishing marks. |

Palette objects define `bg`, `glow`, `dark_a`, `dark_b`, `mid_a`, `mid_b`, `lite_a`, `lite_b`, `pale`, `frame`, and `star`. Optional `accent` and `signal` default to `lite_a` and `dark_a`. Every value is a six-digit hex color. A named palette can include the same keys and be placed in `themes/` for reuse.

## Layer types

All layers may use `fill`, `stroke`, `stroke-width`, `opacity`, and common SVG line/shape attributes where relevant. Color values can be palette keys, literal hex values, `none`, or one of the built-in gradient keys `gMid`, `gLite`, `gDark`, `gGlow`, `gOrb`.

| Type | Main fields | Use |
|---|---|---|
| `group` | `layers`, optional `transform` | Share a transform or style across child layers. |
| `path` | SVG path data in `d` | Draw custom silhouettes and curves. |
| `polygon`, `polyline` | `points: [[x,y], ...]` | Facets, contours, linework. |
| `line` | `points: [x1,y1,x2,y2]` | Strokes and technical marks. |
| `circle`, `ellipse` | center and radius fields | Discs, rings, soft orbits. |
| `rect` | `x`, `y`, `w`, `h`, optional `rx` | Bars, panels, borders, glitch marks. |
| `text` | `x`, `y`, `text`, optional font and alignment fields | Exact labels, titles, and small typography. Text content is XML escaped. |
| `petal` | center, angle, length, width, bend, noise | Tapered organic or blade forms; not limited to flowers. |
| `crescent` | center, `rx`, `ry`, `arc`, `peak`, optional spikes/noise | Claws, partial bands, crescents, curved masses. |
| `vine` | `points`, width `w`, thorn `size`, side `flip` | Branching or thorned linework. |
| `shards` | `items` with points, optional fill/noise | Facets and fragments. |
| `splat` | center, `r`, spike count | Irregular burst or ink mark. |
| `ribbon` | `points`, matching `widths` | Variable-width bands. |
| `fractured_veins` | center, count, length, width, depth, step | Seeded branching cracks, veins, lightning, or roots. |
| `chain` | four cubic Bezier control points, spacing, scale, optional `tone` (`mid_a`, `pale`, `signal`, `accent`) | Repeated interlocking links along a curve. |
| `reticle` | center, radius, tick count, tone | Technical radial measurement marks. |
| `orbit_arc` | center, radius/axes, `[start,end]` arc | Broken circles and ellipse segments. |
| `number_orbit` | unique `key`, center, radius, text | Text along a circular path. |
| `rays` | center, count, inner radius, length and width ranges | Directional beams or radial marks. |
| `glitch_bars` | count, ranges, tones, optional `avoid: [x,y,r]` | Seeded horizontal signal breaks. |
| `floating_digits` | count, ranges, digits, optional `avoid` | Seeded scattered numerals. |
| `specks` | center, radii, count, size, tones | Stippling, stars, or particulate texture. |
| `rosette` | center, petal arrays/count, optional centerpiece | Layered flower-like rosette, only when appropriate. |
| `centerpiece` | center, `piece_type`, `r` | Built-in rose, lotus, eye, or crystal motif. |

`text` supports `font_family` (family names separated by commas), `font_size`, `font_weight`, `anchor` (`start`, `middle`, `end`), `letter_spacing`, and `rotation`. Use exact copy supplied by the user. Avoid relying on a font unavailable to the renderer if the lettering itself must be preserved; convert delicate lettering to paths when deterministic typography is required.

## Paint order

The renderer paints: background, background layers, `effects.back`, optional dashed rings, `layers` in order, `effects.front`, optional vignette, frame, then `overlays`. Disable built-in decoration when it competes with the composition. The existing [flor-espinhos.json](../configs/flor-espinhos.json) and [carmesim-glitch.json](../configs/carmesim-glitch.json) are contrasting examples; neither is a default.

## Useful commands

```sh
python3 scripts/gen_cover.py --config CONFIG.json --seed 11 --output /tmp/cover.svg
python3 scripts/preview.py /tmp/cover.svg --output /tmp/cover.png
python3 scripts/validate.py /tmp/cover.svg --config CONFIG.json
python3 scripts/batch.py --config CONFIG.json --seeds 1-20 --output-dir out/variations
```
