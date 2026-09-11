"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
import {
  RARITY,
  GALAXY_FRAME,
  GALAXY_TEXT,
  FOIL_TEXT,
} from "@/components/gacha/GachaCard";
import type { GachaPull } from "@/types";

/**
 * FeaturedPortrait — retrato troféu 3:4 da carta destaque no hero do perfil.
 *
 * In-flow (nunca absolute), caixa com aspect-ratio fixo (zero CLS), moldura
 * por raridade reaproveitada do GachaCard. Sem animação/tilt/hover-zoom.
 */
export function FeaturedPortrait({ pull }: { pull: GachaPull }) {
  const { card } = pull;
  const [failed, setFailed] = useState(false);
  const art = failed ? undefined : safeImageSrc(card.image);
  const rarity = RARITY[card.rarity] ?? RARITY.COMUM!;
  const isGalaxy = card.rarity === "GALACTICA";
  const foilText = FOIL_TEXT[pull.foil];

  return (
    <div className="w-28 sm:w-32 md:w-40">
      <p className="mb-1.5 font-mono text-caption uppercase tracking-wider text-mist-soft">
        Carta destaque
      </p>
      <Link
        href={`/gacha?card=${pull.id}`}
        aria-label={`Ver carta destacada ${card.name}`}
        className="block"
      >
        <div
          className={
            isGalaxy
              ? GALAXY_FRAME
              : `overflow-hidden border bg-panel ${rarity.border} ${rarity.glow ?? ""}`
          }
        >
          <div className={isGalaxy ? "bg-panel" : ""}>
          <div className="relative" style={{ aspectRatio: "3 / 4" }}>
            {art ? (
              <Image
                src={art}
                alt={card.name}
                fill
                priority
                sizes="(max-width: 639px) 112px, (max-width: 767px) 128px, 160px"
                placeholder="blur"
                  blurDataURL={blur.portrait}
                  className="object-cover"
                  quality={80}
                  onError={() => setFailed(true)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center border border-hairline bg-panel">
                  <span className="font-mono text-caption uppercase tracking-wider text-mist">
                    sem arte
                  </span>
                </div>
              )}
              <span
                className={`absolute left-1.5 top-1.5 bg-ink/85 px-1.5 py-0.5 font-mono text-caption font-medium backdrop-blur-sm ${isGalaxy ? GALAXY_TEXT : rarity.text}`}
              >
                {card.rarity}
              </span>
              {pull.foil !== "NORMAL" && (
                <span
                  className={`absolute right-1.5 top-1.5 bg-ink/85 px-1.5 py-0.5 font-mono text-caption font-medium backdrop-blur-sm ${foilText ?? "text-snow"}`}
                >
                  {pull.foil}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-1.5 truncate font-sans text-body-sm font-medium text-snow">
          {card.name}
        </p>
      </Link>
    </div>
  );
}

/**
 * Slot reservado enquanto a carta destaque carrega — mesmas dimensões do
 * retrato final (label + frame 3:4 + nome) para zero CLS. Quem não tem carta
 * some sem deixar fantasma (o pai só renderiza isto durante o loading).
 */
export function FeaturedPortraitSkeleton() {
  return (
    <div className="w-28 sm:w-32 md:w-40" aria-hidden="true">
      <p className="mb-1.5 font-mono text-caption uppercase tracking-wider text-mist-soft">
        Carta destaque
      </p>
      <div className="overflow-hidden border border-hairline bg-panel">
        <div className="skeleton" style={{ aspectRatio: "3 / 4" }} />
      </div>
      <div className="skeleton mt-1.5 h-5 w-3/4" />
    </div>
  );
}
