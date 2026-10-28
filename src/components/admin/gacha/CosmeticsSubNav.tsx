"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TYPES = [
  { href: "/admin/gacha/cosmeticos", label: "Visão geral", end: true },
  { href: "/admin/gacha/cosmeticos/capas", label: "Capas", end: false },
  { href: "/admin/gacha/cosmeticos/molduras", label: "Molduras", end: false },
  { href: "/admin/gacha/cosmeticos/destaques", label: "Destaques", end: false },
  { href: "/admin/gacha/cosmeticos/skins", label: "Skins", end: false },
];

/** Navegação secundária do hub de cosméticos. Rotas reais, não estado. */
export function CosmeticsSubNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Tipos de cosmético" className="flex flex-wrap gap-2">
      {TYPES.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="admin-tab"
          aria-current={
            (t.end ? pathname === t.href : pathname.startsWith(t.href + "/") || pathname === t.href)
              ? "page"
              : undefined
          }
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
