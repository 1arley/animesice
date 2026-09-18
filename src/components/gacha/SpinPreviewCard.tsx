"use client";

import { GachaCard } from "@/components/gacha/GachaCard";
import type { GachaSpinPreview } from "@/types";

/**
 * SpinPreviewCard — preview de giro exibida com o mesmo visual da carta
 * final (GachaCard), mas sem edição definitiva nem dono: o que o usuário
 * vê antes de decidir guardar. Edition exibe "?" e valor é estimativa.
 */
export function SpinPreviewCard({ spin }: { spin: GachaSpinPreview }) {
  return (
    <GachaCard
      linkAnime={false}
      preview
      pull={{
        id: spin.id,
        condition: spin.condition,
        conditionLabel: spin.conditionLabel,
        foil: spin.foil,
        edition: 0,
        value: spin.value,
        obtainedAt: spin.createdAt,
        user: {
          id: "",
          name: null,
          userName: null,
          avatar: null,
        },
        card: spin.card,
      }}
    />
  );
}
