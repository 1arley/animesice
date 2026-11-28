#!/usr/bin/env python3
"""Embed an image into an SVG card, keeping the SVG lean.

usage: svg_embed.py CARD.svg IMAGE [-o OUT.svg] [--width N] [--quality Q]

CARD.svg must contain an <image> tag. Its href is (re)written as a data URI.
--width/--quality recompress through ImageMagick first.
"""
import argparse
import base64
import mimetypes
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

IMAGE_TAG = re.compile(rb"<image\b[^>]*?>", re.S)
HREF = re.compile(rb"""\s(?:xlink:)?href\s*=\s*(["']).*?\1""", re.S)
MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif",
        ".svg": "image/svg+xml"}


def mime_of(path: pathlib.Path) -> str:
    return MIME.get(path.suffix.lower()) or mimetypes.guess_type(path)[0] \
        or "application/octet-stream"


def payload(image: pathlib.Path, width: int, quality: int) -> str:
    """Base64 for the image, recompressed if width/quality requested."""
    if not (width or quality):
        return base64.b64encode(image.read_bytes()).decode()
    if shutil.which("magick") is None:
        sys.exit("magick not found: install ImageMagick or drop --width/--quality")
    # ponytail: keeps the source format; add per-format flags when a card needs
    # lossless alpha (PNG/WebP) next to a lossy background in the same build.
    with tempfile.TemporaryDirectory() as tmp:
        out = pathlib.Path(tmp) / ("out" + image.suffix.lower())
        cmd = ["magick", str(image)]
        cmd += ["-resize", f"{width}x"] if width else []
        cmd += ["-quality", str(quality)] if quality else []
        subprocess.run(cmd + ["-strip", str(out)], check=True)
        return base64.b64encode(out.read_bytes()).decode()


def embed(card: pathlib.Path, image: pathlib.Path, width: int = 0,
          quality: int = 0) -> bytes:
    svg = card.read_bytes()
    match = IMAGE_TAG.search(svg)
    if not match:
        sys.exit(f"no <image> tag in {card}")
    tag = match.group(0)
    stripped = HREF.sub(b"", tag).rstrip()
    uri = f'href="data:{mime_of(image)};base64,{payload(image, width, quality)}"'.encode()
    new_tag = (stripped[:-2] + b" " + uri + b"/>") if stripped.endswith(b"/>") \
        else (stripped + b" " + uri + b">")
    return svg[:match.start()] + new_tag + svg[match.end():]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("card", type=pathlib.Path)
    ap.add_argument("image", type=pathlib.Path)
    ap.add_argument("-o", "--out", type=pathlib.Path)
    ap.add_argument("--width", type=int, help="downscale before embedding")
    ap.add_argument("--quality", type=int, help="quality 1-100 before embedding")
    args = ap.parse_args()

    out = args.out or args.card
    out.write_bytes(embed(args.card, args.image, args.width, args.quality))
    print(f"{out} {out.stat().st_size / 1024:.0f}K")


if __name__ == "__main__":
    main()