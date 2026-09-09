import Image from "next/image";
import Link from "next/link";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
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

const RARITY: Record<string, RarityStyle> = {
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

const GALAXY_FRAME =
  "overflow-hidden p-px bg-[linear-gradient(120deg,#8b5cf6_0%,#ec4899_35%,#38bdf8_70%,#8b5cf6_100%)] shadow-[0_0_26px_rgba(168,85,247,0.35)]";

export const GALAXY_TEXT =
  "bg-gradient-to-r from-violet-400 via-pink-400 to-sky-400 bg-clip-text text-transparent";

const FOIL_TEXT: Record<string, string> = {
  HOLO: "text-ice",
  GOLD: "text-amber-300",
};

export function GachaCard({ pull }: { pull: GachaPull }) {
  const { card } = pull;
  const art = safeImageSrc(card.image);
  const label = pull.conditionLabel ?? gachaConditionLabel(pull.condition);
  const animeSlug = card.anime?.slug ?? null;
  const rarity = RARITY[card.rarity] ?? RARITY.COMUM!;
  const isGalaxy = card.rarity === "GALACTICA";
  const foilText = FOIL_TEXT[pull.foil];

  return (
    <div
      className={
        isGalaxy
          ? GALAXY_FRAME
          : `overflow-hidden border bg-panel ${rarity.border} ${rarity.glow ?? ""}`
      }
    >
      <div className={`overflow-hidden ${isGalaxy ? "bg-panel" : ""}`}>
        <div className="relative" style={{ aspectRatio: "3 / 4" }}>
          {art ? (
            <Image
              src={art}
              alt={card.name}
              fill
              sizes="(max-width: 480px) 50vw, (max-width: 1024px) 25vw, 16vw"
              placeholder="blur"
              blurDataURL={blur.portrait}
              className="object-cover"
              quality={80}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-hairline">
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
        <div className="p-2">
          <p className="truncate font-sans text-body-sm font-medium text-snow">
            {card.name}
          </p>
          <p className="truncate font-mono text-caption text-mist-soft">
            {label} · #{pull.edition} · {pull.value} pts
          </p>
          {card.animeTitle && animeSlug && (
            <Link
              href={`/animes/${animeSlug}`}
              className="mt-0.5 block truncate font-mono text-caption text-ice hover:text-snow"
            >
              {card.animeTitle}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
