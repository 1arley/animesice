"use client";

import { useId, useState } from "react";
import type {
  GachaCatalogItem,
  GachaItemAmount,
  GachaEconomyInventory,
} from "@/types";

export function inventoryAmount(
  inventory: GachaEconomyInventory,
  field: string,
): number {
  const value = (inventory as unknown as Record<string, unknown>)[field];
  return typeof value === "number" ? value : 0;
}

export function ItemRewardPicker({
  catalog,
  value,
  onChange,
  inventory,
  disabled = false,
}: {
  catalog: GachaCatalogItem[];
  value: GachaItemAmount[];
  onChange: (items: GachaItemAmount[]) => void;
  inventory?: GachaEconomyInventory;
  disabled?: boolean;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const available = catalog.filter(
    (item) =>
      (!inventory || inventoryAmount(inventory, item.field) > 0) &&
      item.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-3">
      <legend className="text-body-sm text-snow">Itens e quantidades</legend>
      <label className="block text-caption text-mist" htmlFor={`${id}-search`}>
        Buscar item
      </label>
      <input
        id={`${id}-search`}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="field min-h-11 w-full"
        placeholder="Nome do item…"
      />
      {value.length > 0 && (
        <ul className="space-y-2" aria-label="Itens selecionados">
          {value.map((row) => {
            const item = catalog.find((entry) => entry.id === row.itemId);
            return (
              <li
                key={row.itemId}
                className="flex flex-wrap items-end gap-2 border border-hairline p-3"
              >
                <label className="min-w-0 flex-1 text-body-sm text-snow">
                  {item?.name ?? row.itemId}
                  <input
                    aria-label={`Quantidade de ${item?.name ?? row.itemId}`}
                    type="number"
                    min={1}
                    max={
                      inventory && item
                        ? inventoryAmount(inventory, item.field)
                        : 2147483647
                    }
                    step={1}
                    required
                    value={row.quantity}
                    onChange={(event) =>
                      onChange(
                        value.map((entry) =>
                          entry.itemId === row.itemId
                            ? { ...entry, quantity: Number(event.target.value) }
                            : entry,
                        ),
                      )
                    }
                    className="field mt-1 min-h-11 w-full"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      value.filter((entry) => entry.itemId !== row.itemId),
                    )
                  }
                  className="btn-ghost min-h-11 px-3"
                  aria-label={`Remover ${item?.name ?? row.itemId}`}
                >
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="max-h-48 overflow-y-auto border border-hairline">
        {available.length ? (
          available.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={value.some((row) => row.itemId === item.id)}
              onClick={() =>
                onChange([...value, { itemId: item.id, quantity: 1 }])
              }
              className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-hairline px-3 py-2 text-left text-body-sm text-snow last:border-0 hover:bg-ice/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:text-mist"
            >
              <span>{item.name}</span>
              <span className="shrink-0 text-caption text-ice">
                {value.some((row) => row.itemId === item.id)
                  ? "Selecionado"
                  : inventory
                    ? `${inventoryAmount(inventory, item.field).toLocaleString("pt-BR")} disponível`
                    : "Adicionar"}
              </span>
            </button>
          ))
        ) : (
          <p className="p-3 text-body-sm text-mist">
            {inventory
              ? "Nenhum item disponível para oferecer."
              : "Nenhum item encontrado."}
          </p>
        )}
      </div>
    </fieldset>
  );
}
