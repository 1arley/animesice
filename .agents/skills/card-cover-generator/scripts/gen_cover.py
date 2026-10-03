#!/usr/bin/env python3
"""Generate deterministic, layered procedural cover artwork as SVG."""

from __future__ import annotations

import argparse
import copy
import json
import math
import random
import re
import sys
from html import escape
from pathlib import Path
from typing import Any, Callable


SKILL_DIR = Path(__file__).resolve().parents[1]
THEMES_DIR = SKILL_DIR / "themes"
THEME_KEYS = ("bg", "glow", "dark_a", "dark_b", "mid_a", "mid_b", "lite_a", "lite_b", "pale", "frame", "star")
DEFAULT_CONFIG: dict[str, Any] = {
    "id_prefix": "cover",
    "seed": 1,
    "canvas": {"w": 600, "h": 900, "emblem_scale": 1.0},
    "theme": "grafite",
    "background": {"glow": False, "stars": 0, "dashed_rings": False, "halftone": False, "scanlines": False},
    "frame": {"enabled": False},
    "effects": {},
    "layers": [],
    "overlays": []
}


def merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    result = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


def load_config(path: Path) -> dict[str, Any]:
    try:
        source = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"cannot load config {path}: {exc}") from exc
    if not isinstance(source, dict):
        raise ValueError("config root must be a JSON object")
    return merge(DEFAULT_CONFIG, source)


