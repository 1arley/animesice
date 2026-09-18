"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import type { GachaSkin } from "@/types";

export function SkinReveal({
  skin,
  reduceMotion,
  onClose,
}: {
  skin: GachaSkin;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useGSAP(
    () => {
      const timeline = gsap.timeline();
      timeline.from("[data-skin-stage]", {
        opacity: 0,
        scale: reduceMotion ? 1 : 0.72,
        duration: reduceMotion ? 0.15 : 0.45,
        ease: "back.out(1.8)",
      });
      if (!reduceMotion) {
        timeline
          .from(
            "[data-skin-ring]",
            { scale: 0.2, opacity: 0.8, duration: 0.55, stagger: 0.1 },
            0,
          )
          .to(
            "[data-skin-ring]",
            { scale: 1.8, opacity: 0, duration: 0.65, stagger: 0.1 },
            0.15,
          )
          .from("[data-skin-name]", { y: 16, opacity: 0, duration: 0.3 }, 0.35);
      }
    },
    { scope: dialog, dependencies: [reduceMotion] },
  );

  return (
    <dialog
      ref={dialog}
      aria-labelledby="skin-reveal-title"
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto border-0 bg-ink-deep/95 p-4 text-snow backdrop:bg-ink-deep/95"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full flex-col items-center justify-center gap-6">
        <p className="font-mono text-caption uppercase tracking-[0.25em] text-ice">
          Nova skin desbloqueada
        </p>
        <div data-skin-stage className="relative w-64 max-w-[75vw]">
          <div
            data-skin-ring
            aria-hidden="true"
            className="absolute -inset-5 rounded-full border border-ice/60"
          />
          <div
            data-skin-ring
            aria-hidden="true"
            className="absolute -inset-10 rounded-full border border-ice/30"
          />
          <div className="relative aspect-square overflow-hidden border border-ice bg-panel shadow-glow-ice">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={skin.imageUrl}
              alt={skin.name}
              width={512}
              height={512}
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-ink-deep/80 via-transparent to-ice/10"
            />
          </div>
        </div>
        <div data-skin-name className="text-center" aria-live="polite">
          <h2
            id="skin-reveal-title"
            className="font-display text-2xl text-snow"
          >
            {skin.name}
          </h2>
          <p className="mt-1 text-body-sm text-mist">
            Skin adicionada à sua coleção.
          </p>
        </div>
        <button
          autoFocus
          type="button"
          onClick={onClose}
          className="btn-ice min-h-11 px-8 py-3 focus-visible:outline focus-visible:outline-ice"
        >
          Continuar
        </button>
      </div>
    </dialog>
  );
}
