import type { GachaItemConfig, GachaPull } from "@/types";

export function gachaRerollCost(
  card: GachaPull,
  config: GachaItemConfig,
): number | null {
  const base = config.base_value[card.card.rarity];
  if (card.valueOverride != null)
    return Math.max(
      card.value + 1,
      Math.round(card.value * (1 + config.reroll_cost_pct)),
    );
  if (base == null) return null;
  const condition =
    card.condition <= 0.07
      ? 3
      : card.condition <= 0.15
        ? 2
        : card.condition <= 0.38
          ? 1.5
          : card.condition <= 0.55
            ? 1.2
            : 1;
  const raw = base * condition * (config.foil_mult[card.foil] ?? 1);
  const value = Math.round(
    raw + (card.edition <= 10 ? (raw * (11 - card.edition)) / 10 : 0),
  );
  return Math.max(value + 1, Math.round(value * (1 + config.reroll_cost_pct)));
}
