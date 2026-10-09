"use client";

import Image from "next/image";
import { useRef, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export type CrystalMotionMode = "reveal" | "loop" | "transition" | "micro";

export interface CrystalMotionProps {
  mode: CrystalMotionMode;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}

const LOGO_URL = "/images/logo.webp";

export function CrystalMotion({
  mode,
  size = 220,
  className = "",
  style,
}: CrystalMotionProps) {
  const reduzir = usePrefersReducedMotion();
  const raiz = useRef<HTMLDivElement>(null);
  const costura = useRef<HTMLSpanElement>(null);
  const microTimeline = useRef<gsap.core.Timeline | null>(null);
  const medida = typeof size === "number" ? `${size}px` : size;

  useGSAP(() => {
    const elemento = raiz.current;
    if (!elemento) return;

    if (reduzir && mode !== "reveal") {
      // Único recurso e único gesto permitido: fade de opacidade inferior a 400ms.
      gsap.fromTo(elemento, { opacity: 0 }, {
        opacity: 1,
        duration: 0.18,
        ease: "power1.out",
      });
      return;
    }

    const largura = elemento.getBoundingClientRect().width;
    const tl = gsap.timeline({ paused: true, repeat: mode === "loop" ? -1 : 0 });

    if (mode === "reveal") {
      tl.set(elemento, { willChange: "transform, opacity" }, 0)
        .fromTo(elemento, { opacity: 0, y: 8 }, {
          opacity: 1, y: 0, duration: 0.25, ease: "expo.out",
          immediateRender: false,
        }, 0)
        .set(elemento, { clearProps: "willChange" }, 0.25);
    } else if (mode === "loop") {
      tl.set(elemento, { willChange: "opacity" }, 0)
        .to(elemento, { opacity: 0.74, duration: 0.75, ease: "sine.inOut" }, 0)
        .to(elemento, { opacity: 1, duration: 0.75, ease: "sine.inOut" }, 0.75);
    } else if (mode === "transition" && costura.current) {
      const distancia = Math.max(1, largura);
      const duracao = distancia / 650; // px / px por segundo.
      tl.set(costura.current, { willChange: "transform, opacity" }, 0)
        .fromTo(costura.current, { x: -distancia / 2, opacity: 1 }, {
          x: distancia / 2,
          opacity: 0,
          duration: duracao,
          ease: "power1.inOut",
          immediateRender: false,
        }, 0)
        .set(costura.current, { clearProps: "willChange" }, duracao);
    } else if (mode === "micro") {
      tl.set(elemento, { willChange: "transform" }, 0)
        .to(elemento, { scale: 0.97, duration: 0.09, ease: "power2.out" }, 0)
        .to(elemento, { scale: 1, duration: 0.16, ease: "power2.out" }, 0.09)
        .set(elemento, { clearProps: "willChange" }, 0.25);
      microTimeline.current = tl;
    }

    if (mode !== "micro") tl.play();
    return () => {
      tl.kill();
      microTimeline.current = null;
      gsap.set(elemento, { clearProps: "willChange" });
      if (costura.current) gsap.set(costura.current, { clearProps: "willChange" });
    };
  }, { scope: raiz, dependencies: [mode, reduzir], revertOnUpdate: true });

  const tamanho = { width: medida, height: medida, ...style } as CSSProperties;

  return (
    <div
      ref={raiz}
      data-mode={mode}
      aria-hidden="true"
      className={`crystal-motion relative inline-grid shrink-0 place-items-center overflow-hidden ${className}`}
      style={tamanho}
      onPointerDown={() => {
        if (mode === "micro" && !reduzir) microTimeline.current?.restart();
      }}
    >
      <Image
        className="crystal-logo block h-full w-full select-none object-contain"
        src={LOGO_URL}
        alt=""
        width={220}
        height={220}
        draggable={false}
        priority={mode === "reveal"}
      />
      {mode === "transition" && !reduzir && (
        <span
          ref={costura}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-ice"
        />
      )}
    </div>
  );
}

export default CrystalMotion;

// ponytail: teto visual = WebP + uma costura simples. Upgrade:
// adicionar iluminação real apenas se o teste em dispositivo justificar custo.
