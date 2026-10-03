# Procedural geometry notes

Use only the recipes that support the selected reference language. Organic randomness suits ink, roots, flames, and broken metal; precise repeats suit technical, geometric, or ceremonial designs. The algorithm is a tool, not a style preset.

## Coordinate convention

`direction(angle) = (sin(angle), -cos(angle))`: zero points up, 90 points right, and angles increase clockwise. `side_vector(angle) = (cos(angle), sin(angle))`. Config angles are degrees.

## Organic forms

- `petal` samples a tapered axis, adds optional sideways bend, and jitters intermediate widths. It returns a mapper for surface details. Reuse it for any pointed or leaf-like silhouette, not only petals.
- `crescent` samples an elliptical centerline and tapers its width to zero at both ends. Noise affects only intermediate samples, so the tips remain clean. Optional spikes share the ellipse's coordinate system.
- `ribbon` builds two offsets around a sampled path. Supply one width per point. It works for cloth, energy trails, tendrils, or other bands.
- `fractured_veins` walks a seeded, alternating angular path and recursively grows branches. Depth and width fall toward the tips. Reduce branch count and depth for delicate or uncluttered work.
- `vine` draws a polyline then places alternating thorns at segment midpoints. Use it when that pointed rhythm belongs to the design.

## Repeated structures

- `chain` samples a cubic Bezier curve, accumulates distance, and places alternating reusable link symbols at even intervals. Its control points are in the current layer coordinate space.
- `reticle` uses regular angular ticks; `orbit_arc` creates a partial ellipse; `number_orbit` lays text on a circular path. Small spacing or opacity variations can keep technical graphics from overpowering the subject.
- `rays` and `specks` distribute seeded marks around a center. Prefer varied size and opacity rather than adding more elements when the artwork already feels busy.
- `glitch_bars` groups equal-color marks to keep SVG output compact. `floating_digits` provides short seeded labels; use `text` overlays for exact wording.

## Determinism and SVG

Create one `random.Random(seed)` per render and pass it to every randomized helper. Never let palette choice change geometry or random call order. Prefix every reusable ID with `id_prefix`; reference it only with local `href` or `url(#...)`. Use literal colors in SVG attributes, escape text, and clip intentional off-canvas forms at the card boundary.

Inspect the rendered result rather than assuming more samples mean more quality. Increase curve samples only when edges visibly facet; reduce density when texture closes the negative space or hides the focal silhouette.
