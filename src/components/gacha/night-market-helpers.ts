import type { GachaEconomyOffer, GachaFoil, GachaPull } from "../../types";

export const SKIN_RARITY: Record<string, string> = {
  COMMON: "COMUM",
  UNCOMMON: "INCOMUM",
  RARE: "RARA",
  EPIC: "EPICA",
  LEGENDARY: "LENDARIA",
  MYTHIC: "MITICA",
  GALACTIC: "GALACTICA",
};

export const RARITY_LABEL: Record<string, string> = {
  COMUM: "Comum",
  INCOMUM: "Incomum",
  RARA: "Rara",
  EPICA: "Épica",
  LENDARIA: "Lendária",
  MITICA: "Mítica",
  GALACTICA: "Galáctica",
};

export const RARITY_ACCENT_RGB: Record<string, string> = {
  COMUM: "148, 163, 184",
  INCOMUM: "52, 211, 153",
  RARA: "56, 189, 248",
  EPICA: "192, 132, 252",
  LENDARIA: "251, 191, 36",
  MITICA: "251, 113, 133",
  GALACTICA: "56, 232, 218",
};

type OfferFoil = "NORMAL" | GachaFoil;

const VALID_FOILS: readonly OfferFoil[] = [
  "NORMAL",
  "HOLO",
  "GOLD",
  "INK",
  "PRISM",
];

function defaultSanitizeUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const val = raw.trim();
  if (!val) return undefined;
  if (val.startsWith("/")) return val;
  if (/^(javascript|data|file):/i.test(val)) return undefined;
  try {
    const parsed = new URL(val);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? val
      : undefined;
  } catch {
    return undefined;
  }
}

function normalizeConditionLabel(condition: number): string {
  if (condition <= 0.07) return "MINT";
  if (condition <= 0.15) return "NM";
  if (condition <= 0.38) return "EX";
  if (condition <= 0.55) return "PLAYED";
  return "POOR";
}

function normalizeFoil(foil: string | undefined): OfferFoil {
  return VALID_FOILS.includes(foil as OfferFoil)
    ? (foil as OfferFoil)
    : "NORMAL";
}

export function offerName(offer: GachaEconomyOffer): string {
  if (offer.itemType === "CARD") {
    if (offer.card?.imageHidden) return "Carta misteriosa";
    return offer.card?.name ?? "Carta";
  }
  if (offer.itemType === "SKIN") {
    return offer.skin?.name ?? "Skin";
  }
  if (offer.itemType === "KEY") {
    return "Chave de caixa";
  }
  if (offer.itemType === "COMMON_BOX") {
    return "Caixa comum";
  }
  return "Oferta";
}

export function offerKind(offer: GachaEconomyOffer): string {
  switch (offer.itemType) {
    case "CARD":
      return "Carta";
    case "SKIN":
      return "Skin";
    case "KEY":
      return "Chave";
    case "COMMON_BOX":
      return "Caixa";
    default:
      return "Oferta";
  }
}

export function offerImage(
  offer: GachaEconomyOffer,
  sanitize: (raw: string | null | undefined) => string | undefined = defaultSanitizeUrl,
): string | undefined {
  if (offer.itemType === "CARD") {
    if (offer.card?.imageHidden) return undefined;
    return sanitize(offer.card?.image ?? null);
  }
  if (offer.itemType === "SKIN") {
    return sanitize(offer.skin?.imageUrl ?? null);
  }
  if (offer.itemType === "COMMON_BOX") {
    return "/gacha/box-common.webp";
  }
  return undefined;
}

export function offerRarity(offer: GachaEconomyOffer): string {
  if (offer.itemType === "KEY" || offer.itemType === "COMMON_BOX") {
    return "COMUM";
  }
  const value = offer.card?.rarity ?? offer.skin?.rarity ?? "COMUM";
  return SKIN_RARITY[value] ?? value;
}

export function rarityLabel(rarity: string): string {
  return RARITY_LABEL[rarity] ?? "Comum";
}

export function offerSlotCode(slot: number, index: number): string {
  const displayNumber = slot >= 7 ? slot - 6 : index + 1;
  return String(Math.max(1, displayNumber)).padStart(2, "0");
}

