import random

from manim import *


class NightMarketIntro(Scene):
    def construct(self):
        self.camera.background_color = "#05070B"
        random.seed(17)
        stars = VGroup(
            *[
                Dot(
                    point=[random.uniform(-7, 7), random.uniform(-3.8, 3.8), 0],
                    radius=random.uniform(0.008, 0.022),
                    color="#94A3B8",
                ).set_opacity(random.uniform(0.2, 0.65))
                for _ in range(68)
            ]
        )
        self.add(stars)
        colors = ["#38E8DA", "#38BDF8", "#A78BFA", "#FCD34D", "#FB7185", "#8B5CF6"]
        cards = VGroup()
        for index, color in enumerate(colors):
            frame = RoundedRectangle(
                width=1.42,
                height=2.08,
                corner_radius=0.08,
                stroke_color=color,
                stroke_width=1.5,
                fill_color="#0E141D",
                fill_opacity=0.96,
            )
            inset = RoundedRectangle(
                width=1.2,
                height=1.86,
                corner_radius=0.055,
                stroke_color=color,
                stroke_width=0.65,
            ).set_opacity(0.62)
            crest = RegularPolygon(
                n=6,
                radius=0.31,
                color=color,
                stroke_width=1.15,
            ).set_fill(color, opacity=0.08)
            crest_inner = RegularPolygon(
                n=4,
                radius=0.15,
                color=color,
                stroke_width=0.8,
            ).rotate(PI / 4)
            rays = VGroup(
                Line(UP * 0.56, DOWN * 0.56, color=color, stroke_width=0.65),
                Line(LEFT * 0.44, RIGHT * 0.44, color=color, stroke_width=0.65),
            ).set_opacity(0.46)
            card = VGroup(frame, inset, crest, crest_inner, rays)
            card.move_to([(-2.65 + index * 1.06), 0, 0])
            card.rotate((index - 2.5) * 0.035)
            cards.add(card)
        cards.scale(0.86)
        cards.move_to(ORIGIN)
        cards.shift(DOWN * 0.15)
        self.play(
            LaggedStart(
                *[
                    FadeIn(card, shift=DOWN * 0.26, scale=0.92)
                    for card in cards
                ],
                lag_ratio=0.12,
            ),
            run_time=2.05,
        )
        pulse = Circle(radius=0.34, color="#38E8DA", stroke_width=1.35)
        pulse.move_to(ORIGIN)
        self.play(
            pulse.animate.scale(3.6).set_opacity(0),
            cards.animate.shift(UP * 0.03),
            run_time=1.05,
            rate_func=smooth,
        )
        self.play(
            LaggedStart(
                *[card.animate.shift(UP * 0.035) for card in cards],
                lag_ratio=0.06,
            ),
            run_time=0.55,
        )
        self.wait(0.35)
