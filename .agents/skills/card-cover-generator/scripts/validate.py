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


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def validate(svg_path: Path, config_path: Path, theme_override: str | None = None, prefix_override: str | None = None) -> list[str]:
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
    try:
        viewbox = [float(n) for n in root.get("viewBox", "").replace(",", " ").split()]
    except ValueError:
        viewbox = []
    if len(viewbox) != 4 or viewbox != [0.0, 0.0, float(canvas_w), float(canvas_h)]:
        errors.append(f'viewBox must be "0 0 {canvas_w} {canvas_h}", got {root.get("viewBox")!r}')
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
    args = parser.parse_args()
    errors = validate(args.svg, args.config, args.theme, args.id_prefix)
    if errors:
        for error in errors:
            print(f"FAIL: {error}", file=sys.stderr)
        return 1
    print(f"PASS: {args.svg}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
