"use client";

import { LazyMotion, domAnimation, useMotionValue, useSpring } from "motion/react";
import * as m from "motion/react-m";
import { useRef, type MouseEvent, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export function HoloTilt({ children, amplitude = 10 }: { children: ReactNode; amplitude?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  const rotateX = useSpring(useMotionValue(0), { damping: 30, stiffness: 100, mass: 2 });
  const rotateY = useSpring(useMotionValue(0), { damping: 30, stiffness: 100, mass: 2 });

  function handleMouse(e: MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node || reduceMotion) return;
    const rect = node.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    rotateX.set((offsetY / (rect.height / 2)) * -amplitude);
    rotateY.set((offsetX / (rect.width / 2)) * amplitude);
  }

  if (reduceMotion) return <>{children}</>;

  return (
    <LazyMotion features={domAnimation}>
      <div
        ref={ref}
        className="group [perspective:1000px]"
        onMouseMove={handleMouse}
        onMouseLeave={() => {
          rotateX.set(0);
          rotateY.set(0);
        }}
      >
        <m.div
          className="relative h-full [transform-style:preserve-3d]"
          style={{ rotateX, rotateY }}
        >
          {children}
          <div className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-300 group-hover:opacity-100 bg-[linear-gradient(115deg,transparent_25%,rgba(255,120,200,0.3)_40%,rgba(120,200,255,0.38)_50%,rgba(160,255,170,0.3)_60%,transparent_75%)] bg-[length:250%_250%] motion-safe:animate-[gradient-sweep_4s_ease-in-out_infinite]" />
        </m.div>
      </div>
    </LazyMotion>
  );
}
