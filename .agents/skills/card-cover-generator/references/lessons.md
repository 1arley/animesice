# SVG and preview lessons

1. SVGs do not reliably inherit web-app CSS variables when opened standalone. Write literal hex colors into generated attributes.
2. IDs can collide when several SVGs are embedded in one page. Give each cover a distinct `id_prefix` and use it in every gradient, pattern, clip path, group, text path, and local reference.
3. Arc sweep flags can turn a partial band into an unexpected lens. Sampled crescent polygons taper predictably; use them when a clean tapered end matters.
4. A `<use>` inherits some presentation attributes, but explicit attributes in the referenced group can override them. Put important colors directly on the reused shape.
5. Intentional overflow (chain links, rays, shards) is safe when clipped to the canvas. It can be part of the composition.
6. View the preview. A technically valid SVG can still have a weak hierarchy, collisions, indistinct silhouette, or lost small details. Inspect at the output size and as a thumbnail.
7. Keep randomness local and seeded. Same config, palette, and seed must produce byte-identical output. A palette change must not change geometry.
8. Preview lookup order is CairoSVG, `rsvg-convert`, then Inkscape. If none exists, say that preview is unavailable; don't claim visual inspection.
9. For painterly, photographic, or materially rich artwork, SVG primitives may flatten the reference. Use the raster route described by `imagegen` when that is the better match.
10. Describe the result as a new interpretation of the source's visual language, not a traced or exact copy.
11. A correct `viewBox` is not a correct cover. Editing the root `viewBox` re-frames the canvas without moving a single coordinate, so artwork authored for the old size ends up floating in one corner with empty bands where the page background shows through. Resize the layer coordinates too; `validate.py` fails when the background plate stops reaching the canvas.
12. An internal inset frame is not free bleed space. A card back renders at exactly the same scale as the front art — no overscan on either side, or the card jumps in size when it flips — so a `x=14, width=572` frame inside a 750-wide canvas leaves a visible rim of page background. Art for a card back bleeds to the edges and the card border supplies the frame.
13. Overscanning a card back hides a wrong canvas instead of fixing it. Scaling the verso 6% to swallow the rim also scaled it 6% larger than the front art, which is the "strange" feeling on flip. The renderer must not paper over bad authoring: measure the plate against the canvas (`--slot card`) and redraw on the slot.
14. Baking a non-uniform scale into coordinates is not a redraw. Going 2/3 → 3/4 is not a similarity, so rewriting coordinates by `(750/600, 1000/900)` reshapes every rotated element — chains, rays, petals — even though the circles and strokes stay put. Rescale uniformly on the binding axis and re-center instead; `object-cover` then crops the extra height, which is the same compromise the front art already makes.
