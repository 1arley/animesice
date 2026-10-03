"""Render the decorative Mercado Noturno card-reveal burst as a web MP4.

    python -m pip install manim==0.20.1
    python scripts/animations/night_market_card_reveal.py

The black background is screen-blended over the live card in the browser. The
offer and its art remain React content; the clip only adds the reveal flourish.
"""
import math
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from manim import (
    Circle,
    Dot,
    FadeIn,
    FadeOut,
    LaggedStart,
    Line,
    Polygon,
    Scene,
    VGroup,
    rate_functions,
    tempconfig,
)


ICE = "#38E8DA"
FROST = "#E9FFFF"


def diamond(radius: float, opacity: float = 0.08) -> Polygon:
    return Polygon(
        (0, radius, 0),
        (radius * 0.72, 0, 0),
        (0, -radius, 0),
        (-radius * 0.72, 0, 0),
        stroke_color=FROST,
        stroke_width=1.6,
        fill_color=ICE,
        fill_opacity=opacity,
    )


class NightMarketCardReveal(Scene):
    def construct(self):
        aura = VGroup(
            *[
                Circle(radius=1.15 + index * 0.075, stroke_width=0)
                .set_fill(ICE, opacity=0.011)
                for index in range(15)
            ]
        )
        sigil = VGroup(
            diamond(1.6, 0.035),
            diamond(1.12, 0),
            diamond(0.46, 0.13),
            Dot(radius=0.085, color=FROST),
        )
        ring = Circle(radius=0.51, color=FROST, stroke_width=1.4)
        charge_lines = VGroup(
            *[
                Line(
                    (math.cos(angle) * 1.86, math.sin(angle) * 1.86, 0),
                    (math.cos(angle) * 2.16, math.sin(angle) * 2.16, 0),
                    color=ICE if index % 2 else FROST,
                    stroke_width=1.7,
                ).set_opacity(0.72)
                for index, angle in enumerate(
                    [index * math.tau / 12 for index in range(12)]
                )
            ]
        )

        shards = VGroup()
        shard_moves = []
        for index in range(18):
            angle = index * math.tau / 18 + 0.07
            length = 0.18 + (index % 4) * 0.045
            shard = Polygon(
                (-length * 0.18, -0.045, 0),
                (length, 0, 0),
                (-length * 0.18, 0.045, 0),
                stroke_color=FROST,
                stroke_width=0.55,
                fill_color=ICE if index % 3 else FROST,
                fill_opacity=0.9,
            ).rotate(angle)
            shard.move_to((0, 0, 0)).set_opacity(0)
            distance = 1.45 + (index % 5) * 0.15
            shards.add(shard)
            shard_moves.append(
                shard.animate
                .shift(
                    np.array(
                        [math.cos(angle) * distance, math.sin(angle) * distance, 0]
                    )
                )
                .rotate(0.3 if index % 2 else -0.3)
                .set_opacity(0.82)
            )

        motes = VGroup()
        mote_moves = []
        for index in range(24):
            angle = index * math.tau / 24 + 0.11
            mote = Dot(
                radius=0.018 + (index % 3) * 0.008,
                color=FROST if index % 4 else ICE,
            ).move_to((0, 0, 0))
            mote.set_opacity(0)
            motes.add(mote)
            distance = 1.0 + (index % 7) * 0.26
            mote_moves.append(
                mote.animate
                .shift(
                    np.array(
                        [math.cos(angle) * distance, math.sin(angle) * distance, 0]
                    )
                )
                .set_opacity(0.78)
            )

        self.play(
            FadeIn(aura, scale=0.72),
            FadeIn(sigil, scale=0.74),
            FadeIn(ring, scale=0.7),
            FadeIn(charge_lines, scale=0.88),
            run_time=0.15,
            rate_func=rate_functions.ease_out_cubic,
        )

        self.add(shards, motes)
        self.play(
            aura.animate.scale(3.1).set_opacity(0),
            ring.animate.scale(4.4).set_opacity(0).set_rate_func(rate_functions.linear),
            sigil.animate.scale(0.22).rotate(0.2).set_opacity(0),
            charge_lines.animate.scale(1.7).set_opacity(0),
            LaggedStart(*shard_moves, lag_ratio=0.012),
            LaggedStart(*mote_moves, lag_ratio=0.006),
            run_time=0.62,
            rate_func=rate_functions.ease_out_cubic,
        )

        self.play(
            FadeOut(shards, shift=np.array([0, 0.12, 0])),
            FadeOut(motes, shift=np.array([0, 0.16, 0])),
            run_time=0.24,
            rate_func=rate_functions.ease_out_cubic,
        )
        self.wait(0.14)


def render_asset():
    root = Path(__file__).resolve().parents[2]
    output = root / "public" / "gacha" / "night-market-card-reveal.mp4"
    output.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="animesice-card-reveal-") as media:
        with tempconfig(
            {
                "media_dir": media,
                "output_file": "night-market-card-reveal",
                "disable_caching": True,
                "pixel_width": 720,
                "pixel_height": 960,
                "frame_rate": 30,
                "frame_width": 5.4,
                "frame_height": 7.2,
                "background_color": "#000000",
            }
        ):
            scene = NightMarketCardReveal()
            scene.render()

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                "-i",
                str(scene.renderer.file_writer.movie_file_path),
                "-an",
                "-c:v",
                "libx264",
                "-crf",
                "23",
                "-preset",
                "slow",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                str(output),
            ],
            check=True,
        )


if __name__ == "__main__":
    render_asset()
