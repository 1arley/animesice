"use client";

import { useEffect, useRef } from "react";
import {
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export interface ParallaxValues {
  mouseX: ReturnType<typeof useSpring>;
  mouseY: ReturnType<typeof useSpring>;
  scrollY: ReturnType<typeof useSpring>;
  envX: ReturnType<typeof useTransform>;
  envY: ReturnType<typeof useTransform>;
  charX: ReturnType<typeof useTransform>;
  charY: ReturnType<typeof useTransform>;
  partX: ReturnType<typeof useTransform>;
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
  const scrollY = useSpring(rawScrollY, { stiffness: 80, damping: 30 });

  const envX = useTransform(mouseX, [-0.5, 0.5], [8, -8]);
  const envY = useTransform(mouseY, [-0.5, 0.5], [4, -4]);
  const charX = useTransform(mouseX, [-0.5, 0.5], [16, -16]);
  const charY = useTransform(mouseY, [-0.5, 0.5], [8, -8]);
  const partX = useTransform(mouseX, [-0.5, 0.5], [4, -4]);

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
