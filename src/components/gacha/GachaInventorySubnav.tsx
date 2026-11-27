"use client";

import Link from "next/link";
import type { InventoryFragmentStats } from "@/lib/gacha-inventory";

export function GachaInventorySubnav({
  active,
  stats,
}: {
  active: "inventory" | "fragments";
  stats?: InventoryFragmentStats | null;
}) {
  return (
    <nav
      aria-label="Navegação do inventário"
      className="gacha-inventory-subnav mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/gacha/inventario"
          aria-current={active === "inventory" ? "page" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 border px-4 text-body-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
            active === "inventory"
              ? "border-ice bg-ice/10 text-ice"
              : "border-hairline bg-panel text-mist hover:border-ice/40 hover:text-snow"
          }`}
        >
          <span>Inventário</span>
        </Link>
        <Link
          href="/gacha/inventario/fragmentos"
          aria-current={active === "fragments" ? "page" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 border px-4 text-body-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
            active === "fragments"
              ? "border-ice bg-ice/10 text-ice"
              : "border-hairline bg-panel text-mist hover:border-ice/40 hover:text-snow"
          }`}
        >
          <span>Fragmentos</span>
          {stats && (
            <span className="border border-hairline bg-ink px-2 py-0.5 font-mono text-caption tabular-nums text-snow">
              {stats.totalFragments.toLocaleString("pt-BR")}
            </span>
          )}
          {stats && stats.totalCraftable > 0 && (
            <span className="bg-ice px-1.5 py-0.5 font-mono text-label font-semibold uppercase tracking-wider text-ink">
              Pronto
            </span>
          )}
        </Link>
      </div>

      {active === "fragments" && (
        <Link
          href="/gacha/inventario"
          className="btn-ghost min-h-11 px-4 text-body-sm"
        >
          ← Voltar ao inventário
        </Link>
      )}
    </nav>
  );
}
