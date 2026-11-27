"use client";

import Image from "next/image";
import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/components/common/ToastProvider";
import {
  CardPreview,
  type GachaCardInspection,
} from "@/components/gacha/CardPreview";
import { GachaCard, RARITY } from "@/components/gacha/GachaCard";
import {
  RARITY_ACCENT_RGB,
  computeNightMarketStats,
  formatNightMarketWindow,
  offerImage,
  offerInspection,
  offerKind,
  offerName,
  offerPull,
  offerRarity,
  offerSlotCode,
  rarityLabel,
} from "@/components/gacha/night-market-helpers";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { isOptimizableImageUrl, safeImageSrc } from "@/lib/url";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { GachaEconomyOffer } from "@/types";

const CARD_STAGGER_MS = [0, 45, 85, 120, 150, 175] as const;

const RARITY_TEXT_CLASS: Record<string, string> = {
  COMUM: RARITY.COMUM?.text ?? "text-mist",
  INCOMUM: RARITY.INCOMUM?.text ?? "text-emerald-400",
  RARA: RARITY.RARA?.text ?? "text-sky-400",
  EPICA: RARITY.EPICA?.text ?? "text-violet-400",
  LENDARIA: RARITY.LENDARIA?.text ?? "text-amber-300",
  MITICA: RARITY.MITICA?.text ?? "text-rose-400",
  GALACTICA: "text-ice",
};

function KeyEmblem({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="22" cy="24" r="11" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="22" cy="24" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M30 32l20 20m-5-5l5-5m-10 0l5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="square"
      />
    </svg>
  );
}

function SealCrestGlyph({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 3l10 13-10 13L6 16 16 3Zm0 7l5 6-5 6-5-6 5-6Z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <circle cx="16" cy="16" r="1.7" fill="currentColor" />
    </svg>
  );
}

function OfferThumbnail({
  offer,
  sizes,
}: {
  offer: GachaEconomyOffer;
  sizes: string;
}) {
  const image = offerImage(offer, (raw) => safeImageSrc(raw));
  const name = offerName(offer);

  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        fill
        sizes={sizes}
        unoptimized={!isOptimizableImageUrl(image)}
        className={
          offer.itemType === "COMMON_BOX"
            ? "object-contain p-2"
            : "object-cover"
        }
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-ink-deep text-ice/80">
      {offer.itemType === "KEY" ? (
        <KeyEmblem className="h-9 w-9" />
      ) : (
        <span className="font-mono text-caption tracking-widest text-ice">
          {offer.card?.imageHidden ? "???" : "◇"}
        </span>
      )}
    </div>
  );
}

