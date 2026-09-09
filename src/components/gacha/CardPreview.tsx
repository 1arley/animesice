"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { SpotlightCard } from "@/components/core/SpotlightCard";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { safeImageSrc } from "@/lib/url";
import type { GachaPull } from "@/types";

export function CardPreview({
  pull,
  onClose,
}: {
  pull: GachaPull;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function share() {
    const url = `${window.location.origin}/gacha?card=${pull.id}`;
    try {
      if (navigator.share) await navigator.share({ title: pull.card.name, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  }

  const content = (
    <div className="relative mx-auto w-full max-w-md border border-ice/40 bg-panel p-5 shadow-2xl shadow-ink">
      <button
        type="button"
        aria-label="Fechar preview"
        onClick={onClose}
        className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center bg-ink/80 text-xl text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
      >
        ×
      </button>
      <h2
        id="card-preview-title"
        className="font-display text-display-md text-snow"
      >
        {pull.card.name}
      </h2>
      <p
        id="card-preview-description"
        className="mb-4 font-mono text-caption text-mist"
      >
        {pull.card.rarity} · {pull.foil} · #{pull.edition} · {pull.value} pts
      </p>
      <div className="relative aspect-[2/3] overflow-hidden bg-slate">
        {pull.card.image ? (
          <Image
            src={safeImageSrc(pull.card.image) ?? ""}
            alt={pull.card.name}
            fill
            sizes="(max-width: 640px) calc(100vw - 3rem), 448px"
            className="object-cover"
            priority
            quality={90}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-mist">
            Sem imagem
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => void share()}
        className="btn-ice mt-4 w-full px-4 py-3"
      >
        Compartilhar carta
      </button>
    </div>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="card-preview-title"
      aria-describedby="card-preview-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-full max-w-none bg-transparent p-4 backdrop:bg-ink/90"
    >
      {fine && !reduced ? (
        <SpotlightCard className="mx-auto max-w-md">{content}</SpotlightCard>
      ) : (
        content
      )}
    </dialog>
  );
}
