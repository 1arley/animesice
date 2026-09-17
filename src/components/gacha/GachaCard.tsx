import Image from "next/image";
import Link from "next/link";
import { memo, type CSSProperties } from "react";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
import { HoloTilt } from "@/components/core/HoloTilt";
import type { GachaPull } from "@/types";

export function gachaConditionLabel(condition: number): string {
  if (condition <= 0.07) return "MINT";
  if (condition <= 0.15) return "NM";
  if (condition <= 0.38) return "EX";
  if (condition <= 0.55) return "PLAYED";
  return "POOR";
}

interface RarityStyle {
  text: string;
  border: string;
  glow?: string;
}

export const GACHA_TIERS = [
  "COMUM",
  "INCOMUM",
  "RARA",
  "EPICA",
  "LENDARIA",
  "MITICA",
  "GALACTICA",
] as const;

// Escala visual: cinza > verde > azul > roxo > dourado > vermelho > galáctico.
// Raridade manda na moldura; foil é só o badge. Glow estático, nunca cor sozinha
// (badge de texto carrega a semântica).
export const RARITY_TEXT: Record<string, string> = {
  COMUM: "text-mist",
  INCOMUM: "text-emerald-400",
  RARA: "text-sky-400",
  EPICA: "text-violet-400",
  LENDARIA: "text-amber-300",
  MITICA: "text-rose-400",
};

export const RARITY: Record<string, RarityStyle> = {
  COMUM: { text: RARITY_TEXT.COMUM!, border: "border-hairline" },
  INCOMUM: { text: RARITY_TEXT.INCOMUM!, border: "border-emerald-400/40" },
  RARA: { text: RARITY_TEXT.RARA!, border: "border-sky-400/40" },
  EPICA: {
    text: RARITY_TEXT.EPICA!,
    border: "border-violet-400/50",
    glow: "shadow-[0_0_16px_rgba(167,139,250,0.2)]",
  },
  LENDARIA: {
    text: RARITY_TEXT.LENDARIA!,
    border: "border-amber-300/60",
    glow: "shadow-[0_0_20px_rgba(252,211,77,0.25)]",
  },
  MITICA: {
    text: RARITY_TEXT.MITICA!,
    border: "border-rose-500/60",
    glow: "shadow-[0_0_22px_rgba(251,113,133,0.28)]",
  },
};

export const GALAXY_FRAME =
  "overflow-hidden p-px bg-[linear-gradient(120deg,#8b5cf6_0%,#ec4899_35%,#38bdf8_70%,#8b5cf6_100%)] shadow-[0_0_26px_rgba(168,85,247,0.35)]";

export const GALAXY_TEXT =
  "bg-gradient-to-r from-violet-400 via-pink-400 to-sky-400 bg-clip-text text-transparent";

export const FOIL_TEXT: Record<string, string> = {
  HOLO: "text-ice",
  GOLD: "text-amber-300",
};

export const CONDITION_COLOR: Record<string, string> = {
  MINT: "text-ice",
  NM: "text-snow",
  EX: "text-amber-300",
  PLAYED: "text-orange-500",
  POOR: "text-red-500",
};

export const CONDITION_GLYPH: Record<string, string> = {
  MINT: "◆◆◆",
  NM: "◆◆",
  EX: "◆",
  PLAYED: "▽",
  POOR: "✕",
};

// Arte decaiu junto com a condição: PLAYED dessatura, POOR dessatura + escurece.
const CONDITION_ART: Record<string, string> = {
  MINT: "saturate-[1.08] brightness-[1.03]",
  NM: "saturate-[1.02] brightness-[1.01]",
  EX: "saturate-[.82] brightness-[.96]",
  PLAYED: "saturate-[.75]",
  POOR: "saturate-[.55] brightness-[.88]",
};

const CONDITION_SURFACE: Record<string, string> = {
  MINT: "condition-surface-mint",
  NM: "condition-surface-nm",
  EX: "condition-surface-ex",
};

// Seed deterministica dos riscos por carta: hash do pull.id vira angulo
// (--sc1/--sc2) e espacamento (--scg) dos gradientes. Estavel entre renders.
function scratchVars(id: string): CSSProperties {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return {
    "--sc1": `${60 + (h % 70)}deg`,
    "--sc2": `${-40 - ((h >> 6) % 60)}deg`,
    "--scg": `${30 + ((h >> 3) % 26)}px`,
  } as CSSProperties;
}

