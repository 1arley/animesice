"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { GachaCard, RARITY } from "@/components/gacha/GachaCard";
import { useToast } from "@/components/common/ToastProvider";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { safeImageSrc } from "@/lib/url";
import { GachaOfferGridSkeleton } from "@/components/gacha/GachaPageSkeleton";
import type { GachaEconomyOffer, GachaPull } from "@/types";

const SKIN_RARITY: Record<string, string> = {
  COMMON: "COMUM",
  UNCOMMON: "INCOMUM",
  RARE: "RARA",
  EPIC: "EPICA",
  LEGENDARY: "LENDARIA",
};

const RARITY_LABEL: Record<string, string> = {
  COMUM: "Comum",
  INCOMUM: "Incomum",
  RARA: "Rara",
  EPICA: "Épica",
  LENDARIA: "Lendária",
  MITICA: "Mítica",
  GALACTICA: "Galáctica",
};

function offerName(offer: GachaEconomyOffer) {
  return offer.card?.name ?? offer.skin?.name ?? "Oferta";
}

function offerImage(offer: GachaEconomyOffer) {
  return safeImageSrc(offer.card?.image ?? offer.skin?.imageUrl ?? null);
}

function offerRarity(offer: GachaEconomyOffer) {
  const value = offer.card?.rarity ?? offer.skin?.rarity ?? "COMUM";
  return SKIN_RARITY[value] ?? value;
}

function rarityLabel(rarity: string) {
  return RARITY_LABEL[rarity] ?? "Comum";
}

function offerKind(offer: GachaEconomyOffer) {
  return offer.itemType === "CARD" ? "Carta" : "Skin";
}

function offerPull(offer: GachaEconomyOffer): GachaPull | null {
  if (offer.itemType !== "CARD" || !offer.card) return null;
  const cardRarity = offer.card.rarity ?? "COMUM";
  return {
    id: offer.id,
    condition: 1,
    conditionLabel: "MINT",
    foil: "NORMAL",
    edition: 1,
    value: offer.price,
    obtainedAt: new Date().toISOString(),
    user: {
      id: "night-market",
      name: "Mercado Noturno",
      userName: "mercado-noturno",
      avatar: null,
    },
    card: {
      id: offer.card.id,
      name: offer.card.name,
      image: offer.card.image ?? null,
      imageHidden: Boolean(offer.card.imageHidden),
      rarity: cardRarity,
      favourites: 0,
      animeId: null,
      animeTitle: offer.card.animeTitle ?? null,
      anime: offer.card.animeTitle
        ? {
            id: "",
            title: offer.card.animeTitle,
            slug: "",
            coverImage: null,
            malId: null,
          }
        : null,
    },
  };
}