def load_theme(name: str | dict[str, Any]) -> dict[str, str]:
    if isinstance(name, dict):
        theme = copy.deepcopy(name)
    else:
        path = THEMES_DIR / f"{name}.json"
        try:
            theme = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            available = ", ".join(sorted(p.stem for p in THEMES_DIR.glob("*.json")))
            raise ValueError(f"cannot load theme {name!r} ({exc}); available: {available}") from exc
    if not isinstance(theme, dict) or any(key not in theme for key in THEME_KEYS):
        raise ValueError(f"theme {name!r} must define: {', '.join(THEME_KEYS)}")
    for key in THEME_KEYS:
        if not isinstance(theme[key], str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", theme[key]):
            raise ValueError(f"theme color {key!r} must be a six-digit hex literal")
    theme.setdefault("accent", theme["lite_a"])
    theme.setdefault("signal", theme["dark_a"])
    for key, value in theme.items():
        if key not in THEME_KEYS and (not isinstance(value, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", value)):
            raise ValueError(f"optional theme color {key!r} must be a six-digit hex literal")
    return theme


def fmt(value: float) -> str:
    if abs(value) < 0.0005:
        value = 0
    # Tenth-unit precision is sub-pixel after emblem scaling and keeps dense covers compact.
    return f"{value:.1f}".rstrip("0").rstrip(".")


def xy(points: list[tuple[float, float]]) -> str:
    return " ".join(f"{fmt(x)},{fmt(y)}" for x, y in points)


def direction(angle: float) -> tuple[float, float]:
    radians = math.radians(angle)
    return math.sin(radians), -math.cos(radians)


def side_vector(angle: float) -> tuple[float, float]:
    radians = math.radians(angle)
    return math.cos(radians), math.sin(radians)


def petal(
    cx: float,
    cy: float,
    ang: float,
    length: float,
    width: float,
    bend: float,
    rng: random.Random,
    seg: int = 10,
    noise: float = 2.2,
    t0: float = 0.0,
    t1: float = 1.0,
) -> tuple[list[tuple[float, float]], Callable[[float, float], tuple[float, float]]]:
    dx, dy = direction(ang)
    sx, sy = side_vector(ang)

    def profile(t: float) -> float:
        return width * math.sin(math.pi * t**0.7) * (1 - 0.3 * t)

    def point(t: float, side: float, local_width: float | None = None) -> tuple[float, float]:
        half_width = profile(t) / 2 if local_width is None else local_width / 2
        along = length * t
        lateral = bend * length * t * t + side * half_width
        return cx + dx * along + sx * lateral, cy + dy * along + sy * lateral

    ts = [t0 + (t1 - t0) * i / seg for i in range(seg + 1)]
    widths: list[float] = []
    for i, t in enumerate(ts):
        irregularity = rng.uniform(-noise, noise) if noise and 0 < i < len(ts) - 1 else 0.0
        widths.append(max(0.0, profile(t) + irregularity))
    polygon = [point(t, 1, w) for t, w in zip(ts, widths)]
    polygon.extend(point(t, -1, w) for t, w in reversed(list(zip(ts, widths))))
    return polygon, lambda t, side: point(t, side)


def crescent(
    cx: float, cy: float, rx: float, ry: float, a0: float, a1: float,
    peak: float, n: int, noise: float, rng: random.Random,
) -> list[tuple[float, float]]:
    outer: list[tuple[float, float]] = []
    inner: list[tuple[float, float]] = []
    for i in range(n + 1):
        t = i / n
        angle = a0 + (a1 - a0) * t
        radians = math.radians(angle)
        center_x = cx + rx * math.sin(radians)
        center_y = cy - ry * math.cos(radians)
        width = peak * math.sin(math.pi * t) ** 0.8
        jitter = rng.uniform(-noise, noise) if noise and 0 < i < n else 0.0
        nx, ny = direction(angle)
        half = width / 2 + jitter
        outer.append((center_x + nx * half, center_y + ny * half))
        inner.append((center_x - nx * half, center_y - ny * half))
    return outer + list(reversed(inner))


def ellipse_point(cx: float, cy: float, rx: float, ry: float, angle: float) -> tuple[float, float]:
    radians = math.radians(angle)
    return cx + rx * math.sin(radians), cy - ry * math.cos(radians)


def spike_at(
    cx: float, cy: float, rx: float, ry: float, pos: float, out_dir: float,
    length: float, base: float, rng: random.Random,
) -> list[tuple[float, float]]:
    anchor = ellipse_point(cx, cy, rx, ry, pos)
    dx, dy = direction(out_dir)
    sx, sy = side_vector(out_dir)
    length *= rng.uniform(0.91, 1.09)
    base *= rng.uniform(0.93, 1.07)
    left = (anchor[0] - sx * base / 2, anchor[1] - sy * base / 2)
    middle = (anchor[0] + dx * length * 0.48 + sx * base * 0.08,
              anchor[1] + dy * length * 0.48 + sy * base * 0.08)
    tip = (anchor[0] + dx * length, anchor[1] + dy * length)
    right = (anchor[0] + sx * base / 2, anchor[1] + sy * base / 2)
    return [left, middle, tip, right]


def thorns_along(
    points: list[list[float]], size: float, flip: int, base: float, rng: random.Random,
) -> list[list[tuple[float, float]]]:
    thorns = []
    for index, (start, end) in enumerate(zip(points, points[1:])):
        x1, y1 = start
        x2, y2 = end
        dx, dy = x2 - x1, y2 - y1
        segment_length = math.hypot(dx, dy)
        if segment_length == 0:
            continue
        tx, ty = dx / segment_length, dy / segment_length
        side = flip if index % 2 == 0 else -flip
        nx, ny = -ty * side, tx * side
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        thorn_length = size * rng.uniform(0.75, 1.3)
        half_base = max(base * 0.5, size * 0.12)
        thorns.append([
            (mx - tx * half_base, my - ty * half_base),
            (mx + nx * thorn_length, my + ny * thorn_length),
            (mx + tx * half_base, my + ty * half_base),
        ])
    return thorns


def octagon(cx: float, cy: float, radius: float, rotation: float, rng: random.Random) -> list[tuple[float, float]]:
    pts = []
    for index in range(8):
        angle = math.radians(rotation + index * 45 - 90)
        r = radius * rng.uniform(0.82, 1.1)
        pts.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    return pts


def ribbon(points: list[list[float]], widths: list[float]) -> list[tuple[float, float]]:
    if len(points) < 2 or len(widths) != len(points):
        raise ValueError("ribbon needs matching arrays of at least two points and widths")
    left, right = [], []
    for index, (x, y) in enumerate(points):
        if index == 0:
            dx, dy = points[1][0] - x, points[1][1] - y
        elif index == len(points) - 1:
            dx, dy = x - points[index-1][0], y - points[index-1][1]
        else:
            dx, dy = points[index+1][0] - points[index-1][0], points[index+1][1] - points[index-1][1]
        length = math.hypot(dx, dy) or 1
        nx, ny = -dy / length, dx / length
        half = float(widths[index]) / 2
        left.append((x + nx*half, y + ny*half))
        right.append((x - nx*half, y - ny*half))
    return left + list(reversed(right))


def bezier(p0: list[float], p1: list[float], p2: list[float], p3: list[float], t: float) -> tuple[float, float]:
    u = 1-t
    return (u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0],
            u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1])


def fractured_veins(layer: dict[str, Any], rng: random.Random, colors: dict[str, str], prefix: str) -> list[str]:
    out: list[str] = []
    branches: list[tuple[list[tuple[float,float]], list[float], int]] = []
    max_depth = int(layer.get("depth", 2))
    base_width = float(layer.get("width", 8))
    step_size = max(4.0, float(layer.get("step", 15)))
    def grow(x: float, y: float, angle: float, length: float, width: float, depth: int) -> None:
        n = max(4, int(length / step_size))
        step = length / n
        points = [(x, y)]
        sign = rng.choice((-1, 1))
        for _ in range(n):
            angle_now = angle + sign*rng.uniform(8, 40)
            sign *= -1
            dx, dy = direction(angle_now)
            x += dx*step*rng.uniform(.7, 1.3)
            y += dy*step*rng.uniform(.7, 1.3)
            points.append((x, y))
        widths = [max(.6, width*(1-i/n)**1.15 + .4) for i in range(n+1)]
        branches.append((points, widths, depth))
        if depth < max_depth and n > 4:
            for _ in range(rng.randint(1, 2)):
                index = rng.randint(2, n-1)
                grow(*points[index], angle + rng.choice((-1,1))*rng.uniform(28,75), length*rng.uniform(.35,.6), widths[index]*.75, depth+1)
    start = layer.get("center", (365,365))
    for _ in range(int(layer.get("count", 12))):
        angle = 360*rng.random() + float(layer.get("angle_offset", 0))
        dx, dy = direction(angle)
        x, y = float(start[0])+dx*float(layer.get("root_radius", 24)), float(start[1])+dy*float(layer.get("root_radius", 24))
        grow(x,y,angle,float(layer.get("length", 240)),base_width,0)
    for points, widths, depth in sorted(branches, key=lambda item: -item[2]):
        path = xy(ribbon([[x,y] for x,y in points], widths))
        fill = color_value("gDark" if depth == 0 else layer.get("branch_tone", "dark_a"), colors, prefix)
        out.append(f'<polygon points="{path}" fill="{fill}" stroke="{colors["dark_b"]}" stroke-width="{fmt(float(layer.get("outline", 1))) }" stroke-linejoin="miter"/>')
        if layer.get("highlights", True) and depth == 0:
            thin = [max(.5,w*.22) for w in widths]
            out.append(f'<polygon points="{xy(ribbon([[x,y] for x,y in points], thin))}" fill="{colors["pale"]}" opacity="0.45"/>')
    return out


def render_chain(layer: dict[str, Any], prefix: str) -> list[str]:
    controls = layer.get("points", [])
    if len(controls) != 4:
        raise ValueError("chain layer points must contain four cubic Bezier control points")
    samples = max(30, int(layer.get("samples", 240)))
    curve = [bezier(*controls, i/samples) for i in range(samples+1)]
    cumulative = [0.0]
    for first, second in zip(curve, curve[1:]):
        cumulative.append(cumulative[-1] + math.dist(first, second))
    spacing = max(8.0, float(layer.get("spacing", 20)))
    scale = float(layer.get("scale", 1))
    style = str(layer.get("tone", "mid_a"))
    symbol_prefix = {"mid_a": "chain", "pale": "chain-pale", "signal": "chain-signal", "accent": "chain-accent"}.get(style)
    if symbol_prefix is None:
        raise ValueError("chain tone must be one of mid_a, pale, signal, or accent")
    opacity = f' opacity="{fmt(float(layer["opacity"]))}"' if "opacity" in layer else ""
    out = []
    target, index, link = float(layer.get("start", 0)), 0, 0
    while target < cumulative[-1]:
        while index < samples-1 and cumulative[index+1] < target:
            index += 1
        x, y = curve[index]
        x2, y2 = curve[min(index+1,samples)]
        angle = math.degrees(math.atan2(y2-y,x2-x))
        symbol = "A" if link % 2 == 0 else "B"
        out.append(f'<use href="#{prefix}-{symbol_prefix}{symbol}" transform="translate({fmt(x)} {fmt(y)}) rotate({fmt(angle)}) scale({fmt(scale)})"{opacity}/>')
        target += spacing*scale
        link += 1
    return out


def chain_symbols(prefix: str, name: str, tone: str, inner: str, colors: dict[str, str]) -> list[str]:
    shadow = colors["dark_b"]
    return [
        f'<g id="{prefix}-{name}A"><rect x="-13" y="-7" width="29" height="18" rx="9" fill="none" stroke="{shadow}" stroke-width="9" opacity=".5"/><rect x="-14" y="-9" width="28" height="18" rx="9" fill="none" stroke="{shadow}" stroke-width="8"/><rect x="-14" y="-9" width="28" height="18" rx="9" fill="none" stroke="{tone}" stroke-width="5"/><rect x="-14" y="-9" width="28" height="18" rx="9" fill="none" stroke="{inner}" stroke-width="1"/></g>',
        f'<g id="{prefix}-{name}B"><rect x="-15" y="-3.5" width="30" height="7" rx="3.5" fill="{shadow}" opacity=".55"/><rect x="-15" y="-3.5" width="30" height="7" rx="3.5" fill="{tone}" stroke="{shadow}" stroke-width="1.4"/><line x1="-11" y1="0" x2="11" y2="0" stroke="{inner}" stroke-width=".9"/></g>',
    ]


def render_reticle(layer: dict[str, Any], colors: dict[str, str]) -> list[str]:
    cx, cy = map(float, layer.get("center", (300,450)))
    radius = float(layer.get("radius", 105))
    count = max(4, int(layer.get("ticks", 48)))
    tone = colors.get(layer.get("tone", "frame"), colors["frame"])
    signal = colors["accent"]
    out = [f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(radius)}" fill="none" stroke="{tone}" stroke-width="{fmt(float(layer.get("stroke_width",.8)))}" opacity="{fmt(float(layer.get("opacity",.6)))}"/>']
    for i in range(count):
        angle = i*360/count + float(layer.get("rotation", 0))
        dx,dy = direction(angle)
        inner = radius-float(layer.get("minor", 4))
        outer = radius-float(layer.get("major", 10)) if i % max(1,count//12) == 0 else inner
        out.append(f'<line x1="{fmt(cx+dx*inner)}" y1="{fmt(cy+dy*inner)}" x2="{fmt(cx+dx*outer)}" y2="{fmt(cy+dy*outer)}" stroke="{tone}" stroke-width="{fmt(1.3 if i % max(1,count//12)==0 else .65)}"/>')
    for angle in (0,90,180,270):
        dx,dy = direction(angle)
        x,y = cx+dx*(radius+float(layer.get("crosshair",24))),cy+dy*(radius+float(layer.get("crosshair",24)))
        out.append(f'<line x1="{fmt(cx+dx*radius)}" y1="{fmt(cy+dy*radius)}" x2="{fmt(x)}" y2="{fmt(y)}" stroke="{tone}" stroke-width="1.3" opacity=".75"/>')
        out.append(f'<circle cx="{fmt(x)}" cy="{fmt(y)}" r="2.7" fill="{signal}"/>')
    return out


def render_orbit_text(layer: dict[str, Any], prefix: str, colors: dict[str, str], key: str) -> list[str]:
    radius = float(layer["radius"])
    cx,cy = map(float,layer.get("center",(300,450)))
    path_id = f"{prefix}-text-{key}"
    start_x = cx-radius
    circumference = f'M {fmt(start_x)} {fmt(cy)} a {fmt(radius)} {fmt(radius)} 0 1 1 {fmt(2*radius)} 0 a {fmt(radius)} {fmt(radius)} 0 1 1 {fmt(-2*radius)} 0'
    tone = color_value(layer.get("tone","pale"),colors,prefix)
    content = escape(str(layer.get("text","")))
    return [f'<defs><path id="{path_id}" d="{circumference}"/></defs>',
            f'<text font-family="monospace" font-size="{fmt(float(layer.get("font_size",10)))}" letter-spacing="{fmt(float(layer.get("letter_spacing",3)))}" fill="{tone}" opacity="{fmt(float(layer.get("opacity",.45)))}"><textPath href="#{path_id}" startOffset="{escape(str(layer.get("start_offset","0%")))}">{content}</textPath></text>']


def render_rose(cx: float, cy: float, radius: float, rng: random.Random, prefix: str, colors: dict[str, str]) -> list[str]:
    out = [f'<polygon points="{xy(octagon(cx, cy, 1.22 * radius, 0, rng))}" fill="{colors["dark_b"]}" stroke="{colors["dark_a"]}" stroke-width="2"/>']
    scales = (1.0, 0.82, 0.64, 0.46, 0.30)
    rotations = (0, 22, 48, 75, 105)
    fills = (colors["lite_a"], colors["mid_b"], colors["pale"], colors["lite_b"], colors["pale"])
    for scale, rotation, fill in zip(scales, rotations, fills):
        out.append(f'<polygon points="{xy(octagon(cx, cy, radius * scale, rotation, rng))}" fill="{fill}" stroke="{colors["dark_a"]}" stroke-width="1.1"/>')
    spiral = []
    for k in range(40):
        rr = radius * (0.05 + 0.017 * k)
        angle = 0.55 * k
        spiral.append((cx + math.cos(angle) * rr, cy + math.sin(angle) * rr))
    out.append(f'<polyline points="{xy(spiral)}" fill="none" stroke="{colors["dark_b"]}" stroke-width="1.2" stroke-linecap="round"/>')
    return out


def render_center(piece: dict[str, Any], center: list[float], rng: random.Random, colors: dict[str, str], prefix: str = "cover") -> list[str]:
    cx, cy = center
    radius = float(piece.get("r", 42))
    kind = str(piece.get("piece_type", piece.get("type", "rose"))).lower()
    if kind == "rose":
        return render_rose(cx, cy, radius, rng, "", colors)
    if kind == "lotus":
        out = [f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(radius * 0.42)}" fill="{colors["dark_b"]}"/>']
        for i in range(10):
            ang = i * 36 - 18
            polygon, _ = petal(cx, cy, ang, radius * (1.5 if i % 2 == 0 else 1.28), radius * 0.58, (-1 if i % 2 else 1) * 0.035, rng, 9, radius * 0.025)
            fill = colors["lite_a"] if i % 2 == 0 else colors["mid_b"]
            out.append(f'<polygon points="{xy(polygon)}" fill="{fill}" stroke="{colors["dark_a"]}" stroke-width="1.1"/>')
        out.extend([f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(radius * 0.29)}" fill="{colors["pale"]}"/>',
                    f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(radius * 0.12)}" fill="{colors["lite_b"]}"/>'])
        return out
    if kind == "eye":
        out = [
            f'<path d="M {fmt(cx-radius*1.65)} {fmt(cy)} Q {fmt(cx)} {fmt(cy-radius*0.95)} {fmt(cx+radius*1.65)} {fmt(cy)} Q {fmt(cx)} {fmt(cy+radius*0.95)} {fmt(cx-radius*1.65)} {fmt(cy)} Z" fill="{colors["lite_a"]}" stroke="{colors["dark_b"]}" stroke-width="3"/>',
            f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(radius*0.57)}" fill="url(#{prefix}-gOrb)" stroke="{colors["dark_a"]}" stroke-width="2"/>',
        ]
        for i in range(32):
            angle = math.tau * i / 32
            r0, r1 = radius * 0.35, radius * (0.48 if i % 2 else 0.55)
            x1, y1 = cx + math.cos(angle) * r0, cy + math.sin(angle) * r0
            x2, y2 = cx + math.cos(angle) * r1, cy + math.sin(angle) * r1
            out.append(f'<line x1="{fmt(x1)}" y1="{fmt(y1)}" x2="{fmt(x2)}" y2="{fmt(y2)}" stroke="{colors["pale"] if i % 2 == 0 else colors["dark_b"]}" stroke-width="{fmt(0.55 if i % 2 else 0.85)}" opacity="0.78"/>')
        out.extend([
            f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(radius*0.30)}" fill="{colors["dark_b"]}" stroke="{colors["pale"]}" stroke-width="0.8"/>',
            f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(radius*0.17)}" fill="{colors["signal"]}"/>',
            f'<circle cx="{fmt(cx-radius*0.13)}" cy="{fmt(cy-radius*0.16)}" r="{fmt(radius*0.11)}" fill="{colors["pale"]}"/>',
            f'<circle cx="{fmt(cx+radius*0.15)}" cy="{fmt(cy+radius*0.12)}" r="{fmt(radius*0.045)}" fill="{colors["lite_b"]}"/>'
        ])
        return out
    if kind == "crystal":
        angles = (-90, -42, 0, 43, 90, 139, 180, 222)
        pts = [(cx + math.cos(math.radians(a)) * radius * rng.uniform(0.9, 1.08),
                cy + math.sin(math.radians(a)) * radius * rng.uniform(0.9, 1.08)) for a in angles]
        out = [f'<polygon points="{xy(pts)}" fill="{colors["lite_b"]}" stroke="{colors["dark_b"]}" stroke-width="2"/>']
        for i in range(len(pts)):
            out.append(f'<polygon points="{xy([pts[i], pts[(i+1)%len(pts)], (cx,cy)])}" fill="{colors["lite_a"] if i % 2 else colors["pale"]}" opacity="0.72"/>')
        return out
    raise ValueError(f"unsupported center_piece.type {kind!r}; use rose, lotus, eye, or crystal")


