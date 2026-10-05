#!/usr/bin/env python3
"""Check SVG structure, local references, IDs, palette, and practical file size."""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET

from gen_cover import load_config, load_theme


SVG_NS = "http://www.w3.org/2000/svg"
MAX_BYTES = 256 * 1024
# Where a generated file ends up, so validation can hold the canvas to the size
# it will actually be rendered into. `card` is the AnimeSice gacha card slot:
# the same 3/4 window the card art uses, so front and back render at one size.
SLOTS = {
    "card": (750, 1000),
    "portrait": (600, 900),
    "square": (730, 730),
}
# Containers whose children are definitions, never painted themselves.
NON_PAINTED = {"defs", "clipPath", "pattern", "mask", "symbol"}


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _length(value: str | None) -> float:
    if not value:
        return 0.0
    match = re.match(r"\s*(-?[0-9.]+)", value)
    return float(match.group(1)) if match else 0.0


def largest_plate(element: ET.Element) -> tuple[float, float, float, float] | None:
    """Biggest painted `<rect>`: the background plate the art sits on.

    The plate carries the authoring coordinates, while the viewBox is only a
    declared frame. So a viewBox edited by hand without rescaling the artwork
    still satisfies the viewBox check in `validate` but shows up here as a
    plate smaller than the canvas -- the exact shape of a cover that renders
    with empty bands around the art.
    """
    best: tuple[float, float, float, float] | None = None
    stack = [child for child in element if local_name(child.tag) not in NON_PAINTED]
    while stack:
        node = stack.pop()
        if local_name(node.tag) == "rect":
            w, h = _length(node.get("width")), _length(node.get("height"))
            if w > 0 and h > 0 and (best is None or w * h > best[2] * best[3]):
                best = (_length(node.get("x")), _length(node.get("y")), w, h)
        stack.extend(child for child in node if local_name(child.tag) not in NON_PAINTED)
    return best


def validate(svg_path: Path, config_path: Path, theme_override: str | None = None, prefix_override: str | None = None, slot: str | None = None) -> list[str]:
    errors: list[str] = []
    try:
        config = load_config(config_path)
        theme_spec = theme_override if theme_override is not None else config.get("theme", "grafite")
        load_theme(theme_spec)
        tree = ET.parse(svg_path)
        byte_size = svg_path.stat().st_size
    except (OSError, ValueError, ET.ParseError) as exc:
        return [f"cannot read SVG/config/theme: {exc}"]

    root = tree.getroot()
    if root.tag != f"{{{SVG_NS}}}svg":
        errors.append("root element must be an SVG in the standard SVG namespace")

    prefix = prefix_override or str(config.get("id_prefix", "cover"))
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.-]*", prefix):
        return errors + [f"invalid id_prefix {prefix!r}"]
    canvas_w, canvas_h = int(config["canvas"]["w"]), int(config["canvas"]["h"])
    if slot is not None:
        if slot not in SLOTS:
            return [f"unknown slot {slot!r}; choose one of {', '.join(sorted(SLOTS))}"]
        slot_w, slot_h = SLOTS[slot]
        if (canvas_w, canvas_h) != (slot_w, slot_h):
            errors.append(
                f"canvas must be {slot_w}x{slot_h} for the {slot} slot, got "
                f"{canvas_w}x{canvas_h}; the card fits the cover to that slot, so any other "
                "ratio is cropped or letterboxed instead of filling it"
            )
    try:
        viewbox = [float(n) for n in root.get("viewBox", "").replace(",", " ").split()]
    except ValueError:
        viewbox = []
    if len(viewbox) != 4 or viewbox != [0.0, 0.0, float(canvas_w), float(canvas_h)]:
        errors.append(f'viewBox must be "0 0 {canvas_w} {canvas_h}", got {root.get("viewBox")!r}')
    # A matching viewBox says nothing about whether the art reaches it.
    # gen_cover.py draws the plate from `canvas`, so the two normally agree;
    # editing the viewBox by hand to retarget an existing cover breaks that
    # agreement, which is how a cover ends up with empty bands. Compare the
    # drawn plate against the declared frame to catch it.
    if len(viewbox) == 4:
        plate = largest_plate(root)
        if plate is None:
            errors.append("no painted <rect> found: the cover needs an opaque background plate")
        else:
            px, py, pw, ph = plate
            gaps = {
                "left": px - viewbox[0],
                "right": viewbox[0] + viewbox[2] - (px + pw),
                "top": py - viewbox[1],
                "bottom": viewbox[1] + viewbox[3] - (py + ph),
            }
            empty = {side: gap for side, gap in gaps.items() if gap > 0.5}
            if empty:
                detail = " and ".join(f"{round(gap)}px {side}" for side, gap in empty.items())
                errors.append(
                    f"background plate {round(pw)}x{round(ph)} does not reach the "
                    f"{round(viewbox[2])}x{round(viewbox[3])} canvas: {detail} left undrawn; "
                    "artwork must bleed to every edge (resize the layer coordinates with the canvas)"
                )
    if byte_size > MAX_BYTES:
        errors.append(f"SVG is {byte_size} bytes; maximum is {MAX_BYTES}")

    ids: list[str] = []
    refs: list[str] = []
    for element in root.iter():
        name = local_name(element.tag)
        if name in {"script", "foreignObject", "image"}:
            errors.append(f"unsupported embedded element: {name}")
        identifier = element.get("id")
        if identifier:
            ids.append(identifier)
        for attr in ("fill", "stroke"):
            value = element.get(attr, "")
            if "var(--" in value:
                errors.append(f"CSS variable found in {attr} attribute")
            if "url(" in value:
                match = re.fullmatch(r"url\(#([^)]+)\)", value)
                if match:
                    refs.append(match.group(1))
                else:
                    errors.append(f"non-local SVG reference found in {attr} attribute")
        href = element.get("href") or element.get("{http://www.w3.org/1999/xlink}href")
        if href:
            if href.startswith("#"):
                refs.append(href[1:])
            else:
                errors.append("external SVG reference found in href")

    duplicates = sorted(identifier for identifier, count in Counter(ids).items() if count > 1)
    if duplicates:
        errors.append("duplicate SVG IDs: " + ", ".join(duplicates))
    unprefixed = sorted(identifier for identifier in ids if not identifier.startswith(prefix + "-"))
    if unprefixed:
        errors.append("IDs missing id_prefix: " + ", ".join(unprefixed))
    missing_refs = sorted(set(refs) - set(ids))
    if missing_refs:
        errors.append("references point to missing IDs: " + ", ".join(missing_refs))
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("svg", type=Path)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--theme", help="palette override used when generating the SVG")
    parser.add_argument("--id-prefix", help="unique prefix used when generating the SVG")
    parser.add_argument(
        "--slot",
        choices=sorted(SLOTS),
        help="hold the canvas to the size the cover is rendered into (card = 750x1000)",
    )
    args = parser.parse_args()
    errors = validate(args.svg, args.config, args.theme, args.id_prefix, args.slot)
    if errors:
        for error in errors:
            print(f"FAIL: {error}", file=sys.stderr)
        return 1
    print(f"PASS: {args.svg}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
