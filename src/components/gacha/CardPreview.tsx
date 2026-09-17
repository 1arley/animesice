"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SpotlightCard } from "@/components/core/SpotlightCard";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { GachaCard, gachaConditionLabel } from "@/components/gacha/GachaCard";
import type { GachaPull } from "@/types";

export function CardPreview({
  pull,
  onClose,
  canReroll = false,
  rerolling = false,
  onReroll,
  onList,
  listing = false,
  burning = false,
  onBurn,
}: {
  pull: GachaPull;
  onClose: () => void;
  canReroll?: boolean;
  rerolling?: boolean;
  onReroll?: () => void;
  onList?: (price: number) => void;
  listing?: boolean;
  burning?: boolean;
  onBurn?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const priceRef = useRef<HTMLInputElement>(null);
  const cosmetics = pull.user?.gachaCosmetics ?? [];
  const aurora = cosmetics.includes("FRAME_AURORA");
  const destaque = cosmetics.includes("DESTAQUE_CARTA");
  const rerollCost = Math.max(1, Math.round(pull.value * 1.1));
  const condition = pull.conditionLabel ?? gachaConditionLabel(pull.condition);
  const obtainedAt = new Date(pull.obtainedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const ownerName = pull.user.name || pull.user.userName || "Usuário";
  const originalOwnerName = pull.originalUser?.name || pull.originalUser?.userName || "Desconhecido";
  const animeTitle = pull.card.animeTitle ?? pull.card.anime?.title ?? null;
  const animeSlug = pull.card.anime?.slug ?? null;
  const [flipped, setFlipped] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    setFlipped(false);
    setShowDetails(false);
  }, [pull.id]);

  async function share() {
    const url = `${window.location.origin}/gacha?card=${pull.id}`;
    try {
      if (navigator.share)
        await navigator.share({ title: pull.card.name, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  }

  const content = (
    <div
      className={`relative border bg-panel p-5 shadow-2xl shadow-ink ${
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
      <p
        id="card-preview-description"
        className="sr-only"
      >
        {pull.card.rarity} · {pull.foil} · {condition} · #{pull.edition} · {pull.value} pontos · Origem: {animeTitle ?? "desconhecida"}
      </p>
      <div className="grid gap-5 md:grid-cols-[minmax(0,260px)_1fr]">
        <div>
          <div className="relative" style={{ perspective: 1200 }}>
            <div
              className="transition-transform duration-500 motion-reduce:transition-none"
              style={{ transform: flipped ? "rotateY(180deg)" : undefined, transformStyle: "preserve-3d" }}
            >
              <div className="relative" style={{ backfaceVisibility: "hidden" }}>
                <GachaCard pull={pull} linkAnime={false} showInfo={false} />
                {showDetails && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/85 p-4" aria-live="polite">
                    <dl className="grid w-full grid-cols-2 gap-x-3 gap-y-2 border border-ice/40 bg-ink/95 p-3 font-mono text-caption text-mist">
                      <div><dt className="text-mist-soft">Raridade</dt><dd className="text-snow">{pull.card.rarity}</dd></div>
                      <div><dt className="text-mist-soft">Foil</dt><dd className="text-snow">{pull.foil}</dd></div>
                      <div><dt className="text-mist-soft">Condição</dt><dd className="text-snow">{condition}</dd></div>
                      <div><dt className="text-mist-soft">Edição</dt><dd className="text-snow">#{pull.edition}</dd></div>
                      <div><dt className="text-mist-soft">Pontos</dt><dd className="text-ice">{pull.value}</dd></div>
                      <div><dt className="text-mist-soft">Dono</dt><dd className="truncate text-snow">{ownerName}</dd></div>
                      <div className="col-span-2"><dt className="text-mist-soft">Quem tirou</dt><dd className="truncate text-snow">{originalOwnerName}</dd></div>
                      <div className="col-span-2"><dt className="text-mist-soft">Obtida em</dt><dd className="text-snow">{obtainedAt}</dd></div>
                    </dl>
                  </div>
                )}
              </div>
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <GachaCard pull={pull} linkAnime={false} showInfo={false} side="back" />
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn-ghost min-h-11 px-3 py-2" aria-pressed={flipped} onClick={() => { setFlipped((value) => !value); setShowDetails(false); }}>
              {flipped ? "Ver frente" : "Virar carta"}
            </button>
            <button type="button" className="btn-ice min-h-11 px-3 py-2" aria-pressed={showDetails} onClick={() => { setShowDetails((value) => !value); setFlipped(false); }}>
              {showDetails ? "Ocultar dados" : "Informações"}
            </button>
          </div>
          <p className="mt-2 font-mono text-caption text-mist-soft">
            Obtida em {obtainedAt}
          </p>
        </div>
        <div className="min-w-0">
          <h2
            id="card-preview-title"
            className="font-display text-display-md text-snow"
          >
            {pull.card.name}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[pull.card.rarity, pull.foil, condition, `#${pull.edition}`, `${pull.value} pts`].map(
              (chip) => (
                <span
                  key={chip}
                  className="border border-hairline bg-ink px-2 py-1 font-mono text-caption text-mist"
                >
                  {chip}
                </span>
              ),
            )}
          </div>
          {animeTitle && (
            <div className="mt-4 border border-hairline bg-ink p-3">
              <p className="font-mono text-caption uppercase tracking-wide text-mist-soft">
                Origem
              </p>
              {animeSlug ? (
                <Link
                  href={`/animes/${animeSlug}`}
                  className="mt-1 block truncate text-body-sm font-medium text-ice hover:text-snow"
                >
                  Ver anime: {animeTitle}
                </Link>
              ) : (
                <span
                  title="Anime ainda não vinculado"
                  className="mt-1 block truncate text-body-sm font-medium text-mist"
                >
                  {animeTitle}
                </span>
              )}
            </div>
          )}
          <div className="mt-4 border border-hairline bg-ink p-3">
            <p className="font-mono text-caption uppercase tracking-wide text-mist-soft">
              Dono
            </p>
            {pull.user.userName ? (
              <Link
                href={`/users/${pull.user.userName}`}
                className="mt-1 block truncate text-body-sm font-medium text-snow hover:text-ice"
              >
                {ownerName}
              </Link>
            ) : (
              <p className="mt-1 truncate text-body-sm font-medium text-snow">
                {ownerName}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <p className="mb-2 font-mono text-caption uppercase tracking-wide text-mist-soft">
          Ações da carta
        </p>
        <button
          type="button"
          onClick={() => void share()}
          className="btn-ice w-full px-4 py-3"
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
            Preço em Crystais
          </label>
          <input
            id="listing-price"
            ref={priceRef}
            type="number"
            min={1}
            step={1}
            placeholder="Preço em Crystais"
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
      {onBurn && (
        <button
          type="button"
          onClick={onBurn}
          disabled={burning}
          className="mt-3 w-full border border-signal/60 px-4 py-3 font-mono text-caption text-signal disabled:opacity-50"
        >
          {burning
            ? "Queimando…"
            : `Queimar · ${Math.max(1, Math.floor(pull.value * 0.4))} crystals`}
        </button>
      )}
      </div>
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
      className="m-auto w-full max-w-3xl bg-transparent p-4 backdrop:bg-ink/90"
    >
      {fine && !reduced ? (
        <SpotlightCard className="mx-auto max-w-3xl">{content}</SpotlightCard>
      ) : (
        content
      )}
    </dialog>
  );
}
