"""Render the decorative gacha loop; see README.md for the isolated Python setup."""

from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess

import numpy as np
from manim import (
    Circle, Dot, Ellipse, Polygon, Scene, TAU, ValueTracker, VGroup,
    always_redraw, linear, tempconfig,
)

ICE = "#38E8DA"
FROST = "#E2F7F9"
AZURE = "#008CDA"


class GachaCrystal(Scene):
    def construct(self):
        phase = ValueTracker(0)
        # Layered translucency gives a soft halo without a post-processing step.
        halo = VGroup(*[
            Circle(radius=0.5 + i * 0.085, stroke_width=0)
            .set_fill(ICE, opacity=0.009)
            for i in range(24)
        ])
        stars = VGroup(*[
            Dot(
                [np.cos(i * 2.4) * (2.2 + (i % 7) * 0.17),
                 np.sin(i * 2.4) * (2.2 + (i % 7) * 0.17), 0],
                radius=0.009 + (i % 3) * 0.005, color=FROST,
            ).set_opacity(0.2 + (i % 4) * 0.12)
            for i in range(36)
        ])
        orbits = VGroup(*[
            Ellipse(width=5.8, height=2.3, color=ICE, stroke_width=1.4)
            .rotate(angle).set_stroke(opacity=0.35)
            for angle in [0.35, -0.65]
        ])

        def crystal():
            angle = phase.get_value()
            equator = [
                np.array([0.8 * np.cos(angle + i * TAU / 4),
                          0, 0.8 * np.sin(angle + i * TAU / 4)])
                for i in range(4)
            ]
            faces = []
            for tip in [np.array([0, 1.45, 0]), np.array([0, -1.45, 0])]:
                for i in range(4):
                    vertices = [tip, equator[i], equator[(i + 1) % 4]]
                    depth = sum(v[2] for v in vertices) / 3
                    points = [[v[0], v[1] + v[2] * 0.32, 0] for v in vertices]
                    facet = Polygon(*points, stroke_color=FROST, stroke_width=1.2)
                    facet.set_fill(ICE if depth > 0 else AZURE, opacity=0.3 + depth * 0.28)
                    faces.append((depth, facet))
            return VGroup(*[face for _, face in sorted(faces, key=lambda f: f[0])])

        def sparks():
            result = VGroup()
            for orbit, tilt in enumerate([0.35, -0.65]):
                for i in range(6):
                    angle = phase.get_value() * (1 if orbit == 0 else -1) + i * TAU / 6
                    x, y = 2.9 * np.cos(angle), 1.15 * np.sin(angle)
                    point = [x * np.cos(tilt) - y * np.sin(tilt),
                             x * np.sin(tilt) + y * np.cos(tilt), 0]
                    result.add(Dot(point, radius=0.028, color=FROST))
                    result.add(Dot(point, radius=0.075, color=ICE).set_opacity(0.14))
            return result

        self.add(halo, stars, orbits, always_redraw(crystal), always_redraw(sparks))
        self.play(phase.animate.set_value(TAU), run_time=4, rate_func=linear)


if __name__ == "__main__":
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