export function NightMarket() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const reduceMotion = usePrefersReducedMotion();
  const [offers, setOffers] = useState<GachaEconomyOffer[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [animatingOffers, setAnimatingOffers] = useState<Set<string>>(
    () => new Set(),
  );
  const [playingBursts, setPlayingBursts] = useState<Set<string>>(
    () => new Set(),
  );
  const pendingReveals = useRef(new Set<string>());
  const [purchaseOffer, setPurchaseOffer] = useState<GachaEconomyOffer | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const flippers = useRef<Record<string, HTMLDivElement | null>>({});
  const revealBursts = useRef<Record<string, HTMLVideoElement | null>>({});
  const fronts = useRef<Record<string, HTMLDivElement | null>>({});

  const loadOffers = useCallback(async () => {
    if (!user) return;
    try {
      const [shop, inventory] = await Promise.all([
        api.gachaEconomyShop(),
        api.gachaEconomyInventory(),
      ]);
      const nightOffers = shop.filter((offer) => offer.slot >= 7);
      setOffers(nightOffers);
      setRevealed(
        new Set(
          nightOffers.filter((offer) => offer.revealed).map((offer) => offer.id),
        ),
      );
      setAvailable(inventory.available);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível carregar o Mercado Noturno.",
      );
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void loadOffers().finally(() => setLoading(false));
  }, [authLoading, loadOffers, user]);

  const revealOffer = async (offer: GachaEconomyOffer) => {
    if (revealed.has(offer.id) || pendingReveals.current.has(offer.id)) return;
    pendingReveals.current.add(offer.id);
    try {
      await api.gachaEconomyRevealOffer(offer.id);
    } catch (cause) {
      toast(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível salvar a revelação. Tente novamente.",
        "error",
      );
      pendingReveals.current.delete(offer.id);
      return;
    }
    pendingReveals.current.delete(offer.id);
    setRevealed((current) => new Set(current).add(offer.id));
    requestAnimationFrame(() => fronts.current[offer.id]?.focus());
    if (reduceMotion) return;
    const flipper = flippers.current[offer.id];
    if (!flipper) return;
    const burst = revealBursts.current[offer.id];
    setAnimatingOffers((current) => new Set(current).add(offer.id));
    const finishReveal = () => {
      if (burst) {
        burst.onended = null;
        burst.pause();
        burst.currentTime = 0;
      }
      setAnimatingOffers((current) => {
        const next = new Set(current);
        next.delete(offer.id);
        return next;
      });
      setPlayingBursts((current) => {
        const next = new Set(current);
        next.delete(offer.id);
        return next;
      });
    };
    void import("@/lib/gsap")
      .then(({ gsap }) => {
        if (!flipper.isConnected) {
          finishReveal();
          return;
        }
        const playFlip = () => {
          if (!flipper.isConnected) {
            finishReveal();
            return;
          }
          gsap
            .timeline({ onComplete: finishReveal })
            .fromTo(
              flipper,
              { rotationY: 0 },
              {
                rotationY: 82,
                duration: 0.4,
                ease: "power2.in",
              },
            )
            .to(flipper, {
              rotationY: 180,
              duration: 0.42,
              ease: "power3.out",
            });
        };
        if (!burst) {
          playFlip();
          return;
        }
        setPlayingBursts((current) => new Set(current).add(offer.id));
        burst.currentTime = 0;
        burst.onended = () => {
          burst.onended = null;
          burst.pause();
          burst.currentTime = 0;
          setPlayingBursts((current) => {
            const next = new Set(current);
            next.delete(offer.id);
            return next;
          });
          playFlip();
        };
        void burst.play().catch(() => {
          burst.onended = null;
          setPlayingBursts((current) => {
            const next = new Set(current);
            next.delete(offer.id);
            return next;
          });
          playFlip();
        });
      })
      .catch(finishReveal);
  };

  const buyOffer = async () => {
    if (!purchaseOffer || busy) return;
    setBusy(true);
    setPurchaseError("");
    try {
      await api.gachaEconomyBuyOffer(purchaseOffer.id);
      toast("Oferta comprada.", "success");
      setPurchaseOffer(null);
      void loadOffers();
    } catch (cause) {
      setPurchaseError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível concluir a compra.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="body-content" className="mx-auto max-w-shelf px-4 pb-20 pt-8">
      <header className="night-market-hero">
        <div className="night-market-hero__copy">
          <p className="shelf-label">Gacha / Edição semanal</p>
          <h1 className="max-w-xl text-balance font-display text-4xl text-snow sm:text-5xl">
            Mercado Noturno
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-body text-mist">
            Seis ofertas pessoais chegam todo fim de semana. Revele cada carta
            uma vez; ela continuará aberta até o fim desta edição.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#ofertas" className="btn-ice min-h-11 px-4">
              Ver as ofertas
            </a>
            <span className="border border-hairline px-3 py-2 text-body-sm text-mist">
              Descontos de 10% a 30%
            </span>
          </div>
        </div>
        <div className="night-market-hero__art" aria-hidden="true">
          {reduceMotion ? (
            <Image
              src="/assets/night-market-poster.png"
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <video
              autoPlay
              muted
              playsInline
              preload="metadata"
              poster="/assets/night-market-poster.png"
              className="h-full w-full object-cover"
              tabIndex={-1}
            >
              <source src="/assets/night-market-intro.mp4" type="video/mp4" />
            </video>
          )}
          <div className="night-market-hero__veil" />
        </div>
      </header>

      <section id="ofertas" className="mt-10 scroll-mt-24" aria-labelledby="offers-title">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <p className="text-caption text-mist">Nova seleção todo fim de semana</p>
            <h2 id="offers-title" className="mt-1 font-display text-2xl text-snow">
              Cartas seladas
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              Desconto, preço e raridade ficam visíveis antes da primeira revelação.
            </p>
          </div>
          {available !== null && (
            <div className="border border-hairline bg-panel px-4 py-3">
              <p className="text-caption text-mist">Saldo disponível</p>
              <p className="font-display text-xl tabular-nums text-ice">
                {available.toLocaleString("pt-BR")} cristais
              </p>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" aria-live="polite" className="mt-5 border border-signal/50 bg-signal/10 p-4 text-body-sm text-signal">
            {error}
          </p>
        )}

        {loading ? (
          <GachaOfferGridSkeleton
            count={3}
            label="Carregando ofertas do Mercado Noturno"
            className="mt-6 gap-5"
          />
        ) : offers.length > 0 ? (
          <>
            <p className="mt-5 text-caption text-mist" aria-live="polite">
              {offers.length} {offers.length === 1 ? "oferta disponível" : "ofertas disponíveis"}
            </p>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer, index) => {
                const isRevealed = revealed.has(offer.id);
                const rarity = offerRarity(offer);
                const rarityStyle = RARITY[rarity] ?? RARITY.COMUM!;
                const name = offerName(offer);
                const image = offerImage(offer);
                const kind = offerKind(offer);
                const isAnimating = animatingOffers.has(offer.id);
                const pull = offerPull(offer);
                return (
                  <li key={offer.id} className="night-offer-card">
                    <div
                      ref={(element) => {
                        flippers.current[offer.id] = element;
                      }}
                      className={`night-offer-card__flipper ${isRevealed ? "is-revealed" : ""} ${isAnimating ? "is-animating" : ""}`}
                    >
                      <button
                        type="button"
                        aria-label={`Revelar oferta ${index + 1}: ${kind}, raridade ${rarityLabel(rarity)}, ${offer.discount}% de desconto`}
                        aria-hidden={isRevealed}
                        tabIndex={isRevealed ? -1 : 0}
                        onClick={() => void revealOffer(offer)}
                        data-rarity={rarity}
                        className={`night-offer-card__face night-offer-card__back border bg-panel p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice ${rarityStyle.border} ${rarityStyle.glow ?? ""}`}
                      >
                        <svg
                          className="night-offer-card__back-art"
                          viewBox="0 0 300 400"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <path
                            className="night-offer-card__frame-lines"
                            d="M18 48V18h264v364H18v-30M18 90h24l34 34v46M282 90h-24l-34 34v46M18 310h24l34-34v-46M282 310h-24l-34-34v-46"
                          />
                          <path
                            className="night-offer-card__glyph-lines"
                            d="M150 135v-38M150 303v-38M93 200h-35M242 200h-35M150 145l55 55-55 55-55-55 55-55Zm0 23 32 32-32 32-32-32 32-32Zm0 19 13 13-13 13-13-13 13-13Z"
                          />
                          <circle className="night-offer-card__glyph-core" cx="150" cy="200" r="3" />
                          <circle className="night-offer-card__glyph-star" cx="150" cy="82" r="2" />
                          <circle className="night-offer-card__glyph-star" cx="150" cy="318" r="2" />
                        </svg>
                        <span className="night-offer-card__sheen" aria-hidden="true" />
                        <span className="night-offer-card__content flex items-center justify-between gap-3 text-caption">
                          <span className="text-mist">{kind} · Oferta {index + 1}</span>
                          <span className="bg-ice px-2 py-1 font-semibold text-ink">
                            −{offer.discount}%
                          </span>
                        </span>
                        <span className="night-offer-card__content mt-auto block">
                          <span className="block text-caption text-mist">Raridade</span>
                          <span className={`mt-1 block font-display text-lg ${rarityStyle.text}`}>
                            {rarityLabel(rarity)}
                          </span>
                          <span className="mt-4 flex items-baseline justify-between gap-3 border-t border-hairline pt-3">
                            <span className="text-caption text-mist">Preço da oferta</span>
                            <span className="font-display text-lg tabular-nums text-snow">
                              {offer.price.toLocaleString("pt-BR")} cristais
                            </span>
                          </span>
                          <span className="mt-4 block text-center text-body-sm text-ice">
                            Toque para revelar
                          </span>
                        </span>
                      </button>
                      <div
                        ref={(element) => {
                          fronts.current[offer.id] = element;
                        }}
                        aria-hidden={!isRevealed}
                        aria-live="polite"
                        inert={!isRevealed}
                        tabIndex={-1}
                        className="night-offer-card__face night-offer-card__front"
                      >
                        <div className="night-offer-card__preview relative h-full w-full">
                          {pull ? (
                            <GachaCard
                              pull={pull}
                              linkAnime={false}
                              preview
                              showInfo={false}
                            />
                          ) : (
                            <div
                              className={`relative h-full w-full overflow-hidden border bg-panel ${rarityStyle.border} ${rarityStyle.glow ?? ""}`}
                            >
                              {image ? (
                                <Image
                                  src={image}
                                  alt={name}
                                  fill
                                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-ink-deep">
                                  <span
                                    className="font-display text-5xl text-ice/70"
                                    aria-hidden="true"
                                  >
                                    ◇
                                  </span>
                                </div>
                              )}
                              <span
                                className={`absolute left-1.5 top-1.5 z-20 bg-ink/85 px-1.5 py-0.5 font-mono text-caption font-medium backdrop-blur-sm ${rarityStyle.text}`}
                              >
                                {kind} · {rarityLabel(rarity)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Base overlay with price, discount, and action button */}
                        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end bg-gradient-to-t from-ink via-ink/95 to-transparent px-3.5 pb-3.5 pt-12">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="bg-ice px-1.5 py-0.5 font-mono text-caption font-bold text-ink">
                                −{offer.discount}%
                              </span>
                              <span className="font-display text-base tabular-nums text-snow">
                                {offer.price.toLocaleString("pt-BR")} cristais
                              </span>
                            </div>
                            <h3
                              className="mt-1 line-clamp-1 break-words font-display text-base text-snow sm:text-lg"
                              title={name}
                            >
                              {name}
                            </h3>
                            {offer.card?.animeTitle ? (
                              <p
                                className="line-clamp-1 text-caption text-mist"
                                title={offer.card.animeTitle}
                              >
                                {offer.card.animeTitle}
                              </p>
                            ) : (
                              <p className="text-caption text-mist">
                                {kind} · {rarityLabel(rarity)}
                              </p>
                            )}
                          </div>

                          <div className="mt-2.5">
                            {offer.purchasedAt ? (
                              <div className="flex min-h-11 items-center justify-center border border-hairline bg-panel/85 text-center text-body-sm font-medium text-mist">
                                Comprada nesta edição
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setError("");
                                  setPurchaseError("");
                                  setPurchaseOffer(offer);
                                }}
                                className="btn-ice min-h-11 w-full px-3 text-body-sm font-semibold"
                              >
                                Comprar oferta
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <video
                      ref={(element) => {
                        revealBursts.current[offer.id] = element;
                      }}
                      className={`night-offer-card__burst ${playingBursts.has(offer.id) ? "is-playing" : ""}`}
                      aria-hidden="true"
                      muted
                      playsInline
                      preload="metadata"
                      tabIndex={-1}
                    >
                      <source
                        src="/gacha/night-market-card-reveal.mp4"
                        type="video/mp4"
                      />
                    </video>
                  </li>
                );
              })}
            </ul>
          </>
        ) : authLoading ? null : !user ? (
          <div className="mt-6 border border-hairline bg-panel p-6">
            <p className="text-body text-snow">Entre para ver sua seleção pessoal.</p>
            <Link href="/login" className="btn-ice mt-4 inline-flex min-h-11 items-center px-4">
              Entrar
            </Link>
          </div>
        ) : error ? (
          <div className="mt-6 border border-hairline bg-panel p-6">
            <p className="text-body-sm text-mist">Não foi possível carregar as ofertas.</p>
            <button
              type="button"
              onClick={() => void loadOffers()}
              className="btn-ghost mt-3 min-h-11 px-4"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="mt-6 border border-hairline bg-panel p-6">
            <h3 className="font-display text-xl text-snow">A noite ainda não começou</h3>
            <p className="mt-2 max-w-xl text-body-sm text-mist">
              O Mercado Noturno abre aos sábados e domingos, com novas cartas e
              skins a cada fim de semana.
            </p>
            <Link href="/gacha/mercado" className="mt-4 inline-flex min-h-11 items-center text-body-sm text-ice hover:underline">
              Voltar ao mercado
            </Link>
          </div>
        )}
      </section>

      {purchaseOffer && (
        <Modal
          open
          title={`Comprar ${offerName(purchaseOffer)}`}
          onClose={() => {
            if (!busy) setPurchaseOffer(null);
          }}
          footer={
            <button
              type="button"
              disabled={busy}
              onClick={() => setPurchaseOffer(null)}
              className="btn-ghost min-h-11 px-4"
            >
              Cancelar
            </button>
          }
        >
          <p className="text-body-sm text-mist">
            Confira o valor antes de confirmar a compra.
          </p>
          <dl className="my-4 space-y-3 text-body-sm">
            <div className="flex justify-between gap-3">
              <dt>Preço com desconto</dt>
              <dd className="text-ice">
                {purchaseOffer.price.toLocaleString("pt-BR")} cristais
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Desconto</dt>
              <dd>{purchaseOffer.discount}%</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Saldo após a compra</dt>
              <dd>
                {Math.max(0, (available ?? 0) - purchaseOffer.price).toLocaleString("pt-BR")} cristais
              </dd>
            </div>
          </dl>
          {purchaseError && <p role="alert" aria-live="polite" className="mb-3 text-body-sm text-signal">{purchaseError}</p>}
          <button
            type="button"
            disabled={busy || (available ?? 0) < purchaseOffer.price}
            onClick={() => void buyOffer()}
            className="btn-ice min-h-11 w-full disabled:opacity-40"
          >
            {busy ? "Comprando…" : "Confirmar compra"}
          </button>
        </Modal>
      )}
    </main>
  );
}
