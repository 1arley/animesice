"use client";

import { CosmeticThumb } from "@/components/gacha/CosmeticThumb";
import type { CosmeticType } from "@/lib/cosmetic-svg";
import type { GachaShopItem } from "@/types";

const SLOT_LABEL: Record<CosmeticType, string> = {
  BACK: "Capa",
  FRAME: "Moldura",
  HIGHLIGHT: "Destaque",
};

const SLOT_HINT: Record<CosmeticType, string> = {
  BACK: "O verso das suas cartas.",
  FRAME: "O contorno em volta da arte, em todas as cartas.",
  HIGHLIGHT: "O realce aplicado sobre a carta.",
};

/**
 * Um slot do loadout: item equipado + uma fileira de botões para trocar.
 * Botões reais (não div clicável) para foco e teclado nativos; o estado vem de
 * aria-pressed e o grupo é rotulado por fieldset/legend.
 */
export function CosmeticSlotPicker({
  type,
  items,
  activeKey,
  busyKey,
  onSelect,
}: {
  type: CosmeticType;
  items: GachaShopItem[];
  activeKey: string | null;
  busyKey: string | null;
  onSelect: (key: string | null) => void;
}) {
  const labelId = `slot-${type.toLowerCase()}`;
  const active = items.find((i) => i.key === activeKey) ?? null;

  return (
    <fieldset className="min-w-0 border border-hairline bg-panel p-5">
      <legend className="px-1 font-display text-xl text-snow">
        {SLOT_LABEL[type]}
      </legend>
      <p className="text-caption text-mist">{SLOT_HINT[type]}</p>

      <div className="mt-4 flex items-center gap-4">
        <CosmeticThumb
          svg={active?.svg}
          type={type}
          alt={active ? `${SLOT_LABEL[type]} em uso: ${active.label}` : `Nenhum ${SLOT_LABEL[type].toLowerCase()} em uso`}
          className="aspect-[3/4] w-24 flex-none border border-hairline"
        />
        <p className="text-body-sm text-snow" role="status">
          {active ? active.label : "Padrão da série"}
        </p>
      </div>

      {active && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          disabled={busyKey !== null}
          className="btn-ghost mt-3 min-h-11 w-full px-3 disabled:opacity-50"
        >
          Remover {SLOT_LABEL[type].toLowerCase()}
        </button>
      )}

      <div
        role="group"
        aria-labelledby={labelId}
        className="mt-4 flex flex-wrap gap-2"
      >
        <span id={labelId} className="sr-only">
          {SLOT_LABEL[type]} disponíveis para equipar
        </span>
        {items.length === 0 ? (
          <p className="text-body-sm text-mist">
            Nenhum {SLOT_LABEL[type].toLowerCase()} na sua coleção ainda.
          </p>
        ) : (
          items.map((item) => {
            const selected = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={selected}
                disabled={busyKey !== null}
                onClick={() => onSelect(selected ? null : item.key)}
                className={`min-w-0 border p-1 text-left disabled:opacity-50 ${
                  selected
                    ? "border-ice bg-ice/10"
                    : "border-hairline hover:border-ice/60"
                }`}
              >
                <CosmeticThumb
                  svg={item.svg}
                  type={type}
                  className="aspect-[3/4] w-20"
                />
                <span className="mt-1 block truncate text-[11px] text-snow">
                  {item.label}
                </span>
              </button>
            );
          })
        )}
      </div>
    </fieldset>
  );
}