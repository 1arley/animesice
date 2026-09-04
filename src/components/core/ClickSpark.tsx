"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * ClickSpark — estilhas de luz no ponto do clique, adaptado de
 * React Bits (github.com/DavidHDev/react-bits, MIT + Commons Clause).
 *
 * Re-tematizado: a faísca padrão é o gelo da marca (#38E8DA), não branco.
 * Otimizações sobre o original:
 *  - o loop de rAF só roda enquanto há faíscas (e desliga sozinho);
 *  - prefers-reduced-motion vira pass-through puro (sem canvas);
 *  - wrapper inline-block — não estica o conteúdo que envolve.
 */

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

export function ClickSpark({
  sparkColor = "#38E8DA",
  sparkSize = 9,
  sparkRadius = 18,
  sparkCount = 8,
  duration = 350,
  easing = "ease-out",
  className = "",
  children,
}: {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  className?: string;
  children?: ReactNode;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const startLoopRef = useRef<(() => void) | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Redimensiona o canvas quando o wrapper muda de tamanho.
  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const resizeCanvas = () => {
      const { width, height } = canvas.parentElement!.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 100);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(canvas.parentElement);
    resizeCanvas();
    return () => {
      ro.disconnect();
      clearTimeout(resizeTimeout);
    };
  }, [reduceMotion]);

  const easeFunc = useCallback(
    (t: number) => {
      switch (easing) {
        case "linear":
          return t;
        case "ease-in":
          return t * t;
        case "ease-in-out":
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        default:
          return t * (2 - t);
      }
    },
    [easing],
  );

  // Loop rAF lazy: liga quando há faíscas, desliga sozinho ao esvaziar.
  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let rafId = 0;
    const start = () => {
      if (rafId !== 0) return;
      const draw = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        sparksRef.current = sparksRef.current.filter((spark) => {
          const elapsed = timestamp - spark.startTime;
          if (elapsed >= duration) return false;

          const progress = elapsed / duration;
          const eased = easeFunc(progress);
          const distance = eased * sparkRadius;
          const lineLength = sparkSize * (1 - eased);

          ctx.strokeStyle = sparkColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(
            spark.x + distance * Math.cos(spark.angle),
            spark.y + distance * Math.sin(spark.angle),
          );
          ctx.lineTo(
            spark.x + (distance + lineLength) * Math.cos(spark.angle),
            spark.y + (distance + lineLength) * Math.sin(spark.angle),
          );
          ctx.stroke();
          return true;
        });

        if (sparksRef.current.length === 0) {
          rafId = 0;
          return;
        }
        rafId = requestAnimationFrame(draw);
      };
      rafId = requestAnimationFrame(draw);
    };

    startLoopRef.current = start;
    return () => {
      cancelAnimationFrame(rafId);
      startLoopRef.current = null;
    };
  }, [duration, easeFunc, reduceMotion, sparkColor, sparkRadius, sparkSize]);

  // Reduced motion: sem canvas, só o conteúdo.
  if (reduceMotion) return <>{children}</>;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();
    sparksRef.current.push(
      ...Array.from({ length: sparkCount }, (_, i) => ({
        x,
        y,
        angle: (2 * Math.PI * i) / sparkCount,
        startTime: now,
      })),
    );
    startLoopRef.current?.();
  };

  return (
    <div onClick={handleClick} className={`relative inline-block ${className}`}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
