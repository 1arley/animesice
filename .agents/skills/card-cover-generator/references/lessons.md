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
