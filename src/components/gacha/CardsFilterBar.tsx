"use client";

import { GACHA_TIERS } from "@/components/gacha/GachaCard";

/**
 * CardsFilterBar — barra de filtros para /gacha/cartas.
 *
 * Exibe selects de ordenação, raridade e foil com badges quando um
 * filtro não-padrão está ativo. Também mostra a contagem de resultados
 * e um botão para limpar todos os filtros ativos.
 */
export function CardsFilterBar({
  sort,
  rarity,
  foil,
  total,
  loading,
  onSortChange,
  onRarityChange,
  onFoilChange,
}: {
  sort: string;
  rarity: string;
  foil: string;
  total: number;
  loading: boolean;
  onSortChange: (value: string) => void;
  onRarityChange: (value: string) => void;
  onFoilChange: (value: string) => void;
}) {
  const activeCount = (rarity !== "" ? 1 : 0) + (foil !== "" ? 1 : 0);
  const hasActiveFilters = activeCount > 0;

  function clearAll() {
    onRarityChange("");
    onFoilChange("");
  }

  return (
    <div className="mt-6 space-y-3">
      {/* Linha de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Ordenação */}
        <div className="relative">
          <select
            aria-label="Ordenação"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-11 cursor-pointer appearance-none border border-hairline bg-panel pl-3 pr-8 font-mono text-body-sm text-snow transition-colors hover:border-ice/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
          >
            <option value="value">Mais valiosas</option>
            <option value="recent">Recentes</option>
            <option value="rarity">Raridade</option>
            <option value="edition">Edição</option>
          </select>
          <ChevronDown />
        </div>

        {/* Raridade */}
        <div className="relative">
          <select
            aria-label="Raridade"
            value={rarity}
            onChange={(e) => onRarityChange(e.target.value)}
            className={`h-11 cursor-pointer appearance-none border pl-3 pr-8 font-mono text-body-sm transition-colors hover:border-ice/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
              rarity !== ""
                ? "border-ice/60 bg-ice/10 text-snow"
                : "border-hairline bg-panel text-snow"
            }`}
          >
            <option value="">Todas as raridades</option>
            {GACHA_TIERS.map((tier) => (
              <option key={tier}>{tier}</option>
            ))}
          </select>
          <ChevronDown active={rarity !== ""} />
        </div>

        {/* Foil */}
        <div className="relative">
          <select
            aria-label="Tipo de foil"
            value={foil}
            onChange={(e) => onFoilChange(e.target.value)}
            className={`h-11 cursor-pointer appearance-none border pl-3 pr-8 font-mono text-body-sm transition-colors hover:border-ice/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
              foil !== ""
                ? "border-ice/60 bg-ice/10 text-snow"
                : "border-hairline bg-panel text-snow"
            }`}
          >
            <option value="">Todos os foils</option>
            <option value="NORMAL">Normal</option>
            <option value="HOLO">Holo</option>
            <option value="GOLD">Gold</option>
            <option value="INK">Ink</option>
            <option value="NEGATIVE">Negative</option>
          </select>
          <ChevronDown active={foil !== ""} />
        </div>

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex h-11 items-center gap-1.5 border border-ice/30 px-3 font-mono text-body-sm text-ice transition-colors hover:border-ice/60 hover:bg-ice/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
            aria-label={`Limpar ${activeCount} filtro${activeCount > 1 ? "s" : ""} ativo${activeCount > 1 ? "s" : ""}`}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-ice/20 font-mono text-[11px] font-bold text-ice"
              aria-hidden="true"
            >
              {activeCount}
            </span>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Badges de filtros ativos + contagem de resultados */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Contagem */}
        <span
          className="font-mono text-caption text-mist"
          aria-live="polite"
          aria-atomic="true"
        >
          {loading ? (
            "Carregando…"
          ) : (
            <>
              <span className="text-snow">{total}</span>{" "}
              {total === 1 ? "carta" : "cartas"}
              {hasActiveFilters && " com esses filtros"}
            </>
          )}
        </span>

        {/* Badge raridade */}
        {rarity !== "" && (
          <FilterBadge label={rarity} onRemove={() => onRarityChange("")} />
        )}

        {/* Badge foil */}
        {foil !== "" && (
          <FilterBadge label={foil} onRemove={() => onFoilChange("")} />
        )}
      </div>
    </div>
  );
}

/** Badge de filtro ativo com botão de remover. */
function FilterBadge({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="flex items-center gap-1 border border-ice/40 bg-ice/10 px-2 py-0.5 font-mono text-caption text-ice">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        className="ml-0.5 flex h-4 w-4 items-center justify-center text-ice/70 transition-colors hover:text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
      >
        ✕
      </button>
    </span>
  );
}

/** Ícone de chevron para selects. */
function ChevronDown({ active = false }: { active?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] ${active ? "text-ice" : "text-mist"}`}
    >
      ▾
    </span>
  );
}
