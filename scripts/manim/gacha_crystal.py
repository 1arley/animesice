"""Render the decorative gacha loop; see README.md for the isolated Python setup."""

from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess

import numpy as np
from manim import (
    Circle, Dot, Ellipse, ManimColor, Polygon, Scene, TAU, ValueTracker, VGroup,
    always_redraw, interpolate_color, tempconfig,
)

ICE = "#38E8DA"
FROST = "#E2F7F9"
AZURE = "#008CDA"

FACETS = 6
RADIUS = 0.82
SHAPE = (1.0, 0.78, 1.12, 0.86, 1.05, 0.82)
TIPS = (1.45, 1.24)
TURNS = 3
GHOSTS = (-0.32, -0.64)
WOBBLE = 0.75
DURATION = 4
TILT = 0.5
COS_TILT, SIN_TILT = np.cos(TILT), np.sin(TILT)


def breathe(alpha: float) -> float:
    """Speed curve whose value and slope match at both ends, so the loop has no seam."""
    return alpha - WOBBLE * np.sin(TAU * alpha) / TAU


def tumble(v: np.ndarray, t: float) -> np.ndarray:
    """Spin on Y and nod on X at the same rate: the outline changes every frame."""
    x, y, z = v
    x, z = x * np.cos(t) + z * np.sin(t), -x * np.sin(t) + z * np.cos(t)
    y, z = y * np.cos(t) - z * np.sin(t), y * np.sin(t) + z * np.cos(t)
    return np.array([x, y, z])


def tilt(v: np.ndarray) -> np.ndarray:
    """Lean the solid toward the viewer; without this the facets never read as 3D."""
    return np.array([v[0], v[1] * COS_TILT - v[2] * SIN_TILT,
                     v[1] * SIN_TILT + v[2] * COS_TILT])


def crystal(t: float) -> VGroup:
    """Draw the faceted solid at time t, painter-sorted back to front."""
    ring = [tilt(tumble(np.array([
        RADIUS * SHAPE[i % FACETS] * np.cos(i * TAU / FACETS), 0.0,
        RADIUS * SHAPE[i % FACETS] * np.sin(i * TAU / FACETS),
    ]), t)) for i in range(FACETS)]
    tips = [tilt(tumble(np.array([0.0, height, 0.0]), t)) for height in TIPS]
    bob = np.sin(t) * 0.06
    faces = []
    for tip in tips:
        for i in range(FACETS):
            tri = [tip, ring[i], ring[(i + 1) % FACETS]]
            depth = float(np.mean([v[2] for v in tri]))
            faces.append((depth, [[v[0], v[1] + bob, 0.0] for v in tri]))
    brightest = max(depth for depth, _ in faces)
    shapes = []
    for depth, points in sorted(faces, key=lambda face: face[0]):
        facing = (depth + RADIUS) / (2 * RADIUS)
        lit = depth > brightest - 0.05
        facet = Polygon(*points, stroke_color=FROST, stroke_width=1.1 if lit else 0.5)
        facet.set_fill(
            FROST if lit else interpolate_color(
                ManimColor(AZURE), ManimColor(ICE), facing),
            opacity=0.6 if lit else 0.12 + 0.4 * facing,
        )
        shapes.append(facet)
    return VGroup(*shapes)


def ghost(t: float) -> VGroup:
    trail = crystal(t)
    trail.set_stroke(opacity=0)
    trail.set_opacity(0.16)
    return trail


def spark(angle: float, tilt: float) -> np.ndarray:
    x, y = 2.9 * np.cos(angle), 1.15 * np.sin(angle)
    return np.array([x * np.cos(tilt) - y * np.sin(tilt),
                     x * np.sin(tilt) + y * np.cos(tilt), 0.0])


class GachaCrystal(Scene):
    def construct(self):
        phase = ValueTracker(0)
        halo = VGroup(*[
            Circle(stroke_width=0).set_fill(ICE, opacity=0.009)
            for _ in range(20)
        ])
        stars = VGroup(*[
            Dot([np.cos(i * 2.4) * (2.2 + (i % 7) * 0.17),
                 np.sin(i * 2.4) * (2.2 + (i % 7) * 0.17), 0],
                radius=0.009 + (i % 3) * 0.005, color=FROST)
            for i in range(36)
        ])
        orbits = VGroup(*[
            Ellipse(width=5.8, height=2.3, color=ICE, stroke_width=1.4)
            .rotate(angle).set_stroke(opacity=0.35)
            for angle in (0.35, -0.65)
        ])

        def draw_halo() -> VGroup:
            for i, ring in enumerate(halo):
                ring.scale((0.5 + i * 0.085 + np.sin(phase.get_value()) * 0.022) / 0.5)
            return halo

        def draw_stars() -> VGroup:
            for i, star in enumerate(stars):
                star.set_opacity(
                    (0.2 + (i % 4) * 0.12) * (0.55 + 0.45 * np.sin(phase.get_value() + i)))
            return stars

        def draw_crystal() -> VGroup:
            t = phase.get_value()
            return VGroup(*[ghost(t + g) for g in GHOSTS], crystal(t))

        def draw_sparks() -> VGroup:
            result = VGroup()
            for index, tilt in enumerate((0.35, -0.65)):
                for i in range(6):
                    angle = phase.get_value() * 1.6 * (1 if index == 0 else -1) + i * TAU / 6
                    point = spark(angle, tilt)
                    result.add(Dot(point, radius=0.028, color=FROST))
                    result.add(Dot(point, radius=0.075, color=ICE).set_opacity(0.14))
            return result

        self.add(always_redraw(draw_halo), always_redraw(draw_stars), orbits,
                 always_redraw(draw_sparks), always_redraw(draw_crystal))
        self.play(phase.animate.set_value(TURNS * TAU), run_time=DURATION,
                  rate_func=breathe)


def selfcheck() -> None:
    """The loop only looks seamless if speed and pose both land back on the start."""
    epsilon = 1e-6
    assert abs(breathe(0.0)) < epsilon and abs(breathe(1.0) - 1.0) < epsilon
    start = (breathe(epsilon) - breathe(0.0)) / epsilon
    end = (breathe(1.0) - breathe(1.0 - epsilon)) / epsilon
    assert abs(start - end) < 1e-3, "speed curve must match at the seam"
    assert 0.25 < start < 1.75 and 1.75 > (breathe(0.5) - breathe(0.5 - epsilon)) / epsilon


if __name__ == "__main__":
    selfcheck()
    destination = Path(__file__).resolve().parents[2] / "public" / "gacha"
    destination.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix="animesice-manim-") as media:
        with tempconfig({
            "media_dir": media, "output_file": "crystal", "disable_caching": True,
            "pixel_width": 720, "pixel_height": 720, "frame_rate": 30,
            "frame_width": 8, "frame_height": 8, "background_color": "#000000",
        }):
            scene = GachaCrystal()
            scene.render()
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", scene.renderer.file_writer.movie_file_path,
            "-an", "-c:v", "libx264", "-crf", "23", "-preset", "slow",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(destination / "crystal.mp4"),
        ], check=True)
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-ss", "0.5",
            "-i", str(destination / "crystal.mp4"), "-frames:v", "1",
            str(destination / "crystal.webp"),
        ], check=True)
