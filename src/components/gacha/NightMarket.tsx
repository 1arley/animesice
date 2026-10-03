"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { RARITY } from "@/components/gacha/GachaCard";
import { useToast } from "@/components/common/ToastProvider";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { safeImageSrc } from "@/lib/url";
import type { GachaEconomyOffer } from "@/types";

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

export function NightMarket() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const reduceMotion = usePrefersReducedMotion();
  const [offers, setOffers] = useState<GachaEconomyOffer[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [purchaseOffer, setPurchaseOffer] = useState<GachaEconomyOffer | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const flippers = useRef<Record<string, HTMLDivElement | null>>({});
  const fronts = useRef<Record<string, HTMLDivElement | null>>({});

  const loadOffers = useCallback(async () => {
    if (!user) return;
    try {
      const [shop, inventory] = await Promise.all([
        api.gachaEconomyShop(),
        api.gachaEconomyInventory(),
      ]);
      setOffers(shop.filter((offer) => offer.slot >= 7));
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

  const revealOffer = (offer: GachaEconomyOffer) => {
    setRevealed((current) => new Set(current).add(offer.id));
    requestAnimationFrame(() => fronts.current[offer.id]?.focus());
    if (reduceMotion) return;
    const flipper = flippers.current[offer.id];
    if (!flipper) return;
    void import("@/lib/gsap").then(({ gsap }) => {
      gsap.fromTo(
        flipper,
        { rotationY: 0 },
        {
          rotationY: 180,
          duration: 1.05,
          ease: "power3.inOut",
          transformOrigin: "center center",
        },
      );
    });
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
          <p className="shelf-label">Gacha / Edição mensal</p>
          <h1 className="max-w-xl text-balance font-display text-4xl text-snow sm:text-5xl">
            Mercado Noturno
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-body text-mist">
            Seis ofertas pessoais aparecem por tempo limitado. A raridade dá a
            pista; a arte e os detalhes só surgem quando você vira a carta.
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
            <p className="text-caption text-mist">A seleção termina no fim do evento</p>
            <h2 id="offers-title" className="mt-1 font-display text-2xl text-snow">
              Cartas seladas
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              Desconto, preço e raridade ficam visíveis antes de revelar cada oferta.
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
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando ofertas">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="skeleton aspect-[3/4]" />
            ))}
          </div>
        ) : authLoading ? null : !user ? (
          <div className="mt-6 border border-hairline bg-panel p-6">
            <p className="text-body text-snow">Entre para ver sua seleção pessoal.</p>
            <Link href="/login" className="btn-ice mt-4 inline-flex min-h-11 items-center px-4">
              Entrar
            </Link>
          </div>
        ) : offers.length === 0 && error ? (
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
        ) : offers.length === 0 ? (
          <div className="mt-6 border border-hairline bg-panel p-6">
            <h3 className="font-display text-xl text-snow">A noite ainda não começou</h3>
            <p className="mt-2 max-w-xl text-body-sm text-mist">
              A próxima edição mensal ainda não está aberta. As ofertas aparecem
              aqui quando o Mercado Noturno voltar.
            </p>
            <Link href="/gacha/mercado" className="mt-4 inline-flex min-h-11 items-center text-body-sm text-ice hover:underline">
              Voltar ao mercado
            </Link>
          </div>
        ) : (
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
                return (
                  <li key={offer.id} className="night-offer-card">
                    <div
                      ref={(element) => {
                        flippers.current[offer.id] = element;
                      }}
                      className="night-offer-card__flipper"
                    >
                      <button
                        type="button"
                        aria-label={`Revelar oferta ${index + 1}: ${kind}, raridade ${rarityLabel(rarity)}, ${offer.discount}% de desconto`}
                        aria-hidden={isRevealed}
                        tabIndex={isRevealed ? -1 : 0}
                        onClick={() => revealOffer(offer)}
                        className={`night-offer-card__face night-offer-card__back border bg-panel p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice ${rarityStyle.border} ${rarityStyle.glow ?? ""}`}
                      >
                        <span className="flex items-center justify-between gap-3 text-caption">
                          <span className="text-mist">{kind} · Oferta {index + 1}</span>
                          <span className="bg-ice px-2 py-1 font-semibold text-ink">
                            −{offer.discount}%
                          </span>
                        </span>
                        <span className="night-offer-card__sigil" aria-hidden="true">
                          <span className="night-offer-card__sigil-inner" />
                        </span>
                        <span className="mt-auto block">
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
                        className={`night-offer-card__face night-offer-card__front border bg-panel p-4 ${rarityStyle.border} ${rarityStyle.glow ?? ""}`}
                      >
                        <div className="relative flex h-[42%] min-h-32 items-center justify-center overflow-hidden border border-hairline bg-ink-deep">
                          {image ? (
                            <Image
                              src={image}
                              alt={name}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-contain p-3"
                              unoptimized
                            />
                          ) : (
                            <span className="font-display text-5xl text-ice/70" aria-hidden="true">
                              {kind === "Carta" ? "✧" : "◇"}
                            </span>
                          )}
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col pt-3">
                          <p className={`text-caption ${rarityStyle.text}`}>
                            {kind} · {rarityLabel(rarity)} · −{offer.discount}%
                          </p>
                          <h3 className="mt-1 line-clamp-2 break-words font-display text-xl text-snow">
                            {name}
                          </h3>
                          <p className="mt-2 text-caption text-mist">
                            Oferta pessoal do Mercado Noturno.
                          </p>
                          <div className="mt-auto pt-3">
                            <p className="font-display text-lg tabular-nums text-ice">
                              {offer.price.toLocaleString("pt-BR")} cristais
                            </p>
                            {offer.purchasedAt ? (
                              <p className="mt-2 min-h-11 content-center text-center text-body-sm text-mist">
                                Comprada nesta edição
                              </p>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setError("");
                                  setPurchaseError("");
                                  setPurchaseOffer(offer);
                                }}
                                className="btn-ice mt-2 min-h-11 w-full px-3"
                              >
                                Comprar oferta
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
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
