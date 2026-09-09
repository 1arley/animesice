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

const RARITY_TEXT: Record<string, string> = {
  COMUM: "text-mist",
  RARA: "text-ice",
  EPICA: "text-ice",
  LENDARIA: "text-amber-300",
};

function foilRing(foil: string): string {
  if (foil === "GOLD") return "ring-1 ring-amber-300/70";
  if (foil === "HOLO") return "ring-1 ring-ice/60";
  return "";
}

/**
 * GachaCard — carta de waifu: arte, raridade, foil, condition, edição e
 * valor. Usado no /gacha, na coleção do perfil e nos posts GACHA_PULL.
 */
export function GachaCard({ pull }: { pull: GachaPull }) {
  const { card } = pull;
  const art = safeImageSrc(card.image);
  const label = pull.conditionLabel ?? gachaConditionLabel(pull.condition);
  const animeSlug = card.anime?.slug ?? null;

  return (
    <div className={`overflow-hidden bg-panel ${foilRing(pull.foil)}`}>
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
          className={`absolute left-1.5 top-1.5 bg-ink/85 px-1.5 py-0.5 font-mono text-caption font-medium backdrop-blur-sm ${RARITY_TEXT[card.rarity] ?? "text-mist"}`}
        >
          {card.rarity}
        </span>
        {pull.foil !== "NORMAL" && (
          <span className="absolute right-1.5 top-1.5 bg-ink/85 px-1.5 py-0.5 font-mono text-caption font-medium text-amber-300 backdrop-blur-sm">
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
  );
}
