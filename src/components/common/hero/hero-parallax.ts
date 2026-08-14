"use client";

import { useEffect, useRef } from "react";
import {
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

import type { MotionValue } from "motion/react";

export interface ParallaxValues {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  scrollY: MotionValue<number>;
  envX: MotionValue<number>;
  envY: MotionValue<number>;
  charX: MotionValue<number>;
  charY: MotionValue<number>;
  partX: MotionValue<number>;
}

export function useHeroParallax(
  containerRef: React.RefObject<HTMLElement | null>,
): ParallaxValues {
  const reduceMotion = usePrefersReducedMotion();
  const isTouch = useRef(false);

  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);

  const mouseX = useSpring(rawMouseX, { stiffness: 50, damping: 20 });
  const mouseY = useSpring(rawMouseY, { stiffness: 50, damping: 20 });

  const { scrollY: rawScrollY } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  // Limita a puxada do parallax: scrollY fica em 0..300px, então a imagem
  // nunca desliza além do over-scan das camadas (sem espaço vazio na borda).
  const scrollY = useSpring(
    useTransform(rawScrollY, [0, 300], [0, 300]),
    { stiffness: 80, damping: 30 },
  );

  const envX = useTransform(mouseX, [-0.5, 0.5], [6, -6]);
  const envY = useTransform(mouseY, [-0.5, 0.5], [3, -3]);
  const charX = useTransform(mouseX, [-0.5, 0.5], [10, -10]);
  const charY = useTransform(mouseY, [-0.5, 0.5], [5, -5]);
  const partX = useTransform(mouseX, [-0.5, 0.5], [2, -2]);

  useEffect(() => {
    if (reduceMotion) return;

    isTouch.current = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch.current) return;

    const handle = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      rawMouseX.set(x);
      rawMouseY.set(y);
    };

    window.addEventListener("mousemove", handle, { passive: true });
    return () => window.removeEventListener("mousemove", handle);
  }, [reduceMotion, containerRef, rawMouseX, rawMouseY]);

  return { mouseX, mouseY, scrollY, envX, envY, charX, charY, partX };
}
