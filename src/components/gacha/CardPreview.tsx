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
  canReroll = false,
  rerolling = false,
  onReroll,
  onList,
  listing = false,
}: {
  pull: GachaPull;
  onClose: () => void;
  canReroll?: boolean;
  rerolling?: boolean;
  onReroll?: () => void;
  onList?: (price: number) => void;
  listing?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const priceRef = useRef<HTMLInputElement>(null);
  const cosmetics = pull.user?.gachaCosmetics ?? [];
  const aurora = cosmetics.includes("FRAME_AURORA");
  const destaque = cosmetics.includes("DESTAQUE_CARTA");
  const rerollCost = Math.max(1, Math.round(pull.value * 1.1));

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
    <div
      className={`relative mx-auto w-full max-w-md border bg-panel p-5 shadow-2xl shadow-ink ${
        aurora
          ? "border-fuchsia-400/70 shadow-[0_0_20px_rgba(232,121,249,0.3)]"
          : "border-ice/40"
      } ${destaque ? " ring-1 ring-amber-300/60" : ""}`}
    >
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
      {canReroll && onReroll && (
        <button
          type="button"
          onClick={onReroll}
          disabled={rerolling}
          title="Sorteia nova condition e foil para esta carta — pode piorar."
          className="btn-ghost mt-3 w-full px-4 py-3 disabled:opacity-50"
        >
          {rerolling
            ? "Rerrollando…"
            : `Rerrollar condition/foil · ${rerollCost} pts`}
        </button>
      )}
      {onList && (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const raw = Number(priceRef.current?.value);
            if (!Number.isInteger(raw) || raw < 1) return;
            onList(raw);
          }}
        >
          <label className="sr-only" htmlFor="listing-price">
            Preço em pontos
          </label>
          <input
            id="listing-price"
            ref={priceRef}
            type="number"
            min={1}
            step={1}
            placeholder="Preço em pts"
            defaultValue={pull.value}
            className="h-11 w-full border border-hairline bg-ink px-3 font-mono text-caption text-snow placeholder:text-mist focus:border-ice focus:outline-none"
          />
          <button
            type="submit"
            disabled={listing}
            className="btn-ghost shrink-0 px-4 py-3 disabled:opacity-50"
          >
            {listing ? "Anunciando…" : "Anunciar no mercado"}
          </button>
        </form>
      )}
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
