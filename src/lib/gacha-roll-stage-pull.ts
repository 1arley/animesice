import type { GachaPull } from "@/types";
import { safeImageSrc } from "@/lib/url";

/** Only backend fields enter the scene; novelty badges require an explicit API flag. */
export function toRollStagePull(pull: GachaPull) {
  const result = pull as GachaPull & { isNew?: boolean; isDuplicate?: boolean };
  return {
    id: pull.id,
    rarity: pull.card.rarity,
    name: pull.card.name,
    points: pull.value,
    image: pull.card.imageHidden ? null : safeImageSrc(pull.card.image) ?? null,
    foil: pull.foil,
    condition: pull.conditionLabel ?? pull.condition,
    isNew: result.isNew === true,
    isDuplicate: result.isDuplicate === true,
  };
}
