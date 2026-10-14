import Link from "next/link";

const TABS = [
  { href: "/admin/gacha", label: "Gacha" },
  { href: "/admin/gacha/config", label: "Configuração" },
  { href: "/admin/gacha/codigos", label: "Códigos" },
  { href: "/admin/gacha/animacao", label: "Animação" },
  { href: "/admin/gacha/capas", label: "Editar capas" },
  { href: "/admin/gacha/skins", label: "Skins" },
];

/** Navegação entre as telas do gacha. Sem ela a sub-página só oferece "Voltar". */
export function GachaAdminTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Áreas do gacha" className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="admin-tab"
          aria-current={tab.href === current ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}