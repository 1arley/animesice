# Render: manim -qh --fps 30 -r 720,720 --format mp4 scripts/manim/card_invocation.py CardInvocation -o public/gacha/card-invocation
# Poster: ffmpeg -y -ss 0.75 -i public/gacha/card-invocation.mp4 -frames:v 1 -c:v libwebp -quality 82 public/gacha/card-invocation.webp
import random

from manim import *


class CardInvocation(Scene):
    def construct(self):
        random.seed(17)
        self.camera.background_color = "#05070B"

        crystal = VGroup(
            Polygon(
                UP * 0.74,
                RIGHT * 0.42 + UP * 0.28,
                RIGHT * 0.56,
                RIGHT * 0.40 + DOWN * 0.28,
                DOWN * 0.74,
                LEFT * 0.40 + DOWN * 0.28,
                LEFT * 0.56,
                LEFT * 0.42 + UP * 0.28,
                color="#60F6E9",
                stroke_width=1.7,
                fill_color="#0E141D",
                fill_opacity=0.96,
            ),
            Polygon(
                UP * 0.74,
                RIGHT * 0.42 + UP * 0.28,
                ORIGIN,
                color="#60F6E9",
                stroke_width=0.7,
                fill_color="#38E8DA",
                fill_opacity=0.72,
            ),
            Polygon(
                UP * 0.74,
                ORIGIN,
                LEFT * 0.42 + UP * 0.28,
                color="#E2F7F9",
                stroke_width=0.7,
                fill_color="#E2F7F9",
                fill_opacity=0.34,
            ),
            Polygon(
                RIGHT * 0.42 + UP * 0.28,
                RIGHT * 0.56,
                ORIGIN,
                color="#008CDA",
                stroke_width=0.65,
                fill_color="#008CDA",
                fill_opacity=0.56,
            ),
            Polygon(
                RIGHT * 0.56,
                RIGHT * 0.40 + DOWN * 0.28,
                ORIGIN,
                color="#38E8DA",
                stroke_width=0.65,
                fill_color="#38E8DA",
                fill_opacity=0.50,
            ),
            Polygon(
                RIGHT * 0.40 + DOWN * 0.28,
                DOWN * 0.74,
                ORIGIN,
                color="#7CF5EB",
                stroke_width=0.65,
                fill_color="#7CF5EB",
                fill_opacity=0.30,
            ),
            Polygon(
                DOWN * 0.74,
                LEFT * 0.40 + DOWN * 0.28,
                ORIGIN,
                color="#60F6E9",
                stroke_width=0.65,
                fill_color="#38E8DA",
                fill_opacity=0.46,
            ),
            Polygon(
                LEFT * 0.40 + DOWN * 0.28,
                LEFT * 0.56,
                ORIGIN,
                color="#94A3B8",
                stroke_width=0.65,
                fill_color="#94A3B8",
                fill_opacity=0.38,
            ),
            Polygon(
                LEFT * 0.56,
                LEFT * 0.42 + UP * 0.28,
                ORIGIN,
                color="#60F6E9",
                stroke_width=0.65,
                fill_color="#38E8DA",
                fill_opacity=0.40,
            ),
            Line(UP * 0.74, DOWN * 0.74, color="#E2F7F9", stroke_width=0.65).set_opacity(0.72),
            Polygon(
                UP * 0.18,
                RIGHT * 0.10,
                DOWN * 0.18,
                LEFT * 0.10,
                color="#E2F7F9",
                stroke_width=0.5,
                fill_color="#E2F7F9",
                fill_opacity=0.62,
            ),
        )
        crystal.move_to(ORIGIN)
        crystal.scale(0.35 * 1.18)
        self.play(FadeIn(crystal), run_time=0.30, rate_func=smooth)

        glow = VGroup(
            Circle(radius=0.42, color="#38E8DA", stroke_width=1.2),
            Circle(radius=0.27, color="#60F6E9", stroke_width=0.8),
        ).set_opacity(0.18)
        glow.move_to(ORIGIN).scale(0.2)
        self.add(glow)
        self.play(
            crystal.animate.scale(1 / 0.35).rotate(TAU, axis=UP),
            glow.animate.scale(8).set_opacity(0.10),
            run_time=14 / 30,
            rate_func=smooth,
        )

        rings = VGroup(
            RegularPolygon(n=6, radius=1.0, color="#38E8DA", stroke_width=1.0),
            RegularPolygon(n=4, radius=0.82, color="#94A3B8", stroke_width=1.0).rotate(PI / 4),
            RegularPolygon(n=3, radius=0.68, color="#60F6E9", stroke_width=0.9).rotate(PI / 6),
        )
        rings.set_opacity(0.88).set_fill(opacity=0).scale(2.4)
        self.add(rings)
        self.play(
            rings.animate.scale(1 / 2.4).set_opacity(0),
            glow.animate.set_opacity(0),
            run_time=0.30,
            rate_func=smooth,
        )

        flash = Polygon(
            UP * 0.48,
            RIGHT * 0.35,
            DOWN * 0.46,
            LEFT * 0.35,
            color="#E2F7F9",
            stroke_width=0,
            fill_color="#E2F7F9",
            fill_opacity=0.96,
        )
        self.add(flash)
        self.play(FadeOut(flash), run_time=0.10, rate_func=smooth)

        shards = VGroup()
        shard_shifts = []
        for index in range(18):
            angle = TAU * index / 18 + random.uniform(-0.08, 0.08)
            direction = np.array([np.cos(angle), np.sin(angle), 0])
            tangent = np.array([-direction[1], direction[0], 0])
            size = random.uniform(0.18, 0.30)
            shard = Polygon(
                direction * size,
                -direction * size * 0.55 + tangent * size * 0.78,
                -direction * size * 0.55 - tangent * size * 0.34,
                color="#60F6E9",
                stroke_width=0.8,
                fill_color="#38E8DA",
                fill_opacity=0.76,
            )
            shard.move_to(ORIGIN)
            shards.add(shard)
            shard_shifts.append(direction * random.uniform(2.0, 2.8))
        self.play(
            LaggedStart(
                *[
                    shard.animate.shift(shift).set_opacity(0)
                    for shard, shift in zip(shards, shard_shifts)
                ],
                lag_ratio=0.03,
            ),
            FadeOut(crystal),
            run_time=0.40,
            rate_func=smooth,
        )

        halo = Circle(radius=0.48, color="#38E8DA", stroke_width=1.0)
        halo.set_opacity(0.12).move_to(ORIGIN)
        self.add(halo)
        self.play(halo.animate.set_opacity(0), run_time=7 / 30, rate_func=smooth)
