"use client";

import { useInView, useMotionValue, useSpring } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * CountUp — contagem animada quando entra na viewport, adaptado de
 * React Bits (github.com/DavidHDev/react-bits, MIT + Commons Clause).
 *
 * Re-tematizado para o AnimesIce:
 *  - prefers-reduced-motion: valor final imediato (spring quase instantâneo);
 *  - tipagem estrita (noUncheckedIndexedAccess) no parse de decimais.
 */

export function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 1.6,
  className = "",
  startWhen = true,
  separator = "",
  onStart,
  onEnd,
}: {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  // Reduced motion → spring praticamente instantâneo (valor final).
  const effectiveDuration = reduceMotion ? 0.01 : duration;

  const motionValue = useMotionValue(direction === "down" ? to : from);
  const damping = 20 + 40 * (1 / effectiveDuration);
  const stiffness = 100 * (1 / effectiveDuration);
  const springValue = useSpring(motionValue, { damping, stiffness });

  const isInView = useInView(ref, { once: true, margin: "0px" });

  const maxDecimals = Math.max(
    (() => {
      const str = from.toString();
      const decimals = str.split(".")[1];
      return decimals && parseInt(decimals, 10) !== 0 ? decimals.length : 0;
    })(),
    (() => {
      const str = to.toString();
      const decimals = str.split(".")[1];
      return decimals && parseInt(decimals, 10) !== 0 ? decimals.length : 0;
    })(),
  );

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;
      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      };
      const formatted = new Intl.NumberFormat("pt-BR", options).format(latest);
      return separator ? formatted.replace(/\./g, separator) : formatted;
    },
    [maxDecimals, separator],
  );

  // O valor inicial já sai no render (SSR/primeira pintura) — o span nunca
  // fica vazio, o que preserva o accessible name do botão pai. Congelado em
  // useState para re-renders do pai não resetarem o número animado.
  const [initialText] = useState(() =>
    formatValue(direction === "down" ? to : from),
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = initialText;
    }
  }, [initialText]);

  useEffect(() => {
    if (isInView && startWhen) {
      onStart?.();
      const timeoutId = setTimeout(() => {
        motionValue.set(direction === "down" ? from : to);
      }, delay * 1000);
      const durationTimeoutId = setTimeout(() => {
        onEnd?.();
      }, delay * 1000 + effectiveDuration * 1000);
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [
    isInView,
    startWhen,
    motionValue,
    direction,
    from,
    to,
    delay,
    effectiveDuration,
    onStart,
    onEnd,
  ]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest: number) => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest);
      }
    });
    return () => unsubscribe();
  }, [springValue, formatValue]);

  return (
    <span ref={ref} className={className}>
      {initialText}
    </span>
  );
}
