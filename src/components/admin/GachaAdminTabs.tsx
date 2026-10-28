"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/gacha", label: "Cartas" },
  { href: "/admin/gacha/jogadores", label: "Jogadores" },
  { href: "/admin/gacha/cosmeticos", label: "Cosméticos" },
  { href: "/admin/gacha/config", label: "Configuração" },
  { href: "/admin/gacha/codigos", label: "Códigos" },
  { href: "/admin/gacha/animacao", label: "Animação" },
];

/**
 * Navegação entre as telas do gacha. Sem ela a sub-página só oferece "Voltar".
 * O item ativo é a rota exata; se `current` não vier, usa o pathname atual.
 */
export function GachaAdminTabs({ current }: { current?: string }) {
  const pathname = usePathname();
  const active = current ?? pathname;
  return (
    <nav aria-label="Áreas do gacha" className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="admin-tab"
          aria-current={tab.href === active ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