export const GachaCard = memo(function GachaCard({ pull, preview = false, linkAnime = true, showInfo = true, side = "front" }: { pull: GachaPull; linkAnime?: boolean; /** Preview de giro: sem edição definitiva nem valor final. */ preview?: boolean; /** Preview modal: usa só a arte. */ showInfo?: boolean; side?: "front" | "back" }) {
  const { card } = pull;
  const art = safeImageSrc(card.image);
  const label = pull.conditionLabel ?? gachaConditionLabel(pull.condition);
  const animeSlug = card.anime?.slug ?? null;
  const rarity = RARITY[card.rarity] ?? RARITY.COMUM!;
  const isGalaxy = card.rarity === "GALACTICA";
  const foilText = FOIL_TEXT[pull.foil];
  const cosmetics = pull.user?.gachaCosmetics ?? [];
  const hasAurora = cosmetics.includes("FRAME_AURORA");
  const backKey = pull.user?.gachaCardBack;
  const destaqueRing = cosmetics.includes("DESTAQUE_CARTA")
    ? " shadow-[0_0_18px_rgba(252,211,77,0.45)]"
    : "";

  const markup = (
    <div
      className={
        isGalaxy || hasAurora
          ? `group ${GALAXY_FRAME}${destaqueRing}`
          : `group overflow-hidden border bg-panel ${rarity.border} ${rarity.glow ?? ""}${destaqueRing}`
      }
    >
      <div className={`overflow-hidden ${isGalaxy || hasAurora ? "bg-panel" : ""}`}>
        {side === "back" ? (
          <div
            className={`relative flex aspect-[3/4] items-center justify-center overflow-hidden p-5 ${backKey === "BACK_ICE" ? "bg-[radial-gradient(circle_at_30%_20%,rgba(56,232,218,.5),transparent_35%),linear-gradient(145deg,#183d55,#080c12_55%,#0d2439)]" : "bg-[radial-gradient(circle_at_30%_20%,rgba(56,232,218,.3),transparent_35%),linear-gradient(145deg,#101d30,#080c12_55%,#172f48)]"}`}
            role="img"
            aria-label="Verso personalizado da carta"
          >
            <div className="absolute inset-3 border border-ice/40" aria-hidden="true" />
            <div className="relative flex h-full w-full items-center justify-center border border-white/10 bg-ink/30">
              <span className="font-display text-center text-display-md text-ice/90">ANIMESICE</span>
            </div>
          </div>
        ) : <>
        <div className="group relative" style={{ aspectRatio: "3 / 4" }}>
          {art ? (
            <Image
              src={art}
              alt={card.name}
              fill
              sizes="(max-width: 480px) 50vw, (max-width: 1024px) 25vw, 16vw"
              placeholder="blur"
              blurDataURL={blur.portrait}
              className={`object-cover ${CONDITION_ART[label] ?? ""}`}
              quality={80}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-hairline">
              <span className="font-mono text-caption uppercase tracking-wider text-mist">
                sem arte
              </span>
            </div>
          )}
          {pull.foil === "GOLD" && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 mix-blend-screen bg-[radial-gradient(120%_90%_at_50%_45%,transparent_40%,rgba(251,191,36,0.28)_72%,rgba(252,211,77,0.55)_100%)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-[-25%] left-0 w-1/3 bg-gradient-to-r from-transparent via-amber-100/50 to-transparent mix-blend-screen motion-safe:animate-[gold-shine_5s_ease-in-out_infinite]"
              />
            </>
          )}
          {(label === "PLAYED" || label === "POOR") && (
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 ${label === "POOR" ? "card-scratches-poor" : "card-scratches"}`}
              style={scratchVars(pull.id)}
            />
          )}
          {CONDITION_SURFACE[label] && (
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 ${CONDITION_SURFACE[label]}`}
            />
          )}
          {label === "MINT" && pull.foil === "NORMAL" && (
            <div aria-hidden className="condition-mint-glare pointer-events-none absolute inset-0" />
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
          <span
            className={`absolute bottom-1.5 right-1.5 bg-ink/85 px-1.5 py-0.5 font-mono text-caption font-medium backdrop-blur-sm ${CONDITION_COLOR[label] ?? "text-mist"}`}
          >
            {CONDITION_GLYPH[label] ? `${CONDITION_GLYPH[label]} ` : ""}
            {label}
          </span>
        </div>
        {showInfo && (
          <div className="p-2">
            <p className="truncate font-sans text-body-sm font-medium text-snow">
              {card.name}
            </p>
          <p className="truncate font-mono text-caption text-mist-soft">
            {preview ? `${label} · prévia` : `${label} · #${pull.edition} · ${pull.value} pts`}
          </p>
          {preview && (
            <p className="break-words font-mono text-body-sm font-semibold text-ice" aria-label={`Valor estimado: ${pull.value} pontos`}>
              ~{pull.value} pts
            </p>
          )}
            {card.animeTitle && animeSlug && (
              linkAnime ? (
                <Link
                  href={`/animes/${animeSlug}`}
                  className="mt-0.5 block truncate font-mono text-caption text-ice hover:text-snow"
                >
                  {card.animeTitle}
                </Link>
              ) : (
                <span className="mt-0.5 block truncate font-mono text-caption text-ice">
                  {card.animeTitle}
                </span>
              )
            )}
          </div>
        )}
        </>}
      </div>
    </div>
  );

  return pull.foil === "HOLO" ? <HoloTilt>{markup}</HoloTilt> : markup;
});