def color_value(value: Any, colors: dict[str, str], prefix: str, default: str = "dark_a") -> str:
    if value is None:
        value = default
    if not isinstance(value, str):
        raise ValueError(f"color must be a theme key or hex string, got {value!r}")
    if value in colors:
        return colors[value]
    if value in ("gMid", "gLite", "gDark", "gGlow", "gOrb"):
        return f"url(#{prefix}-{value})"
    if value == "none" or re.fullmatch(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})", value):
        return value
    raise ValueError(f"unknown color {value!r}; use a theme key or literal hex")


def svg_attrs(layer: dict[str, Any], colors: dict[str, str], prefix: str) -> str:
    attrs = []
    for key in ("fill", "stroke"):
        if key in layer:
            attrs.append(f'{key}="{color_value(layer[key], colors, prefix)}"')
    for key in ("stroke-width", "opacity", "stroke-opacity", "fill-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "rx", "ry"):
        if key in layer:
            value = str(layer[key])
            if "var(--" in value or "<" in value or '"' in value:
                raise ValueError(f"unsafe SVG attribute value for {key}")
            attrs.append(f'{key}="{value}"')
    return (" " + " ".join(attrs)) if attrs else ""


def render_rosette(layer: dict[str, Any], rng: random.Random, prefix: str, colors: dict[str, str]) -> list[str]:
    cx, cy = map(float, layer.get("center", (365, 365)))
    back_specs = layer.get("back", [])
    front_specs = layer.get("front", [])
    count = int(layer.get("count", 12))
    base_angle = float(layer.get("angle", 0))
    base_length = float(layer.get("length", 190))
    base_width = float(layer.get("width", 52))
    if not back_specs and not front_specs:
        back_specs = [[base_angle + 360*i/count + rng.uniform(-5, 5), base_length*rng.uniform(.86, 1.16), base_width*rng.uniform(.9, 1.2), rng.uniform(-.08, .08)] for i in range(count)]
        front_specs = [[base_angle + 180/count + 360*i/count + rng.uniform(-4, 4), base_length*rng.uniform(.68, .94), base_width*rng.uniform(.72, 1), rng.uniform(-.09, .09)] for i in range(count)]
    out: list[str] = []
    back_petals = []
    front_petals = []
    if back_specs:
        out.append(f'<g fill="url(#{prefix}-gMid)" stroke="{colors["dark_b"]}" stroke-width="0.8" stroke-opacity="0.42">')
        for ang, length, width_, bend in back_specs:
            shape, mapper = petal(cx, cy, float(ang), float(length), float(width_), float(bend), rng, 10, float(layer.get("noise", 2.2)))
            back_petals.append((mapper, float(ang), float(length), float(width_), float(bend)))
            out.append(f'<polygon points="{xy(shape)}"/>')
        out.append('</g>')
    if front_specs:
        out.append(f'<g fill="url(#{prefix}-gLite)" stroke="{colors["dark_a"]}" stroke-width="1" stroke-opacity="0.76">')
        for ang, length, width_, bend in front_specs:
            shape, mapper = petal(cx, cy, float(ang), float(length), float(width_), float(bend), rng, 10, float(layer.get("noise", 2.2)))
            front_petals.append((mapper, float(ang), float(length), float(width_), float(bend)))
            out.append(f'<polygon points="{xy(shape)}"/>')
        out.append('</g>')
    if layer.get("veins", True):
        out.append(f'<g fill="none" stroke="{colors["dark_b"]}" stroke-width="0.72" stroke-opacity="0.60" stroke-linecap="round">')
        for mapper, _ang, _length, _width, _bend in back_petals + front_petals:
            for side in (0, -0.34, 0.34, -0.61, 0.61):
                vein = [mapper(0.12 + 0.70*i/4, side) for i in range(5)]
                out.append(f'<polyline points="{xy(vein)}"/>')
        out.append('</g>')
    if layer.get("highlights", True):
        out.append(f'<g fill="{colors["pale"]}" opacity="0.38">')
        for _mapper, angle, length, width_, bend in front_petals:
            highlight, _ = petal(cx, cy, angle, length*.78, width_*.32, bend, rng, 10, .7, .14, .86)
            out.append(f'<polygon points="{xy(highlight)}"/>')
        out.append('</g>')
    for branch in layer.get("branches", []):
        out.append(f'<polyline points="{xy([(float(x), float(y)) for x,y in branch])}" fill="none" stroke="{colors["dark_b"]}" stroke-width="2.3" stroke-linecap="square" stroke-linejoin="miter"/>')
    if layer.get("center_piece"):
        out.extend(render_center(layer["center_piece"], [cx, cy], rng, colors, prefix))
    return out


def render_layer(layer: dict[str, Any], rng: random.Random, prefix: str, colors: dict[str, str]) -> list[str]:
    kind = str(layer.get("type", "")).lower()
    attrs = svg_attrs(layer, colors, prefix)
    if kind == "group":
        transform = str(layer.get("transform", ""))
        if transform and not re.fullmatch(r"[A-Za-z0-9.,() +\-]+", transform):
            raise ValueError("group transform contains unsupported characters")
        transform_attr = f' transform="{transform}"' if transform else ""
        out = [f'<g{transform_attr}{attrs}>']
        for child in layer.get("layers", []):
            out.extend(render_layer(child, rng, prefix, colors))
        out.append('</g>')
        return out
    if kind in ("polygon", "polyline"):
        return [f'<{kind} points="{xy([(float(x),float(y)) for x,y in layer["points"]])}"{attrs}/>']
    if kind == "line":
        x1, y1, x2, y2 = map(float, layer["points"])
        return [f'<line x1="{fmt(x1)}" y1="{fmt(y1)}" x2="{fmt(x2)}" y2="{fmt(y2)}"{attrs}/>']
    if kind == "circle":
        return [f'<circle cx="{fmt(float(layer["cx"]))}" cy="{fmt(float(layer["cy"]))}" r="{fmt(float(layer["r"]))}"{attrs}/>']
    if kind == "ellipse":
        return [f'<ellipse cx="{fmt(float(layer["cx"]))}" cy="{fmt(float(layer["cy"]))}" rx="{fmt(float(layer["rx"]))}" ry="{fmt(float(layer["ry"]))}"{attrs}/>']
    if kind == "rect":
        return [f'<rect x="{fmt(float(layer["x"]))}" y="{fmt(float(layer["y"]))}" width="{fmt(float(layer["w"]))}" height="{fmt(float(layer["h"]))}"{attrs}/>']
    if kind == "path":
        d = str(layer["d"])
        if re.search(r"url\s*\(|var\s*\(|[<>\"']", d):
            raise ValueError("path data contains unsupported markup or style")
        return [f'<path d="{d}"{attrs}/>']
    if kind == "text":
        font = str(layer.get("font_family", "serif"))
        weight = str(layer.get("font_weight", "normal"))
        anchor = str(layer.get("anchor", "middle"))
        if not re.fullmatch(r"[A-Za-z0-9 ,_-]+", font):
            raise ValueError("font_family may contain only family names and separators")
        if weight not in ("normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"):
            raise ValueError("font_weight must be normal, bold, or a numeric SVG weight")
        if anchor not in ("start", "middle", "end"):
            raise ValueError("text anchor must be start, middle, or end")
        x, y = float(layer["x"]), float(layer["y"])
        rotation = float(layer.get("rotation", 0))
        transform = f' transform="rotate({fmt(rotation)} {fmt(x)} {fmt(y)})"' if rotation else ""
        size = fmt(float(layer.get("font_size", 24)))
        spacing = fmt(float(layer.get("letter_spacing", 0)))
        body = escape(str(layer.get("text", "")))
        return [f'<text x="{fmt(x)}" y="{fmt(y)}" font-family="{font}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" letter-spacing="{spacing}"{attrs}{transform}>{body}</text>']
    if kind == "petal":
        shape, _ = petal(float(layer["cx"]), float(layer["cy"]), float(layer["angle"]), float(layer["length"]), float(layer["width"]), float(layer.get("bend", 0)), rng, int(layer.get("segments", 10)), float(layer.get("noise", 2.2)))
        return [f'<polygon points="{xy(shape)}"{attrs}/>']
    if kind == "crescent":
        cx, cy = map(float, layer["center"])
        rx, ry = float(layer["rx"]), float(layer["ry"])
        a0, a1 = map(float, layer["arc"])
        shape = crescent(cx, cy, rx, ry, a0, a1, float(layer["peak"]), int(layer.get("segments", 40)), float(layer.get("noise", 1)), rng)
        out = [f'<polygon points="{xy(shape)}"{attrs}/>']
        for pos, direction_, length, base in layer.get("spikes", []):
            spike = spike_at(cx, cy, rx, ry, float(pos), float(direction_), float(length), float(base), rng)
            out.append(f'<polygon points="{xy(spike)}" fill="{colors["dark_a"]}" stroke="{colors["dark_b"]}" stroke-width="1"/>')
        return out
    if kind == "vine":
        points = layer["points"]
        out = [f'<polyline points="{xy([(float(x),float(y)) for x,y in points])}" fill="none" stroke="{color_value(layer.get("stroke", "dark_b"),colors,prefix)}" stroke-width="{fmt(float(layer.get("w", 10)))}" stroke-linejoin="miter" stroke-linecap="square"/>']
        for thorn in thorns_along(points, float(layer.get("size", 18)), int(layer.get("flip", 1)), float(layer.get("w", 10)), rng):
            out.append(f'<polygon points="{xy(thorn)}" fill="{colors["dark_b"]}"/>')
        return out
    if kind == "shards":
        out = []
        for shard in layer.get("items", []):
            noise = float(shard.get("noise", 0))
            points = [(float(x)+rng.uniform(-noise,noise),float(y)+rng.uniform(-noise,noise)) for x,y in shard["points"]]
            out.append(f'<polygon points="{xy(points)}" fill="{color_value(shard.get("fill","dark_a"),colors,prefix)}" stroke="{colors["dark_b"]}" stroke-width="1"/>')
        return out
    if kind == "splat":
        cx,cy=float(layer["cx"]),float(layer["cy"])
        spikes=int(layer.get("spikes",rng.randint(14,22)))
        points=[]
        for i in range(spikes*2):
            angle=i*360/(spikes*2)+rng.uniform(-6,6)
            radius=float(layer["r"])*(rng.uniform(.45,.9) if i%2==0 else rng.uniform(1.1,2.5))
            dx,dy=direction(angle)
            points.append((cx+dx*radius,cy+dy*radius))
        return [f'<polygon points="{xy(points)}" fill="{color_value(layer.get("fill","dark_a"),colors,prefix)}" stroke="{color_value(layer.get("stroke","dark_b"),colors,prefix)}" stroke-width="{fmt(float(layer.get("stroke_width",1.4)))}" stroke-linejoin="miter"/>']
    if kind == "ribbon":
        points=layer["points"]
        shape=ribbon([[float(x),float(y)] for x,y in points], [float(w) for w in layer["widths"]])
        return [f'<polygon points="{xy(shape)}"{attrs}/>']
    if kind == "fractured_veins":
        return fractured_veins(layer,rng,colors,prefix)
    if kind == "chain":
        return render_chain(layer,prefix)
    if kind == "reticle":
        return render_reticle(layer,colors)
    if kind == "number_orbit":
        key=str(layer.get("key","ring"))
        if not re.fullmatch(r"[A-Za-z0-9_.-]+",key):
            raise ValueError("number_orbit key must be a valid SVG ID suffix")
        return render_orbit_text(layer,prefix,colors,key)
    if kind == "orbit_arc":
        cx,cy=map(float,layer.get("center",(365,365)))
        rx=float(layer.get("rx",layer.get("r",180)))
        ry=float(layer.get("ry",layer.get("r",180)))
        a0,a1=map(float,layer["arc"])
        x0,y0=ellipse_point(cx,cy,rx,ry,a0)
        x1,y1=ellipse_point(cx,cy,rx,ry,a1)
        delta=(a1-a0)%360
        large=1 if delta>180 else 0
        tone=color_value(layer.get("stroke","frame"),colors,prefix)
        d=f'M {fmt(x0)} {fmt(y0)} A {fmt(rx)} {fmt(ry)} 0 {large} 1 {fmt(x1)} {fmt(y1)}'
        dash = f' stroke-dasharray="{escape(str(layer["dash"]), quote=True)}"' if layer.get("dash") else ""
        return [f'<path d="{d}" fill="none" stroke="{tone}" stroke-width="{fmt(float(layer.get("stroke_width",1.2)))}" opacity="{fmt(float(layer.get("opacity",.5)))}" stroke-linecap="round"{dash}/>']
    if kind == "rays":
        cx,cy=map(float,layer.get("center",(365,365)))
        count=max(1,int(layer.get("count",24)))
        start=float(layer.get("angle",0))
        start_radius=float(layer.get("inner",40))
        tone=color_value(layer.get("fill","lite_a"),colors,prefix)
        out=[]
        for i in range(count):
            angle=start+360*i/count+rng.uniform(-float(layer.get("jitter",2)),float(layer.get("jitter",2)))
            dx,dy=direction(angle)
            length=rng.uniform(float(layer.get("length_min",80)),float(layer.get("length_max",180)))
            half=rng.uniform(float(layer.get("width_min",1)),float(layer.get("width_max",5)))
            nx,ny=-dy,dx
            a=(cx+dx*start_radius+nx*half,cy+dy*start_radius+ny*half)
            b=(cx+dx*(start_radius+length),cy+dy*(start_radius+length))
            c=(cx+dx*start_radius-nx*half,cy+dy*start_radius-ny*half)
            out.append(f'<polygon points="{xy([a,b,c])}" fill="{tone}" opacity="{fmt(float(layer.get("opacity",.8)))}"/>')
        return out
    if kind == "glitch_bars":
        count=max(0,int(layer.get("count",24)))
        xr=layer.get("x_range",[35,565]); yr=layer.get("y_range",[70,830])
        wr=layer.get("width_range",[12,90]); hr=layer.get("height_range",[1.2,4.8])
        avoid=layer.get("avoid")
        tones=layer.get("tones",["accent","signal","pale"])
        bins: dict[tuple[str,float],list[tuple[float,float,float,float]]]={}
        for _ in range(count):
            for _attempt in range(40):
                x=rng.uniform(float(xr[0]),float(xr[1]))
                y=rng.uniform(float(yr[0]),float(yr[1]))
                w=rng.uniform(float(wr[0]),float(wr[1]))
                h=rng.uniform(float(hr[0]),float(hr[1]))
                if not avoid or math.hypot(x+w/2-float(avoid[0]),y-float(avoid[1]))>float(avoid[2]):
                    break
            tone=str(rng.choice(tones)); opacity=round(rng.uniform(float(layer.get("opacity_min",.3)),float(layer.get("opacity_max",.85))),1)
            bins.setdefault((tone,opacity),[]).append((x,y,w,h))
        out=[]
        for (tone,opacity),bars in bins.items():
            out.append(f'<g fill="{color_value(tone,colors,prefix)}" opacity="{fmt(opacity)}">')
            out.extend(f'<rect x="{fmt(x)}" y="{fmt(y)}" width="{fmt(w)}" height="{fmt(h)}"/>' for x,y,w,h in bars)
            out.append('</g>')
        return out
    if kind == "floating_digits":
        count=max(0,int(layer.get("count",32)))
        xr=layer.get("x_range",[35,565]); yr=layer.get("y_range",[80,820])
        digit_set=str(layer.get("digits","0123456789"))
        tone=color_value(layer.get("fill","pale"),colors,prefix)
        avoid=layer.get("avoid")
        out=[]
        for _ in range(count):
            for _attempt in range(40):
                x=rng.uniform(float(xr[0]),float(xr[1])); y=rng.uniform(float(yr[0]),float(yr[1]))
                if not avoid or math.hypot(x-float(avoid[0]),y-float(avoid[1]))>float(avoid[2]):
                    break
            length=rng.randint(int(layer.get("min_digits",2)),int(layer.get("max_digits",7)))
            value="".join(rng.choice(digit_set) for _ in range(length))
            size=rng.uniform(float(layer.get("size_min",8)),float(layer.get("size_max",16)))
            angle=rng.uniform(float(layer.get("rotation_min",-12)),float(layer.get("rotation_max",12)))
            opacity=rng.uniform(float(layer.get("opacity_min",.35)),float(layer.get("opacity_max",.8)))
            out.append(f'<text x="{fmt(x)}" y="{fmt(y)}" font-family="monospace" font-size="{fmt(size)}" fill="{tone}" opacity="{fmt(opacity)}" transform="rotate({fmt(angle)} {fmt(x)} {fmt(y)})">{escape(value)}</text>')
        return out
    if kind == "specks":
        count=max(0,int(layer.get("count",70)))
        cx,cy=map(float,layer.get("center",(300,450)))
        rx,ry=float(layer.get("rx",230)),float(layer.get("ry",330))
        tones=layer.get("tones",["star","pale"])
        out=[]
        for _ in range(count):
            angle=rng.uniform(0,math.tau); radius=math.sqrt(rng.random())
            x=cx+math.cos(angle)*rx*radius; y=cy+math.sin(angle)*ry*radius
            r=rng.uniform(float(layer.get("size_min",.5)),float(layer.get("size_max",2.2)))
            tone=color_value(str(rng.choice(tones)),colors,prefix)
            opacity=rng.uniform(float(layer.get("opacity_min",.25)),float(layer.get("opacity_max",.75)))
            out.append(f'<circle cx="{fmt(x)}" cy="{fmt(y)}" r="{fmt(r)}" fill="{tone}" opacity="{fmt(opacity)}"/>')
        return out
    if kind == "rosette":
        return render_rosette(layer, rng, prefix, colors)
    if kind == "centerpiece":
        return render_center(layer, list(layer.get("center", (365,365))), rng, colors, prefix)
    raise ValueError(f"unsupported layer type {kind!r}; see references/anatomy.md")


def legacy_layers(config: dict[str, Any]) -> list[dict[str, Any]]:
    layers: list[dict[str, Any]] = []
    rings = config.get("rings", [])
    for side in ("right", "left"):
        for item in (ring for ring in rings if ring.get("side") == side):
            ex, ey, rx, ry = map(float, item["ellipse"])
            layers.append({"type": "crescent", "center": [ex, ey], "rx": rx, "ry": ry,
                           "arc": item["arc"], "peak": item["peak"], "noise": item.get("noise", 0),
                           "segments": 48 if side == "right" else 52, "spikes": item.get("spikes", [])})
        for blade in (item for item in config.get("blades", []) if item.get("side") == side):
            layers.append({"type": "petal", "cx": blade["root"][0], "cy": blade["root"][1],
                           "angle": blade["angle"], "length": blade["length"], "width": blade["width"],
                           "bend": blade.get("bend", 0), "noise": blade.get("noise", 2.2),
                           "fill": "gDark", "stroke": "dark_b", "stroke-width": 1.2})
    lower = config.get("lower_crescent")
    if lower:
        layers.append({"type": "crescent", "center": lower["center"], "rx": lower["rx"], "ry": lower["ry"],
                       "arc": lower["arc"], "peak": lower["peak"], "noise": lower.get("noise", 1),
                       "segments": 40, "spikes": lower.get("spikes", []),
                       "fill": "gDark", "stroke": "dark_b", "stroke-width": 1.2})
    if config.get("shards"):
        layers.append({"type": "shards", "items": config["shards"]})
    layers.extend({"type": "vine", **vine} for vine in config.get("vines", []))
    if "flower" in config:
        flower = config["flower"]
        layers.append({"type": "rosette", "center": flower["center"], "back": flower.get("back", []),
                       "front": flower.get("front", []), "veins": flower.get("veins", True),
                       "highlights": flower.get("highlights", True),
                       "branches": config.get("central_branches", []),
                       "center_piece": config.get("center_piece", {"type": "rose", "r": 42})})
    return layers


def draw(config: dict[str, Any], colors: dict[str, str], seed: int) -> str:
    rng = random.Random(seed)
    prefix = str(config.get("id_prefix", "cover"))
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.-]*", prefix):
        raise ValueError("id_prefix must be a valid SVG ID prefix")
    canvas = config.get("canvas", {})
    width, height = int(canvas.get("w", 600)), int(canvas.get("h", 900))
    scale = float(canvas.get("emblem_scale", 1.0))
    if width <= 0 or height <= 0 or not 0 < scale <= 1.5:
        raise ValueError("canvas dimensions must be positive and emblem_scale must be between 0 and 1.5")
    bgcfg = config.get("background", {})
    framecfg = config.get("frame", {})
    effects = config.get("effects", {})
    cx, cy = width / 2, height / 2
    emblem_x, emblem_y = cx - 365 * scale, cy - 365 * scale
    title = escape(str(config.get("title", "Card cover")))
    description = escape(str(config.get("description", "Original parametric vector artwork.")))
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 {width} {height}" role="img" preserveAspectRatio="xMidYMid meet">',
        f'<title>{title}</title><desc>{description}</desc>',
        '<defs>',
        f'<radialGradient id="{prefix}-gGlow" gradientUnits="userSpaceOnUse" cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(float(bgcfg.get("glow_radius", 360)))}"><stop offset="0" stop-color="{colors["glow"]}" stop-opacity="0.72"/><stop offset="1" stop-color="{colors["bg"]}" stop-opacity="0"/></radialGradient>',
        f'<linearGradient id="{prefix}-gMid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{colors["mid_a"]}"/><stop offset="1" stop-color="{colors["mid_b"]}"/></linearGradient>',
        f'<linearGradient id="{prefix}-gLite" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{colors["lite_a"]}"/><stop offset="1" stop-color="{colors["lite_b"]}"/></linearGradient>',
        f'<linearGradient id="{prefix}-gDark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{colors["dark_a"]}"/><stop offset="1" stop-color="{colors["dark_b"]}"/></linearGradient>',
        f'<radialGradient id="{prefix}-gOrb" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="{colors["pale"]}"/><stop offset=".32" stop-color="{colors["lite_b"]}"/><stop offset=".7" stop-color="{colors["lite_a"]}"/><stop offset="1" stop-color="{colors["dark_b"]}"/></radialGradient>',
        f'<radialGradient id="{prefix}-gVig" cx=".5" cy=".5" r=".72"><stop offset=".48" stop-color="{colors["bg"]}" stop-opacity="0"/><stop offset="1" stop-color="{colors["bg"]}" stop-opacity=".78"/></radialGradient>',
        f'<g id="{prefix}-corner" fill="none"><path d="M 0 62 L 0 17 Q 0 0 17 0 L 62 0 M 4 45 C 19 45 24 38 26 25 C 28 13 35 5 49 4 M 4 31 C 14 31 18 25 19 17 M 31 4 C 31 14 25 18 17 19 M 9 9 L 15 15 M 8 21 L 13 26 M 21 8 L 26 13"/></g>',
        f'<g id="{prefix}-topOrn" fill="none" stroke="{colors["frame"]}"><path d="M {fmt(cx-82)} 43 Q {fmt(cx-45)} 34 {fmt(cx)} 43 Q {fmt(cx+45)} 34 {fmt(cx+82)} 43 M {fmt(cx-56)} 43 Q {fmt(cx-31)} 58 {fmt(cx)} 44 Q {fmt(cx+31)} 58 {fmt(cx+56)} 43 M {fmt(cx)} 39 L {fmt(cx)} 57 M {fmt(cx-92)} 42 L {fmt(cx-82)} 43 M {fmt(cx+92)} 42 L {fmt(cx+82)} 43"/><path d="M {fmt(cx-5)} 40 L {fmt(cx)} 34 L {fmt(cx+5)} 40 L {fmt(cx)} 46 Z" fill="{colors["frame"]}"/></g>',
    ]
    out.extend(chain_symbols(prefix, "chain", colors["mid_a"], colors["pale"], colors))
    out.extend(chain_symbols(prefix, "chain-pale", colors["pale"], colors["frame"], colors))
    out.extend(chain_symbols(prefix, "chain-signal", colors["signal"], colors["pale"], colors))
    out.extend(chain_symbols(prefix, "chain-accent", colors["accent"], colors["lite_b"], colors))
    if bgcfg.get("halftone"):
        dot = float(bgcfg.get("halftone_size", 1.05))
        spacing = float(bgcfg.get("halftone_spacing", 6))
        out.append(f'<pattern id="{prefix}-pHalf" width="{fmt(spacing)}" height="{fmt(spacing)}" patternUnits="userSpaceOnUse"><circle cx="{fmt(spacing/2)}" cy="{fmt(spacing/2)}" r="{fmt(dot)}" fill="{colors["accent"]}"/></pattern>')
    if bgcfg.get("scanlines"):
        spacing = float(bgcfg.get("scanline_spacing", 4))
        thickness = float(bgcfg.get("scanline_width", 1.1))
        out.append(f'<pattern id="{prefix}-pScan" width="{fmt(spacing)}" height="{fmt(spacing)}" patternUnits="userSpaceOnUse"><rect width="{fmt(spacing)}" height="{fmt(thickness)}" fill="{colors["dark_b"]}"/></pattern>')
    out.append(f'<clipPath id="{prefix}-clip\"><rect width="{width}" height="{height}" rx="{fmt(float(bgcfg.get("corner_radius", 28)))}"/></clipPath>')
    out.append('</defs>')
    out.append(f'<g clip-path="url(#{prefix}-clip)">')
    out.append(f'<rect width="{width}" height="{height}" rx="{fmt(float(bgcfg.get("corner_radius",28)))}" fill="{colors["bg"]}"/>')
    if bgcfg.get("glow", True):
        out.append(f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(float(bgcfg.get("glow_radius",360)))}" fill="url(#{prefix}-gGlow)"/>')
    if bgcfg.get("halftone"):
        out.append(f'<rect width="{width}" height="{height}" fill="url(#{prefix}-pHalf)" opacity="{fmt(float(bgcfg.get("halftone_opacity",.16)))}"/>')
    if bgcfg.get("scanlines"):
        out.append(f'<rect width="{width}" height="{height}" fill="url(#{prefix}-pScan)" opacity="{fmt(float(bgcfg.get("scanline_opacity",.12)))}"/>')
    star_count=max(0,int(bgcfg.get("stars",70)))
    star_bins={value:[] for value in (.2,.3,.4,.5,.6)}
    min_radius=float(bgcfg.get("star_min_radius",250))
    max_radius=float(bgcfg.get("star_max_radius",475))
    for _ in range(star_count):
        for _attempt in range(100):
            angle=rng.uniform(0,math.tau)
            radius=rng.uniform(min_radius,max_radius)
            sx,sy=cx+math.cos(angle)*radius,cy+math.sin(angle)*radius
            if 8<=sx<=width-8 and 8<=sy<=height-8:
                break
        star_bins[rng.choice(tuple(star_bins))].append((sx,sy,rng.uniform(.65,2.2)))
    for opacity,stars in star_bins.items():
        if stars:
            out.append(f'<g fill="{colors["star"]}" opacity="{fmt(opacity)}">')
            out.extend(f'<circle cx="{fmt(x)}" cy="{fmt(y)}" r="{fmt(r)}"/>' for x,y,r in stars)
            out.append('</g>')
    custom_bg=bgcfg.get("layers",[])
    for layer in custom_bg:
        out.extend(render_layer(layer,rng,prefix,colors))
    back_effects=effects.get("back",[])
    for layer in back_effects:
        out.extend(render_layer(layer,rng,prefix,colors))
    if bgcfg.get("dashed_rings",True):
        circles=bgcfg.get("ring_radii",[292,312])
        for index,radius in enumerate(circles):
            dash=' stroke-dasharray="2 9"' if index==0 else ""
            opacity=".34" if index==0 else ".2"
            out.append(f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(float(radius))}" fill="none" stroke="{colors["frame"]}" stroke-width=".8" opacity="{opacity}"{dash}/>')
    composition=config.get("layers",[])
    if not composition and "flower" in config:
        composition=legacy_layers(config)
    if composition:
        previous_space=None
        for layer in composition:
            space=layer.get("space","emblem")
            if space not in ("emblem","canvas"):
                raise ValueError("layer space must be emblem or canvas")
            if space!=previous_space:
                if previous_space is not None:
                    out.append("</g>")
                transform=f' transform="translate({fmt(emblem_x)} {fmt(emblem_y)}) scale({fmt(scale)})"' if space=="emblem" else ""
                out.append(f"<g{transform}>")
                previous_space=space
            out.extend(render_layer(layer,rng,prefix,colors))
        out.append("</g>")
    for layer in effects.get("front",[]):
        out.extend(render_layer(layer,rng,prefix,colors))
    if bgcfg.get("vignette",False) or effects.get("vignette",False):
        out.append(f'<rect width="{width}" height="{height}" fill="url(#{prefix}-gVig)" opacity="{fmt(float(effects.get("vignette_opacity",.72)))}"/>')
    out.append("</g>")
    if framecfg.get("enabled",True):
        insets=framecfg.get("insets",[14,30,38])
        widths=framecfg.get("widths",[3,1,.6])
        tones=framecfg.get("tones",["dark_a","frame","dark_a"])
        for index,inset in enumerate(insets[:min(3,max(0,int(framecfg.get("layers",3))))]):
            stroke=color_value(tones[index],colors,prefix)
            out.append(f'<rect x="{fmt(float(inset))}" y="{fmt(float(inset))}" width="{fmt(width-2*float(inset))}" height="{fmt(height-2*float(inset))}" rx="{fmt(float(framecfg.get("radius",22)))}" fill="none" stroke="{stroke}" stroke-width="{fmt(float(widths[index]))}" opacity="{fmt(float(framecfg.get("opacity",.82)))}"/>')
        if framecfg.get("corners",True):
            out.extend([
                f'<use href="#{prefix}-corner" transform="translate(48 48)" stroke="{colors["frame"]}" stroke-width="1.4"/>',
                f'<use href="#{prefix}-corner" transform="translate({width-48} 48) scale(-1 1)" stroke="{colors["frame"]}" stroke-width="1.4"/>',
                f'<use href="#{prefix}-corner" transform="translate(48 {height-48}) scale(1 -1)" stroke="{colors["frame"]}" stroke-width="1.4"/>',
                f'<use href="#{prefix}-corner" transform="translate({width-48} {height-48}) scale(-1 -1)" stroke="{colors["frame"]}" stroke-width="1.4"/>',
            ])
        if framecfg.get("top_bottom_ornament",True):
            out.extend([
                f'<use href="#{prefix}-topOrn" stroke-width="1.1"/>',
                f'<use href="#{prefix}-topOrn" transform="translate(0 {height}) scale(1 -1)" stroke-width="1.1"/>'
            ])
    for layer in config.get("overlays", []):
        out.extend(render_layer(layer, rng, prefix, colors))
    out.append("</svg>")
    return "".join(out)

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--theme")
    parser.add_argument("--id-prefix", help="override the config ID prefix for a unique inline SVG")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        config = load_config(args.config)
        seed = args.seed if args.seed is not None else int(config.get("seed", 23))
        theme_spec = args.theme if args.theme is not None else config.get("theme", "grafite")
        if args.id_prefix:
            config["id_prefix"] = args.id_prefix
        svg = draw(config, load_theme(theme_spec), seed)
        prefix = str(config.get("id_prefix", "cover"))
        theme_name = args.theme or config.get("theme_name")
        if not theme_name:
            theme_name = theme_spec if isinstance(theme_spec, str) else "custom"
        output = args.output or Path("out") / f"{prefix}-{theme_name}-s{seed}.svg"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(svg, encoding="utf-8")
        print(output)
    except (ValueError, KeyError, TypeError, IndexError, OverflowError) as exc:
        print(f"gen_cover: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