const NightMarketOfferCard = memo(function NightMarketOfferCard({
  offer,
  index,
  isRevealed,
  available,
  reduceMotion,
  onCommitReveal,
  onSelectPurchase,
  onInspect,
  registerRevealTarget,
}: {
  offer: GachaEconomyOffer;
  index: number;
  isRevealed: boolean;
  available: number | null;
  reduceMotion: boolean;
  onCommitReveal: (offer: GachaEconomyOffer) => Promise<boolean>;
  onSelectPurchase: (offer: GachaEconomyOffer) => void;
  onInspect: (offer: GachaEconomyOffer) => void;
  registerRevealTarget: (offerId: string, element: HTMLElement | null) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isBurstPlaying, setIsBurstPlaying] = useState(false);
  const [dockRevealed, setDockRevealed] = useState(isRevealed);

  const cardRef = useRef<HTMLLIElement | null>(null);
  const flipperRef = useRef<HTMLDivElement | null>(null);
  const burstRef = useRef<HTMLVideoElement | null>(null);
  const sheenRef = useRef<HTMLSpanElement | null>(null);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const postRevealActionRef = useRef<HTMLButtonElement | null>(null);
  const postRevealInspectRef = useRef<HTMLButtonElement | null>(null);

  const mountedRef = useRef(true);
  const timersRef = useRef<number[]>([]);
  const timelineRef = useRef<{ kill: () => void } | null>(null);

  const clearTimers = useCallback(() => {
    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      timelineRef.current?.kill();
      timelineRef.current = null;
    };
  }, [clearTimers]);

  useEffect(() => {
    if (isRevealed && !isAnimating) {
      setDockRevealed(true);
    } else if (!isRevealed) {
      setDockRevealed(false);
    }
  }, [isRevealed, isAnimating]);

  const rarity = offerRarity(offer);
  const rarityTextClass = RARITY_TEXT_CLASS[rarity] ?? "text-mist";
  const accentRgb = RARITY_ACCENT_RGB[rarity] ?? RARITY_ACCENT_RGB.COMUM!;
  const name = offerName(offer);
  const kind = offerKind(offer);
  const slotCode = offerSlotCode(offer.slot, index);
  const image = offerImage(offer, (raw) => safeImageSrc(raw));
  const pull = useMemo(() => offerPull(offer), [offer]);

  const canInspect =
    (offer.itemType === "CARD" || offer.itemType === "SKIN") &&
    !offer.card?.imageHidden;
  const shortfall =
    available !== null ? Math.max(0, offer.price - available) : 0;

  const focusAfterReveal = useCallback(() => {
    const active = document.activeElement;
    const shouldMoveFocus =
      !active ||
      active === document.body ||
      cardRef.current?.contains(active);
    if (!shouldMoveFocus) return;
    if (postRevealActionRef.current) {
      postRevealActionRef.current.focus();
      return;
    }
    if (postRevealInspectRef.current) {
      postRevealInspectRef.current.focus();
      return;
    }
    cardRef.current?.focus();
  }, []);

  const handleBackPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const sheen = sheenRef.current;
    if (!sheen) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 34;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 34;
    sheen.style.transform = `translate3d(${x.toFixed(2)}%, ${y.toFixed(2)}%, 0)`;
  };

  const handleBackPointerLeave = () => {
    const sheen = sheenRef.current;
    if (sheen) {
      sheen.style.transform = "translate3d(0%, 0%, 0)";
    }
  };

  const handleReveal = async () => {
    if (isRevealed || isPending) return;
    setIsPending(true);
    if (!reduceMotion) {
      // Lock the flipper state before awaiting the network so there is no 1-frame snap to 180deg.
      setIsAnimating(true);
    }

    // Preload GSAP alongside the network call so the 440ms overlap stays exact.
    const gsapPromise = reduceMotion ? null : import("@/lib/gsap");
    const committed = await onCommitReveal(offer);
    if (!mountedRef.current) return;
    setIsPending(false);

    if (!committed) {
      setIsAnimating(false);
      return;
    }

    if (reduceMotion) {
      setDockRevealed(true);
      requestAnimationFrame(focusAfterReveal);
      return;
    }

    const flipper = flipperRef.current;
    if (!flipper) {
      setDockRevealed(true);
      setIsAnimating(false);
      return;
    }

    clearTimers();

    const stopBurst = () => {
      const burst = burstRef.current;
      if (burst) {
        burst.onended = null;
        burst.pause();
        burst.currentTime = 0;
      }
      if (mountedRef.current) {
        setIsBurstPlaying(false);
      }
    };

    const finishFlip = () => {
      clearTimers();
      timelineRef.current = null;
      stopBurst();
      if (!mountedRef.current) return;
      setDockRevealed(true);
      setIsAnimating(false);
      requestAnimationFrame(focusAfterReveal);
    };

    const runFlip = async (dockDelayMs: number) => {
      try {
        const gsapModule = await (gsapPromise ?? import("@/lib/gsap"));
        if (!mountedRef.current || !flipper.isConnected) {
          finishFlip();
          return;
        }
        const dockTimer = window.setTimeout(() => {
          if (mountedRef.current) setDockRevealed(true);
        }, dockDelayMs);
        timersRef.current.push(dockTimer);

        const tl = gsapModule.gsap.timeline({ onComplete: finishFlip });
        timelineRef.current = tl;
        tl.fromTo(
          flipper,
          { rotationY: 0, scale: 1 },
          {
            rotationY: 180,
            duration: 0.64,
            ease: "power3.inOut",
          },
          0,
        )
          .to(
            flipper,
            {
              scale: 1.024,
              duration: 0.3,
              ease: "power2.out",
            },
            0,
          )
          .to(
            flipper,
            {
              scale: 1,
              duration: 0.34,
              ease: "power3.out",
            },
            0.3,
          );
      } catch {
        finishFlip();
      }
    };

    const burst = burstRef.current;
    if (!burst) {
      void runFlip(320);
      return;
    }

    setIsBurstPlaying(true);
    burst.currentTime = 0;
    burst.onended = () => {
      stopBurst();
    };

    const fallbackBurstTimer = window.setTimeout(stopBurst, 1300);
    timersRef.current.push(fallbackBurstTimer);

    const flipTimer = window.setTimeout(() => {
      void runFlip(320);
    }, 440);
    timersRef.current.push(flipTimer);

    void burst.play().catch(() => {
      window.clearTimeout(flipTimer);
      stopBurst();
      void runFlip(320);
    });
  };

  return (
    <li
      id={`nm-offer-${offer.id}`}
      ref={(element) => {
        cardRef.current = element;
        registerRevealTarget(offer.id, element);
      }}
      tabIndex={-1}
      data-rarity={rarity}
      data-revealed={isRevealed ? "true" : "false"}
      style={
        {
          "--offer-accent": accentRgb,
          "--nm-delay": `${CARD_STAGGER_MS[index] ?? 175}ms`,
        } as CSSProperties
      }
      className="nm-offer nm-card-enter scroll-mt-24 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
    >
      <div className="nm-stage">
        <div
          ref={flipperRef}
          className={`nm-flipper ${isRevealed ? "is-revealed" : ""} ${isAnimating ? "is-animating" : ""}`}
        >
          <button
            ref={backButtonRef}
            type="button"
            disabled={isPending || isRevealed}
            aria-label={`Revelar oferta ${slotCode}: ${kind}, raridade ${rarityLabel(rarity)}, ${offer.discount}% de desconto, ${offer.price.toLocaleString("pt-BR")} cristais`}
            aria-busy={isPending}
            aria-hidden={isRevealed}
            tabIndex={isRevealed ? -1 : 0}
            onClick={() => void handleReveal()}
            onPointerMove={handleBackPointerMove}
            onPointerLeave={handleBackPointerLeave}
            data-rarity={rarity}
            data-pending={isPending ? "true" : undefined}
            className="nm-face nm-back focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
          >
            {/* Geometria 300×400 sincronizada 1:1 com /gacha/night-market-card-reveal.mp4 */}
            <svg
              className="nm-back__art"
              viewBox="0 0 300 400"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="nm-frame-lines"
                d="M18 48V18h264v364H18v-30M18 90h24l34 34v46M282 90h-24l-34 34v46M18 310h24l34-34v-46M282 310h-24l-34-34v-46"
              />
              <path
                className="nm-glyph-lines"
                d="M150 135v-38M150 303v-38M93 200h-35M242 200h-35M150 145l55 55-55 55-55-55 55-55Zm0 23 32 32-32 32-32-32 32-32Zm0 19 13 13-13 13-13-13 13-13Z"
              />
              <circle className="nm-glyph-core" cx="150" cy="200" r="3" />
              <circle className="nm-glyph-star" cx="150" cy="82" r="2" />
              <circle className="nm-glyph-star" cx="150" cy="318" r="2" />
            </svg>

            <span ref={sheenRef} className="nm-sheen" aria-hidden="true" />

            <span className="nm-back__content flex items-center justify-between gap-3 font-mono text-caption">
              <span className="uppercase tracking-[0.14em] text-mist">
                {slotCode} · {kind}
              </span>
              <span className="bg-ice px-2 py-0.5 font-semibold tabular-nums text-ink">
                −{offer.discount}%
              </span>
            </span>

            <span className="nm-back__content mt-auto flex items-end justify-between gap-3 pt-4">
              <span>
                <span className="block font-mono text-label uppercase tracking-[0.14em] text-mist-soft">
                  Raridade
                </span>
                <span
                  className={`mt-0.5 block font-display text-xl leading-none ${rarityTextClass}`}
                >
                  {rarityLabel(rarity)}
                </span>
              </span>
              <span className="border border-ice/40 bg-ink/80 px-2.5 py-1 font-mono text-caption text-ice">
                {isPending ? "Rompendo selo…" : "Romper selo"}
              </span>
            </span>
          </button>

          <div
            aria-hidden={!isRevealed}
            inert={!isRevealed}
            tabIndex={-1}
            className="nm-face nm-front"
          >
            <div className="nm-front__media relative h-full w-full">
              {pull ? (
                <GachaCard
                  pull={pull}
                  linkAnime={false}
                  preview
                  showInfo={false}
                />
              ) : offer.itemType === "COMMON_BOX" ? (
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_46%,rgba(56,232,218,0.16),transparent_62%),linear-gradient(155deg,#101722,#06090e)]">
                  <Image
                    src="/gacha/box-common.webp"
                    alt="Caixa comum"
                    fill
                    sizes="(max-width: 480px) 92vw, (max-width: 1024px) 46vw, 31vw"
                    className="object-contain p-8"
                  />
                  <span className="absolute left-2 top-2 z-20 bg-ink/85 px-2 py-0.5 font-mono text-caption font-medium text-mist">
                    {kind} · {rarityLabel(rarity)}
                  </span>
                </div>
              ) : offer.itemType === "KEY" ? (
                <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_46%,rgba(56,232,218,0.16),transparent_60%),linear-gradient(155deg,#101722,#06090e)]">
                  <div className="flex h-28 w-28 items-center justify-center border border-ice/25 bg-ink/70 text-ice">
                    <KeyEmblem className="h-14 w-14" />
                  </div>
                  <span className="mt-4 font-mono text-caption uppercase tracking-[0.16em] text-mist">
                    Acesso ao cofre
                  </span>
                  <span className="absolute left-2 top-2 z-20 bg-ink/85 px-2 py-0.5 font-mono text-caption font-medium text-mist">
                    {kind} · {rarityLabel(rarity)}
                  </span>
                </div>
              ) : (
                <div className="relative h-full w-full overflow-hidden bg-panel">
                  {image ? (
                    <Image
                      src={image}
                      alt={name}
                      fill
                      sizes="(max-width: 480px) 92vw, (max-width: 1024px) 46vw, 31vw"
                      className="object-cover"
                      unoptimized={!isOptimizableImageUrl(image)}
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
                    className={`absolute left-2 top-2 z-20 bg-ink/85 px-2 py-0.5 font-mono text-caption font-medium ${rarityTextClass}`}
                  >
                    {kind} · {rarityLabel(rarity)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <video
          ref={burstRef}
          className={`nm-burst ${isBurstPlaying ? "is-playing" : ""}`}
          aria-hidden="true"
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
        >
          <source src="/gacha/night-market-card-reveal.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Plinto externo: controles e informações sempre fora da arte 3:4 */}
      <div className="nm-dock">
        {dockRevealed ? (
          <div key="revealed" className="nm-dock__swap flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-2 font-mono text-caption">
              <span className={`truncate ${rarityTextClass}`}>
                {slotCode} · {kind} · {rarityLabel(rarity)}
              </span>
              <span className="shrink-0 bg-ice px-1.5 py-0.5 font-semibold tabular-nums text-ink">
                −{offer.discount}%
              </span>
            </div>

            <h3
              className="mt-2 line-clamp-1 break-words font-display text-xl leading-tight text-snow"
              title={name}
            >
              {name}
            </h3>
            <p
              className="mt-0.5 line-clamp-1 text-caption text-mist"
              title={offer.card?.animeTitle ?? undefined}
            >
              {offer.card?.animeTitle ??
                (offer.itemType === "KEY"
                  ? "Abre uma caixa selada"
                  : offer.itemType === "COMMON_BOX"
                    ? "Contém cartas, cristais ou itens"
                    : `${kind} exclusiva da edição`)}
            </p>

            <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-hairline/70 pt-2.5">
              <span className="font-display text-xl tabular-nums text-ice">
                {offer.price.toLocaleString("pt-BR")}{" "}
                <span className="font-sans text-caption font-normal text-mist">
                  cristais
                </span>
              </span>
              {!offer.purchasedAt && shortfall > 0 && (
                <span className="font-mono text-caption tabular-nums text-signal">
                  Faltam {shortfall.toLocaleString("pt-BR")}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              {offer.purchasedAt ? (
                <div className="flex min-h-11 flex-1 items-center justify-center border border-ice/30 bg-ice/5 px-3 text-center text-body-sm font-medium text-ice">
                  Adquirida nesta edição
                </div>
              ) : (
                <button
                  ref={postRevealActionRef}
                  type="button"
                  onClick={() => onSelectPurchase(offer)}
                  className="btn-ice min-h-11 flex-1 px-3 text-body-sm font-semibold"
                >
                  Comprar oferta
                </button>
              )}
              {canInspect && (
                <button
                  ref={postRevealInspectRef}
                  type="button"
                  onClick={() => onInspect(offer)}
                  aria-label={`Ampliar arte de ${name}`}
                  className="btn-ghost min-h-11 shrink-0 px-3 text-body-sm"
                >
                  Ampliar
                </button>
              )}
            </div>
          </div>
        ) : (
          <div key="sealed" className="flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-2 font-mono text-caption">
              <span className={`truncate ${rarityTextClass}`}>
                {slotCode} · {kind} · {rarityLabel(rarity)}
              </span>
              <span className="shrink-0 bg-ice px-1.5 py-0.5 font-semibold tabular-nums text-ink">
                −{offer.discount}%
              </span>
            </div>

            <p className="mt-2 font-display text-xl leading-tight text-snow">
              {isPending ? "Rompendo selo…" : "Oferta selada"}
            </p>
            <p className="mt-0.5 text-caption text-mist">
              Permanece aberta até o fim da edição
            </p>

            <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-hairline/70 pt-2.5">
              <span className="font-display text-xl tabular-nums text-snow">
                {offer.price.toLocaleString("pt-BR")}{" "}
                <span className="font-sans text-caption font-normal text-mist">
                  cristais
                </span>
              </span>
              {shortfall > 0 && (
                <span className="font-mono text-caption tabular-nums text-signal">
                  Faltam {shortfall.toLocaleString("pt-BR")}
                </span>
              )}
            </div>

            <div className="mt-3 flex min-h-11 items-center justify-center border border-dashed border-hairline bg-ink/50 px-3 font-mono text-caption text-mist">
              {isPending
                ? "Confirmando revelação…"
                : "Toque no selo acima para revelar"}
            </div>
          </div>
        )}
      </div>
    </li>
  );
});

export function NightMarket() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const reduceMotion = usePrefersReducedMotion();

  const [offers, setOffers] = useState<GachaEconomyOffer[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [marketStatus, setMarketStatus] = useState<
    { open: boolean; periodStart: string | null } | undefined
  >(undefined);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const [purchaseOffer, setPurchaseOffer] = useState<GachaEconomyOffer | null>(
    null,
  );
  const [inspectedCard, setInspectedCard] =
    useState<GachaCardInspection | null>(null);
  const [inspectedSkin, setInspectedSkin] = useState<{
    name: string;
    image: string | null;
    details: string;
  } | null>(null);
  const [skinZoom, setSkinZoom] = useState(false);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchaseError, setPurchaseError] = useState("");

  const pendingReveals = useRef(new Set<string>());
  const offerElements = useRef<Record<string, HTMLElement | null>>({});

  const registerRevealTarget = useCallback(
    (offerId: string, element: HTMLElement | null) => {
      offerElements.current[offerId] = element;
    },
    [],
  );

  useEffect(() => {
    setNowMs(Date.now());
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    void api
      .gachaNightMarketStatus()
      .then((status) => {
        if (mounted) setMarketStatus(status);
      })
      .catch(() => {
        // Mantém fallback editorial quando o status público estiver indisponível.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const loadOffers = useCallback(async () => {
    if (!user) return;
    try {
      const [shopResult, inventoryResult, statusResult] =
        await Promise.allSettled([
          api.gachaEconomyShop(),
          api.gachaEconomyInventory(),
          api.gachaNightMarketStatus(),
        ]);

      if (shopResult.status === "rejected") {
        throw shopResult.reason;
      }
      if (inventoryResult.status === "rejected") {
        throw inventoryResult.reason;
      }

      const nightOffers = shopResult.value.filter((offer) => offer.slot >= 7);
      setOffers(nightOffers);
      setRevealed(
        new Set(
          nightOffers
            .filter((offer) => offer.revealed)
            .map((offer) => offer.id),
        ),
      );
      setAvailable(inventoryResult.value.available);
      if (statusResult.status === "fulfilled") {
        setMarketStatus(statusResult.value);
      }
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
      setOffers([]);
      setAvailable(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadOffers().finally(() => setLoading(false));
  }, [authLoading, loadOffers, user]);

  const commitReveal = useCallback(
    async (offer: GachaEconomyOffer): Promise<boolean> => {
      if (revealed.has(offer.id) || pendingReveals.current.has(offer.id)) {
        return false;
      }
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
        return false;
      }
      pendingReveals.current.delete(offer.id);
      setRevealed((current) => new Set(current).add(offer.id));
      const label = `${offerName(offer)}, ${rarityLabel(offerRarity(offer))}`;
      setAnnouncement(`Oferta revelada: ${label}.`);
      return true;
    },
    [revealed, toast],
  );

  const handleInspect = useCallback((offer: GachaEconomyOffer) => {
    if (offer.itemType === "CARD") {
      const inspection = offerInspection(offer);
      if (inspection) setInspectedCard(inspection);
      return;
    }
    if (offer.itemType === "SKIN") {
      setSkinZoom(false);
      setInspectedSkin({
        name: offerName(offer),
        image: offerImage(offer, (raw) => safeImageSrc(raw)) ?? null,
        details: `${offerKind(offer)} · ${rarityLabel(offerRarity(offer))} · −${offer.discount}% (${offer.price.toLocaleString("pt-BR")} cristais)`,
      });
    }
  }, []);

  const buyOffer = async () => {
    if (!purchaseOffer || busy) return;
    setBusy(true);
    setPurchaseError("");
    const purchasedName = offerName(purchaseOffer);
    try {
      await api.gachaEconomyBuyOffer(purchaseOffer.id);
      toast("Oferta comprada.", "success");
      setAnnouncement(`${purchasedName} comprada com sucesso.`);
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

  const jumpToOffer = (offerId: string) => {
    const target = offerElements.current[offerId];
    if (!target) return;
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    target.focus({ preventScroll: true });
  };

  const stats = useMemo(
    () => computeNightMarketStats(offers, revealed),
    [offers, revealed],
  );

  const isEditionOpen = marketStatus?.open ?? offers.length > 0;
  const windowLabel =
    nowMs === null || marketStatus === undefined
      ? "Sábados e domingos"
      : formatNightMarketWindow(
          marketStatus.open,
          marketStatus.periodStart,
          new Date(nowMs),
        );
  const progressRatio =
    stats.total > 0 ? Math.min(1, stats.revealedCount / stats.total) : 0;

  const activeMonolithOffer =
    hoveredSlot !== null ? (offers[hoveredSlot] ?? null) : null;
  const activeMonolithRevealed = activeMonolithOffer
    ? revealed.has(activeMonolithOffer.id) || activeMonolithOffer.revealed
    : false;

  return (
    <div className="night-market-page mx-auto max-w-shelf px-4 pb-20 pt-8">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <header className="nm-hero p-5 sm:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-end">
          <div className="min-w-0">
            <div className="nm-enter flex flex-wrap items-center gap-3">
              <p className="shelf-label">Gacha / Edição semanal</p>
              <span
                className="nm-status-pill"
                data-open={isEditionOpen ? "true" : "false"}
              >
                <span className="nm-status-dot" aria-hidden="true" />
                {marketStatus === undefined && offers.length === 0
                  ? "Consultando cofre"
                  : isEditionOpen
                    ? "Edição aberta"
                    : "Cofre fechado"}
              </span>
            </div>

            <h1
              className="nm-hero__title nm-enter mt-4 text-balance text-snow"
              style={{ "--nm-delay": "35ms" } as CSSProperties}
            >
              Mercado Noturno
            </h1>

            <p
              className="nm-enter mt-4 max-w-[46ch] text-pretty text-body-sm text-mist sm:text-body"
              style={{ "--nm-delay": "70ms" } as CSSProperties}
            >
              Seis ofertas pessoais liberadas todo fim de semana. Rompa cada
              selo uma vez — a carta permanece aberta até o encerramento desta
              edição.
            </p>

            <div
              className="nm-telemetry nm-enter mt-6"
              style={{ "--nm-delay": "105ms" } as CSSProperties}
            >
              <div className="nm-telemetry__cell flex flex-col justify-between">
                <div>
                  <p className="font-mono text-label uppercase tracking-[0.14em] text-mist-soft">
                    Saldo disponível
                  </p>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <p className="font-display text-2xl tabular-nums text-ice">
                      {available !== null
                        ? available.toLocaleString("pt-BR")
                        : user
                          ? "—"
                          : "Visitante"}
                    </p>
                    {available !== null && (
                      <span className="font-mono text-caption text-mist">
                        cristais
                      </span>
                    )}
                  </div>
                </div>
                {user && (
                  <Link
                    href="/gacha/cristais"
                    className="mt-2 inline-flex min-h-11 items-center font-mono text-caption text-ice underline decoration-hairline underline-offset-4 hover:text-snow"
                  >
                    Recarregar saldo
                  </Link>
                )}
              </div>

              <div className="nm-telemetry__cell flex flex-col justify-between">
                <div>
                  <p className="font-mono text-label uppercase tracking-[0.14em] text-mist-soft">
                    Selos revelados
                  </p>
                  <p className="mt-1 font-display text-2xl tabular-nums text-snow">
                    {offers.length > 0
                      ? `${stats.revealedCount} / ${stats.total}`
                      : "0 / 6"}
                  </p>
                </div>
                <div
                  className="nm-progress-track mt-3"
                  aria-hidden="true"
                >
                  <span
                    className="nm-progress-fill"
                    style={{ transform: `scaleX(${progressRatio})` }}
                  />
                </div>
              </div>

              <div className="nm-telemetry__cell flex flex-col justify-between">
                <div>
                  <p className="font-mono text-label uppercase tracking-[0.14em] text-mist-soft">
                    Janela da edição
                  </p>
                  <p className="mt-1 font-display text-xl leading-tight tabular-nums text-snow sm:text-2xl">
                    {windowLabel}
                  </p>
                </div>
                <p className="mt-2 font-mono text-caption text-mist">
                  {stats.maxDiscount > 0
                    ? `Descontos até −${stats.maxDiscount}%`
                    : "Descontos: 10% a 30%"}
                </p>
              </div>
            </div>
          </div>

          {/* Ponto focal: Bandeja de Monólitos sincronizada com os 6 slots reais */}
          <div
            className="nm-tray nm-enter min-w-0"
            style={{ "--nm-delay": "125ms" } as CSSProperties}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-label uppercase tracking-[0.15em] text-mist-soft">
              <span>Arquivo do cofre</span>
              <span className="tabular-nums text-mist">
                {offers.length > 0
                  ? `${stats.purchasedCount}/${stats.total} adquiridas`
                  : "06 selos semanais"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-2">
              {Array.from({ length: 6 }, (_, index) => {
                const slotOffer = offers[index] ?? null;
                if (!slotOffer) {
                  return (
                    <div
                      key={`dormant-${index}`}
                      className="nm-monolith is-dormant"
                      aria-hidden="true"
                    >
                      <span className="font-mono text-[11px] tabular-nums text-mist-soft">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="my-auto flex justify-center text-mist-dim">
                        <SealCrestGlyph className="h-5 w-5" />
                      </div>
                      <span className="truncate font-mono text-[10px] uppercase tracking-[0.04em] text-mist-dim">
                        Selada
                      </span>
                    </div>
                  );
                }

                const rarity = offerRarity(slotOffer);
                const accent =
                  RARITY_ACCENT_RGB[rarity] ?? RARITY_ACCENT_RGB.COMUM!;
                const slotCode = offerSlotCode(slotOffer.slot, index);
                const slotRevealed =
                  revealed.has(slotOffer.id) || slotOffer.revealed;
                const slotImage = offerImage(slotOffer, (raw) =>
                  safeImageSrc(raw),
                );
                const slotName = offerName(slotOffer);

                return (
                  <button
                    key={slotOffer.id}
                    type="button"
                    data-rarity={rarity}
                    data-active={hoveredSlot === index ? "true" : undefined}
                    style={{ "--offer-accent": accent } as CSSProperties}
                    onClick={() => jumpToOffer(slotOffer.id)}
                    onMouseEnter={() => setHoveredSlot(index)}
                    onFocus={() => setHoveredSlot(index)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    onBlur={() => setHoveredSlot(null)}
                    aria-label={`Ir para oferta ${slotCode}: ${slotRevealed ? slotName : "oferta selada"}, raridade ${rarityLabel(rarity)}, ${slotOffer.discount}% de desconto`}
                    className="nm-monolith group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
                  >
                    {slotRevealed && slotImage && (
                      <div
                        className="pointer-events-none absolute inset-0"
                        aria-hidden="true"
                      >
                        <Image
                          src={slotImage}
                          alt=""
                          fill
                          sizes="96px"
                          unoptimized={!isOptimizableImageUrl(slotImage)}
                          className={
                            slotOffer.itemType === "COMMON_BOX"
                              ? "object-contain p-2 opacity-60 transition-opacity duration-200 group-hover:opacity-90"
                              : "object-cover opacity-50 transition-opacity duration-200 group-hover:opacity-80"
                          }
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/25 to-ink/90" />
                      </div>
                    )}

                    <span className="relative z-10 flex items-center justify-between gap-1 font-mono text-[10px] tabular-nums leading-none">
                      <span className="text-snow">{slotCode}</span>
                      {slotOffer.purchasedAt ? (
                        <span className="text-ice" aria-hidden="true">
                          ✓
                        </span>
                      ) : (
                        <span className="text-mist">−{slotOffer.discount}%</span>
                      )}
                    </span>

                    {(!slotRevealed || !slotImage) && (
                      <div
                        className={`relative z-10 my-auto flex justify-center ${RARITY_TEXT_CLASS[rarity] ?? "text-mist"}`}
                      >
                        <SealCrestGlyph className="h-5 w-5" />
                      </div>
                    )}

                    <span className="relative z-10 mt-auto truncate font-mono text-[10px] uppercase tracking-[0.04em] text-mist">
                      {slotOffer.purchasedAt
                        ? "Sua"
                        : slotRevealed
                          ? "Aberta"
                          : "Selada"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="nm-tray__readout mt-3 flex min-w-0 items-center justify-between gap-3 font-mono text-caption text-mist">
              {activeMonolithOffer ? (
                <p className="min-w-0 truncate tabular-nums">
                  <span className="text-ice">
                    {offerSlotCode(
                      activeMonolithOffer.slot,
                      hoveredSlot ?? 0,
                    )}
                  </span>{" "}
                  · {offerKind(activeMonolithOffer)} ·{" "}
                  {rarityLabel(offerRarity(activeMonolithOffer))} · −
                  {activeMonolithOffer.discount}% ·{" "}
                  {activeMonolithRevealed
                    ? `${offerName(activeMonolithOffer)} · `
                    : ""}
                  {activeMonolithOffer.price.toLocaleString("pt-BR")} cristais
                </p>
              ) : offers.length > 0 ? (
                <p className="min-w-0 truncate">
                  Selecione um monólito para ir direto à oferta abaixo.
                </p>
              ) : (
                <p className="min-w-0 truncate">
                  Seleção pessoal renovada aos sábados, 00h (BRT).
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <section
        id="ofertas"
        className="mt-10 scroll-mt-24"
        aria-labelledby="offers-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-mist-soft">
              Seleção da edição
            </p>
            <h2
              id="offers-title"
              className="mt-1 font-display text-2xl text-snow sm:text-3xl"
            >
              Cartas seladas
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              Desconto, preço e raridade ficam visíveis antes da primeira
              revelação.
            </p>
          </div>
          {offers.length > 0 && (
            <p
              className="font-mono text-caption tabular-nums text-mist"
              aria-live="polite"
            >
              {offers.length} {offers.length === 1 ? "oferta" : "ofertas"} ·{" "}
              {stats.revealedCount} reveladas · {stats.purchasedCount}{" "}
              adquiridas
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-signal/50 bg-signal/10 p-4 text-body-sm text-signal"
          >
            <span>{error}</span>
            {!loading && user && (
              <button
                type="button"
                onClick={() => void loadOffers()}
                className="btn-ghost min-h-11 shrink-0 px-4 text-snow"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div
            role="status"
            aria-label="Carregando ofertas do Mercado Noturno"
            aria-busy="true"
            className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="border border-hairline bg-panel">
                <div className="skeleton aspect-[3/4]" aria-hidden="true" />
                <div className="space-y-3 border-t border-hairline p-4">
                  <div className="skeleton h-4 w-2/3" aria-hidden="true" />
                  <div className="skeleton h-5 w-1/2" aria-hidden="true" />
                  <div className="skeleton h-11 w-full" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        ) : offers.length > 0 ? (
          <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer, index) => (
              <NightMarketOfferCard
                key={offer.id}
                offer={offer}
                index={index}
                isRevealed={revealed.has(offer.id) || offer.revealed}
                available={available}
                reduceMotion={reduceMotion}
                onCommitReveal={commitReveal}
                onSelectPurchase={(selected) => {
                  setError("");
                  setPurchaseError("");
                  setPurchaseOffer(selected);
                }}
                onInspect={handleInspect}
                registerRevealTarget={registerRevealTarget}
              />
            ))}
          </ul>
        ) : authLoading ? null : !user ? (
          <div className="mt-6 border border-hairline bg-panel p-6 sm:p-8">
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-ice">
              Acesso restrito ao cofre
            </p>
            <h3 className="mt-2 font-display text-2xl text-snow">
              Entre para revelar sua seleção pessoal
            </h3>
            <p className="mt-2 max-w-xl text-body-sm text-mist">
              Cada conta recebe seis ofertas exclusivas todo fim de semana, com
              descontos de 10% a 30% em cartas e skins da coleção.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/entrar"
                className="btn-ice inline-flex min-h-11 items-center px-5"
              >
                Entrar
              </Link>
              <Link
                href="/gacha/mercado"
                className="btn-ghost inline-flex min-h-11 items-center px-4"
              >
                Explorar mercado
              </Link>
            </div>
          </div>
        ) : error ? null : (
          <div className="mt-6 border border-hairline bg-panel p-6 sm:p-8">
            <p className="font-mono text-caption uppercase tracking-[0.14em] text-mist-soft">
              {windowLabel}
            </p>
            <h3 className="mt-2 font-display text-2xl text-snow">
              A noite ainda não começou
            </h3>
            <p className="mt-2 max-w-xl text-body-sm text-mist">
              O Mercado Noturno abre aos sábados e domingos, com novas cartas e
              skins selecionadas para a sua conta a cada fim de semana.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/gacha/mercado"
                className="btn-ice inline-flex min-h-11 items-center px-5"
              >
                Voltar ao mercado
              </Link>
              <Link
                href="/gacha/loja"
                className="btn-ghost inline-flex min-h-11 items-center px-4"
              >
                Ver loja diária
              </Link>
            </div>
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
          <div className="flex items-center gap-4 border border-hairline bg-ink/80 p-3">
            <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden border border-hairline bg-panel">
              <OfferThumbnail offer={purchaseOffer} sizes="64px" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`font-mono text-caption ${RARITY_TEXT_CLASS[offerRarity(purchaseOffer)] ?? "text-mist"}`}
              >
                {offerKind(purchaseOffer)} ·{" "}
                {rarityLabel(offerRarity(purchaseOffer))}
              </p>
              <p className="mt-0.5 truncate font-display text-lg text-snow">
                {offerName(purchaseOffer)}
              </p>
              <span className="mt-1 inline-block bg-ice px-1.5 py-0.5 font-mono text-caption font-semibold tabular-nums text-ink">
                −{purchaseOffer.discount}%
              </span>
            </div>
          </div>

          <dl className="my-4 space-y-2.5 text-body-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-mist">Preço com desconto</dt>
              <dd className="font-medium tabular-nums text-ice">
                {purchaseOffer.price.toLocaleString("pt-BR")} cristais
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-mist">Desconto</dt>
              <dd className="tabular-nums text-snow">
                {purchaseOffer.discount}%
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-mist">Saldo atual</dt>
              <dd className="tabular-nums text-snow">
                {(available ?? 0).toLocaleString("pt-BR")} cristais
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-hairline pt-2.5">
              <dt className="text-mist">Saldo após a compra</dt>
              <dd className="font-medium tabular-nums text-snow">
                {Math.max(
                  0,
                  (available ?? 0) - purchaseOffer.price,
                ).toLocaleString("pt-BR")}{" "}
                cristais
              </dd>
            </div>
          </dl>

          {(available ?? 0) < purchaseOffer.price && (
            <div className="mb-3 border border-signal/40 bg-signal/10 p-3 text-caption text-signal">
              Saldo insuficiente. Faltam{" "}
              {(purchaseOffer.price - (available ?? 0)).toLocaleString("pt-BR")}{" "}
              cristais para esta oferta.{" "}
              <Link
                href="/gacha/cristais"
                className="inline-block underline underline-offset-2 hover:text-snow"
              >
                Adquirir cristais
              </Link>
            </div>
          )}

          {purchaseError && (
            <p
              role="alert"
              aria-live="polite"
              className="mb-3 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
            >
              {purchaseError}
            </p>
          )}

          <button
            type="button"
            disabled={busy || (available ?? 0) < purchaseOffer.price}
            onClick={() => void buyOffer()}
            className="btn-ice min-h-11 w-full font-semibold disabled:opacity-40"
          >
            {busy ? "Confirmando…" : "Confirmar compra"}
          </button>
        </Modal>
      )}

      {inspectedCard && (
        <CardPreview
          inspection={inspectedCard}
          onClose={() => setInspectedCard(null)}
        />
      )}

      {inspectedSkin && (
        <Modal
          open
          size="wide"
          onClose={() => setInspectedSkin(null)}
          title={inspectedSkin.name}
          footer={
            <button
              type="button"
              onClick={() => setInspectedSkin(null)}
              className="btn-ghost min-h-11 px-4"
            >
              Fechar prévia
            </button>
          }
        >
          <p className="mb-4 break-words text-body-sm text-mist">
            {inspectedSkin.details}
          </p>
          {inspectedSkin.image ? (
            <>
              <button
                type="button"
                aria-pressed={skinZoom}
                onClick={() => setSkinZoom((current) => !current)}
                className="btn-ghost mb-3 min-h-11 px-4"
              >
                {skinZoom ? "Ajustar à tela" : "Ampliar 2×"}
              </button>
              <div
                tabIndex={0}
                role="region"
                aria-label="Arte ampliada; use a rolagem para explorar"
                className="max-h-[60dvh] overflow-auto overscroll-contain bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
              >
                <Image
                  src={inspectedSkin.image}
                  alt={inspectedSkin.name}
                  width={960}
                  height={1280}
                  sizes={skinZoom ? "1600px" : "800px"}
                  unoptimized={!isOptimizableImageUrl(inspectedSkin.image)}
                  className={
                    skinZoom
                      ? "h-auto w-[200%] max-w-none"
                      : "mx-auto h-auto max-h-[60dvh] w-full object-contain"
                  }
                />
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-mist">
              Imagem indisponível para esta skin.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