export function offerPull(offer: GachaEconomyOffer): GachaPull | null {
  if (offer.itemType !== "CARD" || !offer.card) return null;
  const cardRarity = offerRarity(offer);
  const rawCondition = offer.payload?.condition;
  const condition =
    typeof rawCondition === "number" &&
    Number.isFinite(rawCondition) &&
    rawCondition >= 0 &&
    rawCondition <= 1
      ? rawCondition
      : 0.04;
  const foil = normalizeFoil(offer.payload?.foil);
  return {
    id: offer.id,
    condition,
    conditionLabel: normalizeConditionLabel(condition),
    foil,
    edition: 1,
    value: offer.price,
    obtainedAt: new Date(0).toISOString(),
    user: {
      id: "night-market",
      name: "Mercado Noturno",
      userName: "mercado-noturno",
      avatar: null,
    },
    card: {
      id: offer.card.id,
      name: offer.card.imageHidden ? "Carta misteriosa" : offer.card.name,
      image: offer.card.imageHidden ? null : (offer.card.image ?? null),
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

export function offerInspection(offer: GachaEconomyOffer) {
  if (offer.itemType !== "CARD" || !offer.card) return null;
  const pull = offerPull(offer);
  return {
    card: {
      id: offer.card.id,
      name: offerName(offer),
      image: offer.card.imageHidden ? null : (offer.card.image ?? null),
      imageHidden: Boolean(offer.card.imageHidden),
      rarity: offerRarity(offer),
      animeTitle: offer.card.animeTitle ?? null,
    },
    price: offer.price,
    foil: pull?.foil,
    condition: pull?.condition,
  };
}

export interface NightMarketStats {
  total: number;
  revealedCount: number;
  purchasedCount: number;
  maxDiscount: number;
}

export function computeNightMarketStats(
  offers: GachaEconomyOffer[],
  revealedIds: Set<string>,
): NightMarketStats {
  let revealedCount = 0;
  let purchasedCount = 0;
  let maxDiscount = 0;

  for (const offer of offers) {
    if (offer.revealed || revealedIds.has(offer.id)) {
      revealedCount += 1;
    }
    if (offer.purchasedAt) {
      purchasedCount += 1;
    }
    if (offer.discount > maxDiscount) {
      maxDiscount = offer.discount;
    }
  }

  return {
    total: offers.length,
    revealedCount,
    purchasedCount,
    maxDiscount,
  };
}

const SAO_PAULO_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function formatRemainingDuration(prefix: string, diffMs: number): string {
  const totalMinutes = Math.max(1, Math.ceil(diffMs / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${prefix} ${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${prefix} ${hours}h ${String(minutes).padStart(2, "0")}min`;
  }
  return `${prefix} ${minutes}min`;
}

/**
 * Calcula a janela da edição semanal em America/Sao_Paulo (-03:00 fixo):
 * - Aberta: 48h a partir do `periodStart` (sábado 00:00 BRT -> segunda 00:00 BRT).
 * - Fechada: tempo restante até o próximo sábado 00:00 BRT.
 */
export function formatNightMarketWindow(
  open: boolean | null,
  periodStart: string | null,
  now: Date,
): string {
  if (open === null) {
    return "Sábados e domingos";
  }

  if (open) {
    if (periodStart && /^\d{4}-\d{2}-\d{2}$/.test(periodStart)) {
      const startMs = Date.parse(`${periodStart}T00:00:00-03:00`);
      if (Number.isFinite(startMs)) {
        const closeMs = startMs + 2 * 86_400_000;
        const remaining = closeMs - now.getTime();
        if (remaining > 0) {
          return formatRemainingDuration("Fecha em", remaining);
        }
        return "Edição ativa · BRT";
      }
    }
    return "Edição ativa";
  }

  const parts = Object.fromEntries(
    SAO_PAULO_PARTS.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  // America/Sao_Paulo = UTC-3 fixo. Construímos o meio-dia UTC do dia local para ler o dia da semana sem drift de fuso.
  const localMiddayUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = localMiddayUtc.getUTCDay() || 7; // Mon=1 .. Sat=6, Sun=7
  const daysUntilSaturday = weekday === 6 ? 7 : (6 - weekday + 7) % 7;
  // Meia-noite BRT (00:00-03:00) == 03:00 UTC.
  const nextSaturdayMs = Date.UTC(year, month - 1, day + daysUntilSaturday, 3, 0, 0);
  const remaining = nextSaturdayMs - now.getTime();
  return remaining > 0
    ? formatRemainingDuration("Abre em", remaining)
    : "Sábados e domingos";
}
