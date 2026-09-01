"use client";

import { LazyMotion, domAnimation, useMotionValue, useSpring } from "motion/react";
import * as m from "motion/react-m";
import { useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * TiltedCard — card com inclinação 3D que segue o cursor, adaptado de
 * React Bits (github.com/DavidHDev/react-bits, MIT + Commons Clause).
 *
 * Re-tematizado para o AnimesIce:
 *  - sem o aviso mobile do original (efeito desabilitado no toque);
 *  - tooltip do título no tema do site (panel + hairline + mono ice);
 *  - inclinação mais contida (rotateAmplitude menor que o padrão);
 *  - prefers-reduced-motion: figura estática, sem tilt nem tooltip.
 */

interface TiltedCardProps {
  imageSrc?: string | null;
  altText?: string;
  captionText?: string;
  containerClassName?: string;
  imageClassName?: string;
  /** Inclinação máxima em graus. */
  rotateAmplitude?: number;
  scaleOnHover?: number;
  overlayContent?: ReactNode;
  displayOverlayContent?: boolean;
}

export function TiltedCard({
  imageSrc,
  altText = "",
  captionText = "",
  containerClassName = "",
  imageClassName = "",
  rotateAmplitude = 9,
  scaleOnHover = 1.04,
  overlayContent = null,
  displayOverlayContent = false,
}: TiltedCardProps) {
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  const rotateX = useSpring(useMotionValue(0), { damping: 30, stiffness: 100, mass: 2 });
  const rotateY = useSpring(useMotionValue(0), { damping: 30, stiffness: 100, mass: 2 });
  const scale = useSpring(1, { damping: 30, stiffness: 100, mass: 2 });
  const opacity = useSpring(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  function handleMouse(e: MouseEvent<HTMLElement>) {
    const node = ref.current;
    if (!node || reduceMotion) return;
    const rect = node.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude);
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude);
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  }

  // Reduced motion: sem tilt — figura estática com o conteúdo.
  if (reduceMotion || !imageSrc) {
    return (
      <figure className={containerClassName} aria-label={captionText || altText || undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc ?? undefined}
          alt={altText}
          loading="lazy"
          decoding="async"
          className={`h-auto w-full object-cover ${imageClassName}`}
        />
        {captionText && (
          <figcaption className="sr-only">{captionText}</figcaption>
        )}
        {displayOverlayContent && overlayContent}
      </figure>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <figure
        ref={ref}
        className={`relative flex w-full items-center justify-center [perspective:800px] ${containerClassName}`}
        onMouseMove={handleMouse}
        onMouseEnter={() => {
          scale.set(scaleOnHover);
          opacity.set(1);
        }}
        onMouseLeave={() => {
          scale.set(1);
          opacity.set(0);
          rotateX.set(0);
          rotateY.set(0);
        }}
      >
        <m.div
          className="relative [transform-style:preserve-3d]"
          style={{ rotateX, rotateY, scale, width: "100%" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <m.img
            src={imageSrc}
            alt={altText}
            loading="lazy"
            decoding="async"
            className={`h-auto w-full object-cover ${imageClassName}`}
          />
          {displayOverlayContent && overlayContent && (
            <m.div className="absolute left-0 top-0 z-[2] [transform:translateZ(30px)]">
              {overlayContent}
            </m.div>
          )}
        </m.div>

        {captionText && (
          <m.figcaption
            role="tooltip"
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-[3] hidden border border-hairline bg-panel/95 px-2.5 py-1 font-mono text-caption text-ice opacity-0 shadow-lg shadow-ink/60 backdrop-blur-sm sm:block"
            style={{ x, y, opacity, translateX: "-50%", translateY: "-50%" }}
          >
            {captionText}
          </m.figcaption>
        )}
      </figure>
    </LazyMotion>
  );
}
