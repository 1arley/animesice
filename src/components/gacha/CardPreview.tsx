"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SpotlightCard } from "@/components/core/SpotlightCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useFinePointer } from "@/lib/use-fine-pointer";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { GachaCard, gachaConditionLabel } from "@/components/gacha/GachaCard";
import { CardBackSvg } from "@/components/gacha/CardBackSvg";
import { api, ApiError } from "@/lib/api";
import type { GachaPull, GachaShopItem } from "@/types";

export function CardPreview({
  pull,
  onClose,
  canReroll = false,
  rerolling = false,
  onReroll,
  rerollConfirm = false,
  onRerollConfirm,
  onRerollCancel,
  onList,
  listing = false,
  burning = false,
  onBurn,
  onChange,
}: {
  pull: GachaPull;
  onClose: () => void;
  canReroll?: boolean;
  rerolling?: boolean;
  onReroll?: () => void;
  rerollConfirm?: boolean;
  onRerollConfirm?: () => void;
  onRerollCancel?: () => void;
  onList?: (price: number) => void;
  listing?: boolean;
  burning?: boolean;
  onBurn?: () => void;
  onChange?: (pull: GachaPull) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const priceRef = useRef<HTMLInputElement>(null);
  const cosmetics = pull.user?.gachaCosmetics ?? [];
  const aurora = cosmetics.includes("FRAME_AURORA");
  const destaque = cosmetics.includes("DESTAQUE_CARTA");
  const rerollCost = Math.max(1, pull.value + Math.round(pull.value * 0.15));
  const condition = pull.conditionLabel ?? gachaConditionLabel(pull.condition);
  const obtainedAt = new Date(pull.obtainedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const ownerName = pull.user.name || pull.user.userName || "Usuário";
  const originalOwnerName =
    pull.originalUser?.name || pull.originalUser?.userName || "Desconhecido";
  const animeTitle = pull.card.animeTitle ?? pull.card.anime?.title ?? null;
  const animeSlug = pull.card.anime?.slug ?? null;
  const [flipped, setFlipped] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [skins, setSkins] = useState<
    Array<{ skinId: string; name: string; imageUrl: string }>
  >([]);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(
    pull.skin?.id ?? null,
  );
  const [skinLoading, setSkinLoading] = useState(false);
  const [skinError, setSkinError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [cardBacks, setCardBacks] = useState<GachaShopItem[]>([]);
  const [activeBack, setActiveBack] = useState<string | null>(
    pull.user?.gachaCardBack ?? null,
  );
  const [backLoading, setBackLoading] = useState(false);
  const [backError, setBackError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    setFlipped(false);
    setShowDetails(false);
    setSelectedSkinId(pull.skin?.id ?? null);
    setActiveBack(pull.user?.gachaCardBack ?? null);
  }, [pull.id, pull.skin?.id, pull.user?.gachaCardBack]);

  useEffect(() => {
    if (!canReroll) return;
    let cancelled = false;
    setSkinLoading(true);
    api
      .gachaCardSkins(pull.id)
      .then((result) => {
        if (cancelled) return;
        setSkins(result.skins);
        setBaseImage(result.baseImage);
        setSelectedSkinId(result.selectedSkinId);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setSkinError(
            error instanceof ApiError
              ? error.message
              : "Não foi possível carregar skins.",
          );
      })
      .finally(() => {
        if (!cancelled) setSkinLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canReroll, pull.id]);

  useEffect(() => {
    let cancelled = false;
    api
      .gachaShop()
      .then((s) => {
        if (!cancelled) {
          setCardBacks(
            s.cosmetics.filter((c) => c.key.startsWith("BACK_") && c.owned),
          );
          setActiveBack(s.activeCardBack ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleCardBack(key: string | null) {
    if (backLoading) return;
    setBackLoading(true);
    setBackError("");
    try {
      const next = activeBack === key ? null : key;
      const result = await api.gachaSetCardBack(next);
      setActiveBack(result.gachaCardBack);
    } catch (error: unknown) {
      setBackError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível trocar a capa.",
      );
    } finally {
      setBackLoading(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/gacha?card=${pull.id}`;
    try {
      if (navigator.share)
        await navigator.share({ title: pull.card.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareStatus("Link copiado.");
      }
    } catch {}
  }

  async function applySkin(skinId: string | null) {
    if (skinLoading || skinId === selectedSkinId) return;
    setSkinLoading(true);
    setSkinError("");
    try {
      const updated = await api.gachaApplyCardSkin(pull.id, skinId);
      setSelectedSkinId(skinId);
      onChange?.(updated);
    } catch (error: unknown) {
      setSkinError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível aplicar skin.",
      );
    } finally {
      setSkinLoading(false);
    }
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
      <p id="card-preview-description" className="sr-only">
        {pull.card.rarity} · {pull.foil} · {condition} · #{pull.edition} ·{" "}
        {pull.value} pontos · Origem: {animeTitle ?? "desconhecida"}
      </p>
      <div className="grid gap-5 md:grid-cols-[minmax(0,260px)_1fr]">
        <div>
          <div className="relative" style={{ perspective: 1200 }}>
            <div
              className="transition-transform duration-500 motion-reduce:transition-none"
              style={{
                transform: flipped ? "rotateY(180deg)" : undefined,
                transformStyle: "preserve-3d",
              }}
            >
              <div
                key={`${pull.id}-${pull.condition}-${pull.foil}`}
                className={`relative ${rerolling ? "reroll-shuffle" : "reroll-landed"}`}
                style={{ backfaceVisibility: "hidden" }}
              >
                <GachaCard pull={pull} linkAnime={false} showInfo={false} />
                {showDetails && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-ink/85 p-4"
                    aria-live="polite"
                  >
                    <dl className="grid w-full grid-cols-2 gap-x-3 gap-y-2 border border-ice/40 bg-ink/95 p-3 font-mono text-caption text-mist">
                      <div>
                        <dt className="text-mist-soft">Raridade</dt>
                        <dd className="text-snow">{pull.card.rarity}</dd>
                      </div>
                      <div>
                        <dt className="text-mist-soft">Foil</dt>
                        <dd className="text-snow">{pull.foil}</dd>
                      </div>
                      <div>
                        <dt className="text-mist-soft">Condição</dt>
                        <dd className="text-snow">{condition}</dd>
                      </div>
                      <div>
                        <dt className="text-mist-soft">Edição</dt>
                        <dd className="text-snow">#{pull.edition}</dd>
                      </div>
                      <div>
                        <dt className="text-mist-soft">Pontos</dt>
                        <dd className="text-ice">{pull.value}</dd>
                      </div>
                      <div>
                        <dt className="text-mist-soft">Dono</dt>
                        <dd className="truncate text-snow">{ownerName}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-mist-soft">Quem tirou</dt>
                        <dd className="truncate text-snow">
                          {originalOwnerName}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-mist-soft">Obtida em</dt>
                        <dd className="text-snow">{obtainedAt}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <GachaCard
                  pull={pull}
                  linkAnime={false}
                  showInfo={false}
                  side="back"
                  cardBack={activeBack}
                />
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-ghost min-h-11 px-3 py-2"
              aria-pressed={flipped}
              onClick={() => {
                setFlipped((value) => !value);
                setShowDetails(false);
              }}
            >
              {flipped ? "Ver frente" : "Virar carta"}
            </button>
            <button
              type="button"
              className="btn-ice min-h-11 px-3 py-2"
              aria-pressed={showDetails}
              onClick={() => {
                setShowDetails((value) => !value);
                setFlipped(false);
              }}
            >
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
            {[
              pull.card.rarity,
              pull.foil,
              condition,
              `#${pull.edition}`,
              `${pull.value} pts`,
            ].map((chip) => (
              <span
                key={chip}
                className="border border-hairline bg-ink px-2 py-1 font-mono text-caption text-mist"
              >
                {chip}
              </span>
            ))}
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
          {canReroll && (
            <section className="mt-4 border border-hairline bg-ink p-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-sm text-snow">
                  Arte da carta
                </h3>
                <span className="font-mono text-caption text-mist-soft">
                  {skins.length} skins
                </span>
              </div>
              <p className="mt-1 text-xs text-mist">
                Use uma skin desta personagem nesta cópia.
              </p>
              <div
                className="mt-3 flex gap-2 overflow-x-auto pb-2"
                aria-label="Escolher arte da carta"
                aria-busy={skinLoading}
              >
                <button
                  type="button"
                  onClick={() => void applySkin(null)}
                  disabled={skinLoading}
                  aria-pressed={selectedSkinId === null}
                  className={`w-20 shrink-0 border p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                    selectedSkinId === null
                      ? "border-ice bg-ice/10"
                      : "border-hairline hover:border-ice/60"
                  }`}
                >
                  <span className="flex aspect-square items-center justify-center overflow-hidden bg-panel text-center text-[10px] text-mist">
                    {baseImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={baseImage}
                        alt="Arte original"
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Sem imagem"
                    )}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-snow">
                    Original
                  </span>
                </button>
                {skins.map((skin) => (
                  <button
                    key={skin.skinId}
                    type="button"
                    onClick={() => void applySkin(skin.skinId)}
                    disabled={skinLoading}
                    aria-pressed={selectedSkinId === skin.skinId}
                    className={`w-20 shrink-0 border p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                      selectedSkinId === skin.skinId
                        ? "border-ice bg-ice/10"
                        : "border-hairline hover:border-ice/60"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={skin.imageUrl}
                      alt=""
                      width={96}
                      height={96}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                    <span className="mt-1 block truncate text-[11px] text-snow">
                      {skin.name}
                    </span>
                  </button>
                ))}
              </div>
              {skinError && (
                <p role="alert" className="mt-2 text-xs text-signal">
                  {skinError} Tente novamente.
                </p>
              )}
              {!skinLoading && skins.length === 0 && !skinError && (
                <p className="mt-2 text-xs text-mist-soft">
                  Nenhuma skin desbloqueada para esta carta.
                </p>
              )}
            </section>
          )}
          {cardBacks.length > 0 && (
            <section className="mt-4 border border-hairline bg-ink p-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-sm text-snow">Capa</h3>
                <span className="font-mono text-caption text-mist-soft">
                  {cardBacks.length} capas
                </span>
              </div>
              <p className="mt-1 text-xs text-mist">
                Escolha o verso desta carta.
              </p>
              <div
                className="mt-3 flex gap-2 overflow-x-auto pb-2"
                aria-label="Escolher capa da carta"
              >
                <button
                  type="button"
                  onClick={() => void toggleCardBack(null)}
                  disabled={backLoading || activeBack === null}
                  aria-pressed={activeBack === null}
                  className={`w-20 shrink-0 border p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                    activeBack === null
                      ? "border-ice bg-ice/10"
                      : "border-hairline hover:border-ice/60"
                  }`}
                >
                  <span className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-panel text-center text-[10px] text-mist">
                    Padrão
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-snow">
                    Original
                  </span>
                </button>
                {cardBacks.map((cb) => (
                  <button
                    key={cb.key}
                    type="button"
                    onClick={() => void toggleCardBack(cb.key)}
                    disabled={backLoading}
                    aria-pressed={activeBack === cb.key}
                    className={`w-20 shrink-0 border p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                      activeBack === cb.key
                        ? "border-ice bg-ice/10"
                        : "border-hairline hover:border-ice/60"
                    }`}
                  >
                    <span className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-panel">
                      {cb.svg ? (
                        <CardBackSvg
                          backKey={cb.key}
                          className="h-full w-full"
                        />
                      ) : (
                        <span className="text-[10px] text-mist">
                          Sem preview
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-snow">
                      {cb.label}
                    </span>
                  </button>
                ))}
              </div>
              {backError && (
                <p role="alert" className="mt-2 text-xs text-signal">
                  {backError} Tente novamente.
                </p>
              )}
            </section>
          )}
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
        <p aria-live="polite" className="mt-2 text-center text-xs text-mist">
          {shareStatus}
        </p>
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
              name="listing-price"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Preço em Crystais…"
              defaultValue={pull.value}
              className="h-11 w-full border border-hairline bg-ink px-3 font-mono text-caption text-snow placeholder:text-mist focus-visible:border-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
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
      className="m-auto max-h-[100dvh] w-full max-w-3xl overscroll-contain overflow-y-auto bg-transparent p-4 backdrop:bg-ink/90"
    >
      {fine && !reduced ? (
        <SpotlightCard className="mx-auto max-w-3xl">{content}</SpotlightCard>
      ) : (
        content
      )}
      {canReroll && onRerollConfirm && onRerollCancel && (
        <ConfirmDialog
          open={rerollConfirm}
          title="Rerrollar carta?"
          confirmLabel="Rerrollar"
          busyLabel="Rerrollando…"
          busy={rerolling}
          onCancel={onRerollCancel}
          onConfirm={onRerollConfirm}
        >
          <p className="mt-4 text-body-sm text-mist">
            Sorteia nova condition e foil por {rerollCost} crystals. Pode
            piorar.
          </p>
        </ConfirmDialog>
      )}
    </dialog>
  );
}
