"""Manim CE 0.20.1 + FFmpeg. Regenerate all web assets with:

    python -m pip install manim==0.20.1
    python scripts/animations/gacha_box_reveal.py

Uses a temporary render directory; only optimized MP4/WebP files enter public/.
The movie is decorative: reward data is rendered by React, never baked into it.
"""
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from manim import (
    Scene, VGroup, Polygon, Circle, Line, Dot, Ellipse, FadeOut,
    LaggedStart, UP, DOWN,
    config, rate_functions,
)

config.pixel_width = config.pixel_height = 720
config.frame_width = config.frame_height = 7
config.frame_rate = 30
config.background_color = "#000000"


class GachaBoxReveal(Scene):
    accent = "#94c9dd"
    rings = 1

    def construct(self):
        accent = self.accent
        rng = np.random.default_rng(42)

        def face(points, fill, opacity=1, width=1.5):
            return Polygon(*[(x, y, 0) for x, y in points],
                           fill_color=fill, fill_opacity=opacity,
                           stroke_color=accent, stroke_width=width)

        # Soft light is layered low-opacity geometry, with no full-screen flash.
        aura = VGroup(*[
            Circle(radius=0.6 + i * 0.1, stroke_width=0,
                   fill_color=accent, fill_opacity=0.012)
            for i in range(20)
        ]).shift(DOWN * .2)
        floor = VGroup(*[
            Ellipse(width=3.7 + i * .4, height=.8 + i * .14,
                    color=accent, stroke_width=1, stroke_opacity=.15 + i * .04)
            .shift(DOWN * 1.65)
            for i in range(self.rings + 1)
        ])
        dust = VGroup(*[
            Dot((rng.uniform(-2.8, 2.8), rng.uniform(-2.6, 2.6), 0),
                radius=rng.uniform(.008, .023), color=accent, fill_opacity=.35)
            for _ in range(32)
        ])
        body = VGroup(
            face([(-1.65,.2),(0,-.5),(0,-1.65),(-1.65,-.9)], "#142734"),
            face([(0,-.5),(1.65,.2),(1.65,-.9),(0,-1.65)], "#0a141f"),
            face([(-1.65,.2),(0,.91),(1.65,.2),(0,-.5)], "#07141c", .9),
            face([(-1.46,-.02),(-.18,-.57),(-.18,-1.38),(-1.46,-.81)], "#0d1b28", .8, .65),
            face([(.18,-.57),(1.46,-.02),(1.46,-.81),(.18,-1.38)], "#07131b", .8, .65),
        )
        # Corner bindings and small rivets make the silhouette read as a vault.
        for x in [-1.55, 1.55]:
            body.add(Line((x,.13,0),(x,-.89,0),color=accent,stroke_width=3,stroke_opacity=.45))
            for y in [-.12,-.69]:
                body.add(Dot((x,y,0),radius=.026,color=accent))
        for y in [-.72,-.89,-1.06]:
            body.add(Line((.48,y,0),(1.12,y+.27,0),color=accent,stroke_width=1,stroke_opacity=.3))

        lid = VGroup(
            face([(-1.78,.49),(0,1.25),(1.78,.49),(0,-.27)], "#1c3544"),
            face([(-1.78,.49),(0,-.27),(0,-.5),(-1.78,.25)], "#122738"),
            face([(0,-.27),(1.78,.49),(1.78,.25),(0,-.5)], "#0d1e2a"),
            face([(-1.4,.49),(0,1.08),(1.4,.49),(0,-.1)], "#12242f", .5, .8),
            face([(-.46,.48),(0,.7),(.46,.48),(0,.26)], accent, .14),
        )
        seal = VGroup(
            face([(-.26,-.35),(0,-.22),(.26,-.35),(.26,-.83),(0,-.97),(-.26,-.83)], "#08131c", 1, 2),
            face([(0,-.4),(.12,-.6),(0,-.8),(-.12,-.6)], accent, .75, 1),
        )
        chest = VGroup(body, lid, seal)
        self.add(aura, floor, dust, chest)
        self.wait(.2)
        self.play(chest.animate.shift(UP * .12), dust.animate.shift(UP * .12), run_time=.55,
                  rate_func=rate_functions.ease_in_out_sine)
        self.play(seal.animate.scale(1.14).set_color("#e9ffff"),
                  floor.animate.scale(1.06), run_time=.3)
        shards = VGroup(*[
            face([(0,.1),(.045,0),(0,-.1),(-.045,0)], accent, .85, .5)
            .rotate(i*.73).move_to((0,-.48,0)) for i in range(16)
        ])
        self.add(shards)
        self.play(
            FadeOut(seal, scale=1.3),
            lid.animate.shift(UP * 1.12).rotate(-.08),
            body.animate.shift(DOWN * .12),
            aura.animate.scale(1.2),
            LaggedStart(*[
                shard.animate.move_to((math.cos(i*math.tau/16)*(1.65+i%3*.2),
                                       math.sin(i*math.tau/16)*1.7+.25,0))
                .rotate(.5) for i,shard in enumerate(shards)
            ],lag_ratio=.015),
            run_time=.72, rate_func=rate_functions.ease_out_cubic,
        )
        halo = VGroup(*[
            Circle(radius=.4+i*.18,color=accent,stroke_width=2-i*.35,stroke_opacity=.6)
            for i in range(self.rings+1)
        ]).shift(UP*.3)
        core = face([(0,.86),(.25,.4),(0,-.08),(-.25,.4)], accent, .85)
        self.add(halo,core)
        self.play(halo.animate.scale(3).set_opacity(0),
                  core.animate.shift(UP*.32).scale(1.25),
                  shards.animate.shift(UP*.2).set_opacity(0),
                  lid.animate.shift(UP*.25).set_opacity(0),
                  run_time=.55,rate_func=rate_functions.ease_out_cubic)
        self.play(FadeOut(body,shift=DOWN*.15),FadeOut(core,scale=1.7),
                  FadeOut(floor),FadeOut(dust),FadeOut(aura),run_time=.45)
        self.wait(.1)


class CommonBox(GachaBoxReveal):
    accent = "#94c9dd"
    rings = 1


class RareBox(GachaBoxReveal):
    accent = "#38e8da"
    rings = 2


class PremiumBox(GachaBoxReveal):
    accent = "#f5cb7d"
    rings = 3


def render_assets():
    root = Path(__file__).resolve().parents[2]
    output = root / "public/gacha"
    with tempfile.TemporaryDirectory(prefix="animesice-box-") as temp:
        subprocess.run([sys.executable, "-B", "-m", "manim", "--disable_caching", "--media_dir", temp,
                        str(Path(__file__).resolve()), "CommonBox", "RareBox", "PremiumBox"], check=True)
        for tier, scene in [("common","CommonBox"),("rare","RareBox"),("premium","PremiumBox")]:
            rendered = next(Path(temp).rglob(f"{scene}.mp4"))
            movie = output / f"box-{tier}.mp4"
            subprocess.run(["ffmpeg","-y","-loglevel","error","-i",str(rendered),
                            "-an","-c:v","libx264","-crf","22","-pix_fmt","yuv420p",
                            "-movflags","+faststart",str(movie)],check=True)
            subprocess.run(["ffmpeg","-y","-loglevel","error","-ss","0.1","-i",str(movie),
                            "-frames:v","1","-c:v","libwebp","-quality","88",
                            str(output / f"box-{tier}.webp")],check=True)


if __name__ == "__main__":
    render_assets()
