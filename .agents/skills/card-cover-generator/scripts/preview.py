#!/usr/bin/env python3
"""Render SVG previews or a PNG contact sheet using an available local renderer."""

from __future__ import annotations

import argparse
import base64
import html
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from xml.etree import ElementTree as ET


def dimensions(svg_path: Path) -> tuple[int, int]:
    root = ET.parse(svg_path).getroot()
    viewbox = root.get("viewBox", "0 0 600 900").replace(",", " ").split()
    if len(viewbox) != 4:
        raise ValueError(f"invalid viewBox in {svg_path}")
    return max(1, int(round(float(viewbox[2])))), max(1, int(round(float(viewbox[3]))))


def render(svg_path: Path, png_path: Path, width: int, height: int) -> None:
    png_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        import cairosvg  # type: ignore[import-not-found]

        cairosvg.svg2png(url=str(svg_path), write_to=str(png_path), output_width=width, output_height=height)
        return
    except ImportError:
        pass
    renderer = shutil.which("rsvg-convert")
    if renderer:
        subprocess.run([renderer, "--format", "png", "--width", str(width), "--height", str(height), "--output", str(png_path), str(svg_path)], check=True)
        return
    renderer = shutil.which("inkscape")
    if renderer:
        subprocess.run([renderer, str(svg_path), "--export-type=png", f"--export-filename={png_path}", f"--export-width={width}", f"--export-height={height}"], check=True)
        return
    raise RuntimeError("no SVG renderer found; install CairoSVG or provide rsvg-convert or Inkscape")


def contact_sheet(images: list[Path], output: Path, columns: int = 4, tile_width: int = 160, tile_height: int = 240) -> None:
    if not images:
        raise ValueError("no PNG previews found for contact sheet")
    columns = max(1, columns)
    rows = (len(images) + columns - 1) // columns
    gutter, label_h = 18, 27
    width = columns * tile_width + (columns + 1) * gutter
    height = rows * (tile_height + label_h) + (rows + 1) * gutter
    chunks = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
              '<rect width="100%" height="100%" fill="#101521"/>']
    for index, path in enumerate(images):
        col, row = index % columns, index // columns
        x, y = gutter + col * tile_width, gutter + row * (tile_height + label_h)
        payload = base64.b64encode(path.read_bytes()).decode("ascii")
        chunks.append(f'<rect x="{x-1}" y="{y-1}" width="{tile_width+2}" height="{tile_height+2}" rx="5" fill="#d7e0ee"/>')
        chunks.append(f'<image x="{x}" y="{y}" width="{tile_width}" height="{tile_height}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,{payload}"/>')
        chunks.append(f'<text x="{x + tile_width/2}" y="{y + tile_height + 19}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#edf3ff">{html.escape(path.name)}</text>')
    chunks.append('</svg>')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="card-cover-sheet-") as temp_dir:
        svg_path = Path(temp_dir) / "sheet.svg"
        svg_path.write_text("".join(chunks), encoding="utf-8")
        render(svg_path, output, width, height)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", type=Path, help="SVG input for a single preview")
    parser.add_argument("--output", type=Path, help="PNG output path")
    parser.add_argument("--width", type=int, help="preview width; defaults to SVG viewBox width")
    parser.add_argument("--height", type=int, help="preview height; defaults to SVG viewBox height")
    parser.add_argument("--contact-sheet", action="store_true", help="create a sheet from PNG files in --directory")
    parser.add_argument("--directory", type=Path, help="directory of PNG previews for a contact sheet")
    parser.add_argument("--images", nargs="+", type=Path, help="specific PNG previews for a contact sheet")
    parser.add_argument("--columns", type=int, default=4)
    args = parser.parse_args()
    try:
        if args.contact_sheet:
            if args.input or (not args.directory and not args.images):
                parser.error("--contact-sheet requires --directory or --images and no SVG input")
            images = sorted(args.images) if args.images else sorted(path for path in args.directory.glob("*.png") if path != args.output and path.name != "contact-sheet.png")
            default_output = args.directory / "contact-sheet.png" if args.directory else Path("contact-sheet.png")
            contact_sheet(images, args.output or default_output, args.columns)
            print(args.output or default_output)
            return 0
        if not args.input:
            parser.error("provide an SVG input or use --contact-sheet")
        input_path = args.input
        natural_width, natural_height = dimensions(input_path)
        if args.width and not args.height:
            width, height = args.width, round(args.width * natural_height / natural_width)
        elif args.height and not args.width:
            height, width = args.height, round(args.height * natural_width / natural_height)
        else:
            width, height = args.width or natural_width, args.height or natural_height
        if width <= 0 or height <= 0:
            raise ValueError("preview dimensions must be positive")
        output = args.output or input_path.with_suffix(".png")
        render(input_path, output, width, height)
        print(output)
    except (OSError, RuntimeError, ValueError, ET.ParseError, subprocess.CalledProcessError) as exc:
        print(f"preview: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
