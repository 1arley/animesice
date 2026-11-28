#!/usr/bin/env python3
"""Self-check: embed into template, into a card that already has an image, and
verify the payload round-trips to the source bytes."""
import base64
import pathlib
import re
import sys
import tempfile
import xml.etree.ElementTree as ET

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from svg_embed import embed  # noqa: E402

HERE = pathlib.Path(__file__).parent
SRC = pathlib.Path("/home/iarley/Downloads/c3d27c6f0d66defd82ae49f108593414.jpg")


def href_of(svg: bytes) -> str:
    tag = re.search(rb"<image\b[^>]*>", svg).group(0)
    return re.search(rb'href="([^"]*)"', tag).group(1).decode()


with tempfile.TemporaryDirectory() as tmp:
    tmp = pathlib.Path(tmp)
    card = tmp / "card.svg"

    # 1. template with empty href
    card.write_bytes(embed(HERE / "card-template.svg", SRC))
    out = card.read_bytes()
    ET.fromstring(out)  # parses
    assert href_of(out).startswith("data:image/jpeg;base64,")
    assert base64.b64decode(href_of(out).split(",", 1)[1]) == SRC.read_bytes()

    # 2. re-embed over an existing payload: exactly one <image>, no nested growth
    card.write_bytes(embed(card, SRC))
    out = card.read_bytes()
    ET.fromstring(out)
    assert out.count(b"<image") == 1
    assert href_of(out).count("base64,") == 1
    assert base64.b64decode(href_of(out).split(",", 1)[1]) == SRC.read_bytes()

    # 3. downscaled variant is smaller and still decodes as JPEG
    small = embed(HERE / "card-template.svg", SRC, width=375, quality=60)
    assert len(small) < len(out)
    assert base64.b64decode(href_of(small).split(",", 1)[1])[:2] == b"\xff\xd8"

    # 4. SVG with no <image> tag is rejected, not silently mangled
    empty = tmp / "empty.svg"
    empty.write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
    try:
        embed(empty, SRC)
        raise AssertionError("expected failure on missing <image>")
    except SystemExit as e:
        assert "<image>" in str(e)

print("ok")